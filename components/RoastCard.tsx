'use client'

import { useState } from 'react'
import { ROAST_TYPES, COLORS } from '@/lib/constants'
import { Database } from '@/lib/database.types'

type Profile = Database['public']['Tables']['profiles']['Row']

interface RoastCardProps {
  reviewer: Profile
  onRequestRoast: (reviewerId: string, roastType: string) => Promise<void>
  currentUserId: string
}

export default function RoastCard({ reviewer, onRequestRoast, currentUserId }: RoastCardProps) {
  const [showModal, setShowModal] = useState(false)
  const [selectedType, setSelectedType] = useState<string>('application')
  const [loading, setLoading] = useState(false)

  const handleRequest = async () => {
    setLoading(true)
    try {
      await onRequestRoast(reviewer.id, selectedType)
      setShowModal(false)
    } catch (error) {
      console.error('Error requesting roast:', error)
    } finally {
      setLoading(false)
    }
  }

  if (reviewer.id === currentUserId) return null

  return (
    <>
      <div className="bg-white p-6 rounded-xl border border-gray-200 hover:border-orange-300 transition-all hover:shadow-lg">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <h3 className="font-semibold text-lg text-gray-900">{reviewer.name}</h3>
            {reviewer.company && (
              <p className="text-sm text-gray-600">{reviewer.company}</p>
            )}
            {reviewer.yc_batch && (
              <span className="inline-block px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-full mt-1">
                YC {reviewer.yc_batch}
              </span>
            )}
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">{reviewer.roast_count} roasts</p>
          </div>
        </div>

        {reviewer.quick_context && (
          <p className="text-sm text-gray-600 mb-3 italic">"{reviewer.quick_context}"</p>
        )}

        <div className="flex flex-wrap gap-2 mb-4">
          {reviewer.roast_preferences.map(pref => (
            <span
              key={pref}
              className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
            >
              {ROAST_TYPES[pref as keyof typeof ROAST_TYPES]?.label}
            </span>
          ))}
        </div>

        <div className="flex gap-2">
          {reviewer.industry && (
            <span className="text-xs px-2 py-1 bg-gray-50 text-gray-600 rounded">
              {reviewer.industry}
            </span>
          )}
        </div>

        <button
          onClick={() => setShowModal(true)}
          disabled={!reviewer.is_available}
          className="w-full mt-4 py-2 px-4 text-white font-medium rounded-lg yc-gradient hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
        >
          {reviewer.is_available ? 'Request Roast' : 'Currently Unavailable'}
        </button>
      </div>

      {/* Request Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">Request a Roast from {reviewer.name}</h3>

            <p className="text-sm text-gray-600 mb-4">
              Select what you want to get roasted:
            </p>

            <div className="space-y-2 mb-6">
              {reviewer.roast_preferences.map(pref => (
                <button
                  key={pref}
                  onClick={() => setSelectedType(pref)}
                  className={`w-full p-3 rounded-lg border-2 transition-all text-left ${
                    selectedType === pref
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div>
                    <div className="font-medium">
                      {ROAST_TYPES[pref as keyof typeof ROAST_TYPES]?.label}
                    </div>
                    <div className="text-xs text-gray-500">
                      {ROAST_TYPES[pref as keyof typeof ROAST_TYPES]?.description}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-2 px-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRequest}
                disabled={loading}
                className="flex-1 py-2 px-4 text-white font-medium rounded-lg yc-gradient hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {loading ? 'Requesting...' : 'Send Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}