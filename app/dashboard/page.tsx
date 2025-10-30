'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import MeetingList from '@/components/MeetingList'
import ProfileDropdown from '@/components/ProfileDropdown'
import LiveSessionControl from '@/components/LiveSessionControl'
import LiveRoastersList from '@/components/LiveRoastersList'
import { Database } from '@/lib/database.types'
import { COLORS } from '@/lib/constants'
import { completeMeeting } from '@/lib/meetings'

type Profile = Database['public']['Tables']['profiles']['Row']
type Meeting = Database['public']['Tables']['meetings']['Row'] & {
  applicant?: Profile
  reviewer?: Profile
}

export default function DashboardPage() {
  const [currentUser, setCurrentUser] = useState<Profile | null>(null)

  // For applicants (no longer used, kept for potential future features)
  const [requestedReviewerIds, setRequestedReviewerIds] = useState<Set<string>>(new Set())

  // Common
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [activeTab, setActiveTab] = useState<'find' | 'live' | 'meetings'>('live')
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

      if (!profile) {
        router.push('/onboarding')
        return
      }

      setCurrentUser(profile)

      // Load meetings for both - pass profile directly to avoid timing issues
      await loadMeetings(profile)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadMeetings = async (userProfile?: Profile) => {
    const profile = userProfile || currentUser
    if (!profile) return

    const query = supabase
      .from('meetings')
      .select(`
        *,
        applicant:applicant_id(*),
        reviewer:reviewer_id(*)
      `)
      .order('requested_at', { ascending: false })

    if (profile.role === 'applicant') {
      query.eq('applicant_id', profile.id)
    } else {
      query.eq('reviewer_id', profile.id)
    }

    const { data } = await query
    const meetingsData = (data || []) as Meeting[]
    setMeetings(meetingsData)

    // For applicants, track which reviewers they've already requested
    if (profile.role === 'applicant' && meetingsData) {
      const requestedIds = new Set(
        meetingsData.map(meeting => meeting.reviewer_id)
      )
      setRequestedReviewerIds(requestedIds)
    }
  }

  const handleRequestRoast = async (_reviewerId: string, _roastType: string) => {
    if (!currentUser) return

    // This function is now handled by RoastCard component
    // Just refresh after request
    await loadData()
  }

  const handleUpdateMeeting = async (meetingId: string, updates: any) => {
    try {
      if (updates.status === 'accepted') {
        // Use API route for acceptance flow with Jitsi Meet
        const response = await fetch('/api/accept-roast', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            meetingId,
            roasterId: currentUser!.id
          }),
        })

        const result = await response.json()

        if (response.ok && result.success) {
          setSuccessMessage('Roast accepted! Meeting link sent via email 🔥')
          await loadMeetings()
          setTimeout(() => setSuccessMessage(null), 5000)
        } else {
          setSuccessMessage(`Error: ${result.error}`)
          setTimeout(() => setSuccessMessage(null), 5000)
        }
      } else if (updates.status === 'completed') {
        const result = await completeMeeting(meetingId)

        if (result.success) {
          setSuccessMessage('Meeting completed!')
          await loadMeetings()
          setTimeout(() => setSuccessMessage(null), 3000)
        }
      } else {
        // Regular update
        const { error } = await (supabase as any)
          .from('meetings')
          .update(updates)
          .eq('id', meetingId)

        if (!error) {
          await loadMeetings()
        }
      }
    } catch (error) {
      console.error('Error updating meeting:', error)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
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
              {/* MYC Logo */}
              <img
                src="/logo/new-myc.png"
                alt="MYC"
                className="h-12 w-auto rounded-lg"
              />
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
          <button
            onClick={() => setActiveTab('live')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'live'
                ? 'bg-orange-500 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            🔴 {currentUser.role === 'applicant' ? 'Live Roasters' : 'Live Queue'}
          </button>
          <button
            onClick={() => setActiveTab('meetings')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'meetings'
                ? 'bg-orange-500 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Roast History
            {currentUser.role === 'applicant' && meetings.filter(m => m.status === 'requested').length > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                {meetings.filter(m => m.status === 'requested').length}
              </span>
            )}
          </button>
        </div>

        {/* Content */}
        {activeTab === 'live' ? (
          <div>
            {currentUser.role === 'reviewer' ? (
              <LiveSessionControl
                reviewerId={currentUser.id}
                onSessionChange={() => loadData()}
              />
            ) : (
              <LiveRoastersList applicantId={currentUser.id} />
            )}
          </div>
        ) : (
          <div>
            <h2 className="text-xl font-semibold mb-4">Roast History</h2>
            <MeetingList
              meetings={currentUser.role === 'applicant' ? meetings.filter(m => m.status === 'completed') : meetings}
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
