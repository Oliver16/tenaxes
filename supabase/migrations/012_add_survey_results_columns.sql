-- =====================================================
-- Migration: Add missing columns to survey_results
-- Adds: scores, conceptual_scores, applied_scores, responses, completed_at
-- =====================================================

-- Add missing columns to survey_results table
ALTER TABLE survey_results
  ADD COLUMN IF NOT EXISTS scores JSONB,
  ADD COLUMN IF NOT EXISTS conceptual_scores JSONB,
  ADD COLUMN IF NOT EXISTS applied_scores JSONB,
  ADD COLUMN IF NOT EXISTS responses JSONB,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- Make old columns nullable for backwards compatibility
ALTER TABLE survey_results
  ALTER COLUMN core_axes DROP NOT NULL,
  ALTER COLUMN facets DROP NOT NULL,
  ALTER COLUMN top_flavors DROP NOT NULL;

-- Create indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_survey_results_completed_at ON survey_results(completed_at);

-- Add comments to document the schema
COMMENT ON COLUMN survey_results.scores IS 'Combined axis scores from all questions';
COMMENT ON COLUMN survey_results.conceptual_scores IS 'Axis scores calculated from conceptual questions only';
COMMENT ON COLUMN survey_results.applied_scores IS 'Axis scores calculated from applied questions only';
COMMENT ON COLUMN survey_results.responses IS 'Raw user responses to survey questions';
COMMENT ON COLUMN survey_results.completed_at IS 'Timestamp when the survey was completed';
COMMENT ON COLUMN survey_results.core_axes IS 'Legacy column - replaced by scores/conceptual_scores/applied_scores';
COMMENT ON COLUMN survey_results.facets IS 'Legacy column - no longer used';
COMMENT ON COLUMN survey_results.top_flavors IS 'Legacy column - no longer used';
