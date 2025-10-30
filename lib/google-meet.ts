/**
 * Google Meet integration for creating video meeting links via Google Calendar API
 * Requires Google Workspace account and Calendar API enabled
 */

import { google } from 'googleapis'

interface MeetingDetails {
  applicantName: string
  applicantEmail: string
  roasterName: string
  roasterEmail: string
  roastType?: string
  durationMinutes?: number
}

/**
 * Create a Google Meet link by creating a Calendar event
 * Each roast session gets its own unique meeting
 */
export async function createGoogleMeetLink(details: MeetingDetails): Promise<{
  success: boolean
  meetLink?: string
  eventId?: string
  error?: string
}> {
  try {
    // Get service account credentials from environment
    const credentials = process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS

    if (!credentials) {
      console.error('❌ GOOGLE_SERVICE_ACCOUNT_CREDENTIALS not configured in .env.local')
      return {
        success: false,
        error: 'Google service account credentials not configured. Please add GOOGLE_SERVICE_ACCOUNT_CREDENTIALS to .env.local'
      }
    }

    // Parse the credentials JSON
    let parsedCredentials
    try {
      parsedCredentials = JSON.parse(credentials)
    } catch (e) {
      console.error('Failed to parse Google credentials:', e)
      return {
        success: false,
        error: 'Invalid Google credentials format'
      }
    }

    // Get the calendar ID (can be 'primary' or a specific calendar ID)
    const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary'

    // Get the user email to impersonate for domain-wide delegation
    const userEmail = process.env.GOOGLE_WORKSPACE_USER_EMAIL || calendarId

    // Create OAuth2 client with service account using domain-wide delegation
    const auth = new google.auth.GoogleAuth({
      credentials: parsedCredentials,
      scopes: [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.events'
      ],
      // IMPORTANT: This tells the service account to impersonate a user in your domain
      clientOptions: {
        subject: userEmail
      }
    })

    const calendar = google.calendar({ version: 'v3', auth })

    // Set meeting time (starts now, duration from parameter)
    const startTime = new Date()
    const durationMins = details.durationMinutes || 10
    const endTime = new Date(startTime.getTime() + durationMins * 60 * 1000)

    console.log(`Creating Google Meet for ${durationMins} minutes:`, {
      start: startTime.toISOString(),
      end: endTime.toISOString(),
      applicant: details.applicantEmail,
      roaster: details.roasterEmail
    })

    // Create calendar event with Google Meet
    // Note: We don't add attendees to avoid needing Domain-Wide Delegation
    // The Meet link will be shared through our application instead
    const event = {
      summary: `MYC Roast: ${details.applicantName} x ${details.roasterName}`,
      description: `Roast session${details.roastType ? ` for ${details.roastType}` : ''}\n\nApplicant: ${details.applicantName}\nRoaster: ${details.roasterName}`,
      start: {
        dateTime: startTime.toISOString(),
        timeZone: 'UTC'
      },
      end: {
        dateTime: endTime.toISOString(),
        timeZone: 'UTC'
      },
      conferenceData: {
        createRequest: {
          requestId: Math.random().toString(36).substring(2, 15),
          conferenceSolutionKey: {
            type: 'hangoutsMeet'
          }
        }
      }
    }

    // Insert the event with conference data
    const response = await calendar.events.insert({
      calendarId,
      conferenceDataVersion: 1,
      requestBody: event,
      sendUpdates: 'none' // Don't send email invites automatically
    })

    const meetLink = response.data.hangoutLink

    if (!meetLink) {
      console.error('No Google Meet link in response:', response.data)
      return {
        success: false,
        error: 'Failed to generate Google Meet link from Calendar API'
      }
    }

    console.log('✅ Google Meet link created successfully:', meetLink)

    return {
      success: true,
      meetLink,
      eventId: response.data.id || undefined
    }
  } catch (error: any) {
    console.error('Error creating Google Meet link:', error)
    console.error('Error details:', JSON.stringify(error, null, 2))
    if (error.response?.data) {
      console.error('API response data:', JSON.stringify(error.response.data, null, 2))
    }

    // Provide more specific error messages
    if (error.code === 403) {
      return {
        success: false,
        error: 'Calendar API access denied. Check service account permissions.'
      }
    }

    if (error.code === 404) {
      return {
        success: false,
        error: 'Calendar not found. Check GOOGLE_CALENDAR_ID.'
      }
    }

    if (error.code === 400) {
      return {
        success: false,
        error: `Bad request: ${error.message}. Check error logs for details.`
      }
    }

    return {
      success: false,
      error: error.message || 'Failed to create Google Meet link'
    }
  }
}

/**
 * Delete a Google Calendar event (optional cleanup)
 */
export async function deleteGoogleMeetEvent(eventId: string): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const credentials = process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS

    if (!credentials) {
      return {
        success: false,
        error: 'Google service account credentials not configured'
      }
    }

    const parsedCredentials = JSON.parse(credentials)
    const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary'

    const auth = new google.auth.GoogleAuth({
      credentials: parsedCredentials,
      scopes: ['https://www.googleapis.com/auth/calendar']
    })

    const calendar = google.calendar({ version: 'v3', auth })

    await calendar.events.delete({
      calendarId,
      eventId
    })

    return { success: true }
  } catch (error: any) {
    console.error('Error deleting Google Meet event:', error)
    return {
      success: false,
      error: error.message
    }
  }
}
