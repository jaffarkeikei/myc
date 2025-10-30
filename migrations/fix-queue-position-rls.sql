-- Fix: Allow applicants to see their correct position in queue
-- The issue: Applicants can only see their own queue entry due to RLS,
-- so they can't calculate their position relative to others

-- Solution: Create a database function that bypasses RLS to calculate position

-- Function to get an applicant's position in a queue (bypasses RLS)
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
SECURITY DEFINER  -- This runs with the privileges of the function owner, bypassing RLS
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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_queue_position(uuid, uuid) TO authenticated;

-- Verify the function was created
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name = 'get_queue_position';
