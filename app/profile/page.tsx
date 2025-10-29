'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { INDUSTRIES, ROAST_TYPES, MESSAGES, COLORS } from '@/lib/constants'
import { Database } from '@/lib/database.types'

type Profile = Database['public']['Tables']['profiles']['Row']

export default function ProfilePage() {
  const [role, setRole] = useState<'applicant' | 'reviewer'>('applicant')
  const [roastPreferences, setRoastPreferences] = useState<string[]>(['application'])
  const [industry, setIndustry] = useState('')
  const [quickContext, setQuickContext] = useState('')
  const [name, setName] = useState('')
  const [company, setCompany] = useState('')
  const [ycBatch, setYcBatch] = useState('')
  const [linkedin, setLinkedin] = useState('')
  const [xTwitter, setXTwitter] = useState('')
  const [currentEmail, setCurrentEmail] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [showEmailChange, setShowEmailChange] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [changingEmail, setChangingEmail] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [emailSuccess, setEmailSuccess] = useState(false)

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      setCurrentEmail(user.email || '')

      const profileResult = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      const profile = profileResult.data as Profile | null
      const profileError = profileResult.error

      if (profileError) throw profileError

      if (profile) {
        setRole(profile.role)
        setRoastPreferences(profile.roast_preferences || [])
        setIndustry(profile.industry || '')
        setQuickContext(profile.quick_context || '')
        setName(profile.name || '')
        setCompany(profile.company || '')
        setYcBatch(profile.yc_batch || '')
        setLinkedin(profile.linkedin || '')
        setXTwitter(profile.x_twitter || '')
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
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

  const handleEmailChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setChangingEmail(true)
    setEmailError(null)

    try {
      const { error } = await supabase.auth.updateUser({
        email: newEmail,
      }, {
        emailRedirectTo: `${window.location.origin}/auth/callback?type=email_change`,
      })

      if (error) throw error

      setEmailSuccess(true)
    } catch (err: any) {
      setEmailError(err.message)
    } finally {
      setChangingEmail(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (role === 'applicant' && roastPreferences.length === 0) {
      setError('Please select at least one roast type')
      return
    }

    setSaving(true)
    setError(null)
    setSuccessMessage(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No authenticated user')

      const { error: profileError } = await (supabase as any)
        .from('profiles')
        .update({
          // Note: role is intentionally excluded - users cannot change their role after initial setup
          roast_preferences: roastPreferences,
          industry,
          quick_context: quickContext,
          name,
          company,
          yc_batch: role === 'reviewer' ? ycBatch : null,
          linkedin,
          x_twitter: xTwitter,
        })
        .eq('id', user.id)

      if (profileError) throw profileError

      setSuccessMessage('Profile updated successfully!')
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-2xl" style={{ color: COLORS.primary }}>Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white p-4">
      <div className="max-w-2xl mx-auto pt-12">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </Link>
          <h1 className="text-4xl font-bold mb-2" style={{ color: COLORS.primary }}>
            Edit Profile
          </h1>
          <p className="text-lg text-gray-600">Update your information and preferences</p>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 text-green-700 rounded-lg">
            {successMessage}
          </div>
        )}

        {/* Profile Form */}
        <form onSubmit={handleSubmit} className="bg-white p-8 rounded-2xl shadow-xl roast-glow">
          {/* Current Role Display (read-only) */}
          <div className="mb-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Your Role:
            </label>
            <div className="flex items-center gap-2">
              <div className="px-4 py-2 rounded-lg bg-orange-100 text-orange-700 font-medium">
                {role === 'applicant' ? 'Get Roasted (YC Applicant)' : 'Give Roasts (YC Alumni/Expert)'}
              </div>
              <span className="text-xs text-gray-500">
                (Role cannot be changed after initial setup)
              </span>
            </div>
          </div>

          {/* Section 2: Roast Preferences - Only for Applicants */}
          {role === 'applicant' && (
            <div className="mb-8">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Roast my:
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
                  What I'm building (80 chars max):
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
            disabled={saving || !name}
            className="w-full py-3 px-4 rounded-md yc-button disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>

        {/* Footer */}
        <p className="text-center text-xs text-gray-500 mt-8 mb-4">
          Changes will be visible to other users immediately
        </p>

        {/* Account Settings Section */}
        <div className="mt-8 p-6 bg-gray-50 rounded-2xl border border-gray-200">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Account Settings</h3>
          
          {/* Current Email Display */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <div className="flex items-center justify-between">
              <span className="text-gray-900">{currentEmail}</span>
              <button
                type="button"
                onClick={() => setShowEmailChange(!showEmailChange)}
                className="text-sm text-orange-600 hover:text-orange-700 transition-colors font-medium"
              >
                {showEmailChange ? 'Cancel' : 'Change Email'}
              </button>
            </div>
          </div>

          {/* Email Change Form */}
          {showEmailChange && !emailSuccess && (
            <form onSubmit={handleEmailChange} className="space-y-4 mt-4 p-4 bg-white rounded-lg border border-orange-200">
              <div>
                <label htmlFor="newEmail" className="block text-sm font-medium text-gray-700 mb-1">
                  New Email Address
                </label>
                <input
                  id="newEmail"
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="newemail@example.com"
                  required
                />
              </div>

              {emailError && (
                <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">
                  {emailError}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={changingEmail || !newEmail}
                  className="flex-1 py-2 px-4 rounded-md yc-button disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  {changingEmail ? 'Sending...' : 'Send Confirmation Email'}
                </button>
              </div>

              <p className="text-xs text-gray-600">
                We'll send a confirmation email to your new address. Click the link in that email to complete the change.
              </p>
            </form>
          )}

          {/* Email Change Success */}
          {emailSuccess && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-start gap-3">
                <div className="text-2xl">✉️</div>
                <div>
                  <h4 className="font-bold text-green-900 mb-1">Check Your Email!</h4>
                  <p className="text-sm text-green-800 mb-2">
                    We've sent a confirmation link to <strong>{newEmail}</strong>
                  </p>
                  <p className="text-xs text-green-700">
                    Click the link in that email to complete the email change. Your current email will remain active until you confirm.
                  </p>
                  <button
                    onClick={() => {
                      setEmailSuccess(false)
                      setShowEmailChange(false)
                      setNewEmail('')
                    }}
                    className="mt-3 text-sm text-green-700 hover:text-green-900 font-medium"
                  >
                    Got it
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}