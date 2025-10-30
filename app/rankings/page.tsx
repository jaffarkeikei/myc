'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import ProfileDropdown from '@/components/ProfileDropdown'
import { Database } from '@/lib/database.types'
import { COLORS } from '@/lib/constants'

type Profile = Database['public']['Tables']['profiles']['Row']

export default function RankingsPage() {
  const [currentUser, setCurrentUser] = useState<Profile | null>(null)
  const [roasters, setRoasters] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadData()
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

      // Get all reviewers sorted by roast count
      const { data: reviewersData } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'reviewer')
        .order('roast_count', { ascending: false })

      setRoasters((reviewersData || []) as Profile[])
    } catch (error) {
      console.error('Error loading rankings:', error)
    } finally {
      setLoading(false)
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
            <div className="flex items-center gap-8">
              {/* MYC Logo */}
              <img
                src="/logo/new-myc.png"
                alt="MYC"
                className="h-12 w-auto rounded-lg cursor-pointer"
                onClick={() => router.push('/dashboard')}
              />

              {/* Navigation Links */}
              <nav className="flex gap-6">
                <button
                  onClick={() => router.push('/rankings')}
                  className="text-orange-500 font-semibold transition-colors cursor-pointer"
                >
                  Rankings
                </button>
              </nav>
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

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Roaster Rankings</h1>
          <p className="text-gray-600">Top roasters ranked by number of completed roasts</p>
        </div>

        {/* Rankings List */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {roasters.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>No roasters found</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {roasters.map((roaster, index) => (
                <div
                  key={roaster.id}
                  className="p-6 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-6">
                    {/* Rank Badge */}
                    <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold ${
                      index === 0 ? 'bg-yellow-400 text-yellow-900' :
                      index === 1 ? 'bg-gray-300 text-gray-700' :
                      index === 2 ? 'bg-orange-400 text-orange-900' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                    </div>

                    {/* Roaster Info */}
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold">{roaster.name || 'Unknown'}</h3>
                      {roaster.company && (
                        <p className="text-sm text-gray-600">{roaster.company}</p>
                      )}
                      {roaster.yc_batch && (
                        <p className="text-sm text-orange-500 font-medium mt-1">{roaster.yc_batch}</p>
                      )}
                    </div>

                    {/* Roast Count */}
                    <div className="flex-shrink-0 text-right">
                      <div className="text-3xl font-bold" style={{ color: COLORS.primary }}>
                        {roaster.roast_count || 0}
                      </div>
                      <div className="text-sm text-gray-500">
                        {roaster.roast_count === 1 ? 'roast' : 'roasts'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Back to Dashboard */}
        <div className="mt-6">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-gray-600 hover:text-gray-900 font-medium transition-colors cursor-pointer"
          >
            ← Back to Dashboard
          </button>
        </div>
      </main>
    </div>
  )
}
