-- =====================================================
-- MIGRATION: Fix RLS policies for admin access
-- =====================================================

-- Add admin policy for viewing all profiles
-- This allows admins to see all users in the user management page
CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.is_admin = true
    )
  );

-- Add admin policy for viewing all user_roles
-- This allows admins to see all user role assignments
DROP POLICY IF EXISTS "Anyone can view their own roles" ON user_roles;

CREATE POLICY "Users can view their own roles" ON user_roles
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can view all roles" ON user_roles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Ensure question_axis_links table has correct RLS policies
-- (Table should already exist from migration 20240604120000)
-- Just verify the policies are correct

-- Note: The question_axis_links table foreign key is already defined in
-- migration 20240604120000_add_question_axis_links.sql
-- If you're getting PGRST200 errors, the schema cache may need refreshing
-- or the migration may not have been applied to the database yet.
