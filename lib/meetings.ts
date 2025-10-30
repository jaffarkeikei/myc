import { createClient } from './supabase'
import { sendRoastConfirmationEmails, sendNewRequestNotification } from './email'
import { Database } from './database.types'
import { addToRequestHistory, incrementRequestCount } from './matching'

type Meeting = Database['public']['Tables']['meetings']['Row']

/**
 * Generate a unique meeting link using Daily.co API
 * Creates a temporary room that both participants can join instantly
 * No moderation, no login required
 */
export async function generateMeetingLink(): Promise<string> {
  try {
    const apiKey = process.env.DAILY_API_KEY

    if (!apiKey) {
      throw new Error('DAILY_API_KEY not configured')
    }

    // Generate a unique room name
    const uniqueId = Math.random().toString(36).substring(2, 15) + Date.now().toString(36)
    const roomName = `myc-roast-${uniqueId}`

    // Create a Daily.co room via REST API
    const response = await fetch('https://api.daily.co/v1/rooms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        name: roomName,
        privacy: 'public', // Anyone with link can join
        properties: {
          enable_prejoin_ui: false, // Skip pre-join screen
          enable_network_ui: false, // Hide network stats
          enable_screenshare: true,
          enable_chat: true,
          start_video_off: false,
          start_audio_off: false,
          exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // Expires in 24 hours
        }
      })
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Daily.co API error: ${error}`)
    }

    const data = await response.json()
    return data.url // Returns the meeting URL
  } catch (error) {
    console.error('Error creating Daily.co room:', error)
    // Fallback to a simple meet.jit.si link if API fails
    const uniqueId = Math.random().toString(36).substring(2, 15) + Date.now().toString(36)
    return `https://meet.jit.si/MYC-Roast-${uniqueId}`
  }
}

/**
 * Accept a roast request and set up the meeting
 */
export async function acceptRoastRequest(meetingId: string, roasterId: string) {
  const supabase = createClient()

  try {
    console.log('acceptRoastRequest called with:', { meetingId, roasterId })

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

    console.log('Meeting query result:', { error: meetingResult.error, data: meetingResult.data })

    const meeting = meetingResult.data as any

    if (meetingResult.error) {
      console.error('Meeting query error:', meetingResult.error)
      throw new Error(`Database error: ${meetingResult.error.message}`)
    }

    if (!meeting) {
      throw new Error('Meeting not found or already processed')
    }

    // Generate meeting link
    const meetLink = await generateMeetingLink()
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
      throw updateError
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

    await sendRoastConfirmationEmails({
      applicantName: applicant.name || 'Applicant',
      applicantEmail: applicant.email || '',
      roasterName: reviewer.name || 'Roaster',
      roasterEmail: reviewer.email || '',
      meetingLink: meetLink,
      roastType: roastTypeLabels[meeting.roast_type] || meeting.roast_type
    })

    return {
      success: true,
      meetingLink: meetLink
    }
  } catch (error: any) {
    console.error('Error accepting roast request:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Create a new roast request
 */
export async function createRoastRequest(
  applicantId: string,
  reviewerId: string,
  roastType: string
) {
  const supabase = createClient()

  try {
    // Create the meeting request
    const { data: meeting, error: meetingError } = await (supabase as any)
      .from('meetings')
      .insert({
        applicant_id: applicantId,
        reviewer_id: reviewerId,
        roast_type: roastType,
        status: 'requested'
      })
      .select(`
        *,
        applicant:applicant_id(*),
        reviewer:reviewer_id(*)
      `)
      .single()

    if (meetingError) {
      throw meetingError
    }

    // Increment request count
    await incrementRequestCount(applicantId)

    // Add to request history
    await addToRequestHistory(applicantId, reviewerId)

    // Send notification to roaster
    const applicant = meeting.applicant as any
    const reviewer = meeting.reviewer as any

    const roastTypeLabels: Record<string, string> = {
      application: 'Application',
      pitch: 'Pitch Deck',
      idea: 'Idea'
    }

    await sendNewRequestNotification(
      reviewer.email || '',
      reviewer.name || 'Roaster',
      applicant.name || 'Applicant',
      applicant.company,
      roastTypeLabels[roastType] || roastType
    )

    return {
      success: true,
      meeting
    }
  } catch (error: any) {
    console.error('Error creating roast request:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Complete a meeting
 */
export async function completeMeeting(meetingId: string) {
  const supabase = createClient()

  try {
    // Get meeting details to find both parties
    const meetingResult = await supabase
      .from('meetings')
      .select('reviewer_id, applicant_id')
      .eq('id', meetingId)
      .single()

    const meeting = meetingResult.data as any

    if (meetingResult.error || !meeting) {
      throw new Error('Meeting not found')
    }

    // Update meeting status to completed
    const { error } = await (supabase as any)
      .from('meetings')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', meetingId)

    if (error) {
      throw error
    }

    // Increment roast count for both the reviewer and the applicant
    // Get current counts
    const reviewerResult = await supabase
      .from('profiles')
      .select('roast_count')
      .eq('id', meeting.reviewer_id)
      .single()

    const applicantResult = await supabase
      .from('profiles')
      .select('roast_count')
      .eq('id', meeting.applicant_id)
      .single()

    const reviewerData = reviewerResult.data as any
    const applicantData = applicantResult.data as any

    // Update reviewer roast count
    if (reviewerData) {
      await (supabase as any)
        .from('profiles')
        .update({ roast_count: (reviewerData.roast_count || 0) + 1 })
        .eq('id', meeting.reviewer_id)
    }

    // Update applicant roast count
    if (applicantData) {
      await (supabase as any)
        .from('profiles')
        .update({ roast_count: (applicantData.roast_count || 0) + 1 })
        .eq('id', meeting.applicant_id)
    }

    return { success: true }
  } catch (error: any) {
    console.error('Error completing meeting:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Cancel/decline a meeting
 */
export async function declineMeeting(meetingId: string) {
  const supabase = createClient()

  try {
    const { error } = await (supabase as any)
      .from('meetings')
      .update({
        status: 'cancelled'
      })
      .eq('id', meetingId)

    if (error) {
      throw error
    }

    return { success: true }
  } catch (error: any) {
    console.error('Error declining meeting:', error)
    return { success: false, error: error.message }
  }
}
