'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import RoastCard from '@/components/RoastCard'
import MeetingList from '@/components/MeetingList'
import ProfileDropdown from '@/components/ProfileDropdown'
import { Database } from '@/lib/database.types'
import { MESSAGES, COLORS, ROAST_TYPES } from '@/lib/constants'
import {
  canMakeRequest,
  getMatchesForApplicant,
  getPriorityQueueForRoaster,
  DAILY_REQUEST_LIMIT
} from '@/lib/matching'
import { acceptRoastRequest, completeMeeting } from '@/lib/meetings'

type Profile = Database['public']['Tables']['profiles']['Row']
type Meeting = Database['public']['Tables']['meetings']['Row'] & {
  applicant?: Profile
  reviewer?: Profile
}

export default function DashboardPage() {
  const [currentUser, setCurrentUser] = useState<Profile | null>(null)

  // For applicants
  const [featuredRoaster, setFeaturedRoaster] = useState<Profile | null>(null)
  const [industryMatches, setIndustryMatches] = useState<Profile[]>([])
  const [wildcardRoaster, setWildcardRoaster] = useState<Profile | null>(null)
  const [browseRoasters, setBrowseRoasters] = useState<Profile[]>([])
  const [requestsUsed, setRequestsUsed] = useState(0)
  const [canRequest, setCanRequest] = useState(true)
  const [limitReason, setLimitReason] = useState('')

  // For roasters
  const [priorityQueue, setPriorityQueue] = useState<Meeting[]>([])

  // Common
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

      if (!profile) {
        router.push('/onboarding')
        return
      }

      setCurrentUser(profile)

      // Load different data based on role
      if (profile.role === 'applicant') {
        await loadApplicantView(profile.id)
      } else {
        await loadRoasterView(profile.id)
      }

      // Load meetings for both - pass profile directly to avoid timing issues
      await loadMeetings(profile)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadApplicantView = async (applicantId: string) => {
    try {
      // Check request limits
      const limitCheck = await canMakeRequest(applicantId)
      setCanRequest(limitCheck.canRequest)
      setRequestsUsed(limitCheck.requestsUsed)
      if (limitCheck.reason) {
        setLimitReason(limitCheck.reason)
      }

      // Get matched roasters
      const matches = await getMatchesForApplicant(applicantId)
      setFeaturedRoaster(matches.featured)
      setIndustryMatches(matches.industryMatches)
      setWildcardRoaster(matches.wildcard)

      // Get additional roasters for "browse more"
      const { data: browse } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'reviewer')
        .eq('is_available', true)
        .order('roast_count', { ascending: false })
        .limit(10)

      setBrowseRoasters(browse || [])
    } catch (error) {
      console.error('Error loading applicant view:', error)
    }
  }

  const loadRoasterView = async (roasterId: string) => {
    try {
      const queue = await getPriorityQueueForRoaster(roasterId)

      // Combine all priority items
      const allPriority = [
        ...queue.industryMatches,
        ...queue.recentRequests,
        ...(queue.wildcard ? [queue.wildcard] : [])
      ]

      // Remove duplicates
      const uniquePriority = allPriority.filter((item, index, self) =>
        index === self.findIndex(t => t.id === item.id)
      )

      setPriorityQueue(uniquePriority as Meeting[])
    } catch (error) {
      console.error('Error loading roaster view:', error)
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
    setMeetings(data || [])
  }

  const handleRequestRoast = async (reviewerId: string, roastType: string) => {
    if (!currentUser) return

    // This function is now handled by RoastCard component
    // Just refresh after request
    await loadData()
  }

  const handleUpdateMeeting = async (meetingId: string, updates: any) => {
    try {
      if (updates.status === 'accepted') {
        // Use new acceptance flow with Google Meet
        const result = await acceptRoastRequest(meetingId, currentUser!.id)

        if (result.success) {
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
          {currentUser.role === 'reviewer' && (
            <button
              onClick={() => setActiveTab('find')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'find'
                  ? 'bg-orange-500 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              Priority Queue
              {priorityQueue.filter(m => m.status === 'requested').length > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                  {priorityQueue.filter(m => m.status === 'requested').length}
                </span>
              )}
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
            {currentUser.role === 'applicant' ? 'My Roast Requests' : 'All Roast Requests'}
            {currentUser.role === 'applicant' && meetings.filter(m => m.status === 'requested').length > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                {meetings.filter(m => m.status === 'requested').length}
              </span>
            )}
          </button>
        </div>

        {/* Content */}
        {activeTab === 'find' && currentUser.role === 'applicant' ? (
          <div>
            {/* Daily Limit Counter */}
            <div className="mb-6 p-4 bg-white rounded-lg border border-gray-200">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-semibold text-gray-900">Daily Requests</h3>
                  <p className="text-sm text-gray-600">
                    {requestsUsed}/{DAILY_REQUEST_LIMIT} used today
                  </p>
                </div>
                {!canRequest && (
                  <div className="text-sm text-orange-600 font-medium">
                    {limitReason}
                  </div>
                )}
              </div>
              <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-orange-500 transition-all"
                  style={{ width: `${(requestsUsed / DAILY_REQUEST_LIMIT) * 100}%` }}
                />
              </div>
            </div>

            {/* Featured Roaster */}
            {featuredRoaster && (
              <div className="mb-8">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <span style={{ color: COLORS.primary }}>Featured Roaster</span>
                  <span className="text-sm font-normal text-gray-500">Top pick for you</span>
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <RoastCard
                    reviewer={featuredRoaster}
                    onRequestRoast={handleRequestRoast}
                    currentUserId={currentUser.id}
                    canRequest={canRequest}
                  />
                </div>
              </div>
            )}

            {/* Industry Matches */}
            {industryMatches.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl font-semibold mb-4">Matched to Your Industry</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {industryMatches.map((reviewer) => (
                    <RoastCard
                      key={reviewer.id}
                      reviewer={reviewer}
                      onRequestRoast={handleRequestRoast}
                      currentUserId={currentUser.id}
                      canRequest={canRequest}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Wildcard */}
            {wildcardRoaster && (
              <div className="mb-8">
                <h2 className="text-xl font-semibold mb-4">Fresh Perspective</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <RoastCard
                    reviewer={wildcardRoaster}
                    onRequestRoast={handleRequestRoast}
                    currentUserId={currentUser.id}
                    canRequest={canRequest}
                  />
                </div>
              </div>
            )}

            {/* Browse More */}
            {browseRoasters.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl font-semibold mb-4">Browse More Roasters</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {browseRoasters.slice(0, 6).map((reviewer) => (
                    <RoastCard
                      key={reviewer.id}
                      reviewer={reviewer}
                      onRequestRoast={handleRequestRoast}
                      currentUserId={currentUser.id}
                      canRequest={canRequest}
                    />
                  ))}
                </div>
              </div>
            )}

            {!featuredRoaster && industryMatches.length === 0 && browseRoasters.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                {MESSAGES.dashboard.noRoasters}
              </div>
            )}
          </div>
        ) : activeTab === 'find' && currentUser.role === 'reviewer' ? (
          <div>
            <h2 className="text-xl font-semibold mb-4">Priority Queue</h2>
            {priorityQueue.length > 0 ? (
              <MeetingList
                meetings={priorityQueue}
                currentUserId={currentUser.id}
                userRole={currentUser.role}
                onUpdateMeeting={handleUpdateMeeting}
              />
            ) : (
              <div className="text-center py-12 text-gray-500 bg-white rounded-lg">
                <p className="text-lg mb-2">No pending requests</p>
                <p className="text-sm">Check back later for new roast requests!</p>
              </div>
            )}
          </div>
        ) : (
          <div>
            <h2 className="text-xl font-semibold mb-4">
              {currentUser.role === 'applicant' ? 'Your Roast Requests' : 'All Roast Requests'}
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
