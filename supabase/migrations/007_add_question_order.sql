-- Add question_order field to survey_responses to track randomized presentation order
-- This allows for reproducibility and analysis of question order effects

ALTER TABLE survey_responses
ADD COLUMN question_order INTEGER[] DEFAULT NULL;

COMMENT ON COLUMN survey_responses.question_order IS
'Array of question IDs in the order they were presented to the user. Used for per-user randomization analysis and reproducibility.';
