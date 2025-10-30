import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { Resend } from 'resend'
import { generateMeetingLink } from '@/lib/meetings'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: NextRequest) {
  try {
    const { sessionId, reviewerId } = await request.json()

    if (!sessionId || !reviewerId) {
      return NextResponse.json(
        { success: false, error: 'Missing sessionId or reviewerId' },
        { status: 400 }
      )
    }

    const supabase = await createServerSupabaseClient()

    // Verify session belongs to reviewer
    const { data: session } = await supabase
      .from('live_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('reviewer_id', reviewerId)
      .single()

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Session not found or unauthorized' },
        { status: 404 }
      )
    }

    // Get next person in queue
    const { data: nextEntry, error: queryError } = await supabase
      .from('queue_entries')
      .select(`
        *,
        applicant:applicant_id(*)
      `)
      .eq('live_session_id', sessionId)
      .eq('status', 'waiting')
      .order('position', { ascending: true })
      .limit(1)
      .single()

    console.log('Queue query result:', { error: queryError, hasData: !!nextEntry })

    if (queryError || !nextEntry) {
      console.error('Queue query error:', queryError)
      return NextResponse.json(
        { success: false, error: 'No one in queue' },
        { status: 400 }
      )
    }

    // Create meeting for this person
    const meetingLink = await generateMeetingLink()
    const now = new Date()
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000) // 24 hours

    const nextEntryAny = nextEntry as any

    console.log('Creating meeting for applicant:', nextEntryAny.applicant_id)

    const { data: meeting, error: meetingError } = await (supabase as any)
      .from('meetings')
      .insert({
        applicant_id: nextEntryAny.applicant_id,
        reviewer_id: reviewerId,
        roast_type: 'pitch', // Default, can be customized
        status: 'accepted',
        meeting_link: meetingLink,
        requested_at: now.toISOString(),
        accepted_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
        scheduled_for: now.toISOString()
      })
      .select()
      .single()

    if (meetingError) {
      console.error('Meeting creation error:', meetingError)
      console.error('Meeting error details:', JSON.stringify(meetingError, null, 2))
      return NextResponse.json(
        { success: false, error: `Failed to create meeting: ${meetingError.message || JSON.stringify(meetingError)}` },
        { status: 500 }
      )
    }

    // Update queue entry
    const { error: updateError } = await (supabase as any)
      .from('queue_entries')
      .update({
        status: 'your_turn',
        notified_at: now.toISOString(),
        meeting_id: meeting.id
      })
      .eq('id', nextEntryAny.id)

    if (updateError) {
      console.error('Queue entry update error:', updateError)
      return NextResponse.json(
        { success: false, error: 'Failed to update queue entry' },
        { status: 500 }
      )
    }

    // Send email notification to applicant
    const applicant = (nextEntry as any)?.applicant
    if (applicant?.email) {
      try {
        await resend.emails.send({
          from: 'MYC <noreply@myc-roast.com>',
          to: applicant.email,
          subject: "🔥 It's your turn! Join your roast now",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #FF6600;">It's Your Turn!</h1>
              <p>Hi ${applicant.name || 'there'},</p>
              <p>Great news! It's your turn in the queue. You have <strong>2 minutes</strong> to join the roast session.</p>
              <div style="margin: 30px 0;">
                <a href="${meetingLink}"
                   style="background-color: #FF6600; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                  Join Roast Now
                </a>
              </div>
              <p style="color: #666; font-size: 14px;">
                Meeting Link: <a href="${meetingLink}">${meetingLink}</a>
              </p>
              <p style="color: #666; font-size: 12px; margin-top: 30px;">
                If you don't join within 2 minutes, you'll be automatically skipped and the next person will get their turn.
              </p>
            </div>
          `
        })
      } catch (emailError) {
        console.error('Failed to send email notification:', emailError)
        // Don't fail the request if email fails
      }
    }

    return NextResponse.json({
      success: true,
      entry: nextEntry,
      meeting,
      meetingLink
    })
  } catch (error: any) {
    console.error('Error processing next in queue:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
