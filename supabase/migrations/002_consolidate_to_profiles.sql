-- Migration: Consolidate to profiles table
-- Date: 2025-12-01
-- Description: Remove redundant public.users table and consolidate to public.profiles

-- =====================
-- CREATE PROFILES TABLE
-- =====================
-- Create profiles table extending auth.users
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for admin lookups
CREATE INDEX IF NOT EXISTS idx_profiles_admin ON profiles(is_admin);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Create trigger for updated_at
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Create trigger to auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- =====================
-- MIGRATE DATA (if any exists in public.users)
-- =====================
-- Move any data from public.users to public.profiles if it doesn't already exist
INSERT INTO public.profiles (id, email, created_at, updated_at)
SELECT u.id, u.email, u.created_at, u.updated_at
FROM public.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.id = u.id
)
ON CONFLICT (id) DO NOTHING;

-- =====================
-- DROP CONSTRAINTS AND TABLE
-- =====================
-- Drop the public.users table as it's redundant with profiles
DROP TABLE IF EXISTS public.users CASCADE;

-- =====================
-- UPDATE COMMENTS
-- =====================
COMMENT ON TABLE public.profiles IS 'User profiles extending auth.users with application-specific data. Auto-created via trigger on user signup.';
