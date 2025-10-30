import { createClient } from './supabase'
import { Database } from './database.types'
import { generateMeetingLink } from './meetings'

type LiveSession = Database['public']['Tables']['live_sessions']['Row']
type QueueEntry = Database['public']['Tables']['queue_entries']['Row']

const TURN_TIMEOUT_MINUTES = 2
const MAX_QUEUE_SIZE = 10

/**
 * Start a live session for a roaster
 */
export async function goLive(reviewerId: string, durationMinutes: number) {
  const supabase = createClient()

  try {
    // Check if reviewer already has an active session
    const { data: existingSession } = await supabase
      .from('live_sessions')
      .select('*')
      .eq('reviewer_id', reviewerId)
      .eq('status', 'active')
      .single()

    if (existingSession) {
      return {
        success: false,
        error: 'You already have an active live session'
      }
    }

    // Create new live session
    const now = new Date()
    const endsAt = new Date(now.getTime() + durationMinutes * 60 * 1000)

    const { data: session, error } = await supabase
      .from('live_sessions')
      .insert({
        reviewer_id: reviewerId,
        ends_at: endsAt.toISOString(),
        max_queue_size: MAX_QUEUE_SIZE,
        current_queue_size: 0,
        status: 'active'
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    return {
      success: true,
      session
    }
  } catch (error: any) {
    console.error('Error starting live session:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * End a live session
 */
export async function endLiveSession(sessionId: string, reviewerId: string) {
  const supabase = createClient()

  try {
    const { error } = await supabase
      .from('live_sessions')
      .update({
        status: 'ended'
      })
      .eq('id', sessionId)
      .eq('reviewer_id', reviewerId)

    if (error) {
      throw error
    }

    // Mark all waiting queue entries as skipped
    await supabase
      .from('queue_entries')
      .update({
        status: 'skipped'
      })
      .eq('live_session_id', sessionId)
      .in('status', ['waiting', 'your_turn'])

    return { success: true }
  } catch (error: any) {
    console.error('Error ending live session:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Join a queue for a live session
 */
export async function joinQueue(sessionId: string, applicantId: string) {
  const supabase = createClient()

  try {
    // Get session details
    const { data: session, error: sessionError } = await supabase
      .from('live_sessions')
      .select('*')
      .eq('id', sessionId)
      .single()

    if (sessionError) {
      throw sessionError
    }

    if (!session) {
      return {
        success: false,
        error: 'Live session not found'
      }
    }

    if (session.status !== 'active') {
      return {
        success: false,
        error: 'This live session is no longer active'
      }
    }

    if (session.current_queue_size >= session.max_queue_size) {
      return {
        success: false,
        error: 'Queue is full'
      }
    }

    // Check if applicant already in queue
    const { data: existingEntry } = await supabase
      .from('queue_entries')
      .select('*')
      .eq('live_session_id', sessionId)
      .eq('applicant_id', applicantId)
      .in('status', ['waiting', 'your_turn', 'joined'])
      .single()

    if (existingEntry) {
      return {
        success: false,
        error: 'You are already in this queue'
      }
    }

    // Get current queue size to determine position
    const { count } = await supabase
      .from('queue_entries')
      .select('*', { count: 'exact', head: true })
      .eq('live_session_id', sessionId)
      .in('status', ['waiting', 'your_turn', 'joined'])

    const position = (count || 0) + 1

    // Add to queue
    const { data: entry, error: entryError } = await supabase
      .from('queue_entries')
      .insert({
        live_session_id: sessionId,
        applicant_id: applicantId,
        position,
        status: 'waiting'
      })
      .select()
      .single()

    if (entryError) {
      throw entryError
    }

    // Update session queue size
    await supabase
      .from('live_sessions')
      .update({
        current_queue_size: session.current_queue_size + 1
      })
      .eq('id', sessionId)

    return {
      success: true,
      entry,
      position
    }
  } catch (error: any) {
    console.error('Error joining queue:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Get next person in queue and notify them
 */
export async function processNextInQueue(sessionId: string, reviewerId: string) {
  const supabase = createClient()

  try {
    // Verify session belongs to reviewer
    const { data: session } = await supabase
      .from('live_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('reviewer_id', reviewerId)
      .single()

    if (!session) {
      return {
        success: false,
        error: 'Session not found or unauthorized'
      }
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

    if (queryError || !nextEntry) {
      return {
        success: false,
        error: 'No one in queue'
      }
    }

    // Create meeting for this person
    const meetingLink = generateMeetingLink()
    const now = new Date()
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000) // 24 hours

    const { data: meeting, error: meetingError } = await supabase
      .from('meetings')
      .insert({
        applicant_id: nextEntry.applicant_id,
        reviewer_id: reviewerId,
        roast_type: 'pitch', // Default, can be customized
        status: 'accepted',
        meeting_link: meetingLink,
        accepted_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
        scheduled_for: now.toISOString()
      })
      .select()
      .single()

    if (meetingError) {
      throw meetingError
    }

    // Update queue entry
    await supabase
      .from('queue_entries')
      .update({
        status: 'your_turn',
        notified_at: now.toISOString(),
        meeting_id: meeting.id
      })
      .eq('id', nextEntry.id)

    return {
      success: true,
      entry: nextEntry,
      meeting,
      meetingLink
    }
  } catch (error: any) {
    console.error('Error processing next in queue:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Applicant confirms they're joining
 */
export async function confirmJoining(entryId: string, applicantId: string) {
  const supabase = createClient()

  try {
    const { error } = await supabase
      .from('queue_entries')
      .update({
        status: 'joined',
        joined_at: new Date().toISOString()
      })
      .eq('id', entryId)
      .eq('applicant_id', applicantId)
      .eq('status', 'your_turn')

    if (error) {
      throw error
    }

    return { success: true }
  } catch (error: any) {
    console.error('Error confirming join:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Mark queue entry as completed
 */
export async function completeQueueEntry(entryId: string) {
  const supabase = createClient()

  try {
    const { data: entry, error: fetchError } = await supabase
      .from('queue_entries')
      .select('*, live_session_id')
      .eq('id', entryId)
      .single()

    if (fetchError) {
      throw fetchError
    }

    // Update entry status
    const { error } = await supabase
      .from('queue_entries')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', entryId)

    if (error) {
      throw error
    }

    // Decrement queue size
    const { data: session } = await supabase
      .from('live_sessions')
      .select('current_queue_size')
      .eq('id', entry.live_session_id)
      .single()

    if (session) {
      await supabase
        .from('live_sessions')
        .update({
          current_queue_size: Math.max(0, session.current_queue_size - 1)
        })
        .eq('id', entry.live_session_id)
    }

    return { success: true }
  } catch (error: any) {
    console.error('Error completing queue entry:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Skip user who didn't join in time
 */
export async function skipQueueEntry(entryId: string, reviewerId: string) {
  const supabase = createClient()

  try {
    // Verify this entry belongs to a session owned by the reviewer
    const { data: entry } = await supabase
      .from('queue_entries')
      .select(`
        *,
        live_session:live_session_id(reviewer_id)
      `)
      .eq('id', entryId)
      .single()

    if (!entry || (entry.live_session as any)?.reviewer_id !== reviewerId) {
      return {
        success: false,
        error: 'Unauthorized'
      }
    }

    // Update entry status
    const { error } = await supabase
      .from('queue_entries')
      .update({
        status: 'skipped'
      })
      .eq('id', entryId)

    if (error) {
      throw error
    }

    // Decrement queue size
    const { data: session } = await supabase
      .from('live_sessions')
      .select('current_queue_size')
      .eq('id', entry.live_session_id)
      .single()

    if (session) {
      await supabase
        .from('live_sessions')
        .update({
          current_queue_size: Math.max(0, session.current_queue_size - 1)
        })
        .eq('id', entry.live_session_id)
    }

    return { success: true }
  } catch (error: any) {
    console.error('Error skipping queue entry:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Auto-skip entries that have been notified but haven't joined within timeout
 */
export async function autoSkipExpiredEntries() {
  const supabase = createClient()

  try {
    const timeoutThreshold = new Date(Date.now() - TURN_TIMEOUT_MINUTES * 60 * 1000)

    const { data: expiredEntries } = await supabase
      .from('queue_entries')
      .select('*')
      .eq('status', 'your_turn')
      .lt('notified_at', timeoutThreshold.toISOString())

    if (expiredEntries && expiredEntries.length > 0) {
      for (const entry of expiredEntries) {
        await skipQueueEntry(entry.id, entry.live_session_id)
      }
    }

    return { success: true, skipped: expiredEntries?.length || 0 }
  } catch (error: any) {
    console.error('Error auto-skipping expired entries:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Get all active live roasters with their queue info
 */
export async function getActiveLiveRoasters() {
  const supabase = createClient()

  try {
    const { data: sessions, error } = await supabase
      .from('live_sessions')
      .select(`
        *,
        reviewer:reviewer_id(*)
      `)
      .eq('status', 'active')
      .gt('ends_at', new Date().toISOString())
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    return {
      success: true,
      sessions: sessions || []
    }
  } catch (error: any) {
    console.error('Error getting active live roasters:', error)
    return {
      success: false,
      error: error.message,
      sessions: []
    }
  }
}

/**
 * Get queue position for an applicant
 */
export async function getQueuePosition(sessionId: string, applicantId: string) {
  const supabase = createClient()

  try {
    const { data: entry } = await supabase
      .from('queue_entries')
      .select('*')
      .eq('live_session_id', sessionId)
      .eq('applicant_id', applicantId)
      .in('status', ['waiting', 'your_turn', 'joined'])
      .single()

    if (!entry) {
      return {
        success: false,
        error: 'Not in queue'
      }
    }

    // Count how many people are ahead
    const { count } = await supabase
      .from('queue_entries')
      .select('*', { count: 'exact', head: true })
      .eq('live_session_id', sessionId)
      .in('status', ['waiting', 'your_turn', 'joined'])
      .lt('position', entry.position)

    return {
      success: true,
      entry,
      position: (count || 0) + 1
    }
  } catch (error: any) {
    console.error('Error getting queue position:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Get queue for a specific live session
 */
export async function getSessionQueue(sessionId: string) {
  const supabase = createClient()

  try {
    const { data: entries, error } = await supabase
      .from('queue_entries')
      .select(`
        *,
        applicant:applicant_id(*)
      `)
      .eq('live_session_id', sessionId)
      .in('status', ['waiting', 'your_turn', 'joined'])
      .order('position', { ascending: true })

    if (error) {
      throw error
    }

    return {
      success: true,
      entries: entries || []
    }
  } catch (error: any) {
    console.error('Error getting session queue:', error)
    return {
      success: false,
      error: error.message,
      entries: []
    }
  }
}

/**
 * Get reviewer's current live session
 */
export async function getCurrentLiveSession(reviewerId: string) {
  const supabase = createClient()

  try {
    const { data: session, error } = await supabase
      .from('live_sessions')
      .select('*')
      .eq('reviewer_id', reviewerId)
      .eq('status', 'active')
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
      throw error
    }

    return {
      success: true,
      session: session || null
    }
  } catch (error: any) {
    console.error('Error getting current live session:', error)
    return {
      success: false,
      error: error.message,
      session: null
    }
  }
}
