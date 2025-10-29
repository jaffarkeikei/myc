'use client'

import { useState } from 'react'
import { ROAST_TYPES } from '@/lib/constants'
import { Database } from '@/lib/database.types'
import FeedbackModal from './FeedbackModal'

type Meeting = Database['public']['Tables']['meetings']['Row'] & {
  applicant?: Database['public']['Tables']['profiles']['Row']
  reviewer?: Database['public']['Tables']['profiles']['Row']
}

interface MeetingListProps {
  meetings: Meeting[]
  currentUserId: string
  userRole: 'applicant' | 'reviewer'
  onUpdateMeeting: (meetingId: string, updates: any) => Promise<void>
}

export default function MeetingList({ meetings, currentUserId, userRole, onUpdateMeeting }: MeetingListProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const [feedbackModal, setFeedbackModal] = useState<{ meetingId: string; otherUserName: string } | null>(null)

  const handleAccept = async (meetingId: string) => {
    setLoading(meetingId)
    try {
      // Generate a simple meeting link (using Jitsi Meet)
      const meetingLink = `https://meet.jit.si/myc-roast-${meetingId.slice(0, 8)}`
      await onUpdateMeeting(meetingId, {
        status: 'accepted',
        meeting_link: meetingLink,
        scheduled_for: new Date(Date.now() + 5 * 60000).toISOString() // 5 minutes from now
      })
    } catch (error) {
      console.error('Error accepting meeting:', error)
    } finally {
      setLoading(null)
    }
  }

  const handleComplete = async (meeting: Meeting) => {
    setLoading(meeting.id)
    try {
      await onUpdateMeeting(meeting.id, {
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      // Show feedback modal
      const otherUser = userRole === 'applicant' ? meeting.reviewer : meeting.applicant
      setFeedbackModal({
        meetingId: meeting.id,
        otherUserName: otherUser?.name || 'the other user'
      })
    } catch (error) {
      console.error('Error completing meeting:', error)
    } finally {
      setLoading(null)
    }
  }

  const handleFeedbackSubmit = async (meetingId: string, helpful: boolean, notes?: string) => {
    await onUpdateMeeting(meetingId, {
      feedback_helpful: helpful,
      notes: notes
    })
    setFeedbackModal(null)
  }

  const handleCancel = async (meetingId: string) => {
    setLoading(meetingId)
    try {
      await onUpdateMeeting(meetingId, { status: 'cancelled' })
    } catch (error) {
      console.error('Error cancelling meeting:', error)
    } finally {
      setLoading(null)
    }
  }

  if (meetings.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No {userRole === 'applicant' ? 'roast requests' : 'incoming requests'} yet
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {meetings.map((meeting) => {
        const otherUser = userRole === 'applicant' ? meeting.reviewer : meeting.applicant
        const isLoading = loading === meeting.id

        return (
          <div
            key={meeting.id}
            className={`bg-white p-4 rounded-lg border ${
              meeting.status === 'accepted' ? 'border-green-300 bg-green-50' : 'border-gray-200'
            }`}
          >
            <div className="flex justify-between items-start mb-3">
              <div>
                <h4 className="font-medium text-gray-900">
                  {userRole === 'applicant' ? 'Roaster' : 'Applicant'}: {otherUser?.name}
                </h4>
                {otherUser?.company && (
                  <p className="text-sm text-gray-600">{otherUser.company}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">
                  {ROAST_TYPES[meeting.roast_type as keyof typeof ROAST_TYPES]?.label}
                </span>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  meeting.status === 'requested' ? 'bg-yellow-100 text-yellow-700' :
                  meeting.status === 'accepted' ? 'bg-green-100 text-green-700' :
                  meeting.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {meeting.status}
                </span>
              </div>
            </div>

            {meeting.status === 'accepted' && meeting.meeting_link && (
              <div className="mb-3 p-3 bg-green-100 rounded-lg">
                <p className="text-sm font-medium text-green-800 mb-1">
                  Your roast is ready!
                </p>
                <a
                  href={meeting.meeting_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-green-700 underline hover:no-underline"
                >
                  Join the 10-minute session now →
                </a>
              </div>
            )}

            <div className="flex gap-2">
              {userRole === 'reviewer' && meeting.status === 'requested' && (
                <>
                  <button
                    onClick={() => handleAccept(meeting.id)}
                    disabled={isLoading}
                    className="px-4 py-2 bg-green-500 text-white text-sm rounded-lg hover:bg-green-600 disabled:opacity-50 transition-colors"
                  >
                    {isLoading ? 'Processing...' : 'Accept & Start'}
                  </button>
                  <button
                    onClick={() => handleCancel(meeting.id)}
                    disabled={isLoading}
                    className="px-4 py-2 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300 disabled:opacity-50 transition-colors"
                  >
                    Decline
                  </button>
                </>
              )}

              {meeting.status === 'accepted' && (
                <button
                  onClick={() => handleComplete(meeting)}
                  disabled={isLoading}
                  className="px-4 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors"
                >
                  {isLoading ? 'Processing...' : 'Mark as Complete'}
                </button>
              )}

              {userRole === 'applicant' && meeting.status === 'requested' && (
                <button
                  onClick={() => handleCancel(meeting.id)}
                  disabled={isLoading}
                  className="px-4 py-2 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300 disabled:opacity-50 transition-colors"
                >
                  {isLoading ? 'Processing...' : 'Cancel Request'}
                </button>
              )}
            </div>
          </div>
        )
      })}

      {/* Feedback Modal */}
      {feedbackModal && (
        <FeedbackModal
          meetingId={feedbackModal.meetingId}
          otherUserName={feedbackModal.otherUserName}
          onSubmit={handleFeedbackSubmit}
          onClose={() => setFeedbackModal(null)}
        />
      )}
    </div>
  )
}