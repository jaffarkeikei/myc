-- Fix: Allow system to update queue size for live sessions
-- The issue: When applicants join a queue, the joinQueue function tries to increment
-- current_queue_size, but RLS blocks this because only reviewers can update their sessions.

-- Solution: Create a database function that bypasses RLS to update queue size

-- Function to increment queue size (bypasses RLS)
CREATE OR REPLACE FUNCTION public.increment_queue_size(session_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER  -- This runs with the privileges of the function owner, bypassing RLS
SET search_path = public
AS $$
BEGIN
  UPDATE public.live_sessions
  SET current_queue_size = current_queue_size + 1,
      updated_at = now()
  WHERE id = session_id;
END;
$$;

-- Function to decrement queue size (bypasses RLS)
CREATE OR REPLACE FUNCTION public.decrement_queue_size(session_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER  -- This runs with the privileges of the function owner, bypassing RLS
SET search_path = public
AS $$
BEGIN
  UPDATE public.live_sessions
  SET current_queue_size = GREATEST(0, current_queue_size - 1),
      updated_at = now()
  WHERE id = session_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.increment_queue_size(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decrement_queue_size(uuid) TO authenticated;

-- Verify the functions were created
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('increment_queue_size', 'decrement_queue_size');
