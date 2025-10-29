import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { sendNewRequestNotification } from '@/lib/email'
import { addToRequestHistory, incrementRequestCount, canMakeRequest } from '@/lib/matching'

export async function POST(request: NextRequest) {
  try {
    const { applicantId, reviewerId, roastType } = await request.json()

    if (!applicantId || !reviewerId || !roastType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const supabase = await createServerSupabaseClient()

    // Check if user can make request
    const limitCheck = await canMakeRequest(applicantId)
    if (!limitCheck.canRequest) {
      return NextResponse.json(
        { error: limitCheck.reason || 'Request limit reached' },
        { status: 429 }
      )
    }

    // Create meeting request
    const { data: meeting, error: insertError } = await (supabase as any)
      .from('meetings')
      .insert({
        applicant_id: applicantId,
        reviewer_id: reviewerId,
        roast_type: roastType,
        status: 'requested',
        requested_at: new Date().toISOString(),
      })
      .select(`
        *,
        applicant:applicant_id(*),
        reviewer:reviewer_id(*)
      `)
      .single()

    if (insertError) {
      throw insertError
    }

    // Increment request count
    await incrementRequestCount(applicantId)

    // Add to request history
    await addToRequestHistory(applicantId, reviewerId)

    // Send notification to roaster
    const applicant = meeting.applicant as any
    const reviewer = meeting.reviewer as any

    const roastTypeLabels: Record<string, string> = {
      application: 'Application',
      pitch: 'Pitch Deck',
      idea: 'Idea'
    }

    try {
      await sendNewRequestNotification(
        reviewer.email || '',
        reviewer.name || 'Roaster',
        applicant.name || 'Applicant',
        applicant.company,
        roastTypeLabels[roastType] || roastType
      )
    } catch (emailError) {
      // Log email error but don't fail the request
      console.error('Error sending notification:', emailError)
    }

    return NextResponse.json({
      success: true,
      meeting
    })
  } catch (error: any) {
    console.error('Error creating roast request:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create roast request' },
      { status: 500 }
    )
  }
}
