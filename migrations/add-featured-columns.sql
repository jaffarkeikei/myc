-- Migration: Add featured_until and last_featured columns to profiles table
-- Run this in your Supabase SQL Editor

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS featured_until TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_featured TIMESTAMP WITH TIME ZONE;

-- Add index for better performance on featured queries
CREATE INDEX IF NOT EXISTS idx_profiles_featured_until
ON public.profiles(featured_until)
WHERE role = 'reviewer' AND is_available = true;

-- Verify the columns were added
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'profiles'
  AND column_name IN ('featured_until', 'last_featured');
