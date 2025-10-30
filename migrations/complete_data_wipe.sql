-- Complete Data Wipe for Beta Launch
-- This script deletes EVERYTHING including all profiles
-- Use this for a completely fresh start

BEGIN;

-- 1. Delete all queue entries
DELETE FROM queue_entries;

-- 2. Delete all live sessions
DELETE FROM live_sessions;

-- 3. Delete all meetings
DELETE FROM meetings;

-- 4. Delete all request tracking and history
DELETE FROM request_tracking;
DELETE FROM request_history;

-- 5. Delete ALL profiles (complete wipe)
DELETE FROM profiles;

-- 6. Show final state - should all be 0
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

COMMIT;

-- Complete data wipe finished!
-- Database is now completely empty and ready for beta users
