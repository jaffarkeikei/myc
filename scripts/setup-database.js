const https = require('https');
const fs = require('fs');
const path = require('path');

// Read environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PROJECT_REF = SUPABASE_URL.match(/https:\/\/(.+)\.supabase\.co/)[1];

const schema = `
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if they exist
DROP TABLE IF EXISTS public.meetings CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

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
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
CREATE POLICY "Users can view all profiles" ON public.profiles
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Meetings policies
DROP POLICY IF EXISTS "Users can view own meetings" ON public.meetings;
CREATE POLICY "Users can view own meetings" ON public.meetings
  FOR SELECT USING (
    auth.uid() = applicant_id OR auth.uid() = reviewer_id
  );

DROP POLICY IF EXISTS "Applicants can create meetings" ON public.meetings;
CREATE POLICY "Applicants can create meetings" ON public.meetings
  FOR INSERT WITH CHECK (
    auth.uid() = applicant_id
  );

DROP POLICY IF EXISTS "Users can update own meetings" ON public.meetings;
CREATE POLICY "Users can update own meetings" ON public.meetings
  FOR UPDATE USING (
    auth.uid() = applicant_id OR auth.uid() = reviewer_id
  );

-- Function to automatically create profile on signup
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (new.id, new.email, 'applicant');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for auto-creating profiles
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to increment roast count
DROP FUNCTION IF EXISTS public.increment_roast_count() CASCADE;
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
DROP TRIGGER IF EXISTS on_meeting_completed ON public.meetings;
CREATE TRIGGER on_meeting_completed
  AFTER UPDATE ON public.meetings
  FOR EACH ROW EXECUTE FUNCTION public.increment_roast_count();

-- Function to prevent role changes after initial setup
DROP FUNCTION IF EXISTS public.prevent_role_change() CASCADE;
CREATE OR REPLACE FUNCTION public.prevent_role_change()
RETURNS TRIGGER AS $$
BEGIN
  -- If this is an update operation and the role is being changed
  IF TG_OP = 'UPDATE' AND OLD.role IS DISTINCT FROM NEW.role THEN
    RAISE EXCEPTION 'Role cannot be changed after initial setup';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to enforce immutable role
DROP TRIGGER IF EXISTS enforce_immutable_role ON public.profiles;
CREATE TRIGGER enforce_immutable_role
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_role_change();
`;

function executeSQL(sql) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ query: sql });

    const options = {
      hostname: `${PROJECT_REF}.supabase.co`,
      port: 443,
      path: '/rest/v1/rpc/exec',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Length': data.length
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(responseData);
        } else {
          reject(new Error(`Request failed with status ${res.statusCode}: ${responseData}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(data);
    req.end();
  });
}

async function setupDatabase() {
  console.log('🔥 Setting up MYC database...\n');

  try {
    console.log('📋 Executing SQL schema...');

    // We'll use the psql command instead since Supabase REST API doesn't support direct SQL execution
    const { execSync } = require('child_process');
    const sqlFile = path.join(__dirname, '..', 'supabase-schema-updated.sql');

    // Write the schema to a file
    fs.writeFileSync(sqlFile, schema);

    console.log('✅ Schema file created');
    console.log('\n📝 Please run the SQL from supabase-schema-updated.sql in your Supabase SQL Editor');
    console.log('   Or visit: https://supabase.com/dashboard/project/' + PROJECT_REF + '/sql');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

setupDatabase();
