# Live Queue Feature - Implementation Summary

## ✅ What Was Built

### 1. Database Schema
- **live_sessions table**: Tracks active live roasting sessions
- **queue_entries table**: Manages the queue of applicants waiting for their turn
- Complete with RLS policies, indexes, and automatic timestamp updates

### 2. Core Business Logic (`lib/live-queue.ts`)
- `goLive()` - Reviewer starts a live session
- `endLiveSession()` - End the live session
- `joinQueue()` - Applicant joins a queue
- `processNextInQueue()` - Move to next person and create meeting
- `confirmJoining()` - Applicant confirms they're joining
- `skipQueueEntry()` - Skip someone who didn't join
- `completeQueueEntry()` - Mark session as complete
- `autoSkipExpiredEntries()` - Auto-skip people who don't join within 2 minutes
- `getActiveLiveRoasters()` - Get all live roasters
- `getQueuePosition()` - Get applicant's position in queue
- `getSessionQueue()` - Get all entries for a session
- `getCurrentLiveSession()` - Get reviewer's active session

### 3. UI Components

#### For Reviewers - `LiveSessionControl.tsx`
- **"Go Live" modal**: Set duration (30min - 3hrs)
- **Live session dashboard**: Shows queue length, time remaining
- **Current session view**: See who you're currently roasting
- **"Process Next" button**: Automatically notify next person and open meeting
- **Queue list**: See everyone waiting with their position
- **Skip/Complete buttons**: Manage the current session
- Real-time polling every 5 seconds

#### For Applicants - `LiveRoastersList.tsx`
- **Live roasters grid**: See all active live roasters
- **Queue information**: See queue length and time remaining
- **Join queue button**: Join the queue with one click
- **Position display**: "You're #3 in queue"
- **"Your turn" alert**: Green banner when it's your turn
- **Join now button**: 2-minute window to join
- Real-time Supabase subscriptions for instant updates

### 4. API Routes

#### `/api/live-queue/process-next` (POST)
- Processes next person in queue
- Creates meeting with Jitsi link
- Sends email notification to applicant
- Returns meeting link to reviewer

#### `/api/live-queue/auto-skip` (GET/POST)
- Cron job endpoint (runs every minute)
- Auto-skips entries where notified_at > 2 minutes ago
- Protected with optional CRON_SECRET

### 5. Dashboard Integration
- New **"🔴 Live Queue"** tab for both roles
- Conditional rendering based on user role
- Seamless integration with existing roast request flow

### 6. Email Notifications
Uses Resend to send:
- "It's your turn!" email when applicant reaches front of queue
- 2-minute countdown warning
- Direct link to join the roast

### 7. Real-time Features
- **Supabase Realtime subscriptions** for instant queue updates
- **Polling** for live roaster list and queue positions
- **Automatic UI refresh** when status changes

### 8. Auto-Skip Mechanism
- **Vercel cron job** runs every minute
- Checks for expired "your_turn" entries
- Automatically skips and moves to next person
- Configured in `vercel.json`

## 📂 Files Created/Modified

### New Files
1. `migrations/add-live-queue-tables.sql` - Database migration
2. `lib/live-queue.ts` - Core business logic (500+ lines)
3. `components/LiveSessionControl.tsx` - Reviewer UI (350+ lines)
4. `components/LiveRoastersList.tsx` - Applicant UI (230+ lines)
5. `app/api/live-queue/process-next/route.ts` - Process next API
6. `app/api/live-queue/auto-skip/route.ts` - Auto-skip cron endpoint
7. `vercel.json` - Cron job configuration
8. `LIVE_QUEUE_SETUP.md` - Comprehensive setup guide
9. `LIVE_QUEUE_SUMMARY.md` - This file

### Modified Files
1. `lib/database.types.ts` - Added live_sessions and queue_entries types
2. `app/dashboard/page.tsx` - Added Live Queue tab and components

## 🚀 How to Deploy

1. **Run the database migration** in Supabase SQL Editor
2. **Enable Realtime** for live_sessions and queue_entries tables
3. **Deploy to Vercel** - cron job will auto-configure
4. **Test the feature** - see LIVE_QUEUE_SETUP.md for testing instructions

## 🎯 Key Features

✅ **For Reviewers:**
- Go live with custom duration
- Accept up to 10 people in queue
- Process one-by-one with automatic notifications
- Auto-skip if no join within 2 minutes
- Real-time queue updates

✅ **For Applicants:**
- See all live roasters
- Real-time queue position: "You're #3"
- Email + in-app notification when it's your turn
- 2-minute window to join
- Automatic Jitsi meeting link

✅ **Technical:**
- Full TypeScript types
- RLS security policies
- Real-time subscriptions
- Auto-cleanup via cron
- Email notifications via Resend
- Vercel-ready deployment

## 🔧 Configuration

### Adjustable Settings
- `MAX_QUEUE_SIZE = 10` - Maximum queue size (lib/live-queue.ts:9)
- `TURN_TIMEOUT_MINUTES = 2` - Time window to join (lib/live-queue.ts:8)
- Cron schedule: `* * * * *` - Every minute (vercel.json)

### Environment Variables Required
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `RESEND_API_KEY`
- `CRON_SECRET` (optional, for cron protection)

## 📊 Database Schema

### live_sessions
- Track active roasting sessions
- Max 10 people per queue
- Automatic expiration tracking
- Status: active/paused/ended

### queue_entries
- Position tracking
- Status flow: waiting → your_turn → joined/skipped → completed
- Links to meetings table for video calls
- Timestamps for all state changes

## 🎨 User Experience

### Reviewer Flow
1. Click "Go Live" → Select duration → Session starts
2. Applicants join queue automatically
3. Click "Start Next" → Opens meeting + notifies applicant
4. Roast session happens (10 min)
5. Click "Complete" → Next person is notified
6. Repeat until queue is empty or session ends

### Applicant Flow
1. See live roasters with queue info
2. Click "Join Queue" → Get position (#3)
3. Wait and watch position decrease in real-time
4. Get "Your turn!" notification (email + in-app)
5. Click "Join Now!" within 2 minutes
6. Enter Jitsi meeting room
7. Get roasted, learn, improve!

## 🛡️ Security

- **RLS policies**: Only see your own sessions and queue entries
- **Authentication required**: All operations require valid Supabase auth
- **Rate limiting**: Natural rate limiting via queue system
- **No data leaks**: Reviewers can't see other reviewers' queues
- **Cron protection**: Optional CRON_SECRET for auto-skip endpoint

## 🔮 Future Enhancements

Ideas for v2:
- Priority queue based on industry match
- Browser push notifications
- Queue position ETA estimates
- Session analytics dashboard
- Multiple roast types in live mode
- Group roast sessions
- Calendar scheduling for live sessions
- Mobile app for better notifications
- Tips/donations for roasters
- Session recordings

## 📈 Metrics to Track

Once deployed, monitor:
- Average queue wait time
- Join success rate (joined vs skipped)
- Most popular live times
- Average session duration
- Reviewer burnout indicators
- Applicant satisfaction scores

## 🙏 Credits

Built with:
- Next.js 15 + React 19
- Supabase (PostgreSQL + Realtime + Auth)
- Jitsi Meet (video calls)
- Resend (email notifications)
- Vercel (hosting + cron jobs)
- TypeScript + Tailwind CSS

---

**Status**: ✅ Ready to deploy
**Test Coverage**: Manual testing recommended
**Documentation**: Complete (see LIVE_QUEUE_SETUP.md)
