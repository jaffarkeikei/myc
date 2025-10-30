'use client'

import { useState, useEffect } from 'react'
import { Database } from '@/lib/database.types'
import { getActiveLiveRoasters, joinQueue, getQueuePosition, confirmJoining } from '@/lib/live-queue'
import { createClient } from '@/lib/supabase'

type LiveSession = Database['public']['Tables']['live_sessions']['Row'] & {
  reviewer?: Database['public']['Tables']['profiles']['Row']
}

type QueueEntry = Database['public']['Tables']['queue_entries']['Row']

interface LiveRoastersListProps {
  applicantId: string
}

export default function LiveRoastersList({ applicantId }: LiveRoastersListProps) {
  const [sessions, setSessions] = useState<LiveSession[]>([])
  const [myQueue, setMyQueue] = useState<Map<string, { entry: QueueEntry, position: number }>>(new Map())
  const [error, setError] = useState<string | null>(null)
  const [joiningSession, setJoiningSession] = useState<string | null>(null)

  useEffect(() => {
    loadLiveSessions()
    const interval = setInterval(loadLiveSessions, 5000) // Poll every 5 seconds
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    // Subscribe to ALL queue entry changes (not just for this applicant)
    // This ensures we update positions when anyone joins/leaves any queue
    const supabase = createClient()
    const channel = supabase
      .channel('queue-updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'queue_entries'
      }, (payload) => {
        console.log('Queue entry changed:', payload)
        // Reload queue positions for all sessions whenever ANY change happens
        loadMyQueuePositions()
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'live_sessions'
      }, (payload) => {
        console.log('Live session changed:', payload)
        // Reload all sessions and queue positions when session status changes
        loadLiveSessions()
      })
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [applicantId, sessions])

  const loadLiveSessions = async () => {
    const result = await getActiveLiveRoasters()
    if (result.success) {
      setSessions(result.sessions)
      await loadMyQueuePositions(result.sessions)
    }
  }

  const loadMyQueuePositions = async (sessionsToCheck?: LiveSession[]) => {
    const positions = new Map<string, { entry: QueueEntry, position: number }>()
    const sessionsArray = sessionsToCheck || sessions
    for (const session of sessionsArray) {
      const result: any = await getQueuePosition(session.id, applicantId)
      if (result.success && result.entry) {
        positions.set(session.id, {
          entry: result.entry,
          position: result.position
        })
      }
    }
    setMyQueue(positions)
  }

  const handleJoinQueue = async (sessionId: string) => {
    setJoiningSession(sessionId)
    setError(null)
    try {
      const result = await joinQueue(sessionId, applicantId)
      if (result.success) {
        await loadLiveSessions()
      } else {
        setError(result.error || 'Failed to join queue')
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setJoiningSession(null)
    }
  }

  const handleConfirmJoin = async (entryId: string, meetingLink: string) => {
    try {
      const result = await confirmJoining(entryId, applicantId)
      if (result.success) {
        // Open meeting link
        window.open(meetingLink, '_blank')
        await loadMyQueuePositions()
      }
    } catch (err) {
      console.error('Error confirming join:', err)
    }
  }

  if (sessions.length === 0) {
    return (
      <div className="bg-white p-8 rounded-xl border border-gray-200 text-center">
        <p className="text-gray-500">No roasters are live right now</p>
        <p className="text-sm text-gray-400 mt-1">Check back soon!</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="inline-block w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
        <h2 className="text-xl font-semibold">Live Now</h2>
      </div>

      {error && (
        <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sessions.map((session) => {
          const reviewer = session.reviewer
          const queueInfo = myQueue.get(session.id)
          const timeRemaining = new Date(session.ends_at).getTime() - Date.now()
          const minutesRemaining = Math.max(0, Math.floor(timeRemaining / 60000))
          const isInQueue = !!queueInfo
          const isYourTurn = queueInfo?.entry.status === 'your_turn'
          const hasJoined = queueInfo?.entry.status === 'joined'

          return (
            <div key={session.id} className="bg-white p-6 rounded-xl border border-gray-200 hover:border-orange-300 transition-all hover:shadow-lg flex flex-col">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-semibold text-lg">{reviewer?.name || 'Unknown'}</h3>
                  {reviewer?.company && (
                    <p className="text-sm text-gray-600">{reviewer.company}</p>
                  )}
                  {reviewer?.yc_batch && (
                    <span className="inline-block px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-full mt-1">
                      YC {reviewer.yc_batch}
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">{reviewer?.roast_count || 0} roasts</p>
                </div>
              </div>

              {reviewer?.quick_context && (
                <p className="text-sm text-gray-600 mb-3 italic">"{reviewer.quick_context}"</p>
              )}

              <div className="flex gap-2 mb-3 text-xs text-gray-600">
                <span>⏱️ {minutesRemaining}min left</span>
                <span>•</span>
                <span>👥 {session.current_queue_size}/{session.max_queue_size} in queue</span>
              </div>

              {reviewer?.industry && (
                <span className="text-xs px-2 py-1 bg-gray-50 text-gray-600 rounded w-fit mb-3">
                  {reviewer.industry}
                </span>
              )}

              {/* Action Buttons */}
              <div className="mt-auto">
                {isYourTurn && queueInfo?.entry.meeting_id && (
                  <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm font-medium text-green-900 mb-2">It's your turn!</p>
                    <p className="text-xs text-green-700 mb-3">You have 2 minutes to join</p>
                    <button
                      onClick={async () => {
                        // Get meeting link from meeting_id
                        const supabase = createClient()
                        const { data: meeting } = await supabase
                          .from('meetings')
                          .select('meeting_link')
                          .eq('id', queueInfo.entry.meeting_id!)
                          .single()

                        const meetingData = meeting as { meeting_link: string | null } | null
                        if (meetingData?.meeting_link) {
                          await handleConfirmJoin(queueInfo.entry.id, meetingData.meeting_link)
                        }
                      }}
                      className="w-full py-2 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                    >
                      Join Now!
                    </button>
                  </div>
                )}

                {hasJoined && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-center">
                    <p className="text-sm font-medium text-blue-900">You're in session</p>
                  </div>
                )}

                {isInQueue && !isYourTurn && !hasJoined && (
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-center">
                    <p className="text-sm font-medium text-gray-900">You're in queue</p>
                    <p className="text-lg font-bold text-orange-600 mt-1">
                      Position #{queueInfo.position}
                    </p>
                  </div>
                )}

                {!isInQueue && (
                  <button
                    onClick={() => handleJoinQueue(session.id)}
                    disabled={session.current_queue_size >= session.max_queue_size || joiningSession === session.id}
                    className="w-full py-2 px-4 rounded-md yc-button disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {joiningSession === session.id
                      ? 'Joining...'
                      : session.current_queue_size >= session.max_queue_size
                      ? 'Queue Full'
                      : 'Join Queue'}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
