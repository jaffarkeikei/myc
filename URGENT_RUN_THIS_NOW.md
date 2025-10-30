# 🚨 URGENT: Run These 2 Migrations NOW to Fix Queue Issues

## Migration #1: Fix Queue Counter
## Migration #2: Fix Position Numbers (NEW!)

### ⚡ Quick Fix (2 minutes):

1. **Open this link**: https://supabase.com/dashboard/project/hoevksqthngrlsmrancx/sql

2. **Click "New Query"**

3. **Copy and paste this EXACT SQL** (no modifications needed):

```sql
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

4. **Click "Run"** (or press Cmd/Ctrl + Enter)

5. **You should see**: "Success. No rows returned"

6. **Done!** ✅ The queue counter will now work immediately!

---

## Why This is Needed

The code is deployed and ready, but it needs these database functions to exist. Without them:
- ❌ Queue counter stays at "0/10 in queue"
- ❌ Updates fail silently due to RLS policies

With them:
- ✅ Queue counter updates in real-time
- ✅ Shows "1/10", "2/10", etc. as people join
- ✅ Everyone sees the correct count

---

## Verify It Worked

After running the SQL, test immediately:
1. Go to your app
2. Go Live as a roaster
3. Join queue as an applicant
4. **The counter should now show "1/10 in queue"** ✅

If you still see "0/10", refresh the page and try again.

---

## 🚨 Migration #2: Fix Position Numbers (RUN THIS AFTER #1)

### The Problem
- Queue shows "2/10 in queue" but position shows "#1" for EVERYONE
- Roaster sees correct order, but applicants see wrong positions
- Due to RLS preventing applicants from seeing other entries

### ⚡ Run This SQL:

```sql
CREATE OR REPLACE FUNCTION public.get_queue_position(
  p_session_id uuid,
  p_applicant_id uuid
)
RETURNS TABLE(
  entry_id uuid,
  position_number integer,
  total_in_queue integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH ordered_entries AS (
    SELECT
      id,
      applicant_id,
      position,
      ROW_NUMBER() OVER (ORDER BY position ASC) as actual_position
    FROM public.queue_entries
    WHERE live_session_id = p_session_id
      AND status IN ('waiting', 'your_turn', 'joined')
  ),
  total_count AS (
    SELECT COUNT(*)::integer as total
    FROM public.queue_entries
    WHERE live_session_id = p_session_id
      AND status IN ('waiting', 'your_turn', 'joined')
  )
  SELECT
    oe.id as entry_id,
    oe.actual_position::integer as position_number,
    tc.total as total_in_queue
  FROM ordered_entries oe
  CROSS JOIN total_count tc
  WHERE oe.applicant_id = p_applicant_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_queue_position(uuid, uuid) TO authenticated;
```

---

## Screenshot Guide

If you're not sure where to go:

1. Go to https://supabase.com/dashboard
2. Click on your "myc" project
3. In the left sidebar, click **"SQL Editor"**
4. Click the **"+ New Query"** button
5. Paste the SQL code above
6. Click **"Run"** button (bottom right)

That's it! The fix takes effect immediately - no app restart needed.
