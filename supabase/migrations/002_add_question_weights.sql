-- Add weight and question_type columns to questions
ALTER TABLE questions
  ADD COLUMN IF NOT EXISTS weight DECIMAL(4,2) DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS question_type TEXT DEFAULT 'conceptual' CHECK (question_type IN ('conceptual', 'applied'));

CREATE INDEX IF NOT EXISTS idx_questions_type ON questions(question_type);
