'use client'

import { useState, useEffect } from 'react'
import { Database } from '@/lib/database.types'
import { goLive, endLiveSession, getCurrentLiveSession, getSessionQueue, skipQueueEntry, completeQueueEntry } from '@/lib/live-queue'

type LiveSession = Database['public']['Tables']['live_sessions']['Row']
type QueueEntry = Database['public']['Tables']['queue_entries']['Row'] & {
  applicant?: Database['public']['Tables']['profiles']['Row']
}

interface LiveSessionControlProps {
  reviewerId: string
  onSessionChange?: () => void
}

export default function LiveSessionControl({ reviewerId, onSessionChange }: LiveSessionControlProps) {
  const [session, setSession] = useState<LiveSession | null>(null)
  const [queue, setQueue] = useState<QueueEntry[]>([])
  const [showGoLiveModal, setShowGoLiveModal] = useState(false)
  const [duration, setDuration] = useState(60) // default 60 minutes
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [processingNext, setProcessingNext] = useState(false)

  useEffect(() => {
    loadSession()
  }, [reviewerId])

  useEffect(() => {
    if (session) {
      loadQueue()
      // Poll queue every 5 seconds
      const interval = setInterval(loadQueue, 5000)
      return () => clearInterval(interval)
    }
  }, [session])

  const loadSession = async () => {
    const result = await getCurrentLiveSession(reviewerId)
    if (result.success && result.session) {
      setSession(result.session)
    }
  }

  const loadQueue = async () => {
    if (!session) return
    const result = await getSessionQueue(session.id)
    if (result.success) {
      setQueue(result.entries)
    }
  }

  const handleGoLive = async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await goLive(reviewerId, duration)
      if (result.success) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sessionData = (result as any).session as LiveSession
        setSession(sessionData)
        setShowGoLiveModal(false)
        onSessionChange?.()
      } else {
        setError(result.error || 'Failed to go live')
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleEndSession = async () => {
    if (!session) return
    setLoading(true)
    try {
      const result = await endLiveSession(session.id, reviewerId)
      if (result.success) {
        setSession(null)
        setQueue([])
        onSessionChange?.()
      } else {
        setError(result.error || 'Failed to end session')
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleProcessNext = async () => {
    if (!session) return
    setProcessingNext(true)
    setError(null)
    try {
      // Use API route to send email notification
      const response = await fetch('/api/live-queue/process-next', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: session.id,
          reviewerId: reviewerId
        }),
      })

      const result = await response.json()

      if (response.ok && result.success) {
        await loadQueue()
        // Open the meeting link
        if (result.meetingLink) {
          window.open(result.meetingLink, '_blank')
        }
      } else {
        setError(result.error || 'Failed to process next person')
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setProcessingNext(false)
    }
  }

  const handleSkip = async (entryId: string) => {
    setError(null)
    try {
      const result = await skipQueueEntry(entryId, reviewerId)
      if (result.success) {
        await loadQueue()
      } else {
        setError(result.error || 'Failed to skip entry')
      }
    } catch (err) {
      setError('An unexpected error occurred')
    }
  }

  const handleComplete = async (entryId: string) => {
    setError(null)
    try {
      const result = await completeQueueEntry(entryId)
      if (result.success) {
        await loadQueue()
      } else {
        setError(result.error || 'Failed to complete entry')
      }
    } catch (err) {
      setError('An unexpected error occurred')
    }
  }

  if (!session) {
    return (
      <>
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <h3 className="text-lg font-semibold mb-2">Live Queue</h3>
          <p className="text-sm text-gray-600 mb-4">
            Go live to accept roast requests in real-time. Applicants will join a queue and you'll roast them one by one.
          </p>
          <button
            onClick={() => setShowGoLiveModal(true)}
            className="w-full py-2 px-4 rounded-md yc-button"
          >
            🔴 Go Live
          </button>
        </div>

        {/* Go Live Modal */}
        {showGoLiveModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full">
              <h3 className="text-xl font-bold mb-4">Go Live</h3>

              <p className="text-sm text-gray-600 mb-4">
                You'll be visible to applicants and can accept up to 10 people in your queue. Each roast is ~10 minutes.
              </p>

              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">
                  How long will you be available?
                </label>
                <select
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="w-full p-3 border border-gray-300 rounded-lg"
                >
                  <option value={30}>30 minutes</option>
                  <option value={60}>1 hour</option>
                  <option value={90}>1.5 hours</option>
                  <option value={120}>2 hours</option>
                  <option value={180}>3 hours</option>
                </select>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg">
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setShowGoLiveModal(false)}
                  className="flex-1 py-2 px-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleGoLive}
                  disabled={loading}
                  className="flex-1 py-2 px-4 rounded-md yc-button disabled:opacity-50"
                >
                  {loading ? 'Going Live...' : 'Start Live Session'}
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    )
  }

  const timeRemaining = new Date(session.ends_at).getTime() - Date.now()
  const minutesRemaining = Math.max(0, Math.floor(timeRemaining / 60000))
  const nextEntry = queue.find(e => e.status === 'waiting')
  const currentEntry = queue.find(e => e.status === 'your_turn' || e.status === 'joined')

  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200">
      <div className="flex justify-between items-start mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-block w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
            <h3 className="text-lg font-semibold">Live Now</h3>
          </div>
          <p className="text-sm text-gray-600">
            {minutesRemaining} minutes remaining • {queue.filter(e => e.status === 'waiting').length} in queue
          </p>
        </div>
        <button
          onClick={handleEndSession}
          disabled={loading}
          className="py-2 px-4 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
        >
          End Session
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg">
          {error}
        </div>
      )}

      {/* Current Session */}
      {currentEntry && (
        <div className="mb-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-orange-900">Current Session</p>
              <p className="text-lg font-semibold">{(currentEntry.applicant as any)?.name || 'Unknown'}</p>
              {currentEntry.status === 'your_turn' && (currentEntry as any).meeting?.meeting_link && (
                <div className="mt-2">
                  <a
                    href={(currentEntry as any).meeting.meeting_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Join Meeting →
                  </a>
                </div>
              )}
              {currentEntry.status === 'your_turn' && !(currentEntry as any).meeting?.meeting_link && (
                <p className="text-xs text-orange-600 mt-1">
                  Preparing meeting link...
                </p>
              )}
              {currentEntry.status === 'joined' && (
                <p className="text-xs text-green-600 mt-1">
                  In session
                </p>
              )}
            </div>
            <div className="flex gap-2">
              {currentEntry.status === 'your_turn' && (
                <button
                  onClick={() => handleSkip(currentEntry.id)}
                  className="py-1 px-3 text-xs border border-gray-300 rounded hover:bg-gray-50"
                >
                  Skip
                </button>
              )}
              <button
                onClick={() => handleComplete(currentEntry.id)}
                className="py-1 px-3 text-xs bg-green-600 text-white rounded hover:bg-green-700"
              >
                Complete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Next in Queue */}
      {!currentEntry && nextEntry && (
        <div className="mb-4">
          <button
            onClick={handleProcessNext}
            disabled={processingNext}
            className="w-full py-3 px-4 rounded-md yc-button disabled:opacity-50 font-medium"
          >
            {processingNext ? 'Starting...' : `Start Next: ${(nextEntry.applicant as any)?.name || 'Unknown'}`}
          </button>
        </div>
      )}

      {/* Queue List */}
      {queue.filter(e => e.status === 'waiting').length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Queue ({queue.filter(e => e.status === 'waiting').length})</h4>
          <div className="space-y-2">
            {queue
              .filter(e => e.status === 'waiting')
              .map((entry, index) => (
                <div key={entry.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                    <div>
                      <p className="text-sm font-medium">{(entry.applicant as any)?.name || 'Unknown'}</p>
                      <p className="text-xs text-gray-500">
                        {(entry.applicant as any)?.company || 'No company'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {queue.filter(e => e.status === 'waiting').length === 0 && !currentEntry && (
        <div className="text-center py-8 text-gray-500">
          <p className="text-sm">No one in queue</p>
          <p className="text-xs mt-1">Waiting for applicants to join...</p>
        </div>
      )}
    </div>
  )
}
