import { NextRequest, NextResponse } from 'next/server'
import { autoSkipExpiredEntries } from '@/lib/live-queue'

export async function POST(request: NextRequest) {
  try {
    // Optional: Add authentication for cron job
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const result = await autoSkipExpiredEntries()

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Error auto-skipping expired entries:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  // Support GET for easier testing and URL-based cron jobs
  return POST(request)
}
