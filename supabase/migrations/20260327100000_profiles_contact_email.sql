-- Add a non-unique contact email field to profiles.
-- Keep `profiles.email` as the auth/login email (unique in Supabase Auth).

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS contact_email TEXT;

-- Backfill from existing auth email
UPDATE public.profiles
SET contact_email = email
WHERE contact_email IS NULL;

