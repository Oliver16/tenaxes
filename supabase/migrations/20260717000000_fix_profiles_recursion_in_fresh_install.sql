-- Migration: Remove recursive admin policy on profiles (fixes error 42P17)
-- Date: 2026-07-17
--
-- Problem: Databases provisioned from an earlier fresh_install.sql carry an
-- "Admins can view all profiles" policy on public.profiles whose USING clause
-- sub-selects public.profiles to check is_admin. Any policy on profiles that
-- reads profiles causes "infinite recursion detected in policy for relation
-- profiles" (42P17). This also breaks unrelated reads: question_axis_links has a
-- FOR ALL admin policy that sub-selects profiles, so an anonymous survey submit
-- reading questions + question_axis_links triggers the recursion and returns 500.
--
-- Solution: Drop every self-referencing admin policy on profiles. profiles keeps
-- only the direct auth.uid() self-policies (view/update/insert own). Admin access
-- to profiles is handled via the service role key on the backend or JWT claims.
-- This matches the intended state in supabase/schema.sql.

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop any recursive admin policies (created by older fresh_install/migrations)
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;

-- Drop the SECURITY DEFINER helper from migration 010 if it lingers
DROP FUNCTION IF EXISTS public.is_admin(uuid);

-- Ensure the non-recursive self-policies exist (idempotent recreate)
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);
