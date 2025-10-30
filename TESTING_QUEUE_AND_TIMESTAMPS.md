# Testing Guide: Queue Updates & Timestamps

## Changes Made

### 1. Added Timestamps to Roast History (MeetingList.tsx)
- Shows relative timestamps for all meetings ("just now", "5m ago", "2h ago", etc.)
- Displays different timestamps based on meeting status:
  - **Completed**: Shows when it was completed
  - **Accepted**: Shows when it was accepted
  - **Requested**: Shows when it was requested

### 2. Fixed Queue Update Issue (LiveRoastersList.tsx)
**Problem**: When there's one person in the queue, other users weren't seeing queue position updates in real-time.

**Root Cause**: The subscription was filtering for only that user's queue entries:
```typescript
filter: `applicant_id=eq.${applicantId}`
```

**Solution**: Now subscribes to ALL queue entry changes across all sessions, so when anyone joins/leaves, everyone's positions update:
```typescript
// No filter - subscribes to all changes
table: 'queue_entries'
```

Also added subscription to `live_sessions` table changes to update queue sizes in real-time.

## How to Test

### Test 1: Timestamps on Roast History
1. Log in as an applicant or roaster
2. Go to "My Roast Requests" or "All Roast Requests" tab
3. Look at your meeting history
4. **Expected**: Each meeting should show a timestamp like:
   - "Requested 5m ago"
   - "Accepted 2h ago"
   - "Completed 3d ago"
   - "just now" (if very recent)

### Test 2: Queue Position Updates (Requires 2+ Users)

#### Setup
1. Open app in 2 different browsers/incognito windows
2. User A: Log in as roaster, click "Go Live"
3. User B & C: Log in as different applicants

#### Test Steps
1. **User B**: Go to dashboard, should see the live session
2. **User B**: Click "Join Queue"
   - Should see "You're in queue - Position #1"
3. **User C**: Join the same queue
   - **User C** should see "Position #2"
   - **User B** should STILL see "Position #1" (this is what we fixed!)
4. **Roaster (User A)**: Click "Next Person"
   - **User B** should see "It's your turn!" notification
   - **User C** should now see "Position #1" (moved up!)
5. **User B**: Click "Join Now!"
   - **User B** enters meeting
   - **User C** confirms they still see "Position #1"

### Test 3: Real-time Queue Size Updates
1. Have multiple users join and leave queues
2. Watch the queue counter on live session cards
3. **Expected**: "👥 X/10 in queue" updates in real-time for all users

## What Gets Updated in Real-Time

### Before the Fix
- ❌ User's own queue position only updated when THEIR entry changed
- ❌ Other users joining didn't trigger position recalculation
- ❌ Led to stale queue positions

### After the Fix
- ✅ ALL queue entry changes trigger position updates for ALL users
- ✅ When anyone joins, everyone's position updates
- ✅ When someone leaves, positions recalculate immediately
- ✅ Live session changes also trigger updates

## Console Logs for Debugging
The fix includes console logs to help debug:
```
Queue entry changed: {...}
Live session changed: {...}
```

Check browser console to see when updates are triggered.

## Edge Cases to Test

1. **Empty Queue**: Make sure joining an empty queue shows "Position #1"
2. **Full Queue**: When queue reaches max size (10), button should say "Queue Full"
3. **Multiple Sessions**: Join multiple live sessions, ensure positions track independently
4. **Session Ends**: When roaster ends session, all waiting users should be notified
5. **Timeout**: If user doesn't join within 2 minutes, should be auto-skipped

## Technical Details

### Subscriptions Setup
```typescript
supabase.channel('queue-updates')
  .on('postgres_changes', {
    event: '*',           // INSERT, UPDATE, DELETE
    schema: 'public',
    table: 'queue_entries'  // No filter = all changes
  })
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'live_sessions'
  })
  .subscribe()
```

### Timestamp Format Logic
- < 1 minute: "just now"
- < 60 minutes: "Xm ago"
- < 24 hours: "Xh ago"
- < 7 days: "Xd ago"
- 7+ days: "Mon DD, YYYY"
