-- Migration: Rewrite profiles RLS policies to avoid self-select recursion
-- Date: 2025-12-02
--
-- Problem: Any policy on profiles that queries profiles causes infinite recursion.
-- The previous "Admins can view all profiles" policy did SELECT FROM profiles
-- to check is_admin, triggering the same policy again (error 42P17).
--
-- Solution: Remove all self-referencing policies. Only keep policies that
-- check auth.uid() directly without querying the profiles table.
-- For admin access, use JWT claims instead of database queries.

-- Make sure RLS is enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies to get a clean slate
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- Recreate policies WITHOUT any self-referencing SELECT FROM profiles

-- 1) Users can see their own profile (no recursion - direct auth.uid() check)
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT
  USING (auth.uid() = id);

-- 2) Admins can view all profiles (using JWT claim instead of DB query)
-- This requires is_admin to be in the JWT claims
CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT
  USING (
    coalesce((auth.jwt() ->> 'is_admin')::boolean, false) = true
  );

-- 3) Users can update their own profile (no recursion - direct auth.uid() check)
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- 4) Admins can update any profile (using JWT claim)
CREATE POLICY "Admins can update any profile" ON profiles
  FOR UPDATE
  USING (
    coalesce((auth.jwt() ->> 'is_admin')::boolean, false) = true
  );

-- 5) Users can insert their own profile (used by signup trigger)
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Drop the is_admin function from the previous migration if it exists
DROP FUNCTION IF EXISTS is_admin(UUID);

-- Note: For JWT claims to work, you need to add is_admin to the JWT claims
-- This can be done via a Supabase database function that updates the JWT:
--
-- CREATE OR REPLACE FUNCTION custom_access_token_hook(event jsonb)
-- RETURNS jsonb
-- LANGUAGE plpgsql
-- SECURITY DEFINER
-- AS $$
-- DECLARE
--   claims jsonb;
--   is_admin_claim boolean;
-- BEGIN
--   -- Fetch the is_admin claim for the user
--   SELECT is_admin INTO is_admin_claim
--   FROM profiles
--   WHERE id = (event->>'user_id')::uuid;
--
--   claims := event->'claims';
--
--   -- Add is_admin to the claims
--   claims := jsonb_set(claims, '{is_admin}', to_jsonb(coalesce(is_admin_claim, false)));
--
--   -- Update the 'claims' object in the original event
--   event := jsonb_set(event, '{claims}', claims);
--
--   RETURN event;
-- END;
-- $$;
--
-- Then configure this hook in your Supabase project settings under Authentication > Hooks.
