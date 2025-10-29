import { createClient } from './supabase'
import { Database } from './database.types'

type Profile = Database['public']['Tables']['profiles']['Row']

export const DAILY_REQUEST_LIMIT = 3
export const COOLDOWN_HOURS = 48

/**
 * Check if applicant can make more requests today
 */
export async function canMakeRequest(applicantId: string): Promise<{
  canRequest: boolean
  requestsUsed: number
  reason?: string
}> {
  const supabase = createClient()

  // Check daily limit
  const today = new Date().toISOString().split('T')[0]
  const trackingResult = await supabase
    .from('request_tracking')
    .select('request_count, last_rejection_at')
    .eq('applicant_id', applicantId)
    .eq('date', today)
    .single()

  const tracking = trackingResult.data as any
  const requestsUsed = tracking?.request_count || 0

  if (requestsUsed >= DAILY_REQUEST_LIMIT) {
    return {
      canRequest: false,
      requestsUsed,
      reason: `Daily limit reached (${DAILY_REQUEST_LIMIT}/day)`
    }
  }

  // Check cooldown after rejection
  if (tracking?.last_rejection_at) {
    const lastRejection = new Date(tracking.last_rejection_at)
    const hoursSince = (Date.now() - lastRejection.getTime()) / (1000 * 60 * 60)

    if (hoursSince < COOLDOWN_HOURS) {
      const hoursRemaining = Math.ceil(COOLDOWN_HOURS - hoursSince)
      return {
        canRequest: false,
        requestsUsed,
        reason: `Cooldown active. Try again in ${hoursRemaining} hours`
      }
    }
  }

  return { canRequest: true, requestsUsed }
}

/**
 * Check if applicant has already requested this roaster
 */
export async function hasRequestedRoaster(
  applicantId: string,
  reviewerId: string
): Promise<boolean> {
  const supabase = createClient()

  const { data } = await (supabase as any)
    .from('request_history')
    .select('id')
    .eq('applicant_id', applicantId)
    .eq('reviewer_id', reviewerId)
    .single()

  return !!data
}

/**
 * Increment request count for applicant
 */
export async function incrementRequestCount(applicantId: string): Promise<void> {
  const supabase = createClient()
  const today = new Date().toISOString().split('T')[0]

  await (supabase as any)
    .from('request_tracking')
    .upsert({
      applicant_id: applicantId,
      date: today,
      request_count: 1
    }, {
      onConflict: 'applicant_id,date',
      ignoreDuplicates: false
    })

  // Also add to request history
  await (supabase as any)
    .from('request_tracking')
    .update({
      request_count: supabase.rpc('request_tracking.request_count + 1')
    })
    .eq('applicant_id', applicantId)
    .eq('date', today)
}

/**
 * Add to request history (prevent duplicate requests to same roaster)
 */
export async function addToRequestHistory(
  applicantId: string,
  reviewerId: string
): Promise<void> {
  const supabase = createClient()

  await (supabase as any)
    .from('request_history')
    .insert({
      applicant_id: applicantId,
      reviewer_id: reviewerId
    })
}

/**
 * Get featured roaster (rotates daily)
 */
export async function getFeaturedRoaster(): Promise<Profile | null> {
  const supabase = createClient()

  // Try to get currently featured roaster
  const { data: featured } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'reviewer')
    .eq('is_available', true)
    .gt('featured_until', new Date().toISOString())
    .single()

  if (featured) {
    return featured as Profile
  }

  // No featured roaster, select one and mark as featured
  const newFeaturedResult = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'reviewer')
    .eq('is_available', true)
    .or(`last_featured.is.null,last_featured.lt.${new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()}`)
    .order('roast_count', { ascending: false })
    .limit(1)
    .single()

  const newFeatured = newFeaturedResult.data as Profile | null

  if (newFeatured) {
    // Mark as featured for 24 hours
    await (supabase as any)
      .from('profiles')
      .update({
        featured_until: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        last_featured: new Date().toISOString()
      })
      .eq('id', newFeatured.id)

    return newFeatured
  }

  return null
}

/**
 * Get industry-matched roasters for applicant
 */
export async function getIndustryMatches(
  applicantId: string,
  limit: number = 2
): Promise<Profile[]> {
  const supabase = createClient()

  // Get applicant's industry
  const applicantResult = await supabase
    .from('profiles')
    .select('industry')
    .eq('id', applicantId)
    .single()

  const applicant = applicantResult.data as any

  if (!applicant?.industry) {
    return []
  }

  // Get reviewers in same industry
  const matchesResult = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'reviewer')
    .eq('is_available', true)
    .eq('industry', applicant.industry)
    .order('roast_count', { ascending: false })
    .limit(limit)

  return (matchesResult.data || []) as Profile[]
}

/**
 * Get a random "wildcard" roaster for diversity
 */
export async function getWildcardRoaster(): Promise<Profile | null> {
  const supabase = createClient()

  // Get a random available reviewer
  const roastersResult = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'reviewer')
    .eq('is_available', true)
    .limit(10) // Get 10 and pick randomly

  const roasters = roastersResult.data as Profile[] | null

  if (!roasters || roasters.length === 0) {
    return null
  }

  const randomIndex = Math.floor(Math.random() * roasters.length)
  return roasters[randomIndex]
}

/**
 * Get matches for applicant (Featured + Industry + Wildcard)
 */
export async function getMatchesForApplicant(applicantId: string): Promise<{
  featured: Profile | null
  industryMatches: Profile[]
  wildcard: Profile | null
}> {
  const [featured, industryMatches, wildcard] = await Promise.all([
    getFeaturedRoaster(),
    getIndustryMatches(applicantId, 2),
    getWildcardRoaster()
  ])

  return { featured, industryMatches, wildcard }
}

/**
 * Get priority queue for roaster (Industry + Recent + Wildcard)
 */
export async function getPriorityQueueForRoaster(roasterId: string): Promise<{
  industryMatches: any[]
  recentRequests: any[]
  wildcard: any | null
}> {
  const supabase = createClient()

  // Get roaster's industry
  const roasterResult = await supabase
    .from('profiles')
    .select('industry, roast_preferences')
    .eq('id', roasterId)
    .single()

  const roaster = roasterResult.data as any

  // Get meetings with applicant info
  const meetingsResult = await supabase
    .from('meetings')
    .select(`
      *,
      applicant:applicant_id(*)
    `)
    .eq('reviewer_id', roasterId)
    .eq('status', 'requested')
    .order('requested_at', { ascending: false })

  const meetings = meetingsResult.data as any[] | null

  if (!meetings) {
    return { industryMatches: [], recentRequests: [], wildcard: null }
  }

  // Filter by industry match
  const industryMatches = roaster?.industry
    ? meetings
        .filter(m => (m.applicant as any)?.industry === roaster.industry)
        .slice(0, 2)
    : []

  // Get most recent requests
  const recentRequests = meetings.slice(0, 2)

  // Get a random request as wildcard
  const wildcard = meetings.length > 0
    ? meetings[Math.floor(Math.random() * Math.min(meetings.length, 5))]
    : null

  return { industryMatches, recentRequests, wildcard }
}
