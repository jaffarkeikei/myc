import { createClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.exchangeCodeForSession(code)
    
    if (session) {
      // Check if user has completed onboarding
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
    }
  }

  // New user or no profile yet, redirect to onboarding
  return NextResponse.redirect(new URL('/onboarding', request.url))
}
