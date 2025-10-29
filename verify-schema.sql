-- Quick verification that schema-updates.sql was applied correctly
-- Run this in Supabase SQL Editor

-- 1. Check new tables exist
SELECT 'Tables Check' as test_name,
       COUNT(*) as found,
       2 as expected
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('request_tracking', 'request_history');

-- 2. Check profiles columns
SELECT 'Profiles Columns' as test_name,
       COUNT(*) as found,
       2 as expected
FROM information_schema.columns
WHERE table_name = 'profiles'
AND column_name IN ('featured_until', 'last_featured');

-- 3. Check meetings columns
SELECT 'Meetings Columns' as test_name,
       COUNT(*) as found,
       2 as expected
FROM information_schema.columns
WHERE table_name = 'meetings'
AND column_name IN ('accepted_at', 'expires_at');

-- 4. Check helper functions
SELECT 'Helper Functions' as test_name,
       COUNT(*) as found,
       4 as expected
FROM pg_proc
WHERE proname IN (
  'check_daily_request_limit',
  'is_in_cooldown',
  'has_requested_roaster',
  'get_featured_roaster'
);

-- 5. Check indexes exist
SELECT 'Indexes' as test_name,
       COUNT(*) as found,
       '7+' as expected_note
FROM pg_indexes
WHERE schemaname = 'public'
AND indexname LIKE 'idx_%';

-- If all checks show "found = expected", schema is correctly applied!
