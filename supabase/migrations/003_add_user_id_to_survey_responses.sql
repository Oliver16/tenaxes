-- Migration: Add user_id to survey_responses table
-- Date: 2025-12-01
-- Description: Add missing user_id column to survey_responses table to match schema.sql

-- =====================
-- ADD USER_ID COLUMN
-- =====================
-- Add user_id column to link responses to user accounts
-- This column was missing from the original migration but exists in schema.sql
ALTER TABLE survey_responses
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add index for faster lookups by user (if it doesn't already exist)
CREATE INDEX IF NOT EXISTS idx_responses_user ON survey_responses(user_id);

-- =====================
-- UPDATE RLS POLICIES
-- =====================
-- Ensure RLS policies are correct for the user_id column

-- Drop existing policies that might conflict
DROP POLICY IF EXISTS "Users can read own responses" ON survey_responses;
DROP POLICY IF EXISTS "Admins can read all responses" ON survey_responses;

-- Users can read their own responses
CREATE POLICY "Users can read own responses" ON survey_responses
  FOR SELECT USING (
    auth.uid() = user_id
  );

-- Admins can read all responses
CREATE POLICY "Admins can read all responses" ON survey_responses
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );
