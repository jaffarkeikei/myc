import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { sendRoastConfirmationEmails } from '@/lib/email'
import { generateMeetingLink } from '@/lib/meetings'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { meetingId, roasterId } = body

    console.log('Accept roast API called with:', { meetingId, roasterId })

    if (!meetingId || !roasterId) {
      return NextResponse.json(
        { error: 'Missing meetingId or roasterId' },
        { status: 400 }
      )
    }

    const supabase = await createServerSupabaseClient()

    // Get meeting details
    const meetingResult = await supabase
      .from('meetings')
      .select(`
        *,
        applicant:applicant_id(*),
        reviewer:reviewer_id(*)
      `)
      .eq('id', meetingId)
      .eq('reviewer_id', roasterId)
      .eq('status', 'requested')
      .single()

    console.log('Meeting query result:', { error: meetingResult.error, hasData: !!meetingResult.data })

    if (meetingResult.error) {
      console.error('Meeting query error:', meetingResult.error)
      return NextResponse.json(
        { error: `Database error: ${meetingResult.error.message}` },
        { status: 500 }
      )
    }

    const meeting = meetingResult.data as any

    if (!meeting) {
      return NextResponse.json(
        { error: 'Meeting not found or already processed' },
        { status: 404 }
      )
    }

    // Get applicant and reviewer details
    const applicant = meeting.applicant as any
    const reviewer = meeting.reviewer as any

    // Get roast type label
    const roastTypeLabels: Record<string, string> = {
      application: 'Application',
      pitch: 'Pitch Deck',
      idea: 'Idea'
    }

    // Generate meeting link with Google Meet
    const meetLinkResult = await generateMeetingLink(
      applicant.email || '',
      applicant.name || 'Applicant',
      reviewer.email || '',
      reviewer.name || 'Roaster',
      roastTypeLabels[meeting.roast_type] || meeting.roast_type,
      15 // 15 minutes duration
    )

    if (!meetLinkResult.success || !meetLinkResult.url) {
      console.error('Failed to generate meeting link:', meetLinkResult.error)
      return NextResponse.json(
        { error: meetLinkResult.error || 'Failed to generate meeting link' },
        { status: 500 }
      )
    }

    const meetLink = meetLinkResult.url
    const now = new Date()
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000) // 24 hours

    // Update meeting with link and status
    const { error: updateError } = await (supabase as any)
      .from('meetings')
      .update({
        status: 'accepted',
        meeting_link: meetLink,
        accepted_at: now.toISOString(),
        expires_at: expiresAt.toISOString()
      })
      .eq('id', meetingId)

    if (updateError) {
      console.error('Update error:', updateError)
      return NextResponse.json(
        { error: `Failed to update meeting: ${updateError.message}` },
        { status: 500 }
      )
    }

    // Send confirmation emails to both parties
    try {
      await sendRoastConfirmationEmails({
        applicantName: applicant.name || 'Applicant',
        applicantEmail: applicant.email || '',
        roasterName: reviewer.name || 'Roaster',
        roasterEmail: reviewer.email || '',
        meetingLink: meetLink,
        roastType: roastTypeLabels[meeting.roast_type] || meeting.roast_type
      })
    } catch (emailError: any) {
      console.error('Email sending failed:', emailError)
      // Don't fail the entire request if email fails
      // The meeting is already accepted, so return success
    }

    return NextResponse.json({
      success: true,
      meetingLink: meetLink
    })
  } catch (error: any) {
    console.error('Error in accept-roast API:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
