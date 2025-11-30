-- Supabase Schema for Political Compass
-- Run this in your Supabase SQL Editor

-- =====================
-- QUESTIONS TABLE
-- =====================
CREATE TABLE questions (
  id SERIAL PRIMARY KEY,
  axis_id TEXT NOT NULL,
  key INTEGER NOT NULL CHECK (key IN (-1, 1)),
  text TEXT NOT NULL,
  educational_content TEXT,
  display_order INTEGER NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fetching active questions by axis
CREATE INDEX idx_questions_axis ON questions(axis_id);
CREATE INDEX idx_questions_active ON questions(active);
CREATE INDEX idx_questions_order ON questions(display_order);

-- =====================
-- SURVEY RESPONSES TABLE
-- =====================
CREATE TABLE survey_responses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL UNIQUE,
  responses JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Survey results table (stores calculated scores)
CREATE TABLE survey_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL UNIQUE REFERENCES survey_responses(session_id),
  core_axes JSONB NOT NULL,
  facets JSONB NOT NULL,
  top_flavors JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for faster lookups
CREATE INDEX idx_responses_session ON survey_responses(session_id);
CREATE INDEX idx_results_session ON survey_results(session_id);
CREATE INDEX idx_responses_created ON survey_responses(created_at);
CREATE INDEX idx_results_created ON survey_results(created_at);

-- =====================
-- ROW LEVEL SECURITY
-- =====================
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_results ENABLE ROW LEVEL SECURITY;

-- Questions: anyone can read, only authenticated can modify
-- For simplicity, we'll use anon for everything (add auth later if needed)
CREATE POLICY "Allow read questions" ON questions FOR SELECT TO anon USING (true);
CREATE POLICY "Allow insert questions" ON questions FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow update questions" ON questions FOR UPDATE TO anon USING (true);
CREATE POLICY "Allow delete questions" ON questions FOR DELETE TO anon USING (true);

-- Survey data policies
CREATE POLICY "Allow anonymous insert responses" ON survey_responses
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow anonymous insert results" ON survey_results
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow read own results" ON survey_results
  FOR SELECT TO anon USING (true);

-- =====================
-- HELPER FUNCTION
-- =====================
-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER questions_updated_at
  BEFORE UPDATE ON questions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- =====================
-- ANALYTICS VIEWS
-- =====================

-- View: Response counts by day
CREATE VIEW daily_responses AS
SELECT 
  DATE(created_at) as date,
  COUNT(*) as count
FROM survey_responses
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- View: Average scores across all responses
CREATE VIEW aggregate_scores AS
SELECT
  axis->>'axis_id' as axis_id,
  axis->>'name' as axis_name,
  AVG((axis->>'score')::float) as avg_score,
  STDDEV((axis->>'score')::float) as std_dev,
  COUNT(*) as sample_size
FROM survey_results,
LATERAL jsonb_array_elements(core_axes) as axis
GROUP BY axis->>'axis_id', axis->>'name';

-- View: Most common top flavors
CREATE VIEW popular_flavors AS
SELECT
  flavor->>'name' as flavor_name,
  COUNT(*) as count,
  AVG((flavor->>'affinity')::float) as avg_affinity
FROM survey_results,
LATERAL jsonb_array_elements(top_flavors) as flavor
GROUP BY flavor->>'name'
ORDER BY count DESC;

-- View: Question counts by axis
CREATE VIEW questions_by_axis AS
SELECT 
  axis_id,
  COUNT(*) FILTER (WHERE active = true) as active_count,
  COUNT(*) FILTER (WHERE active = false) as inactive_count,
  COUNT(*) as total_count
FROM questions
GROUP BY axis_id
ORDER BY axis_id;

-- Grant access to views
GRANT SELECT ON daily_responses TO anon;
GRANT SELECT ON aggregate_scores TO anon;
GRANT SELECT ON popular_flavors TO anon;
GRANT SELECT ON questions_by_axis TO anon;
