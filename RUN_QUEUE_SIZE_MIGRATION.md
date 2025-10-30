# IMPORTANT: Run This Migration to Fix Queue Size Bug

## The Problem
The queue size counter shows "0/10 in queue" even when people join the queue.

**Root Cause**: RLS (Row Level Security) policies prevent applicants from updating the `current_queue_size` field in the `live_sessions` table. Only the reviewer (session owner) can update their sessions, but when an applicant joins, the code tries to increment the counter and fails silently.

## The Solution
Created database functions that bypass RLS to safely update queue sizes.

## How to Run the Migration

### Option 1: Via Supabase Dashboard (Recommended)
1. Go to your Supabase project: https://supabase.com/dashboard
2. Click on **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy the contents of `migrations/fix-live-sessions-queue-size-update.sql`
5. Paste into the SQL editor
6. Click **Run** (or press Cmd/Ctrl + Enter)
7. You should see: "Success. No rows returned"

### Option 2: Via Supabase CLI (if you have it installed)
```bash
supabase db push --db-url "your-postgres-connection-string"
```

### Option 3: Copy SQL Directly
```sql
-- Run this in Supabase SQL Editor

CREATE OR REPLACE FUNCTION public.increment_queue_size(session_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.live_sessions
  SET current_queue_size = current_queue_size + 1,
      updated_at = now()
  WHERE id = session_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.decrement_queue_size(session_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.live_sessions
  SET current_queue_size = GREATEST(0, current_queue_size - 1),
      updated_at = now()
  WHERE id = session_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_queue_size(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decrement_queue_size(uuid) TO authenticated;
```

## Verify the Migration Worked

After running the migration, verify in Supabase SQL Editor:

```sql
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('increment_queue_size', 'decrement_queue_size');
```

You should see both functions listed.

## Testing the Fix

1. **Deploy the code changes** (already done)
2. **Run the migration** (follow steps above)
3. **Test**:
   - User A: Go Live as roaster
   - User B: Join queue → Should see "1/10 in queue"
   - User C: Join queue → Should see "2/10 in queue"
   - Both User B and C should see the correct counts!

## What Changed in the Code

### Before (Broken):
```typescript
// Direct update - blocked by RLS
await supabase.from('live_sessions')
  .update({ current_queue_size: session.current_queue_size + 1 })
  .eq('id', sessionId)
```

### After (Fixed):
```typescript
// Uses database function that bypasses RLS
await supabase.rpc('increment_queue_size', {
  session_id: sessionId
})
```

## Why This is Safe

The `SECURITY DEFINER` functions:
- Only update the `current_queue_size` field (nothing else)
- Use `GREATEST(0, ...)` to prevent negative counts
- Are executed with function owner's privileges (bypasses RLS)
- Are only callable by authenticated users
- Cannot be exploited to update arbitrary data

This is a standard pattern for allowing controlled updates through RLS.
