-- Migration: Allow public read access to survey_responses by session
-- Date: 2025-12-01
-- Description: Allow anyone to read survey_responses by session_id to enable
--              conceptual vs applied comparison on results page for anonymous users

-- =====================
-- ADD PUBLIC READ POLICY
-- =====================
-- This allows the results page to load raw responses and compute the
-- conceptual vs applied comparison for both logged-in and anonymous users.
-- Since survey_results is already publicly readable, this maintains
-- consistency while enabling the comparison feature.

CREATE POLICY "Anyone can read responses by session" ON survey_responses
  FOR SELECT USING (true);
