-- Fix questions RLS policies for authenticated users
-- Issue: Questions load for anonymous users but not authenticated users

-- Drop existing policies
DROP POLICY IF EXISTS "Allow read questions" ON questions;
DROP POLICY IF EXISTS "Anyone can read active questions" ON questions;
DROP POLICY IF EXISTS "Authenticated users can read all questions" ON questions;
DROP POLICY IF EXISTS "Allow insert questions" ON questions;
DROP POLICY IF EXISTS "Allow update questions" ON questions;
DROP POLICY IF EXISTS "Allow delete questions" ON questions;
DROP POLICY IF EXISTS "Admins can insert questions" ON questions;
DROP POLICY IF EXISTS "Admins can update questions" ON questions;
DROP POLICY IF EXISTS "Admins can delete questions" ON questions;

-- Create a single unified SELECT policy that works for both anonymous and authenticated users
-- Anonymous users: can read active questions only
-- Authenticated users: can read all questions
CREATE POLICY "Read questions policy" ON questions
  FOR SELECT USING (
    active = true OR auth.uid() IS NOT NULL
  );

-- Admin policies for INSERT/UPDATE/DELETE
CREATE POLICY "Admins can insert questions" ON questions
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Admins can update questions" ON questions
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Admins can delete questions" ON questions
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );
