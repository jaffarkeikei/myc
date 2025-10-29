-- MYC Database Schema Updates for Matching & Meeting Flow

-- 1. Add new columns to meetings table
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMP;
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP;

-- 2. Add featured roaster tracking to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS featured_until TIMESTAMP;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_featured TIMESTAMP;

-- 3. Create request tracking table for daily limits
CREATE TABLE IF NOT EXISTS request_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  applicant_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  request_count INTEGER DEFAULT 0,
  last_rejection_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(applicant_id, date)
);

-- 4. Create request history to prevent duplicate requests to same roaster
CREATE TABLE IF NOT EXISTS request_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  applicant_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  reviewer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  requested_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(applicant_id, reviewer_id)
);

-- 5. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_meetings_status ON meetings(status);
CREATE INDEX IF NOT EXISTS idx_meetings_reviewer ON meetings(reviewer_id, status);
CREATE INDEX IF NOT EXISTS idx_meetings_applicant ON meetings(applicant_id, status);
CREATE INDEX IF NOT EXISTS idx_profiles_featured ON profiles(featured_until);
CREATE INDEX IF NOT EXISTS idx_profiles_industry ON profiles(industry);
CREATE INDEX IF NOT EXISTS idx_request_tracking_applicant_date ON request_tracking(applicant_id, date);
CREATE INDEX IF NOT EXISTS idx_request_history_applicant ON request_history(applicant_id);

-- 6. Row Level Security Policies

-- request_tracking policies
ALTER TABLE request_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own request tracking"
  ON request_tracking FOR SELECT
  USING (auth.uid() = applicant_id);

CREATE POLICY "Users can insert their own request tracking"
  ON request_tracking FOR INSERT
  WITH CHECK (auth.uid() = applicant_id);

CREATE POLICY "Users can update their own request tracking"
  ON request_tracking FOR UPDATE
  USING (auth.uid() = applicant_id);

-- request_history policies
ALTER TABLE request_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own request history"
  ON request_history FOR SELECT
  USING (auth.uid() = applicant_id);

CREATE POLICY "Users can insert their own request history"
  ON request_history FOR INSERT
  WITH CHECK (auth.uid() = applicant_id);

-- 7. Helper function to check daily limits
CREATE OR REPLACE FUNCTION check_daily_request_limit(user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  request_count INTEGER;
BEGIN
  SELECT COALESCE(rt.request_count, 0)
  INTO request_count
  FROM request_tracking rt
  WHERE rt.applicant_id = user_id
    AND rt.date = CURRENT_DATE;

  RETURN COALESCE(request_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Helper function to check cooldown period
CREATE OR REPLACE FUNCTION is_in_cooldown(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  last_rejection TIMESTAMP;
BEGIN
  SELECT rt.last_rejection_at
  INTO last_rejection
  FROM request_tracking rt
  WHERE rt.applicant_id = user_id
  ORDER BY rt.last_rejection_at DESC
  LIMIT 1;

  IF last_rejection IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Check if 48 hours have passed
  RETURN (CURRENT_TIMESTAMP - last_rejection) < INTERVAL '48 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Helper function to check if already requested from roaster
CREATE OR REPLACE FUNCTION has_requested_roaster(user_id UUID, roaster_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  exists_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO exists_count
  FROM request_history
  WHERE applicant_id = user_id
    AND reviewer_id = roaster_id;

  RETURN exists_count > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Function to increment request count
CREATE OR REPLACE FUNCTION increment_request_count(user_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO request_tracking (applicant_id, date, request_count)
  VALUES (user_id, CURRENT_DATE, 1)
  ON CONFLICT (applicant_id, date)
  DO UPDATE SET request_count = request_tracking.request_count + 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Function to get featured roaster
CREATE OR REPLACE FUNCTION get_featured_roaster()
RETURNS TABLE (
  id UUID,
  name TEXT,
  company TEXT,
  industry TEXT,
  yc_batch TEXT,
  roast_preferences TEXT[],
  roast_count INTEGER,
  is_available BOOLEAN,
  email TEXT
) AS $$
BEGIN
  -- First try to get currently featured roaster
  RETURN QUERY
  SELECT p.id, p.name, p.company, p.industry, p.yc_batch,
         p.roast_preferences, p.roast_count, p.is_available, p.email
  FROM profiles p
  WHERE p.role = 'reviewer'
    AND p.is_available = TRUE
    AND p.featured_until > CURRENT_TIMESTAMP
  LIMIT 1;

  -- If no featured roaster, select one and mark as featured
  IF NOT FOUND THEN
    RETURN QUERY
    UPDATE profiles
    SET featured_until = CURRENT_TIMESTAMP + INTERVAL '24 hours',
        last_featured = CURRENT_TIMESTAMP
    WHERE id = (
      SELECT p.id
      FROM profiles p
      WHERE p.role = 'reviewer'
        AND p.is_available = TRUE
        AND (p.last_featured IS NULL OR p.last_featured < CURRENT_TIMESTAMP - INTERVAL '7 days')
      ORDER BY p.roast_count DESC, RANDOM()
      LIMIT 1
    )
    RETURNING id, name, company, industry, yc_batch, roast_preferences, roast_count, is_available, email;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
