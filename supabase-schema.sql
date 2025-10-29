-- MYC Database Schema for Supabase

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table (extends Supabase auth.users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('applicant', 'reviewer')),
  industry TEXT,
  quick_context TEXT CHECK (char_length(quick_context) <= 80),
  roast_preferences TEXT[] DEFAULT '{}',
  roast_count INTEGER DEFAULT 0,
  is_available BOOLEAN DEFAULT TRUE,
  email TEXT,
  name TEXT,
  company TEXT,
  yc_batch TEXT,
  linkedin TEXT,
  x_twitter TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Meetings table
CREATE TABLE public.meetings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  applicant_id UUID REFERENCES public.profiles(id) NOT NULL,
  reviewer_id UUID REFERENCES public.profiles(id) NOT NULL,
  roast_type TEXT NOT NULL CHECK (roast_type IN ('application', 'pitch', 'idea')),
  status TEXT NOT NULL CHECK (status IN ('requested', 'accepted', 'completed', 'cancelled')) DEFAULT 'requested',
  meeting_link TEXT,
  notes TEXT,
  feedback_helpful BOOLEAN,
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  scheduled_for TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for performance
CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_profiles_available ON public.profiles(is_available);
CREATE INDEX idx_meetings_applicant ON public.meetings(applicant_id);
CREATE INDEX idx_meetings_reviewer ON public.meetings(reviewer_id);
CREATE INDEX idx_meetings_status ON public.meetings(status);

-- Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Meetings policies
CREATE POLICY "Users can view own meetings" ON public.meetings
  FOR SELECT USING (
    auth.uid() = applicant_id OR auth.uid() = reviewer_id
  );

CREATE POLICY "Applicants can create meetings" ON public.meetings
  FOR INSERT WITH CHECK (
    auth.uid() = applicant_id
  );

CREATE POLICY "Users can update own meetings" ON public.meetings
  FOR UPDATE USING (
    auth.uid() = applicant_id OR auth.uid() = reviewer_id
  );

-- Function to automatically create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (new.id, new.email, 'applicant');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for auto-creating profiles
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to increment roast count
CREATE OR REPLACE FUNCTION public.increment_roast_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    -- Increment reviewer's roast count
    UPDATE public.profiles
    SET roast_count = roast_count + 1
    WHERE id = NEW.reviewer_id;

    -- Increment applicant's roast count
    UPDATE public.profiles
    SET roast_count = roast_count + 1
    WHERE id = NEW.applicant_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for roast count
CREATE TRIGGER on_meeting_completed
  AFTER UPDATE ON public.meetings
  FOR EACH ROW EXECUTE FUNCTION public.increment_roast_count();