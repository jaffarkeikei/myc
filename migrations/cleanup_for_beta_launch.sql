-- Beta Launch Data Cleanup Script
-- This script cleans all test data while preserving user profiles
-- Run this before launching to beta users

-- Start transaction
BEGIN;

-- 1. Delete all queue entries (live session queue data)
DELETE FROM queue_entries;
COMMENT ON TABLE queue_entries IS 'Cleaned for beta launch';

-- 2. End all active live sessions and clean history
UPDATE live_sessions SET status = 'ended' WHERE status = 'active';
DELETE FROM live_sessions;
COMMENT ON TABLE live_sessions IS 'Cleaned for beta launch';

-- 3. Delete all meetings (test roast sessions)
DELETE FROM meetings;
COMMENT ON TABLE meetings IS 'Cleaned for beta launch';

-- 4. Reset roast counts for all profiles
UPDATE profiles SET roast_count = 0;
COMMENT ON COLUMN profiles.roast_count IS 'Reset for beta launch';

-- 5. Clear request tracking and history
DELETE FROM request_tracking;
DELETE FROM request_history;
COMMENT ON TABLE request_tracking IS 'Cleaned for beta launch';
COMMENT ON TABLE request_history IS 'Cleaned for beta launch';

-- 6. Show final state
SELECT
  'meetings' as table_name, COUNT(*) as remaining_records
FROM meetings
UNION ALL
SELECT 'queue_entries', COUNT(*) FROM queue_entries
UNION ALL
SELECT 'live_sessions', COUNT(*) FROM live_sessions
UNION ALL
SELECT 'request_tracking', COUNT(*) FROM request_tracking
UNION ALL
SELECT 'request_history', COUNT(*) FROM request_history
UNION ALL
SELECT 'profiles', COUNT(*) FROM profiles;

-- Show profile summary after cleanup
SELECT
  role,
  COUNT(*) as user_count,
  SUM(roast_count) as total_roasts,
  COUNT(CASE WHEN is_available THEN 1 END) as available_count
FROM profiles
GROUP BY role;

COMMIT;

-- Data cleanup complete!
-- All test data removed, roast counts reset
-- User profiles preserved for beta launch
