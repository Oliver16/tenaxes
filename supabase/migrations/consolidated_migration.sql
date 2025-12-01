-- =====================================================
-- CONSOLIDATED MIGRATION SCRIPT
-- Brings database to latest state from all migrations
-- Safe to run multiple times (idempotent)
-- =====================================================

-- =====================
-- HELPER FUNCTIONS (create first as they're used by triggers)
-- =====================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================
-- PROFILES TABLE
-- =====================

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_admin ON profiles(is_admin);

-- Trigger for profiles updated_at
DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- =====================
-- ROLES SYSTEM
-- =====================

CREATE TABLE IF NOT EXISTS roles (
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
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role_id TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_by UUID REFERENCES profiles(id),
  UNIQUE(user_id, role_id)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);

-- =====================
-- AXES TABLE
-- =====================

CREATE TABLE IF NOT EXISTS axes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  pole_negative TEXT,
  pole_positive TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Populate axes table with all 13 axes
INSERT INTO axes (id, name, pole_negative, pole_positive) VALUES
  ('C1', 'Economic Control', 'State-Directed', 'Market-Directed'),
  ('C2', 'Economic Equality', 'Redistributionist', 'Property Rights'),
  ('C3', 'Coercive Power', 'Security/Order', 'Civil Liberties'),
  ('C4', 'Where Power Sits', 'Centralized', 'Localized'),
  ('C5', 'Cultural Orientation', 'Traditionalist', 'Progressivist'),
  ('C6', 'Group Boundaries', 'Particularist', 'Universalist'),
  ('C7', 'Sovereignty Scope', 'Sovereigntist', 'Integrationist'),
  ('C8', 'Technology Stance', 'Tech-Skeptical', 'Tech-Solutionist'),
  ('C9', 'Nature''s Moral Weight', 'Anthropocentric', 'Ecocentric'),
  ('C10', 'Moral Foundation', 'Moral Universalist', 'Moral Pluralist'),
  ('F1', 'Change Strategy', 'Gradualist', 'Radical'),
  ('F2', 'Institutional Trust', 'Trusting', 'Skeptical'),
  ('F3', 'Justice Style', 'Retributive', 'Restorative')
ON CONFLICT (id) DO NOTHING;

-- =====================
-- QUESTIONS TABLE
-- =====================

CREATE TABLE IF NOT EXISTS questions (
  id BIGSERIAL PRIMARY KEY,
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

CREATE INDEX IF NOT EXISTS idx_questions_axis ON questions(axis_id);
CREATE INDEX IF NOT EXISTS idx_questions_active ON questions(active);
CREATE INDEX IF NOT EXISTS idx_questions_order ON questions(display_order);
CREATE INDEX IF NOT EXISTS idx_questions_type ON questions(question_type);

-- Trigger for questions updated_at
DROP TRIGGER IF EXISTS questions_updated_at ON questions;
CREATE TRIGGER questions_updated_at
  BEFORE UPDATE ON questions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- =====================
-- QUESTION AXIS LINKS TABLE
-- =====================

CREATE TABLE IF NOT EXISTS question_axis_links (
  id BIGSERIAL PRIMARY KEY,
  question_id BIGINT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  axis_id TEXT NOT NULL REFERENCES axes(id),
  role TEXT NOT NULL CHECK (role IN ('primary', 'collision')),
  axis_key INTEGER NOT NULL CHECK (axis_key IN (-1, 1)),
  weight NUMERIC NOT NULL DEFAULT 1.0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (question_id, axis_id, role)
);

CREATE INDEX IF NOT EXISTS idx_question_axis_links_question_id ON question_axis_links(question_id);
CREATE INDEX IF NOT EXISTS idx_question_axis_links_axis_id ON question_axis_links(axis_id);
CREATE INDEX IF NOT EXISTS idx_question_axis_links_role ON question_axis_links(role);

-- =====================
-- SURVEY RESPONSES TABLE
-- =====================

CREATE TABLE IF NOT EXISTS survey_responses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  responses JSONB NOT NULL,
  question_order INTEGER[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_responses_session ON survey_responses(session_id);
CREATE INDEX IF NOT EXISTS idx_responses_user ON survey_responses(user_id);
CREATE INDEX IF NOT EXISTS idx_responses_created ON survey_responses(created_at);

COMMENT ON COLUMN survey_responses.question_order IS
'Array of question IDs in the order they were presented to the user. Used for per-user randomization analysis and reproducibility.';

-- =====================
-- SURVEY RESULTS TABLE
-- =====================

CREATE TABLE IF NOT EXISTS survey_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL UNIQUE REFERENCES survey_responses(session_id),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  core_axes JSONB NOT NULL,
  facets JSONB NOT NULL,
  top_flavors JSONB NOT NULL,
  collision_pairs JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_results_session ON survey_results(session_id);
CREATE INDEX IF NOT EXISTS idx_results_user ON survey_results(user_id);
CREATE INDEX IF NOT EXISTS idx_results_created ON survey_results(created_at);

-- =====================
-- ROW LEVEL SECURITY SETUP
-- =====================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE axes ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_axis_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_results ENABLE ROW LEVEL SECURITY;

-- =====================
-- RLS POLICIES - PROFILES
-- =====================

DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.is_admin = true
    )
  );

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- =====================
-- RLS POLICIES - ROLES
-- =====================

DROP POLICY IF EXISTS "Anyone can view roles" ON roles;
CREATE POLICY "Anyone can view roles" ON roles
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Only admins can insert roles" ON roles;
CREATE POLICY "Only admins can insert roles" ON roles
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

DROP POLICY IF EXISTS "Only admins can update roles" ON roles;
CREATE POLICY "Only admins can update roles" ON roles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

DROP POLICY IF EXISTS "Only admins can delete roles" ON roles;
CREATE POLICY "Only admins can delete roles" ON roles
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- =====================
-- RLS POLICIES - USER ROLES
-- =====================

DROP POLICY IF EXISTS "Users can view their own roles" ON user_roles;
DROP POLICY IF EXISTS "Anyone can view their own roles" ON user_roles;
CREATE POLICY "Users can view their own roles" ON user_roles
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can view all user roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON user_roles;
CREATE POLICY "Admins can view all user roles" ON user_roles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

DROP POLICY IF EXISTS "Only admins can assign roles" ON user_roles;
CREATE POLICY "Only admins can assign roles" ON user_roles
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

DROP POLICY IF EXISTS "Only admins can remove roles" ON user_roles;
CREATE POLICY "Only admins can remove roles" ON user_roles
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- =====================
-- RLS POLICIES - AXES
-- =====================

DROP POLICY IF EXISTS "Anyone can read axes" ON axes;
CREATE POLICY "Anyone can read axes" ON axes
  FOR SELECT USING (true);

-- =====================
-- RLS POLICIES - QUESTIONS
-- =====================

DROP POLICY IF EXISTS "Read questions policy" ON questions;
DROP POLICY IF EXISTS "Allow read questions" ON questions;
DROP POLICY IF EXISTS "Anyone can read active questions" ON questions;
DROP POLICY IF EXISTS "Authenticated users can read all questions" ON questions;
CREATE POLICY "Read questions policy" ON questions
  FOR SELECT USING (
    active = true OR auth.uid() IS NOT NULL
  );

DROP POLICY IF EXISTS "Admins can insert questions" ON questions;
DROP POLICY IF EXISTS "Allow insert questions" ON questions;
CREATE POLICY "Admins can insert questions" ON questions
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

DROP POLICY IF EXISTS "Admins can update questions" ON questions;
DROP POLICY IF EXISTS "Allow update questions" ON questions;
CREATE POLICY "Admins can update questions" ON questions
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

DROP POLICY IF EXISTS "Admins can delete questions" ON questions;
DROP POLICY IF EXISTS "Allow delete questions" ON questions;
CREATE POLICY "Admins can delete questions" ON questions
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- =====================
-- RLS POLICIES - QUESTION AXIS LINKS
-- =====================

DROP POLICY IF EXISTS "Anyone can read question-axis links" ON question_axis_links;
CREATE POLICY "Anyone can read question-axis links" ON question_axis_links
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage question-axis links" ON question_axis_links;
CREATE POLICY "Admins can manage question-axis links" ON question_axis_links
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- =====================
-- RLS POLICIES - SURVEY RESPONSES
-- =====================

DROP POLICY IF EXISTS "Anyone can insert responses" ON survey_responses;
CREATE POLICY "Anyone can insert responses" ON survey_responses
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can read responses by session" ON survey_responses;
CREATE POLICY "Anyone can read responses by session" ON survey_responses
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can read own responses" ON survey_responses;
CREATE POLICY "Users can read own responses" ON survey_responses
  FOR SELECT USING (
    auth.uid() = user_id
  );

DROP POLICY IF EXISTS "Admins can read all responses" ON survey_responses;
CREATE POLICY "Admins can read all responses" ON survey_responses
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- =====================
-- RLS POLICIES - SURVEY RESULTS
-- =====================

DROP POLICY IF EXISTS "Anyone can read results by session" ON survey_results;
DROP POLICY IF EXISTS "Allow read results by session" ON survey_results;
CREATE POLICY "Anyone can read results by session" ON survey_results
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can insert results" ON survey_results;
DROP POLICY IF EXISTS "Allow insert results" ON survey_results;
CREATE POLICY "Anyone can insert results" ON survey_results
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow read own saved results" ON survey_results;
DROP POLICY IF EXISTS "Allow link results to account" ON survey_results;
-- These are covered by the "Anyone can read results by session" policy above

-- =====================
-- USER SIGNUP TRIGGER
-- =====================

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert profile
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;

  -- Assign default 'user' role
  INSERT INTO public.user_roles (user_id, role_id)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- =====================
-- HELPER FUNCTIONS
-- =====================

-- Function to check if user has a specific role
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

-- Function to get all user roles
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

-- Legacy function (kept for backwards compatibility)
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

-- Legacy function (kept for backwards compatibility)
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
-- GRANT PERMISSIONS
-- =====================

GRANT EXECUTE ON FUNCTION link_result_to_user(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_results(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION has_role(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_roles(UUID) TO authenticated;

-- =====================
-- ANALYTICS VIEWS
-- =====================

DROP VIEW IF EXISTS daily_responses;
CREATE VIEW daily_responses AS
SELECT
  DATE(created_at) as date,
  COUNT(*) as count
FROM survey_responses
GROUP BY DATE(created_at)
ORDER BY date DESC;

DROP VIEW IF EXISTS aggregate_scores;
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

DROP VIEW IF EXISTS popular_flavors;
CREATE VIEW popular_flavors AS
SELECT
  flavor->>'name' as flavor_name,
  COUNT(*) as count,
  AVG((flavor->>'affinity')::float) as avg_affinity
FROM survey_results,
LATERAL jsonb_array_elements(top_flavors) as flavor
GROUP BY flavor->>'name'
ORDER BY count DESC;

DROP VIEW IF EXISTS questions_by_axis;
CREATE VIEW questions_by_axis AS
SELECT
  axis_id,
  COUNT(*) FILTER (WHERE active = true) as active_count,
  COUNT(*) FILTER (WHERE active = false) as inactive_count,
  COUNT(*) as total_count
FROM questions
GROUP BY axis_id
ORDER BY axis_id;

DROP VIEW IF EXISTS axis_weight_audit;
CREATE VIEW axis_weight_audit AS
SELECT
  axis_id,
  COUNT(*) FILTER (WHERE role = 'primary') as primary_count,
  SUM(weight) FILTER (WHERE role = 'primary') as primary_weight_sum,
  COUNT(*) FILTER (WHERE role = 'collision') as collision_count,
  SUM(weight) FILTER (WHERE role = 'collision') as collision_weight_sum,
  SUM(weight) as total_weight
FROM question_axis_links
JOIN questions ON questions.id = question_axis_links.question_id
WHERE questions.question_type = 'applied'
  AND questions.active = true
GROUP BY axis_id
ORDER BY axis_id;

DROP VIEW IF EXISTS axis_collision_matrix;
CREATE VIEW axis_collision_matrix AS
SELECT
  p.axis_id  AS primary_axis,
  c.axis_id  AS collision_axis,
  COUNT(*)   AS applied_questions
FROM questions q
JOIN question_axis_links p
  ON p.question_id = q.id AND p.role = 'primary'
JOIN question_axis_links c
  ON c.question_id = q.id AND c.role = 'collision'
WHERE q.question_type = 'applied'
  AND q.active = true
GROUP BY p.axis_id, c.axis_id
ORDER BY applied_questions DESC;

-- Grant access to views
GRANT SELECT ON daily_responses TO authenticated;
GRANT SELECT ON aggregate_scores TO authenticated;
GRANT SELECT ON popular_flavors TO authenticated;
GRANT SELECT ON questions_by_axis TO authenticated;
GRANT SELECT ON axis_weight_audit TO authenticated;
GRANT SELECT ON axis_collision_matrix TO authenticated;

-- Add comments
COMMENT ON TABLE profiles IS 'User profiles extending auth.users with application-specific data. Auto-created via trigger on user signup.';
COMMENT ON TABLE question_axis_links IS 'Multi-axis links allowing questions to contribute to multiple axes with different weights and roles';
COMMENT ON VIEW axis_weight_audit IS 'Summary of question weights per axis for balancing';
COMMENT ON VIEW axis_collision_matrix IS 'Matrix showing which axis pairs have collision questions';

-- =====================
-- MIGRATION COMPLETE
-- =====================
