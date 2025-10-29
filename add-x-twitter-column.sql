-- Add x_twitter column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS x_twitter TEXT;