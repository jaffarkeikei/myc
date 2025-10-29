'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import RoastCard from '@/components/RoastCard'
import MeetingList from '@/components/MeetingList'
import ProfileDropdown from '@/components/ProfileDropdown'
import { Database } from '@/lib/database.types'
import { MESSAGES, COLORS } from '@/lib/constants'

type Profile = Database['public']['Tables']['profiles']['Row']
type Meeting = Database['public']['Tables']['meetings']['Row'] & {
  applicant?: Profile
  reviewer?: Profile
}

export default function DashboardPage() {
  const [currentUser, setCurrentUser] = useState<Profile | null>(null)
  const [reviewers, setReviewers] = useState<Profile[]>([])
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [activeTab, setActiveTab] = useState<'find' | 'meetings'>('find')
  const [loading, setLoading] = useState(true)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadData()

    // Set up real-time subscriptions
    const meetingsChannel = supabase
      .channel('meetings-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'meetings',
      }, () => {
        loadMeetings()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(meetingsChannel)
    }
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // Get user profile
      const profileResult = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      const profile = profileResult.data as Profile | null
      const profileError = profileResult.error

      if (!profile || profileError) {
        router.push('/onboarding')
        return
      }

      setCurrentUser(profile)

      // Load reviewers if user is an applicant
      if (profile.role === 'applicant') {
        await loadReviewers()
      }

      // Load meetings
      await loadMeetings()
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadReviewers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'reviewer')
      .eq('is_available', true)
      .order('roast_count', { ascending: false })

    setReviewers(data || [])
  }

  const loadMeetings = async () => {
    if (!currentUser) return

    const query = supabase
      .from('meetings')
      .select(`
        *,
        applicant:applicant_id(*),
        reviewer:reviewer_id(*)
      `)
      .order('requested_at', { ascending: false })

    if (currentUser.role === 'applicant') {
      query.eq('applicant_id', currentUser.id)
    } else {
      query.eq('reviewer_id', currentUser.id)
    }

    const { data } = await query
    setMeetings(data || [])
  }

  const handleRequestRoast = async (reviewerId: string, roastType: string) => {
    if (!currentUser) return

    const insertData: any = {
      applicant_id: currentUser.id,
      reviewer_id: reviewerId,
      roast_type: roastType,
    }

    const { error } = await (supabase as any)
      .from('meetings')
      .insert(insertData)

    if (!error) {
      setSuccessMessage(MESSAGES.dashboard.requestSent)
      setTimeout(() => setSuccessMessage(null), 3000)
      await loadMeetings()
      setActiveTab('meetings')
    }
  }

  const handleUpdateMeeting = async (meetingId: string, updates: any) => {
    const { error } = await (supabase as any)
      .from('meetings')
      .update(updates)
      .eq('id', meetingId)

    if (!error) {
      await loadMeetings()
      if (updates.status === 'accepted') {
        setSuccessMessage(MESSAGES.dashboard.requestAccepted)
        setTimeout(() => setSuccessMessage(null), 5000)
      }
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const toggleAvailability = async () => {
    if (!currentUser) return

    const newAvailability = !currentUser.is_available
    const { error } = await (supabase as any)
      .from('profiles')
      .update({ is_available: newAvailability })
      .eq('id', currentUser.id)

    if (!error) {
      setCurrentUser({ ...currentUser, is_available: newAvailability })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-2xl" style={{ color: COLORS.primary }}>Loading...</div>
      </div>
    )
  }

  if (!currentUser) return null

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              {/* Roasts Counter */}
              <div
                className="px-4 py-2 rounded-lg font-medium"
                style={{
                  background: 'linear-gradient(135deg, #FF6600 0%, #FF8833 100%)',
                  color: 'white'
                }}
              >
                {currentUser.roast_count} roasts
              </div>

              {currentUser.role === 'reviewer' && (
                <button
                  onClick={toggleAvailability}
                  className={`px-3 py-1 text-xs rounded-full transition-colors ${
                    currentUser.is_available
                      ? 'bg-green-100 text-green-700 hover:bg-green-200'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {currentUser.is_available ? 'Available' : 'Busy'}
                </button>
              )}
            </div>

            {/* Profile Dropdown */}
            <ProfileDropdown
              name={currentUser.name || 'User'}
              email={currentUser.email || ''}
              onSignOut={handleSignOut}
            />
          </div>
        </div>
      </header>

      {/* Success Message */}
      {successMessage && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50">
          <div className="bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg">
            {successMessage}
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {currentUser.role === 'applicant' && (
            <button
              onClick={() => setActiveTab('find')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'find'
                  ? 'bg-orange-500 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              Find Roasters
            </button>
          )}
          <button
            onClick={() => setActiveTab('meetings')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'meetings'
                ? 'bg-orange-500 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            {currentUser.role === 'applicant' ? 'My Roast Requests' : 'Roast Requests'}
            {meetings.filter(m => m.status === 'requested').length > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                {meetings.filter(m => m.status === 'requested').length}
              </span>
            )}
          </button>
        </div>

        {/* Content */}
        {activeTab === 'find' && currentUser.role === 'applicant' ? (
          <div>
            <h2 className="text-xl font-semibold mb-4">Available Roasters</h2>
            {reviewers.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {reviewers.map((reviewer) => (
                  <RoastCard
                    key={reviewer.id}
                    reviewer={reviewer}
                    onRequestRoast={handleRequestRoast}
                    currentUserId={currentUser.id}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                {MESSAGES.dashboard.noRoasters}
              </div>
            )}
          </div>
        ) : (
          <div>
            <h2 className="text-xl font-semibold mb-4">
              {currentUser.role === 'applicant' ? 'Your Roast Requests' : 'Incoming Roast Requests'}
            </h2>
            <MeetingList
              meetings={meetings}
              currentUserId={currentUser.id}
              userRole={currentUser.role}
              onUpdateMeeting={handleUpdateMeeting}
            />
          </div>
        )}
      </main>
    </div>
  )
}