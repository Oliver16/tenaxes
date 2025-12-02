-- Migration: Fix infinite recursion in profiles RLS policies
-- Date: 2025-12-02
--
-- Problem: The "Admins can view all profiles" policy on the profiles table
-- queries the same table to check if user is admin, causing infinite recursion.
--
-- Solution: Create a SECURITY DEFINER function that bypasses RLS to check
-- admin status, then use that function in the RLS policies.

-- Create a helper function that bypasses RLS to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT is_admin
    FROM profiles
    WHERE id = user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop the problematic policy
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;

-- Recreate the policy using the SECURITY DEFINER function
-- This avoids recursion because the function bypasses RLS
CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT USING (
    is_admin(auth.uid()) = true
  );

-- Also update the UPDATE policy to allow admins to update any profile
DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;

CREATE POLICY "Admins can update any profile" ON profiles
  FOR UPDATE USING (
    is_admin(auth.uid()) = true
  );

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION is_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin(UUID) TO anon;
