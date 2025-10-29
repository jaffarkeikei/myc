-- Migration: Prevent users from changing their role after initial setup
-- Run this in your Supabase SQL Editor

-- Create a function to prevent role changes
CREATE OR REPLACE FUNCTION prevent_role_change()
RETURNS TRIGGER AS $$
BEGIN
  -- If this is an update operation and the role is being changed
  IF TG_OP = 'UPDATE' AND OLD.role IS DISTINCT FROM NEW.role THEN
    RAISE EXCEPTION 'Role cannot be changed after initial setup. Current role: %, Attempted role: %', OLD.role, NEW.role;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger on the profiles table
DROP TRIGGER IF EXISTS enforce_immutable_role ON public.profiles;
CREATE TRIGGER enforce_immutable_role
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION prevent_role_change();

-- Verify the trigger was created
SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'enforce_immutable_role';
