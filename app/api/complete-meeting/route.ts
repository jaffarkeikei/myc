import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const { meetingId } = await request.json()

    if (!meetingId) {
      return NextResponse.json(
        { error: 'Missing meetingId' },
        { status: 400 }
      )
    }

    const supabase = await createServerSupabaseClient()

    // Get meeting details to find both parties
    const meetingResult = await supabase
      .from('meetings')
      .select('reviewer_id, applicant_id')
      .eq('id', meetingId)
      .single()

    const meeting = meetingResult.data as any

    if (meetingResult.error || !meeting) {
      return NextResponse.json(
        { error: 'Meeting not found' },
        { status: 404 }
      )
    }

    // Update meeting status to completed
    const { error } = await (supabase as any)
      .from('meetings')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', meetingId)

    if (error) {
      console.error('Error completing meeting:', error)
      return NextResponse.json(
        { error: 'Failed to complete meeting' },
        { status: 500 }
      )
    }

    // Increment roast count for both the reviewer and the applicant
    // Get current counts
    const reviewerResult = await supabase
      .from('profiles')
      .select('roast_count')
      .eq('id', meeting.reviewer_id)
      .single()

    const applicantResult = await supabase
      .from('profiles')
      .select('roast_count')
      .eq('id', meeting.applicant_id)
      .single()

    const reviewerData = reviewerResult.data as any
    const applicantData = applicantResult.data as any

    // Update reviewer roast count
    if (reviewerData) {
      await (supabase as any)
        .from('profiles')
        .update({ roast_count: (reviewerData.roast_count || 0) + 1 })
        .eq('id', meeting.reviewer_id)
    }

    // Update applicant roast count
    if (applicantData) {
      await (supabase as any)
        .from('profiles')
        .update({ roast_count: (applicantData.roast_count || 0) + 1 })
        .eq('id', meeting.applicant_id)
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error in complete-meeting API:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
