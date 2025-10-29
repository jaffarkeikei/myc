-- Fix RLS policies for meetings table
-- Run this in Supabase SQL Editor along with fix-rls-policies-v2.sql

-- Drop all existing policies on meetings table
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'meetings' AND schemaname = 'public')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON meetings', r.policyname);
    END LOOP;
END $$;

-- Enable RLS on meetings table
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;

-- Applicants can view their own meetings
CREATE POLICY "Applicants can view their own meetings"
ON meetings
FOR SELECT
TO authenticated
USING (auth.uid() = applicant_id);

-- Reviewers can view meetings they're involved in
CREATE POLICY "Reviewers can view their meetings"
ON meetings
FOR SELECT
TO authenticated
USING (auth.uid() = reviewer_id);

-- Applicants can create meetings (send requests)
CREATE POLICY "Applicants can create meeting requests"
ON meetings
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = applicant_id);

-- Reviewers can update meetings (accept/decline)
CREATE POLICY "Reviewers can update their meetings"
ON meetings
FOR UPDATE
TO authenticated
USING (auth.uid() = reviewer_id)
WITH CHECK (auth.uid() = reviewer_id);

-- Applicants can update their own meetings (e.g., mark complete from their side)
CREATE POLICY "Applicants can update their meetings"
ON meetings
FOR UPDATE
TO authenticated
USING (auth.uid() = applicant_id)
WITH CHECK (auth.uid() = applicant_id);

-- Service role has full access
CREATE POLICY "Service role has full access to meetings"
ON meetings
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Verify policies
SELECT
  tablename,
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE tablename = 'meetings'
ORDER BY policyname;
