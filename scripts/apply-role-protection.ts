import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { readFileSync } from 'fs';

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

// Create Supabase admin client
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function applyMigration() {
  console.log('🔒 Applying role protection migration...\n');

  const sql = `
-- Function to prevent role changes after initial setup
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

-- Create trigger to enforce immutable role
DROP TRIGGER IF EXISTS enforce_immutable_role ON public.profiles;
CREATE TRIGGER enforce_immutable_role
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_role_change();
`;

  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql_string: sql });

    if (error) {
      // If the RPC doesn't exist, try direct execution
      console.log('⚠️  Direct SQL execution via RPC not available.');
      console.log('Please run the SQL manually in your Supabase SQL Editor:\n');
      console.log('📋 Copy and paste this SQL:\n');
      console.log('---START SQL---');
      console.log(sql);
      console.log('---END SQL---\n');
      console.log('Or use the file: scripts/prevent-role-changes.sql\n');
      console.log('🔗 Supabase SQL Editor: https://supabase.com/dashboard/project/hoevksqthngrlsmrancx/sql/new\n');
      return;
    }

    console.log('✅ Migration applied successfully!\n');
    console.log('🔒 Users can no longer change their role after initial setup.');
  } catch (error: any) {
    console.error('❌ Error applying migration:', error.message);
    console.log('\nPlease apply the migration manually using scripts/prevent-role-changes.sql');
  }
}

applyMigration()
  .then(() => {
    console.log('✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
