-- Supabase Schema for Political Compass
-- Run this in your Supabase SQL Editor

-- Survey responses table (stores raw answers)
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

-- Enable Row Level Security
ALTER TABLE survey_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_results ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts (no auth required)
CREATE POLICY "Allow anonymous insert responses" ON survey_responses
  FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anonymous insert results" ON survey_results
  FOR INSERT TO anon
  WITH CHECK (true);

-- Allow reading results by session_id (for results page)
CREATE POLICY "Allow read own results" ON survey_results
  FOR SELECT TO anon
  USING (true);

-- Optional: Analytics views

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

-- Grant access to views
GRANT SELECT ON daily_responses TO anon;
GRANT SELECT ON aggregate_scores TO anon;
GRANT SELECT ON popular_flavors TO anon;
