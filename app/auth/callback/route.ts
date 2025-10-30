import { createClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const type = requestUrl.searchParams.get('type')
  const next = requestUrl.searchParams.get('next')

  console.log('[Auth Callback] Received:', { code: !!code, type, next })

  if (code) {
    const supabase = createClient()
    const { data: { session }, error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error('[Auth Callback] Code exchange error:', error.message)
      // Invalid or expired code
      return NextResponse.redirect(new URL('/login?error=invalid_link', request.url))
    }

    if (session) {
      console.log('[Auth Callback] Session created for user:', session.user.id)

      // IMPORTANT: Only treat as password recovery if type is EXPLICITLY 'recovery'
      // Do NOT check hash or other parameters to avoid false positives
      const isPasswordRecovery = type === 'recovery' && next === 'reset-password'

      // Password recovery - redirect to reset password page
      if (isPasswordRecovery) {
        console.log('[Auth Callback] Password recovery flow detected')
        return NextResponse.redirect(new URL('/auth/reset-password', request.url))
      }

      // Email change confirmation
      if (type === 'email_change' || type === 'email') {
        console.log('[Auth Callback] Email change flow detected')
        return NextResponse.redirect(new URL('/dashboard?message=email_updated', request.url))
      }

      // Regular signup/email confirmation - check onboarding status
      console.log('[Auth Callback] Regular signup/confirmation flow')
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()

      // If user has a name in profile, they've completed onboarding
      if (profile && (profile as any).name) {
        console.log('[Auth Callback] User has completed onboarding, redirecting to dashboard')
        // Already onboarded, go to dashboard
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }

      console.log('[Auth Callback] New user, redirecting to onboarding')
      // New user, go to onboarding
      return NextResponse.redirect(new URL('/onboarding', request.url))
    }
  }

  console.log('[Auth Callback] No code or session, redirecting to login')
  // No code provided or session failed, redirect to login
  return NextResponse.redirect(new URL('/login', request.url))
}
