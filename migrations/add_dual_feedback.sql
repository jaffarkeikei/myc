-- Migration: Add dual-sided feedback and completion tracking
-- This allows both applicant and reviewer to give feedback and mark completion separately

-- Add new columns to meetings table
ALTER TABLE meetings
ADD COLUMN IF NOT EXISTS applicant_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS reviewer_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS applicant_feedback_helpful BOOLEAN,
ADD COLUMN IF NOT EXISTS applicant_notes TEXT,
ADD COLUMN IF NOT EXISTS reviewer_feedback_helpful BOOLEAN,
ADD COLUMN IF NOT EXISTS reviewer_notes TEXT;

-- Migrate existing feedback data to reviewer fields (since it was reviewer-only before)
-- Only migrate if the old fields have data and new fields are null
UPDATE meetings
SET
  reviewer_feedback_helpful = feedback_helpful,
  reviewer_notes = notes,
  reviewer_completed = (status = 'completed')
WHERE feedback_helpful IS NOT NULL OR notes IS NOT NULL OR status = 'completed';

-- Note: We keep the old columns (notes, feedback_helpful) for backwards compatibility
-- They can be removed in a future migration after all data is migrated

COMMENT ON COLUMN meetings.applicant_completed IS 'Whether the applicant has marked the meeting as complete';
COMMENT ON COLUMN meetings.reviewer_completed IS 'Whether the reviewer has marked the meeting as complete';
COMMENT ON COLUMN meetings.applicant_feedback_helpful IS 'Applicant feedback: was the roast helpful?';
COMMENT ON COLUMN meetings.applicant_notes IS 'Applicant feedback notes';
COMMENT ON COLUMN meetings.reviewer_feedback_helpful IS 'Reviewer feedback: was the session productive?';
COMMENT ON COLUMN meetings.reviewer_notes IS 'Reviewer feedback notes';
