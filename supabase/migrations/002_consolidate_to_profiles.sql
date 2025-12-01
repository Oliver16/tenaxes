-- Migration: Consolidate to profiles table
-- Date: 2025-12-01
-- Description: Remove redundant public.users table and consolidate to public.profiles

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
