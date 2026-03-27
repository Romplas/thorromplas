-- Fix username-based login to always resolve the correct Auth email.
-- This prevents password reset/login from "jumping" to another user when profiles.email is shared/changed.

-- 1) Ensure new profiles capture contact_email as well
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, nome, email, contact_email, usuario)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email),
    NEW.email,
    NEW.email,
    NEW.raw_user_meta_data->>'usuario'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2) Resolve Auth email by username via user_id -> auth.users.email
CREATE OR REPLACE FUNCTION public.get_email_by_username(_username TEXT)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT au.email
  FROM public.profiles p
  JOIN auth.users au ON au.id = p.user_id
  WHERE p.usuario = _username
  LIMIT 1
$$;

