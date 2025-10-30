# Live Queue Feature - Setup Guide

This guide will help you set up and deploy the new Live Queue with Waitlist feature for MYC.

## Overview

The Live Queue feature allows reviewers (roasters) to:
- Go live for a specified duration
- Accept up to 10 applicants in a queue
- Process applicants one-by-one with automatic notifications
- Auto-skip applicants who don't join within 2 minutes

Applicants can:
- See all live roasters with queue lengths
- Join queues and see their real-time position
- Get notified when it's their turn
- Join the roast session with a 2-minute window

## 1. Database Setup

### Run the Migration

1. Open your Supabase project at [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Go to the SQL Editor
3. Create a new query
4. Copy and paste the contents of `migrations/add-live-queue-tables.sql`
5. Run the query

This will create:
- `live_sessions` table - Tracks active live sessions
- `queue_entries` table - Tracks applicants in queues
- Necessary indexes and RLS policies
- Auto-skip functionality support

### Verify the Migration

Run this query to verify the tables were created:

```sql
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_name IN ('live_sessions', 'queue_entries')
ORDER BY table_name, ordinal_position;
```

## 2. Enable Real-time Subscriptions

1. In Supabase Dashboard, go to **Database** → **Replication**
2. Enable replication for these tables:
   - `live_sessions`
   - `queue_entries`
3. Click **Save**

This allows real-time updates for queue positions and status changes.

## 3. Environment Variables

Make sure these environment variables are set in your `.env.local` (and in Vercel):

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Resend (for email notifications)
RESEND_API_KEY=your_resend_api_key

# Optional: Cron job authentication
CRON_SECRET=your_random_secret_string
```

## 4. Deploy to Vercel

### Set Up Cron Job

The `vercel.json` file already configures a cron job to auto-skip expired queue entries every minute:

```json
{
  "crons": [
    {
      "path": "/api/live-queue/auto-skip",
      "schedule": "* * * * *"
    }
  ]
}
```

### Deploy Steps

1. **Commit all changes:**
   ```bash
   git add .
   git commit -m "Add live queue feature"
   git push
   ```

2. **Vercel will automatically deploy** if you have auto-deployment enabled

3. **Verify the cron job:**
   - Go to your Vercel project dashboard
   - Navigate to **Settings** → **Crons**
   - You should see the auto-skip job running every minute

## 5. Testing the Feature

### As a Reviewer (Roaster):

1. Log in as a reviewer
2. Click the **🔴 Live Queue** tab
3. Click **Go Live**
4. Select a duration (30 min to 3 hours)
5. You should see the live session controls
6. When applicants join, click **Start Next** to begin a roast
7. The meeting link will open automatically
8. Click **Complete** when done to move to the next person

### As an Applicant:

1. Log in as an applicant
2. Click the **🔴 Live Queue** tab
3. You should see all live roasters
4. Click **Join Queue** on a roaster
5. You'll see your position in real-time (e.g., "Position #3")
6. When it's your turn, you'll see "It's your turn! You have 2 minutes"
7. Click **Join Now!** to enter the roast session
8. You'll also receive an email notification

## 6. How It Works

### Session Flow

1. **Reviewer goes live**
   - Creates a `live_sessions` record with status='active'
   - Sets end time based on selected duration
   - Queue limit set to 10

2. **Applicants join queue**
   - Creates `queue_entries` record with status='waiting'
   - Position calculated based on current queue size
   - Real-time updates via Supabase subscriptions

3. **Reviewer processes next**
   - Next entry status changed to 'your_turn'
   - Meeting record created with Jitsi link
   - Email notification sent to applicant
   - 2-minute countdown starts

4. **Applicant joins or gets skipped**
   - If joins: status='joined', meeting starts
   - If doesn't join in 2 min: auto-skip cron job sets status='skipped'
   - Queue automatically moves to next person

5. **Completion**
   - Entry status='completed'
   - Queue size decremented
   - Reviewer can process next person

### Real-time Updates

The feature uses Supabase Realtime subscriptions for:
- Queue position changes
- "Your turn" notifications
- Live roaster list updates
- Session status changes

### Auto-skip Mechanism

A Vercel cron job runs every minute (`/api/live-queue/auto-skip`):
- Finds all queue entries with status='your_turn'
- Checks if `notified_at` timestamp is > 2 minutes ago
- Automatically skips expired entries
- Moves to next person in queue

## 7. Monitoring and Maintenance

### Check Active Sessions

```sql
SELECT
  ls.*,
  p.name as reviewer_name,
  p.email as reviewer_email
FROM live_sessions ls
JOIN profiles p ON p.id = ls.reviewer_id
WHERE ls.status = 'active'
  AND ls.ends_at > NOW();
```

### Check Queue Status

```sql
SELECT
  qe.*,
  p.name as applicant_name,
  ls.reviewer_id
FROM queue_entries qe
JOIN profiles p ON p.id = qe.applicant_id
JOIN live_sessions ls ON ls.id = qe.live_session_id
WHERE qe.status IN ('waiting', 'your_turn', 'joined')
ORDER BY qe.created_at;
```

### Clean Up Old Sessions

Run this periodically to clean up old data:

```sql
-- Delete queue entries for ended sessions (older than 7 days)
DELETE FROM queue_entries
WHERE live_session_id IN (
  SELECT id FROM live_sessions
  WHERE status = 'ended'
    AND created_at < NOW() - INTERVAL '7 days'
);

-- Delete old ended sessions (older than 7 days)
DELETE FROM live_sessions
WHERE status = 'ended'
  AND created_at < NOW() - INTERVAL '7 days';
```

## 8. Customization Options

### Adjust Queue Size

Change the max queue size in [lib/live-queue.ts](lib/live-queue.ts:8):

```typescript
const MAX_QUEUE_SIZE = 10 // Change to your preferred limit
```

### Adjust Turn Timeout

Change the 2-minute timeout in [lib/live-queue.ts](lib/live-queue.ts:7):

```typescript
const TURN_TIMEOUT_MINUTES = 2 // Change to your preferred timeout
```

### Customize Email Template

Edit the email in [app/api/live-queue/process-next/route.ts](app/api/live-queue/process-next/route.ts:50-75)

## 9. Troubleshooting

### Queue positions not updating
- Check Supabase Realtime is enabled for `queue_entries` table
- Check browser console for WebSocket errors
- Verify RLS policies allow reading queue entries

### Auto-skip not working
- Check cron job is running in Vercel dashboard
- Test manually: `curl -X POST https://your-domain.vercel.app/api/live-queue/auto-skip`
- Check server logs in Vercel

### Email notifications not sending
- Verify `RESEND_API_KEY` is set in environment variables
- Check Resend dashboard for delivery status
- Verify email addresses are valid

### TypeScript errors
- Run `npm run build` to check for type errors
- Make sure `database.types.ts` is up to date with your Supabase schema

## 10. Feature Architecture

### Key Files

| File | Purpose |
|------|---------|
| `lib/live-queue.ts` | Core business logic for queue management |
| `lib/database.types.ts` | TypeScript types for database tables |
| `migrations/add-live-queue-tables.sql` | Database migration |
| `components/LiveSessionControl.tsx` | Reviewer UI for managing live sessions |
| `components/LiveRoastersList.tsx` | Applicant UI for viewing/joining queues |
| `app/api/live-queue/process-next/route.ts` | API for processing next in queue + emails |
| `app/api/live-queue/auto-skip/route.ts` | Cron job endpoint for auto-skip |
| `app/dashboard/page.tsx` | Main dashboard with Live Queue tab |
| `vercel.json` | Cron job configuration |

### Database Schema

**live_sessions**
- `id` - UUID primary key
- `reviewer_id` - FK to profiles
- `started_at` - Session start time
- `ends_at` - Session end time
- `max_queue_size` - Maximum queue capacity (default 10)
- `current_queue_size` - Current number in queue
- `status` - 'active' | 'paused' | 'ended'

**queue_entries**
- `id` - UUID primary key
- `live_session_id` - FK to live_sessions
- `applicant_id` - FK to profiles
- `position` - Queue position number
- `status` - 'waiting' | 'your_turn' | 'skipped' | 'joined' | 'completed'
- `notified_at` - When user was notified it's their turn
- `joined_at` - When user joined the session
- `completed_at` - When session was completed
- `meeting_id` - FK to meetings (for video link)

## 11. Future Enhancements

Potential improvements to consider:

1. **Priority queue for live sessions** - Industry matches go first
2. **Multiple roast types in live mode** - Let applicants specify what they want roasted
3. **Session recording** - Save Jitsi sessions for later review
4. **Analytics dashboard** - Track queue metrics, average wait times
5. **Browser notifications** - Push notifications when it's your turn
6. **Queue position estimates** - Show estimated wait time
7. **Batch mode** - Accept multiple people at once for group roasts
8. **Tips/donations** - Allow applicants to tip roasters
9. **Calendar integration** - Schedule live sessions in advance
10. **Mobile app** - Better mobile experience for on-the-go roasting

## Support

If you encounter any issues:
1. Check the troubleshooting section above
2. Review Vercel logs for errors
3. Check Supabase logs for database issues
4. Open an issue on GitHub with detailed error messages

---

**Built with:**
- Next.js 15
- Supabase (PostgreSQL + Realtime)
- Jitsi Meet (video calls)
- Resend (email notifications)
- Vercel (hosting + cron jobs)
