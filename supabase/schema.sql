-- Supabase Schema for TenAxes
-- Run this in your Supabase SQL Editor

-- =====================
-- USER PROFILES TABLE
-- =====================
-- Extends auth.users with application-specific data
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for admin lookups
CREATE INDEX idx_profiles_admin ON profiles(is_admin);

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
  weight DECIMAL(4,2) DEFAULT 1.0,
  question_type TEXT DEFAULT 'conceptual' CHECK (question_type IN ('conceptual', 'applied')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fetching active questions by axis
CREATE INDEX idx_questions_axis ON questions(axis_id);
CREATE INDEX idx_questions_active ON questions(active);
CREATE INDEX idx_questions_order ON questions(display_order);
CREATE INDEX idx_questions_type ON questions(question_type);

-- =====================
-- SURVEY RESPONSES TABLE
-- =====================
CREATE TABLE survey_responses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  responses JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Survey results table (stores calculated scores)
CREATE TABLE survey_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL UNIQUE REFERENCES survey_responses(session_id),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  core_axes JSONB NOT NULL,
  facets JSONB NOT NULL,
  top_flavors JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for faster lookups
CREATE INDEX idx_responses_session ON survey_responses(session_id);
CREATE INDEX idx_responses_user ON survey_responses(user_id);
CREATE INDEX idx_results_session ON survey_results(session_id);
CREATE INDEX idx_results_user ON survey_results(user_id);
CREATE INDEX idx_responses_created ON survey_responses(created_at);
CREATE INDEX idx_results_created ON survey_results(created_at);

-- =====================
-- ROW LEVEL SECURITY
-- =====================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_results ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can read their own profile, admins can read all
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Questions: anyone can read active questions, only admins can modify
CREATE POLICY "Anyone can read active questions" ON questions
  FOR SELECT USING (active = true);

CREATE POLICY "Authenticated users can read all questions" ON questions
  FOR SELECT USING (auth.role() = 'authenticated');

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

-- Survey responses: anyone can submit (anonymous or authenticated)
CREATE POLICY "Anyone can insert responses" ON survey_responses
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can read own responses" ON survey_responses
  FOR SELECT USING (
    auth.uid() = user_id
  );

CREATE POLICY "Admins can read all responses" ON survey_responses
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Survey results: anyone can view by session_id, users can view their own
CREATE POLICY "Anyone can read results by session" ON survey_results
  FOR SELECT USING (true);

CREATE POLICY "Anyone can insert results" ON survey_results
  FOR INSERT WITH CHECK (true);

-- =====================
-- HELPER FUNCTIONS
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

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

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

-- Grant access to views (authenticated users only for analytics)
GRANT SELECT ON daily_responses TO authenticated;
GRANT SELECT ON aggregate_scores TO authenticated;
GRANT SELECT ON popular_flavors TO authenticated;
GRANT SELECT ON questions_by_axis TO authenticated;
