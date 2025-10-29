'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { COLORS, MESSAGES } from '@/lib/constants'

function LoginForm() {
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetSent, setResetSent] = useState(false)
  const [hasExistingSession, setHasExistingSession] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    // Check if mode is 'signup' from URL parameter
    const mode = searchParams.get('mode')
    if (mode === 'signup') {
      setIsSignUp(true)
    }

    // Don't auto-redirect if user explicitly wants to see login page
    // (e.g., to sign in as a different user)
    const forceLogin = searchParams.get('force')
    if (forceLogin === 'true') {
      return
    }

    // Check if user is already logged in
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        setHasExistingSession(true)
        
        // User is already logged in, check if they've completed onboarding
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()

        // Only redirect if we successfully got profile data
        if (!profileError && profile) {
          if ((profile as any).name) {
            // Profile complete, go to dashboard
            router.push('/dashboard')
          } else {
            // Profile incomplete, go to onboarding
            router.push('/onboarding')
          }
        }
      } else {
        setHasExistingSession(false)
      }
    }

    checkSession()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        })
        if (error) throw error

        // Check if email confirmation is required
        if (data.user && !data.session) {
          // Email confirmation required - show success message
          setError(`🎉 Account created! Check your email (${email}) for the confirmation link. Click it to complete your signup.`)
          setEmail('')
          setPassword('')
        } else if (data.session) {
          // Auto-confirmed (email confirmation disabled in Supabase)
          // This should not happen in production - email confirmation should be enabled
          router.push('/onboarding')
        }
      } else {
        const { data: authData, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error

        // Check if email is verified
        if (authData.user && !authData.user.email_confirmed_at) {
          setError('Please verify your email before logging in. Check your inbox for the confirmation link.')
          await supabase.auth.signOut()
          return
        }

        // Check if user has completed onboarding
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authData.user!.id)
          .single()

        if (profile && (profile as any).name) {
          router.push('/dashboard')
        } else {
          router.push('/onboarding')
        }
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
      })
      if (error) throw error

      setResetSent(true)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    setSigningOut(true)
    try {
      await supabase.auth.signOut()
      setHasExistingSession(false)
      setError(null)
      // Force reload to clear any cached state
      window.location.href = '/login'
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSigningOut(false)
    }
  }

  if (showForgotPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white p-4">
        <div className="w-full max-w-md">
          {/* Back Button */}
          <button
            onClick={() => {
              setShowForgotPassword(false)
              setResetSent(false)
              setError(null)
            }}
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-8 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Login
          </button>

          {/* Logo and Title */}
          <div className="text-center mb-8">
            <h1 className="text-5xl font-bold mb-2 myc-font" style={{ color: COLORS.primary }}>
              MYC
            </h1>
            <p className="text-xl text-gray-600">Reset your password</p>
          </div>

          {/* Reset Form */}
          <div className="bg-white p-8 rounded-2xl shadow-xl roast-glow">
            {resetSent ? (
              <>
                <div className="text-center">
                  <div className="text-6xl mb-4">📧</div>
                  <h2 className="text-2xl font-bold mb-4 text-green-700">Check Your Email!</h2>
                  <p className="text-gray-600 mb-6">
                    We've sent a password reset link to <strong>{resetEmail}</strong>
                  </p>
                  <p className="text-sm text-gray-500">
                    Click the link in the email to reset your password. The link will expire in 1 hour.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowForgotPassword(false)
                    setResetSent(false)
                    setResetEmail('')
                  }}
                  className="w-full mt-6 py-3 px-4 rounded-md yc-button"
                >
                  Back to Login
                </button>
              </>
            ) : (
              <>
                <div className="text-center mb-6">
                  <div className="text-4xl mb-2">🔐</div>
                  <h2 className="text-2xl font-bold">Forgot Password?</h2>
                  <p className="text-sm text-gray-600 mt-2">
                    Enter your email and we'll send you a reset link
                  </p>
                </div>

                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div>
                    <label htmlFor="resetEmail" className="block text-sm font-medium text-gray-700 mb-1">
                      Email Address
                    </label>
                    <input
                      id="resetEmail"
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      placeholder="founder@startup.com"
                      required
                    />
                  </div>

                  {error && (
                    <div className="p-3 rounded-lg text-sm bg-red-50 text-red-700">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 px-4 rounded-md yc-button disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Sending...' : 'Send Reset Link'}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-4">
      <div className="w-full max-w-md">
        {/* Back Button */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-8 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Home
        </Link>

        {/* Logo and Title */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold mb-2 myc-font" style={{ color: COLORS.primary }}>
            MYC
          </h1>
          <p className="text-xl text-gray-600">Get your YC application roasted</p>
          <p className="text-sm text-gray-500 mt-2">10-minute sessions. No DMs. Just feedback.</p>
        </div>

        {/* Auth Form */}
        <div className="bg-white p-8 rounded-2xl shadow-xl roast-glow">
          {hasExistingSession && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between">
                <p className="text-sm text-blue-800">You're already signed in</p>
                <button
                  type="button"
                  onClick={handleSignOut}
                  disabled={signingOut}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50"
                >
                  {signingOut ? 'Signing out...' : 'Sign out'}
                </button>
              </div>
            </div>
          )}
          
          <h2 className="text-2xl font-bold mb-6 text-center">
            {isSignUp ? 'Join the Roast' : 'Welcome Back'}
          </h2>

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                placeholder="founder@startup.com"
                required
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                {!isSignUp && (
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="text-xs text-orange-600 hover:text-orange-700 transition-colors"
                  >
                    Forgot?
                  </button>
                )}
              </div>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>

            {error && (
              <div className={`p-3 rounded-lg text-sm ${
                error.includes('Check your email') || error.includes('Account created') || error.includes('🎉')
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-md yc-button disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Loading...' : (isSignUp ? 'Sign Up' : 'Sign In')}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setIsSignUp(!isSignUp)
                setError(null)
              }}
              className="text-sm text-gray-600 hover:text-orange-600 transition-colors"
            >
              {isSignUp
                ? 'Already have an account? Sign in'
                : "Don't have an account? Sign up"}
            </button>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-500 mt-8">
          By using <span className="myc-font" style={{ color: '#FF6600' }}>MYC</span>, you agree to receive brutally honest feedback.
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <LoginForm />
    </Suspense>
  )
}