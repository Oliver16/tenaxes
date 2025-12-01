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
-- ROLES SYSTEM
-- =====================
-- Roles table defines available roles
CREATE TABLE roles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default roles
INSERT INTO roles (id, name, description) VALUES
  ('admin', 'Administrator', 'Full system access including user management and analytics'),
  ('moderator', 'Moderator', 'Can manage questions and view analytics'),
  ('user', 'User', 'Standard user - can take surveys and view own results')
ON CONFLICT (id) DO NOTHING;

-- User roles junction table
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role_id TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_by UUID REFERENCES profiles(id),
  UNIQUE(user_id, role_id)
);

-- Indexes for role lookups
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_role_id ON user_roles(role_id);

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
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_results ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can read their own profile, admins can read all
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Roles: Anyone can view roles, only admins can modify
CREATE POLICY "Anyone can view roles" ON roles
  FOR SELECT USING (true);

CREATE POLICY "Only admins can insert roles" ON roles
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Only admins can update roles" ON roles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Only admins can delete roles" ON roles
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- User Roles: Users can view their own roles, admins can view and manage all
CREATE POLICY "Users can view their own roles" ON user_roles
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can view all user roles" ON user_roles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Only admins can assign roles" ON user_roles
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Only admins can remove roles" ON user_roles
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Questions: anyone can read active questions, authenticated users can read all
CREATE POLICY "Read questions policy" ON questions
  FOR SELECT USING (
    active = true OR auth.uid() IS NOT NULL
  );

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

-- Allow public read access to enable conceptual vs applied comparison
-- on results page for both logged-in and anonymous users
CREATE POLICY "Anyone can read responses by session" ON survey_responses
  FOR SELECT USING (true);

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
  -- Insert profile
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);

  -- Assign default 'user' role
  INSERT INTO public.user_roles (user_id, role_id)
  VALUES (NEW.id, 'user');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Helper function to check if user has a specific role
CREATE OR REPLACE FUNCTION has_role(user_id UUID, role_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = user_id AND r.id = role_name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get all user roles
CREATE OR REPLACE FUNCTION get_user_roles(user_id UUID)
RETURNS TABLE(role_id TEXT, role_name TEXT, role_description TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT r.id, r.name, r.description
  FROM user_roles ur
  JOIN roles r ON ur.role_id = r.id
  WHERE ur.user_id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
