'use client'

import { useState } from 'react'

interface FeedbackModalProps {
  meetingId: string
  otherUserName: string
  onSubmit: (meetingId: string, helpful: boolean, notes?: string) => void
  onClose: () => void
}

export default function FeedbackModal({
  meetingId,
  otherUserName,
  onSubmit,
  onClose
}: FeedbackModalProps) {
  const [helpful, setHelpful] = useState<boolean | null>(null)
  const [notes, setNotes] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = () => {
    if (helpful !== null) {
      onSubmit(meetingId, helpful, notes)
      setSubmitted(true)
      setTimeout(onClose, 2000)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full">
        {!submitted ? (
          <>
            <h3 className="text-xl font-bold mb-4">How was your roast?</h3>
            <p className="text-gray-600 mb-6">
              Your feedback helps {otherUserName} improve their roasting skills
            </p>

            {/* Feedback Buttons */}
            <div className="flex gap-4 justify-center mb-6">
              <button
                onClick={() => setHelpful(true)}
                className={`flex-1 py-4 px-6 rounded-xl border-2 transition-all ${
                  helpful === true
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-3xl mb-2">👍</div>
                <div className="font-medium">Helpful</div>
              </button>

              <button
                onClick={() => setHelpful(false)}
                className={`flex-1 py-4 px-6 rounded-xl border-2 transition-all ${
                  helpful === false
                    ? 'border-red-500 bg-red-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-3xl mb-2">👎</div>
                <div className="font-medium">Not Helpful</div>
              </button>
            </div>

            {/* Optional Notes */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Any specific feedback? (optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                rows={3}
                placeholder="What was most helpful? What could be improved?"
              />
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-2 px-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Skip
              </button>
              <button
                onClick={handleSubmit}
                disabled={helpful === null}
                className="flex-1 py-2 px-4 text-white font-medium rounded-lg yc-gradient hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
              >
                Submit Feedback
              </button>
            </div>
          </>
        ) : (
          <div className="text-center py-8">
            <h3 className="text-xl font-bold mb-2">Thanks for the feedback!</h3>
            <p className="text-gray-600">
              Your input helps make MYC better for everyone
            </p>
          </div>
        )}
      </div>
    </div>
  )
}