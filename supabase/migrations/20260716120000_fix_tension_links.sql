-- =====================================================
-- MIGRATION: Fix tension (collision) link system
-- See docs/question-bank-audit.md for full rationale.
--
-- 1. Splits the ambiguous 'collision' role into:
--      'secondary' - reinforcing cross-loading. Agreement legitimately
--                    moves both axes the same ideological direction.
--                    Contributes (capped) to axis scores; carries NO
--                    tension information.
--      'tradeoff'  - the scenario explicitly prices one axis's value
--                    against the other's ("even if / even though /
--                    rather than"). Feeds the tension analyzer; does
--                    NOT contribute to axis scores (blocking a dam
--                    says nothing about redistribution).
-- 2. Fixes three mis-keyed links (sign errors).
-- 3. Re-links two livelihood-cost tradeoffs from C1 to C2 so the
--    ecology-vs-prosperity tension lives on one pair.
-- 4. Deletes 26 links that asserted ideological correlations with no
--    content basis in the question (the main source of C2 score
--    contamination).
-- 5. Rebuilds the audit views for the new roles.
-- =====================================================

BEGIN;

-- Step 1: relax the role constraint so we can reclassify
ALTER TABLE question_axis_links
  DROP CONSTRAINT IF EXISTS question_axis_links_role_check;

-- Step 2: key fixes (sign errors)
-- Q109: sympathy for disruptive protesters was keyed 'gradualist'; it
-- indicates tolerance for radical tactics (matches Q139/Q191 keying).
UPDATE question_axis_links SET axis_key = 1
  WHERE question_id = 109 AND axis_id = 'F1' AND role = 'collision';
-- Q116: keeping a majority-tradition display over objections was keyed
-- 'universalist'; if anything it is particularist.
UPDATE question_axis_links SET axis_key = -1
  WHERE question_id = 116 AND axis_id = 'C6' AND role = 'collision';
-- Q186: converting green lots to *affordable housing* was keyed toward
-- property rights; the winning value is need-based housing (C2 -1).
UPDATE question_axis_links SET axis_key = -1
  WHERE question_id = 186 AND axis_id = 'C2' AND role = 'collision';

-- Step 3: re-link livelihood costs from C1 to C2 so all
-- ecology-vs-prosperity tradeoffs aggregate on one pair (C9 x C2).
-- Q132: ranchers' livestock losses are a property/livelihood cost.
UPDATE question_axis_links SET axis_id = 'C2'
  WHERE question_id = 132 AND axis_id = 'C1' AND role = 'collision';
-- Q183: seafood prices / local businesses are a prosperity cost.
UPDATE question_axis_links SET axis_id = 'C2'
  WHERE question_id = 183 AND axis_id = 'C1' AND role = 'collision';

-- Step 4: delete unjustified correlate links (no content for that axis
-- in the question text; these contaminated axis scores - C2 worst).
DELETE FROM question_axis_links
WHERE role = 'collision'
  AND (question_id, axis_id) IN (
    (104, 'C4'),  -- family-farm estate tax has no federalism content
    (110, 'C5'),  -- misinfo takedowns: progressivism is a correlate, not content
    (111, 'C2'),  -- state minimum wage "different from federal" is direction-neutral
    (114, 'C5'),  -- national education standards: no cultural content
    (119, 'C2'),  -- opening a scholarship to all: no redistribution content
    (120, 'C2'),  -- housing priority for long-term residents: no C2 content
    (121, 'C7'),  -- donating surplus vaccines: no institutional-sovereignty content
    (127, 'C1'),  -- city bus automation: city-run either way, no market content
    (129, 'C1'),  -- "society should actively encourage" is not market-directed
    (131, 'C1'),  -- dam's cost is prosperity (kept on C2), not economic control
    (136, 'C5'),  -- condemning arranged marriage keyed 'traditionalist' (backwards)
    (145, 'C3'),  -- institutional skepticism keyed 'security/order' (no basis)
    (146, 'C3'),  -- institutional trust keyed 'civil liberties' (no basis)
    (149, 'C2'),  -- restorative preference: redistribution is a correlate
    (152, 'C4'),  -- city-owned transit keyed 'centralized' (city IS local)
    (154, 'F2'),  -- supporting bailouts keyed 'institution-skeptical' (backwards)
    (157, 'C7'),  -- wealth-tax flight: no sovereignty content
    (160, 'C2'),  -- predictive policing: no economic content
    (162, 'C2'),  -- neighborhood curfews: no economic content
    (168, 'C10'), -- teaching classics unedited: pluralism push unfounded
    (169, 'C4'),  -- school clubs over parent objections: no federalism content
    (173, 'C2'),  -- overseas charity keyed 'property rights' (no basis)
    (174, 'C2'),  -- citizen-first hiring keyed 'property rights' (no basis)
    (189, 'F3'),  -- death-penalty pluralism: no justice-style content
    (196, 'C3'),  -- trusting courts keyed 'security/order' (weak, no basis)
    (199, 'C2')   -- drug treatment over prison: redistribution is a correlate
  );

-- Step 5: classify genuine tradeoffs (scenario explicitly prices the
-- linked axis's value; respondent's answer reveals which value won).
UPDATE question_axis_links SET role = 'tradeoff'
WHERE role = 'collision'
  AND (question_id, axis_id) IN (
    -- Civil liberties x tech-enabled security (C3 x C8)
    (107, 'C8'), (159, 'C8'), (160, 'C8'), (161, 'C8'), (179, 'C3'), (182, 'C3'),
    -- Ecology x prosperity/livelihood (C9 x C2)
    (131, 'C2'), (132, 'C2'), (133, 'C2'), (134, 'C2'),
    (183, 'C2'), (184, 'C2'), (185, 'C2'), (186, 'C2'),
    -- Market function x economic fairness (C1 x C2)
    (151, 'C2'), (153, 'C2'),
    -- Urgency of change x public order (F1 x C3)
    (139, 'C3'), (141, 'C3'), (191, 'C3'), (192, 'C3'), (194, 'C3'),
    -- Singletons awaiting more authored questions
    (124, 'C2'),  -- global tax cooperation vs business competitiveness
    (128, 'F2'),  -- tech health benefit vs institutional distrust
    (163, 'C2'),  -- local zoning power vs citywide housing affordability
    (176, 'C3'),  -- binding global health authority vs personal freedom
    (178, 'C8'),  -- arms-control treaty vs technological edge
    (190, 'C7')   -- universal rights enforcement vs local self-determination
  );

-- Step 6: everything else that was 'collision' is a reinforcing
-- secondary loading.
UPDATE question_axis_links SET role = 'secondary'
WHERE role = 'collision';

-- Step 7: restore a strict constraint
ALTER TABLE question_axis_links
  ADD CONSTRAINT question_axis_links_role_check
  CHECK (role IN ('primary', 'secondary', 'tradeoff'));

-- Step 8: rebuild audit views for the new roles
DROP VIEW IF EXISTS axis_weight_audit;
CREATE VIEW axis_weight_audit AS
SELECT
  axis_id,
  COUNT(*) FILTER (WHERE role = 'primary')   AS primary_count,
  SUM(weight) FILTER (WHERE role = 'primary')   AS primary_weight_sum,
  COUNT(*) FILTER (WHERE role = 'secondary') AS secondary_count,
  SUM(weight) FILTER (WHERE role = 'secondary') AS secondary_weight_sum,
  COUNT(*) FILTER (WHERE role = 'tradeoff')  AS tradeoff_count,
  SUM(weight) FILTER (WHERE role = 'tradeoff')  AS tradeoff_weight_sum
FROM question_axis_links
JOIN questions ON questions.id = question_axis_links.question_id
WHERE questions.active = true
GROUP BY axis_id
ORDER BY axis_id;

DROP VIEW IF EXISTS axis_collision_matrix;
CREATE VIEW axis_collision_matrix AS
SELECT
  LEAST(p.axis_id, t.axis_id)    AS axis_a,
  GREATEST(p.axis_id, t.axis_id) AS axis_b,
  CASE WHEN p.axis_key = t.axis_key THEN 1 ELSE -1 END AS signature,
  COUNT(*) AS tradeoff_questions
FROM questions q
JOIN question_axis_links p
  ON p.question_id = q.id AND p.role = 'primary'
JOIN question_axis_links t
  ON t.question_id = q.id AND t.role = 'tradeoff'
WHERE q.active = true
GROUP BY 1, 2, 3
ORDER BY tradeoff_questions DESC;

COMMENT ON TABLE question_axis_links IS
  'Multi-axis links. primary: the measured axis (full question weight). secondary: reinforcing cross-loading (capped scoring contribution, no tension info). tradeoff: the scenario prices this axis''s value against the primary (feeds tension analysis, excluded from axis scores). axis_key is always the direction agreement pushes the axis.';
COMMENT ON VIEW axis_collision_matrix IS
  'Unordered axis pairs with genuine tradeoff questions, grouped by pole signature (1 = agreement pushes both axes toward same-sign poles).';

COMMIT;
