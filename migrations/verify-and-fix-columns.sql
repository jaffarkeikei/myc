-- First, let's verify if the columns exist
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'profiles'
ORDER BY ordinal_position;

-- If the columns don't appear above, run this:
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS featured_until TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_featured TIMESTAMP WITH TIME ZONE;

-- Grant permissions on the new columns (important!)
GRANT SELECT, UPDATE ON public.profiles TO anon;
GRANT SELECT, UPDATE ON public.profiles TO authenticated;

-- Refresh the schema
NOTIFY pgrst, 'reload schema';

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_profiles_featured_until
ON public.profiles(featured_until)
WHERE role = 'reviewer' AND is_available = true;

-- Verify again
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'profiles'
  AND column_name IN ('featured_until', 'last_featured');
