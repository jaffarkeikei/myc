import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { sendRoastConfirmationEmails } from '@/lib/email'

/**
 * Generate a unique meeting link using Talky.io
 * Talky.io is completely free, instant, and requires no moderation or login
 * Both participants can join directly and start the meeting immediately
 */
function generateMeetingLink(): string {
  // Generate a unique room name
  const uniqueId = Math.random().toString(36).substring(2, 15) + Date.now().toString(36)
  const roomName = `myc-roast-${uniqueId}`

  // Talky.io format: https://talky.io/room-name
  return `https://talky.io/${roomName}`
}

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

    // Generate meeting link
    const meetLink = generateMeetingLink()
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

    // Get roast type label
    const roastTypeLabels: Record<string, string> = {
      application: 'Application',
      pitch: 'Pitch Deck',
      idea: 'Idea'
    }

    // Send confirmation emails to both parties
    const applicant = meeting.applicant as any
    const reviewer = meeting.reviewer as any

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
