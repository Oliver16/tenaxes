-- Migration: Add user accounts and authentication
-- Date: 2025-11-30

-- =====================
-- USERS TABLE
-- =====================
-- Note: Supabase Auth automatically creates auth.users table
-- We create a public.users table for additional user data
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- UPDATE SURVEY RESULTS TABLE
-- =====================
-- Add user_id column to link results to user accounts
ALTER TABLE survey_results
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) ON DELETE SET NULL;

-- Add index for faster lookups by user
CREATE INDEX IF NOT EXISTS idx_results_user ON survey_results(user_id);

-- =====================
-- ROW LEVEL SECURITY POLICIES
-- =====================

-- Enable RLS on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Update survey_results policies to handle both authenticated and anonymous users
-- Drop existing policies
DROP POLICY IF EXISTS "Allow anonymous insert results" ON survey_results;
DROP POLICY IF EXISTS "Allow read own results" ON survey_results;

-- New policies for survey_results
-- Anyone can insert results (authenticated or anonymous)
CREATE POLICY "Allow insert results" ON survey_results
  FOR INSERT WITH CHECK (true);

-- Anyone can read their own results by session_id
CREATE POLICY "Allow read results by session" ON survey_results
  FOR SELECT USING (true);

-- Authenticated users can read their own saved results
CREATE POLICY "Allow read own saved results" ON survey_results
  FOR SELECT USING (auth.uid() = user_id);

-- Authenticated users can update results to link to their account
CREATE POLICY "Allow link results to account" ON survey_results
  FOR UPDATE USING (user_id IS NULL OR auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =====================
-- HELPER FUNCTIONS
-- =====================

-- Function to link existing result to user account
CREATE OR REPLACE FUNCTION link_result_to_user(
  p_session_id TEXT,
  p_user_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE survey_results
  SET user_id = p_user_id
  WHERE session_id = p_session_id
    AND (user_id IS NULL OR user_id = p_user_id);

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get all results for a user
CREATE OR REPLACE FUNCTION get_user_results(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  session_id TEXT,
  core_axes JSONB,
  facets JSONB,
  top_flavors JSONB,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.id,
    r.session_id,
    r.core_axes,
    r.facets,
    r.top_flavors,
    r.created_at
  FROM survey_results r
  WHERE r.user_id = p_user_id
  ORDER BY r.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================
-- TRIGGERS
-- =====================

-- Auto-update updated_at for users table
CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- =====================
-- GRANT PERMISSIONS
-- =====================

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION link_result_to_user(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_results(UUID) TO authenticated;
