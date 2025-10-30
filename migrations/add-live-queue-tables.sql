-- Migration: Add live_sessions and queue_entries tables for live queue feature
-- Run this in your Supabase SQL Editor

-- Create enum for live session status
DO $$ BEGIN
    CREATE TYPE live_session_status AS ENUM ('active', 'paused', 'ended');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create enum for queue entry status
DO $$ BEGIN
    CREATE TYPE queue_entry_status AS ENUM ('waiting', 'your_turn', 'skipped', 'joined', 'completed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create live_sessions table
CREATE TABLE IF NOT EXISTS public.live_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reviewer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    ends_at TIMESTAMP WITH TIME ZONE NOT NULL,
    max_queue_size INTEGER NOT NULL DEFAULT 10,
    current_queue_size INTEGER NOT NULL DEFAULT 0,
    status live_session_status NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create queue_entries table
CREATE TABLE IF NOT EXISTS public.queue_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    live_session_id UUID NOT NULL REFERENCES public.live_sessions(id) ON DELETE CASCADE,
    applicant_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    status queue_entry_status NOT NULL DEFAULT 'waiting',
    notified_at TIMESTAMP WITH TIME ZONE,
    joined_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    meeting_id UUID REFERENCES public.meetings(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_live_sessions_reviewer_id
ON public.live_sessions(reviewer_id);

CREATE INDEX IF NOT EXISTS idx_live_sessions_status
ON public.live_sessions(status)
WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_queue_entries_session_id
ON public.queue_entries(live_session_id);

CREATE INDEX IF NOT EXISTS idx_queue_entries_applicant_id
ON public.queue_entries(applicant_id);

CREATE INDEX IF NOT EXISTS idx_queue_entries_status
ON public.queue_entries(status);

CREATE INDEX IF NOT EXISTS idx_queue_entries_position
ON public.queue_entries(live_session_id, position);

-- Add unique constraint to prevent duplicate queue entries
CREATE UNIQUE INDEX IF NOT EXISTS idx_queue_entries_unique_applicant_session
ON public.queue_entries(live_session_id, applicant_id)
WHERE status NOT IN ('completed', 'skipped');

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_live_sessions_updated_at ON public.live_sessions;
CREATE TRIGGER update_live_sessions_updated_at
    BEFORE UPDATE ON public.live_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_queue_entries_updated_at ON public.queue_entries;
CREATE TRIGGER update_queue_entries_updated_at
    BEFORE UPDATE ON public.queue_entries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE public.live_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.queue_entries ENABLE ROW LEVEL SECURITY;

-- RLS Policies for live_sessions
-- Reviewers can view their own live sessions
CREATE POLICY "Reviewers can view their own live sessions"
ON public.live_sessions FOR SELECT
USING (auth.uid() = reviewer_id);

-- Reviewers can insert their own live sessions
CREATE POLICY "Reviewers can create their own live sessions"
ON public.live_sessions FOR INSERT
WITH CHECK (auth.uid() = reviewer_id);

-- Reviewers can update their own live sessions
CREATE POLICY "Reviewers can update their own live sessions"
ON public.live_sessions FOR UPDATE
USING (auth.uid() = reviewer_id);

-- Everyone can view active live sessions
CREATE POLICY "Anyone can view active live sessions"
ON public.live_sessions FOR SELECT
USING (status = 'active');

-- RLS Policies for queue_entries
-- Applicants can view their own queue entries
CREATE POLICY "Applicants can view their own queue entries"
ON public.queue_entries FOR SELECT
USING (auth.uid() = applicant_id);

-- Reviewers can view queue entries for their live sessions
CREATE POLICY "Reviewers can view queue entries for their sessions"
ON public.queue_entries FOR SELECT
USING (
    live_session_id IN (
        SELECT id FROM public.live_sessions
        WHERE reviewer_id = auth.uid()
    )
);

-- Applicants can insert queue entries
CREATE POLICY "Applicants can join queues"
ON public.queue_entries FOR INSERT
WITH CHECK (auth.uid() = applicant_id);

-- Reviewers can update queue entries for their sessions
CREATE POLICY "Reviewers can update queue entries for their sessions"
ON public.queue_entries FOR UPDATE
USING (
    live_session_id IN (
        SELECT id FROM public.live_sessions
        WHERE reviewer_id = auth.uid()
    )
);

-- Applicants can update their own queue entries (e.g., to mark as joined)
CREATE POLICY "Applicants can update their own queue entries"
ON public.queue_entries FOR UPDATE
USING (auth.uid() = applicant_id);

-- Grant access to authenticated users
GRANT SELECT, INSERT, UPDATE ON public.live_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.queue_entries TO authenticated;

-- Verify the tables were created
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_name IN ('live_sessions', 'queue_entries')
ORDER BY table_name, ordinal_position;
