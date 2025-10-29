-- COMPLETE RLS SETUP FOR ALL MYC TABLES
-- Run this in Supabase SQL Editor to fix all permission issues
-- This will drop all existing policies and create fresh ones

-- ============================================
-- 1. PROFILES TABLE
-- ============================================

-- Drop all existing policies on profiles
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'profiles' AND schemaname = 'public')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON profiles', r.policyname);
    END LOOP;
END $$;

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view all profiles"
ON profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE TO authenticated
USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE POLICY "Service role has full access to profiles"
ON profiles FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================
-- 2. MEETINGS TABLE
-- ============================================

-- Drop all existing policies on meetings
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'meetings' AND schemaname = 'public')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON meetings', r.policyname);
    END LOOP;
END $$;

ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;

-- View: Both applicants and reviewers can see their meetings
CREATE POLICY "Users can view their own meetings"
ON meetings FOR SELECT TO authenticated
USING (auth.uid() = applicant_id OR auth.uid() = reviewer_id);

-- Insert: Only applicants can create requests
CREATE POLICY "Applicants can create meeting requests"
ON meetings FOR INSERT TO authenticated
WITH CHECK (auth.uid() = applicant_id);

-- Update: Both parties can update their meetings
CREATE POLICY "Users can update their meetings"
ON meetings FOR UPDATE TO authenticated
USING (auth.uid() = applicant_id OR auth.uid() = reviewer_id)
WITH CHECK (auth.uid() = applicant_id OR auth.uid() = reviewer_id);

-- Delete: Users can delete their own meetings
CREATE POLICY "Users can delete their meetings"
ON meetings FOR DELETE TO authenticated
USING (auth.uid() = applicant_id OR auth.uid() = reviewer_id);

CREATE POLICY "Service role has full access to meetings"
ON meetings FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================
-- 3. REQUEST_TRACKING TABLE
-- ============================================

-- Check if table exists first
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'request_tracking') THEN
        -- Drop all existing policies
        DECLARE r RECORD;
        BEGIN
            FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'request_tracking' AND schemaname = 'public')
            LOOP
                EXECUTE format('DROP POLICY IF EXISTS %I ON request_tracking', r.policyname);
            END LOOP;
        END;

        ALTER TABLE request_tracking ENABLE ROW LEVEL SECURITY;

        CREATE POLICY "Users can view their own request tracking"
        ON request_tracking FOR SELECT TO authenticated
        USING (auth.uid() = applicant_id);

        CREATE POLICY "Users can insert their own request tracking"
        ON request_tracking FOR INSERT TO authenticated
        WITH CHECK (auth.uid() = applicant_id);

        CREATE POLICY "Users can update their own request tracking"
        ON request_tracking FOR UPDATE TO authenticated
        USING (auth.uid() = applicant_id) WITH CHECK (auth.uid() = applicant_id);

        CREATE POLICY "Service role has full access to request_tracking"
        ON request_tracking FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
END $$;

-- ============================================
-- 4. REQUEST_HISTORY TABLE
-- ============================================

DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'request_history') THEN
        -- Drop all existing policies
        DECLARE r RECORD;
        BEGIN
            FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'request_history' AND schemaname = 'public')
            LOOP
                EXECUTE format('DROP POLICY IF EXISTS %I ON request_history', r.policyname);
            END LOOP;
        END;

        ALTER TABLE request_history ENABLE ROW LEVEL SECURITY;

        CREATE POLICY "Users can view their own request history"
        ON request_history FOR SELECT TO authenticated
        USING (auth.uid() = applicant_id);

        CREATE POLICY "Users can insert their own request history"
        ON request_history FOR INSERT TO authenticated
        WITH CHECK (auth.uid() = applicant_id);

        CREATE POLICY "Service role has full access to request_history"
        ON request_history FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
END $$;

-- ============================================
-- VERIFY ALL POLICIES
-- ============================================

SELECT
  tablename,
  policyname,
  cmd,
  roles,
  CASE
    WHEN cmd = 'SELECT' THEN 'Read'
    WHEN cmd = 'INSERT' THEN 'Create'
    WHEN cmd = 'UPDATE' THEN 'Update'
    WHEN cmd = 'DELETE' THEN 'Delete'
    WHEN cmd = 'ALL' THEN 'Full Access'
  END as permission_type
FROM pg_policies
WHERE tablename IN ('profiles', 'meetings', 'request_tracking', 'request_history')
ORDER BY tablename, policyname;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ RLS policies configured successfully for all tables!';
END $$;
