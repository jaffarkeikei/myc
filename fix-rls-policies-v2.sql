-- Fix RLS policies for profiles table to allow matching to work
-- Run this in Supabase SQL Editor

-- Drop ALL existing policies on profiles table
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'profiles' AND schemaname = 'public')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON profiles', r.policyname);
    END LOOP;
END $$;

-- Enable RLS on profiles table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to READ all profiles (needed for matching)
CREATE POLICY "Authenticated users can view all profiles"
ON profiles
FOR SELECT
TO authenticated
USING (true);

-- Users can only UPDATE their own profile
CREATE POLICY "Users can update own profile"
ON profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Users can only INSERT their own profile
CREATE POLICY "Users can insert own profile"
ON profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Allow service role full access (for system operations)
CREATE POLICY "Service role has full access to profiles"
ON profiles
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
WHERE tablename = 'profiles'
ORDER BY policyname;
