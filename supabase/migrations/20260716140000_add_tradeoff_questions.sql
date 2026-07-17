-- =====================================================
-- MIGRATION: Add 18 tradeoff questions (203-220)
-- Run AFTER 20260716120000_fix_tension_links.sql.
--
-- Fills the tension pairs that previously had only one tradeoff
-- question (below the 2-scenario reporting floor) and adds one new
-- pair, so every marquee tension reaches at least 3 scenarios:
--
--   C7 x C2  global cooperation vs national economic advantage  1 -> 3
--   C8 x F2  tech benefit vs institutional distrust             1 -> 3
--   C4 x C2  local control vs housing/need                      1 -> 3
--   C7 x C3  global authority vs personal liberty               1 -> 3
--   C7 x C8  global governance vs technological edge            1 -> 3
--   C7 x C10 universal rights vs local self-determination       1 -> 3
--   C9 x C2  green space vs affordable housing (left-vs-left)   1 -> 3
--   C1 x C2  market function vs economic fairness               2 -> 3
--   C5 x C3  tradition vs personal liberty (NEW pair)           0 -> 3
--
-- Each pair mixes agreement directions where possible so acquiescence
-- cannot masquerade as a priority. Primary-axis keying stays balanced
-- for every axis except C1 and C5 (each off by one, noted).
-- =====================================================

BEGIN;

INSERT INTO questions (id, axis_id, key, text, display_order, active, weight, question_type) VALUES

-- C7 x C2: global cooperation vs national economic advantage
(203, 'C7',  1,
 'I support global rules that crack down on offshore tax havens, even if our own banking sector loses business as a result.',
 205, true, 1.25, 'applied'),
(204, 'C7', -1,
 'Our country should be free to offer special tax breaks to attract global companies, even if international bodies say it undercuts poorer nations.',
 206, true, 1.25, 'applied'),

-- C8 x F2: tech benefit vs institutional distrust
(205, 'C8',  1,
 'I would use an AI assistant for everyday medical questions, even though that means a tech company handles my health information.',
 207, true, 1.25, 'applied'),
(206, 'C8', -1,
 'I avoid smart-home devices like voice assistants, even though they are convenient, because I don''t trust companies with always-on microphones in my house.',
 208, true, 1.25, 'applied'),

-- C4 x C2: local control vs housing and need
(207, 'C4', -1,
 'The state should be able to override local zoning rules to require that every town allows apartments and affordable housing.',
 209, true, 1.25, 'applied'),
(208, 'C4',  1,
 'A neighborhood should be able to block a homeless shelter from opening on its street, even if the city says the shelter is badly needed.',
 210, true, 1.25, 'applied'),

-- C7 x C3: global authority vs personal liberty
(209, 'C7',  1,
 'During global health emergencies, international authorities should be able to require standardized digital health passes for travel, even though it expands tracking of ordinary people.',
 211, true, 1.25, 'applied'),
(210, 'C7', -1,
 'Our country should refuse international data-sharing rules that require logging citizens'' travel and communications, even if that makes cross-border crime harder to fight.',
 212, true, 1.25, 'applied'),

-- C7 x C8: global governance vs technological edge
(211, 'C7',  1,
 'I support binding international safety limits on advanced AI development, even if they slow down our country''s leading tech companies.',
 213, true, 1.25, 'applied'),
(212, 'C7', -1,
 'Our country should push ahead with cutting-edge genetic and AI research even when international bodies call for a global pause.',
 214, true, 1.25, 'applied'),

-- C7 x C10: universal rights vs local self-determination
(213, 'C10', -1,
 'International institutions should pressure countries that criminalize homosexuality to change those laws, even where the laws reflect majority local values.',
 215, true, 1.25, 'applied'),
(214, 'C10',  1,
 'Even when I find another culture''s practices deeply wrong, international bodies shouldn''t force that culture to change.',
 216, true, 1.25, 'applied'),

-- C9 x C2 (signature +1): green space vs affordable housing
(215, 'C9', -1,
 'Environmental review should be fast-tracked or waived for affordable housing projects, even if some habitat and green space is lost.',
 217, true, 1.25, 'applied'),
(216, 'C9',  1,
 'A city should keep its large parks intact even if selling part of the land could fund thousands of subsidized homes.',
 218, true, 1.25, 'applied'),

-- C1 x C2: market function vs economic fairness (mirrors 151/153)
(217, 'C1', -1,
 'Emergency laws should ban ride-price surges during disasters, even if that means fewer drivers show up exactly when demand spikes.',
 219, true, 1.25, 'applied'),

-- C5 x C3: tradition vs personal liberty (new pair)
(218, 'C5', -1,
 'The government should be able to restrict art or entertainment that mocks sacred religious traditions.',
 220, true, 1.25, 'applied'),
(219, 'C3',  1,
 'Even when public behavior offends community standards of decency, the government shouldn''t have the power to ban it.',
 221, true, 1.25, 'applied'),
(220, 'C3', -1,
 'Schools should be able to enforce dress codes that reflect traditional community values, even when students say it limits their self-expression.',
 222, true, 1.25, 'applied');

-- Primary links (full question weight) and tradeoff links.
-- axis_key is the direction agreement pushes that axis.
INSERT INTO question_axis_links (question_id, axis_id, role, axis_key, weight) VALUES
  (203, 'C7', 'primary',   1, 1.25), (203, 'C2', 'tradeoff',  -1, 0.6),
  (204, 'C7', 'primary',  -1, 1.25), (204, 'C2', 'tradeoff',   1, 0.6),
  (205, 'C8', 'primary',   1, 1.25), (205, 'F2', 'tradeoff',  -1, 0.6),
  (206, 'C8', 'primary',  -1, 1.25), (206, 'F2', 'tradeoff',   1, 0.6),
  (207, 'C4', 'primary',  -1, 1.25), (207, 'C2', 'tradeoff',  -1, 0.6),
  (208, 'C4', 'primary',   1, 1.25), (208, 'C2', 'tradeoff',   1, 0.5),
  (209, 'C7', 'primary',   1, 1.25), (209, 'C3', 'tradeoff',  -1, 0.6),
  (210, 'C7', 'primary',  -1, 1.25), (210, 'C3', 'tradeoff',   1, 0.6),
  (211, 'C7', 'primary',   1, 1.25), (211, 'C8', 'tradeoff',  -1, 0.6),
  (212, 'C7', 'primary',  -1, 1.25), (212, 'C8', 'tradeoff',   1, 0.6),
  (213, 'C10', 'primary', -1, 1.25), (213, 'C7', 'tradeoff',   1, 0.6),
  (214, 'C10', 'primary',  1, 1.25), (214, 'C7', 'tradeoff',  -1, 0.6),
  (215, 'C9', 'primary',  -1, 1.25), (215, 'C2', 'tradeoff',  -1, 0.6),
  (216, 'C9', 'primary',   1, 1.25), (216, 'C2', 'tradeoff',   1, 0.6),
  (217, 'C1', 'primary',  -1, 1.25), (217, 'C2', 'tradeoff',  -1, 0.6),
  (218, 'C5', 'primary',  -1, 1.25), (218, 'C3', 'tradeoff',  -1, 0.6),
  (219, 'C3', 'primary',   1, 1.25), (219, 'C5', 'tradeoff',   1, 0.6),
  (220, 'C3', 'primary',  -1, 1.25), (220, 'C5', 'tradeoff',  -1, 0.6);

-- Keep the id sequence ahead of seeded ids
SELECT setval('questions_id_seq', 220);

COMMIT;
