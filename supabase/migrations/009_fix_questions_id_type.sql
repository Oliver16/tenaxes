-- =====================================================
-- MIGRATION: Fix questions.id type to match foreign keys
-- =====================================================
-- The questions.id column is SERIAL (INTEGER) but question_axis_links.question_id
-- is BIGINT, causing PostgREST to not recognize the foreign key relationship.
-- This migration changes questions.id to BIGINT to match.

-- Step 1: Change questions.id from SERIAL to BIGINT
ALTER TABLE questions ALTER COLUMN id TYPE BIGINT;

-- Step 2: Ensure the sequence continues working
-- The sequence is already created by SERIAL, we just need to make sure it's still linked
ALTER TABLE questions ALTER COLUMN id SET DEFAULT nextval('questions_id_seq'::regclass);

-- Step 3: Verify foreign key relationship exists (should already exist, but let's be explicit)
-- This will fail if the FK doesn't exist, which is fine - it means it's already there
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'question_axis_links_question_id_fkey'
    AND table_name = 'question_axis_links'
  ) THEN
    ALTER TABLE question_axis_links
    ADD CONSTRAINT question_axis_links_question_id_fkey
    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE;
  END IF;
END $$;
