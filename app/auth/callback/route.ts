import { createClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const type = requestUrl.searchParams.get('type')
  const next = requestUrl.searchParams.get('next')

  if (code) {
    const supabase = createClient()
    const { data: { session }, error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      // Invalid or expired code
      return NextResponse.redirect(new URL('/login?error=invalid_link', request.url))
    }

    if (session) {
      // Check if this is a password recovery session
      // Supabase sets recovery_token in session for password resets
      const isRecovery = type === 'recovery' ||
                        next === 'reset-password' ||
                        requestUrl.hash?.includes('type=recovery')

      // Password recovery - redirect to reset password page
      if (isRecovery) {
        return NextResponse.redirect(new URL('/auth/reset-password', request.url))
      }

      // Email change confirmation - just go to dashboard with success message
      if (type === 'email_change' || type === 'email') {
        return NextResponse.redirect(new URL('/dashboard?message=email_updated', request.url))
      }

      // Regular signup/email confirmation - check onboarding status
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()

      // If user has a name in profile, they've completed onboarding
      if (profile && (profile as any).name) {
        // Already onboarded, go to dashboard
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }

      // New user, go to onboarding
      return NextResponse.redirect(new URL('/onboarding', request.url))
    }
  }

  // No code provided or session failed, redirect to login
  return NextResponse.redirect(new URL('/login', request.url))
}
