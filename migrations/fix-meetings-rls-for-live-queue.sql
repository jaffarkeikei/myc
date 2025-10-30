-- Fix RLS policies for meetings table to allow reviewers to create meetings
-- This is needed for the live queue feature where reviewers create meetings directly

-- Drop existing restrictive policies if they exist
DROP POLICY IF EXISTS "Users can insert their own meetings" ON public.meetings;
DROP POLICY IF EXISTS "Applicants can insert meetings" ON public.meetings;

-- Allow users to insert meetings where they are either the applicant OR the reviewer
CREATE POLICY "Users can create meetings as applicant or reviewer"
ON public.meetings FOR INSERT
WITH CHECK (
  auth.uid() = applicant_id OR auth.uid() = reviewer_id
);

-- Verify the policy was created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'meetings' AND cmd = 'INSERT';
