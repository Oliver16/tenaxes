-- =====================================================
-- MIGRATION: Add multi-axis question links system
-- =====================================================

-- Step 1: Create question_axis_links table
CREATE TABLE question_axis_links (
    id          bigserial PRIMARY KEY,
    question_id bigint NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    axis_id     text   NOT NULL REFERENCES axes(id),
    role        text   NOT NULL CHECK (role IN ('primary', 'collision')),
    axis_key    integer NOT NULL CHECK (axis_key IN (-1, 1)),
    weight      numeric NOT NULL DEFAULT 1.0,
    created_at  timestamptz DEFAULT now(),
    UNIQUE (question_id, axis_id, role)
);

-- Step 2: Create indexes
CREATE INDEX idx_question_axis_links_question_id ON question_axis_links(question_id);
CREATE INDEX idx_question_axis_links_axis_id ON question_axis_links(axis_id);
CREATE INDEX idx_question_axis_links_role ON question_axis_links(role);

-- Step 3: Enable RLS
ALTER TABLE question_axis_links ENABLE ROW LEVEL SECURITY;

-- Step 4: Create RLS policies
CREATE POLICY "Anyone can read question-axis links" ON question_axis_links
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage question-axis links" ON question_axis_links
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
    );

-- Step 5: Backfill primary links for ALL existing questions
INSERT INTO question_axis_links (question_id, axis_id, role, axis_key, weight)
SELECT id, axis_id, 'primary', key, weight
FROM questions
ON CONFLICT (question_id, axis_id, role) DO NOTHING;

-- Step 6: Add collision links for applied questions (99-202)
INSERT INTO question_axis_links (question_id, axis_id, role, axis_key, weight) VALUES
  (99, 'C1', 'primary', 1, 1.25)
 , (99, 'C8', 'collision', 1, 0.6)
 , (100, 'C1', 'primary', -1, 1.25)
 , (100, 'C2', 'collision', -1, 0.5)
 , (101, 'C1', 'primary', 1, 1.25)
 , (101, 'F2', 'collision', 1, 0.4)
 , (102, 'C1', 'primary', -1, 1.25)
 , (103, 'C2', 'primary', -1, 1.25)
 , (104, 'C2', 'primary', 1, 1.25)
 , (104, 'C4', 'collision', -1, 0.4)
 , (105, 'C2', 'primary', -1, 1.25)
 , (105, 'C1', 'collision', -1, 0.6)
 , (106, 'C2', 'primary', 1, 1.25)
 , (106, 'C1', 'collision', 1, 0.4)
 , (107, 'C3', 'primary', 1, 1.25)
 , (107, 'C8', 'collision', -1, 0.7)
 , (108, 'C3', 'primary', -1, 1.25)
 , (109, 'C3', 'primary', 1, 1.25)
 , (109, 'F1', 'collision', -1, 0.6)
 , (110, 'C3', 'primary', -1, 1.25)
 , (110, 'C5', 'collision', 1, 0.5)
 , (111, 'C4', 'primary', 1, 1.25)
 , (111, 'C2', 'collision', -1, 0.5)
 , (112, 'C4', 'primary', -1, 1.25)
 , (113, 'C4', 'primary', 1, 1.25)
 , (113, 'C1', 'collision', -1, 0.6)
 , (114, 'C4', 'primary', -1, 1.25)
 , (114, 'C5', 'collision', 1, 0.4)
 , (115, 'C5', 'primary', 1, 1.25)
 , (116, 'C5', 'primary', -1, 1.25)
 , (116, 'C6', 'collision', 1, 0.5)
 , (117, 'C5', 'primary', 1, 1.25)
 , (117, 'C10', 'collision', 1, 0.4)
 , (118, 'C5', 'primary', -1, 1.25)
 , (119, 'C6', 'primary', 1, 1.25)
 , (119, 'C2', 'collision', -1, 0.6)
 , (120, 'C6', 'primary', -1, 1.25)
 , (120, 'C2', 'collision', -1, 0.5)
 , (121, 'C6', 'primary', 1, 1.25)
 , (121, 'C7', 'collision', -1, 0.7)
 , (122, 'C6', 'primary', -1, 1.25)
 , (123, 'C7', 'primary', -1, 1.25)
 , (124, 'C7', 'primary', 1, 1.25)
 , (124, 'C2', 'collision', -1, 0.6)
 , (125, 'C7', 'primary', -1, 1.25)
 , (125, 'C1', 'collision', -1, 0.4)
 , (126, 'C7', 'primary', 1, 1.25)
 , (126, 'C9', 'collision', 1, 0.7)
 , (127, 'C8', 'primary', 1, 1.25)
 , (127, 'C1', 'collision', 1, 0.7)
 , (128, 'C8', 'primary', -1, 1.25)
 , (128, 'F2', 'collision', 1, 0.6)
 , (129, 'C8', 'primary', 1, 1.25)
 , (129, 'C9', 'collision', 1, 0.5)
 , (129, 'C1', 'collision', 1, 0.4)
 , (130, 'C8', 'primary', -1, 1.25)
 , (130, 'C5', 'collision', -1, 0.5)
 , (131, 'C9', 'primary', 1, 1.25)
 , (131, 'C1', 'collision', -1, 0.7)
 , (131, 'C2', 'collision', -1, 0.4)
 , (132, 'C9', 'primary', -1, 1.25)
 , (132, 'C1', 'collision', 1, 0.6)
 , (133, 'C9', 'primary', 1, 1.25)
 , (133, 'C2', 'collision', -1, 0.7)
 , (134, 'C9', 'primary', -1, 1.25)
 , (134, 'C2', 'collision', 1, 0.7)
 , (135, 'C10', 'primary', 1, 1.25)
 , (136, 'C10', 'primary', -1, 1.25)
 , (136, 'C5', 'collision', -1, 0.6)
 , (137, 'C10', 'primary', 1, 1.25)
 , (137, 'C5', 'collision', 1, 0.5)
 , (138, 'C10', 'primary', -1, 1.25)
 , (138, 'C7', 'collision', 1, 0.5)
 , (138, 'C2', 'collision', -1, 0.4)
 , (139, 'F1', 'primary', 1, 1.25)
 , (139, 'C3', 'collision', 1, 0.7)
 , (140, 'F1', 'primary', -1, 1.25)
 , (141, 'F1', 'primary', 1, 1.25)
 , (141, 'C3', 'collision', 1, 0.5)
 , (142, 'F1', 'primary', -1, 1.25)
 , (143, 'F2', 'primary', 1, 1.25)
 , (144, 'F2', 'primary', -1, 1.25)
 , (145, 'F2', 'primary', 1, 1.25)
 , (145, 'C3', 'collision', -1, 0.6)
 , (146, 'F2', 'primary', -1, 1.25)
 , (146, 'C3', 'collision', 1, 0.5)
 , (147, 'F3', 'primary', 1, 1.25)
 , (148, 'F3', 'primary', -1, 1.25)
 , (148, 'C10', 'collision', -1, 0.6)
 , (149, 'F3', 'primary', 1, 1.25)
 , (149, 'C2', 'collision', -1, 0.5)
 , (150, 'F3', 'primary', -1, 1.25)
 , (151, 'C1', 'primary', 1, 1.25)
 , (151, 'C2', 'collision', 1, 0.6)
 , (152, 'C1', 'primary', -1, 1.25)
 , (152, 'C4', 'collision', -1, 0.4)
 , (153, 'C1', 'primary', 1, 1.25)
 , (153, 'C2', 'collision', 1, 0.6)
 , (154, 'C1', 'primary', -1, 1.25)
 , (154, 'F2', 'collision', 1, 0.5)
 , (155, 'C2', 'primary', -1, 1.25)
 , (155, 'C1', 'collision', -1, 0.7)
 , (156, 'C2', 'primary', 1, 1.25)
 , (157, 'C2', 'primary', -1, 1.25)
 , (157, 'C7', 'collision', -1, 0.4)
 , (158, 'C2', 'primary', 1, 1.25)
 , (159, 'C3', 'primary', 1, 1.25)
 , (159, 'C8', 'collision', -1, 0.7)
 , (160, 'C3', 'primary', -1, 1.25)
 , (160, 'C2', 'collision', -1, 0.6)
 , (160, 'C8', 'collision', 1, 0.5)
 , (161, 'C3', 'primary', 1, 1.25)
 , (161, 'C8', 'collision', -1, 0.6)
 , (162, 'C3', 'primary', -1, 1.25)
 , (162, 'C2', 'collision', -1, 0.5)
 , (163, 'C4', 'primary', 1, 1.25)
 , (163, 'C2', 'collision', 1, 0.6)
 , (164, 'C4', 'primary', -1, 1.25)
 , (164, 'C3', 'collision', 1, 0.5)
 , (165, 'C4', 'primary', 1, 1.25)
 , (165, 'C5', 'collision', -1, 0.6)
 , (166, 'C4', 'primary', -1, 1.25)
 , (166, 'C6', 'collision', -1, 0.6)
 , (167, 'C5', 'primary', 1, 1.25)
 , (168, 'C5', 'primary', -1, 1.25)
 , (168, 'C10', 'collision', 1, 0.4)
 , (169, 'C5', 'primary', 1, 1.25)
 , (169, 'C4', 'collision', -1, 0.5)
 , (170, 'C5', 'primary', -1, 1.25)
 , (171, 'C6', 'primary', 1, 1.25)
 , (171, 'C7', 'collision', 1, 0.6)
 , (172, 'C6', 'primary', -1, 1.25)
 , (172, 'C7', 'collision', -1, 0.6)
 , (173, 'C6', 'primary', 1, 1.25)
 , (173, 'C2', 'collision', 1, 0.5)
 , (174, 'C6', 'primary', -1, 1.25)
 , (174, 'C2', 'collision', 1, 0.5)
 , (175, 'C7', 'primary', -1, 1.25)
 , (176, 'C7', 'primary', 1, 1.25)
 , (176, 'C3', 'collision', -1, 0.5)
 , (177, 'C7', 'primary', -1, 1.25)
 , (177, 'C6', 'collision', -1, 0.6)
 , (178, 'C7', 'primary', 1, 1.25)
 , (178, 'C8', 'collision', -1, 0.5)
 , (179, 'C8', 'primary', 1, 1.25)
 , (179, 'C3', 'collision', -1, 0.7)
 , (180, 'C8', 'primary', -1, 1.25)
 , (181, 'C8', 'primary', 1, 1.25)
 , (181, 'C2', 'collision', -1, 0.6)
 , (182, 'C8', 'primary', -1, 1.25)
 , (182, 'C3', 'collision', 1, 0.6)
 , (183, 'C9', 'primary', 1, 1.25)
 , (183, 'C1', 'collision', -1, 0.7)
 , (184, 'C9', 'primary', -1, 1.25)
 , (184, 'C2', 'collision', 1, 0.6)
 , (185, 'C9', 'primary', 1, 1.25)
 , (185, 'C2', 'collision', -1, 0.5)
 , (186, 'C9', 'primary', -1, 1.25)
 , (186, 'C2', 'collision', 1, 0.7)
 , (187, 'C10', 'primary', 1, 1.25)
 , (188, 'C10', 'primary', -1, 1.25)
 , (188, 'C5', 'collision', 1, 0.7)
 , (189, 'C10', 'primary', 1, 1.25)
 , (189, 'F3', 'collision', 1, 0.5)
 , (190, 'C10', 'primary', -1, 1.25)
 , (190, 'C7', 'collision', 1, 0.6)
 , (191, 'F1', 'primary', 1, 1.25)
 , (191, 'C3', 'collision', 1, 0.8)
 , (192, 'F1', 'primary', -1, 1.25)
 , (192, 'C3', 'collision', -1, 0.5)
 , (193, 'F1', 'primary', 1, 1.25)
 , (193, 'F2', 'collision', 1, 0.5)
 , (194, 'F1', 'primary', -1, 1.25)
 , (194, 'C3', 'collision', -1, 0.5)
 , (195, 'F2', 'primary', 1, 1.25)
 , (195, 'C8', 'collision', -1, 0.6)
 , (196, 'F2', 'primary', -1, 1.25)
 , (196, 'C3', 'collision', -1, 0.5)
 , (197, 'F2', 'primary', 1, 1.25)
 , (197, 'F1', 'collision', 1, 0.4)
 , (198, 'F2', 'primary', -1, 1.25)
 , (199, 'F3', 'primary', 1, 1.25)
 , (199, 'C2', 'collision', -1, 0.4)
 , (200, 'F3', 'primary', -1, 1.25)
 , (200, 'C3', 'collision', -1, 0.6)
 , (201, 'F3', 'primary', 1, 1.25)
 , (202, 'F3', 'primary', -1, 1.25);

-- Step 7: Add collision_pairs column to survey_results
ALTER TABLE survey_results
ADD COLUMN IF NOT EXISTS collision_pairs jsonb;

-- Step 8: Create audit views for analysis
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

COMMENT ON TABLE question_axis_links IS 'Multi-axis links allowing questions to contribute to multiple axes with different weights and roles';
COMMENT ON VIEW axis_weight_audit IS 'Summary of question weights per axis for balancing';
COMMENT ON VIEW axis_collision_matrix IS 'Matrix showing which axis pairs have collision questions';
