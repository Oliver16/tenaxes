-- =====================================================
-- URGENT FIX: Add missing columns to survey_results
-- Run this in your Supabase SQL Editor NOW
-- =====================================================

-- Add missing columns
ALTER TABLE survey_results
  ADD COLUMN IF NOT EXISTS scores JSONB,
  ADD COLUMN IF NOT EXISTS conceptual_scores JSONB,
  ADD COLUMN IF NOT EXISTS applied_scores JSONB,
  ADD COLUMN IF NOT EXISTS responses JSONB,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- Make old columns nullable (for backwards compatibility)
ALTER TABLE survey_results
  ALTER COLUMN core_axes DROP NOT NULL,
  ALTER COLUMN facets DROP NOT NULL,
  ALTER COLUMN top_flavors DROP NOT NULL;

-- Create index for completed_at
CREATE INDEX IF NOT EXISTS idx_results_completed_at ON survey_results(completed_at);

-- Verify the fix
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'survey_results'
ORDER BY column_name;
