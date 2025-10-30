import { createClient } from './supabase'
import { Database } from './database.types'

type Profile = Database['public']['Tables']['profiles']['Row']

export const DAILY_REQUEST_LIMIT = 5
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

  // Count today's requests from meetings table
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const { data: meetings, error } = await supabase
    .from('meetings')
    .select('id, requested_at')
    .eq('applicant_id', applicantId)
    .gte('requested_at', todayStart.toISOString())

  if (error) {
    console.error('Error checking request limit:', error)
    return { canRequest: true, requestsUsed: 0 }
  }

  const requestsUsed = meetings?.length || 0

  if (requestsUsed >= DAILY_REQUEST_LIMIT) {
    return {
      canRequest: false,
      requestsUsed,
      reason: `Daily limit reached (${DAILY_REQUEST_LIMIT}/day)`
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
 * Note: Request count is now tracked via meetings table, so this is a no-op
 */
export async function incrementRequestCount(_applicantId: string): Promise<void> {
  // No longer needed - we count meetings directly
  return Promise.resolve()
}

/**
 * Add to request history (prevent duplicate requests to same roaster)
 * Note: Request history is now tracked via meetings table, so this is a no-op
 */
export async function addToRequestHistory(
  _applicantId: string,
  _reviewerId: string
): Promise<void> {
  // No longer needed - we track via meetings table
  return Promise.resolve()
}

/**
 * Get featured roaster (rotates daily)
 * Note: Featured columns disabled temporarily due to PostgREST cache issues
 */
export async function getFeaturedRoaster(): Promise<Profile | null> {
  const supabase = createClient()

  try {
    // Simple query: get top reviewer by roast count
    // TODO: Re-enable featured_until logic once PostgREST schema cache is stable
    const { data: featured } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'reviewer')
      .eq('is_available', true)
      .order('roast_count', { ascending: false })
      .limit(1)
      .single()

    return featured as Profile | null
  } catch (error) {
    console.error('Error getting featured roaster:', error)
    return null
  }
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
