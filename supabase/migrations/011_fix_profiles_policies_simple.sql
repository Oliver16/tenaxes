-- Migration: Fix profiles RLS policies - Simple Version (No Admin Policy)
-- Date: 2025-12-02
--
-- Problem: The "Admins can view all profiles" policy queries profiles table
-- to check is_admin, causing infinite recursion (error 42P17).
--
-- Solution: Remove the self-referencing admin policy. Users can only see
-- their own profiles. Admin functionality will need to be handled differently
-- (e.g., via service role key on the backend, or JWT claims).

-- Make sure RLS is enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies to get a clean slate
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- Recreate basic policies WITHOUT any self-referencing SELECT FROM profiles

-- 1) Users can see their own profile (no recursion - direct auth.uid() check)
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT
  USING (auth.uid() = id);

-- 2) Users can update their own profile (no recursion - direct auth.uid() check)
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- 3) Users can insert their own profile (used by signup trigger)
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Drop the is_admin function from previous migration if it exists
DROP FUNCTION IF EXISTS is_admin(UUID);

-- Note: Admin users will not be able to view all profiles with this policy.
-- For admin functionality, you have two options:
--
-- Option 1: Use service role key on backend/admin routes (bypasses RLS)
-- Option 2: Add is_admin to JWT claims (see migration 011_rewrite_profiles_policies_no_recursion.sql)
