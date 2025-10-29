'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { INDUSTRIES, ROAST_TYPES, MESSAGES, COLORS } from '@/lib/constants'

export default function OnboardingPage() {
  const [role, setRole] = useState<'applicant' | 'reviewer'>('applicant')
  const [roastPreferences, setRoastPreferences] = useState<string[]>(['application'])
  const [industry, setIndustry] = useState('')
  const [quickContext, setQuickContext] = useState('')
  const [name, setName] = useState('')
  const [company, setCompany] = useState('')
  const [ycBatch, setYcBatch] = useState('')
  const [linkedin, setLinkedin] = useState('')
  const [xTwitter, setXTwitter] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    // Check if already onboarded
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profile && (profile as any).name) {
      router.push('/dashboard')
    }
  }

  const toggleRoastPreference = (type: string) => {
    setRoastPreferences(prev => {
      if (prev.includes(type)) {
        return prev.filter(t => t !== type)
      }
      return [...prev, type]
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (role === 'applicant' && roastPreferences.length === 0) {
      setError('Please select at least one roast type')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No authenticated user')

      // Update profile
      const { error: profileError } = await (supabase as any)
        .from('profiles')
        .update({
          role,
          roast_preferences: roastPreferences,
          industry,
          quick_context: quickContext,
          name,
          company,
          yc_batch: role === 'reviewer' ? ycBatch : null,
          linkedin,
          x_twitter: xTwitter,
          email: user.email,
        })
        .eq('id', user.id)

      if (profileError) throw profileError

      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white p-4">
      <div className="max-w-2xl mx-auto pt-12">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2" style={{ color: COLORS.primary }}>
            {MESSAGES.onboarding.welcome}
          </h1>
          <p className="text-lg text-gray-600">Set up your roast profile in 15 seconds</p>
        </div>

        {/* Onboarding Form */}
        <form onSubmit={handleSubmit} className="bg-white p-8 rounded-2xl shadow-xl roast-glow">
          {/* Section 1: Role Selection */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              {MESSAGES.onboarding.selectRole}
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole('applicant')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  role === 'applicant'
                    ? 'border-orange-500 bg-orange-50 text-orange-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-medium">Get Roasted</div>
                <div className="text-sm text-gray-500">I'm a YC applicant</div>
              </button>

              <button
                type="button"
                onClick={() => setRole('reviewer')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  role === 'reviewer'
                    ? 'border-orange-500 bg-orange-50 text-orange-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-medium">Give Roasts</div>
                <div className="text-sm text-gray-500">I'm YC alumni/expert</div>
              </button>
            </div>
          </div>

          {/* Section 2: Roast Preferences - Only for Applicants */}
          {role === 'applicant' && (
            <div className="mb-8">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                {MESSAGES.onboarding.selectType}
              </label>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(ROAST_TYPES).map(([key, type]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleRoastPreference(key)}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      roastPreferences.includes(key)
                        ? 'border-orange-500 bg-orange-50 text-orange-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-sm font-medium">{type.label}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Section 3: Basic Info */}
          <div className="space-y-4 mb-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Name *
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                placeholder="Jane Founder"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="industry" className="block text-sm font-medium text-gray-700 mb-1">
                  Industry
                </label>
                <select
                  id="industry"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 h-[42px]"
                >
                  <option value="">Select industry</option>
                  {INDUSTRIES.map(ind => (
                    <option key={ind} value={ind}>{ind}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-1">
                  Company
                </label>
                <input
                  id="company"
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="Awesome Startup"
                />
              </div>
            </div>

            {/* What I'm Building - Only for Applicants */}
            {role === 'applicant' && (
              <div>
                <label htmlFor="quickContext" className="block text-sm font-medium text-gray-700 mb-1">
                  {MESSAGES.onboarding.context}
                </label>
                <input
                  id="quickContext"
                  type="text"
                  value={quickContext}
                  onChange={(e) => setQuickContext(e.target.value.slice(0, 80))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="AI-powered tool for..."
                  maxLength={80}
                />
                <p className="text-xs text-gray-500 mt-1">{quickContext.length}/80 characters</p>
              </div>
            )}

            {/* YC Batch - Only for Reviewers */}
            {role === 'reviewer' && (
              <div>
                <label htmlFor="ycBatch" className="block text-sm font-medium text-gray-700 mb-1">
                  YC Batch (optional)
                </label>
                <input
                  id="ycBatch"
                  type="text"
                  value={ycBatch}
                  onChange={(e) => setYcBatch(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="W23, S22, etc."
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="linkedin" className="block text-sm font-medium text-gray-700 mb-1">
                  LinkedIn (optional)
                </label>
                <input
                  id="linkedin"
                  type="url"
                  value={linkedin}
                  onChange={(e) => setLinkedin(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="https://linkedin.com/in/..."
                />
              </div>

              <div>
                <label htmlFor="xTwitter" className="block text-sm font-medium text-gray-700 mb-1">
                  X / Twitter (optional)
                </label>
                <input
                  id="xTwitter"
                  type="url"
                  value={xTwitter}
                  onChange={(e) => setXTwitter(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="https://x.com/..."
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm mb-4">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || !name}
            className="w-full py-3 px-4 rounded-md yc-button disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Setting up...' : `Start ${role === 'applicant' ? 'Getting' : 'Giving'} Roasts 🔥`}
          </button>
        </form>

        {/* Footer */}
        <p className="text-center text-xs text-gray-500 mt-8 mb-4">
          You can change your preferences anytime from the dashboard
        </p>
      </div>
    </div>
  )
}