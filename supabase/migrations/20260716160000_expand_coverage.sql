-- =====================================================
-- MIGRATION: Close the coverage gaps from the question-bank audit
-- Run AFTER 20260716150000_reword_overlap_items.sql.
--
-- 1. Two new facet axes:
--      F4 Decision Authority  (Majoritarian <-> Constitutionalist)
--        - who should decide: popular will vs experts/courts/constraints
--      F5 Force & Peace       (Dove <-> Hawk)
--        - willingness to use military force
-- 2. Renames C10 from "Moral Foundation" to "Moral Epistemology" -
--    the axis measures universalism vs pluralism about moral truth,
--    not Haidt-style moral foundations; the old name collided with
--    Moral Foundations Theory.
-- 3. 44 new questions (221-264) covering previously unaddressed areas:
--    democratic process, war and peace, religion vs secular state,
--    labor and workplace power, positive vs negative liberty,
--    bioethics and moral paternalism, gun rights, race-conscious
--    policy, and intergenerational obligation.
--
-- Keying notes:
--  - Race-conscious items are split across C6 (colorblind = universalist,
--    matching Q119's precedent) and C2 (corrective redistribution). The
--    correct loading is genuinely contested; item-rest correlations in
--    /admin/validation should settle it empirically.
--  - C2 gains a -6/+4 primary-key skew from the new content (most new
--    topics have a redistribution-favorable agree direction); monitor
--    via the validation dashboard.
-- =====================================================

BEGIN;

-- Step 1: new facet axes
INSERT INTO axes (id, name, pole_negative, pole_positive) VALUES
  ('F4', 'Decision Authority', 'Majoritarian', 'Constitutionalist'),
  ('F5', 'Force & Peace', 'Dove', 'Hawk')
ON CONFLICT (id) DO NOTHING;

-- Step 2: rename C10 (measures moral epistemology, not Haidtian foundations)
UPDATE axes SET name = 'Moral Epistemology' WHERE id = 'C10';

-- Step 3: new questions
INSERT INTO questions (id, axis_id, key, text, educational_content, display_order, active, weight, question_type) VALUES

-- =====================
-- F4: Decision Authority (Majoritarian <-> Constitutionalist)
-- =====================
(221, 'F4', 1,
 'Courts should be able to strike down laws passed by large democratic majorities when those laws violate fundamental rights.',
 'This is the countermajoritarian dilemma: constitutionalists argue rights must be protected even from popular majorities, or democracy devours itself. Majoritarians counter that unelected judges overriding the people''s representatives is itself a failure of democracy.',
 223, true, 1.0, 'conceptual'),
(222, 'F4', -1,
 'No court, expert body, or institution should be able to block the clearly expressed will of the majority for long.',
 'Majoritarians hold that legitimacy flows only from the people, so institutional vetoes must ultimately yield. Constitutionalists argue that durable checks are what distinguish constitutional democracy from mob rule, protecting minorities and long-term interests.',
 224, true, 1.0, 'conceptual'),
(223, 'F4', 1,
 'Some public questions are too technical for popular opinion to settle and are better delegated to qualified experts.',
 'Advocates of delegation point to central banking, drug approval, and pandemic response as areas where expertise outperforms popular sentiment. Critics argue expert bodies escape accountability and smuggle value judgments in as technical ones.',
 225, true, 1.0, 'conceptual'),
(224, 'F4', -1,
 'Ordinary citizens, not experts or judges, should make the big decisions about society''s direction - even on complex issues.',
 'Democratic populists argue citizens are the rightful authors of their collective life and that "complexity" is often an excuse to exclude them. Constitutionalists respond that good judgment on technical questions requires knowledge most citizens lack the time to acquire.',
 226, true, 1.0, 'conceptual'),
(225, 'F4', 1,
 'Constitutions should be hard to change, even when current majorities find them inconvenient.',
 'Entrenchment protects fundamental rules from momentary passions and shifting majorities. Critics argue the dead hand of the past should not bind the living, and that rigid constitutions preserve outdated arrangements.',
 227, true, 1.0, 'conceptual'),
(226, 'F4', -1,
 'Putting major national questions directly to voters in referendums produces more legitimate decisions than leaving them to politicians.',
 'Direct-democracy advocates argue referendums cut out self-interested intermediaries and settle big questions with unmatched legitimacy. Skeptics point to campaigns that reduce complex tradeoffs to slogans and outcomes that swing on turnout.',
 228, true, 1.0, 'conceptual'),
(227, 'F4', -1,
 'If a large majority of voters supports a policy, the government should implement it even when most experts warn it will backfire.',
 NULL, 229, true, 1.25, 'applied'),
(228, 'F4', 1,
 'An independent central bank should keep control of interest rates even when elected leaders demand cheaper borrowing before an election.',
 NULL, 230, true, 1.25, 'applied'),
(229, 'F4', -1,
 'Voters should be able to remove judges who repeatedly block popular laws.',
 NULL, 231, true, 1.25, 'applied'),
(230, 'F4', 1,
 'Even on divisive moral questions like assisted dying, careful legislative deliberation is better than a simple yes/no referendum.',
 NULL, 232, true, 1.25, 'applied'),

-- =====================
-- F5: Force & Peace (Dove <-> Hawk)
-- =====================
(231, 'F5', 1,
 'Sometimes military force is the only language aggressive regimes understand.',
 'Hawks argue that appeasement invites escalation and that credible force is what keeps predatory states in check. Doves counter that force usually breeds the next conflict and that this framing forecloses diplomacy too early.',
 233, true, 1.0, 'conceptual'),
(232, 'F5', -1,
 'War is almost never worth its cost in lives, even when the cause seems just.',
 'Near-pacifists weigh the certain horrors of war against its speculative benefits and find almost no war justified. Interventionists respond that refusing to fight can carry even higher costs - conquest, atrocity, and the collapse of deterrence.',
 234, true, 1.0, 'conceptual'),
(233, 'F5', 1,
 'A strong military prevents wars; weakness invites them.',
 'Deterrence theory holds that visible strength raises the cost of aggression and so preserves peace. Critics argue arms build-ups feed security spirals in which each side''s "defensive" strength looks like a threat to the other.',
 235, true, 1.0, 'conceptual'),
(234, 'F5', -1,
 'Most wars our country has fought could have been avoided through diplomacy and restraint.',
 'Doves read history as a catalog of avoidable wars driven by pride, fear, and bad information. Hawks read the same history as proof that some adversaries cannot be talked out of aggression, only deterred or defeated.',
 236, true, 1.0, 'conceptual'),
(235, 'F5', 1,
 'Countries with the power to stop mass atrocities abroad have a duty to intervene, with force if necessary.',
 'Humanitarian interventionists argue sovereignty is no shield for genocide. Opponents - both dovish and sovereigntist - point to interventions that deepened the suffering they meant to stop, and question who authorizes such wars.',
 237, true, 1.0, 'conceptual'),
(236, 'F5', -1,
 'Shifting military spending to domestic needs would make us better off, not less safe.',
 'Advocates see defense budgets as bloated opportunity costs paid in schools and hospitals. Skeptics argue security underwrites everything else and that underfunded deterrence is the most expensive mistake a country can make.',
 238, true, 1.0, 'conceptual'),
(237, 'F5', 1,
 'If an allied democracy is invaded, our country should be willing to send troops - not just weapons and aid.',
 NULL, 239, true, 1.25, 'applied'),
(238, 'F5', -1,
 'I would oppose striking a hostile country''s weapons programs unless we were attacked first.',
 NULL, 240, true, 1.25, 'applied'),
(239, 'F5', 1,
 'Targeting a terrorist leader hiding in another country without that country''s permission can be justified.',
 NULL, 241, true, 1.25, 'applied'),
(240, 'F5', -1,
 'Our country should pledge never to use nuclear weapons first, even if that weakens deterrence.',
 NULL, 242, true, 1.25, 'applied'),

-- =====================
-- Religion and the secular state (C5 x C3)
-- =====================
(241, 'C5', -1,
 'Religious organizations should be able to run publicly funded schools that teach according to their faith.',
 NULL, 243, true, 1.25, 'applied'),
(242, 'C5', 1,
 'Government employees should keep religious symbols out of sight while serving the public, so the state stays neutral.',
 NULL, 244, true, 1.25, 'applied'),
(243, 'C5', -1,
 'People should be able to refuse work duties that conflict with their religious beliefs, even when it inconveniences employers or customers.',
 NULL, 245, true, 1.25, 'applied'),

-- =====================
-- Labor and workplace power (C1 / C2)
-- =====================
(244, 'C2', -1,
 'Workers have the right to strike even when it shuts down services the public depends on.',
 NULL, 246, true, 1.25, 'applied'),
(245, 'C1', 1,
 'Companies should be able to hire replacements for striking workers to keep their business running.',
 NULL, 247, true, 1.25, 'applied'),
(246, 'C2', -1,
 'Gig workers like rideshare drivers should get employee benefits, even if it raises prices and means fewer flexible jobs.',
 NULL, 248, true, 1.25, 'applied'),
(247, 'C2', 1,
 'Employees who don''t want a union shouldn''t have to pay union dues, even if they benefit from the contract the union negotiated.',
 NULL, 249, true, 1.25, 'applied'),

-- =====================
-- Positive vs negative liberty (C2 x C3 tradeoffs)
-- =====================
(248, 'C2', -1,
 'Taxing people more to guarantee everyone housing and healthcare expands freedom overall, even though it limits what earners keep.',
 NULL, 250, true, 1.25, 'applied'),
(249, 'C2', 1,
 'Freedom means the government leaving you alone - even if some people end up without the means to make much of that freedom.',
 NULL, 251, true, 1.25, 'applied'),
(250, 'C2', -1,
 'Mandatory paycheck deductions for retirement and health coverage make people freer in the long run, even though they override individual choice.',
 NULL, 252, true, 1.25, 'applied'),

-- =====================
-- Bioethics, moral paternalism, and guns (C3)
-- =====================
(251, 'C3', 1,
 'Terminally ill adults should have the legal right to end their lives with medical assistance.',
 NULL, 253, true, 1.25, 'applied'),
(252, 'C3', 1,
 'Adults should be free to use recreational drugs, with the state limited to regulating safety and purity.',
 NULL, 254, true, 1.25, 'applied'),
(253, 'C3', -1,
 'Governments should be able to require vaccination during dangerous outbreaks, with real penalties for refusing.',
 NULL, 255, true, 1.25, 'applied'),
(254, 'C3', 1,
 'Law-abiding adults should be able to own firearms for self-defense without having to prove a special need.',
 NULL, 256, true, 1.25, 'applied'),
(255, 'C3', -1,
 'Requiring licenses, training, and registration for all gun owners is a reasonable public-safety measure.',
 NULL, 257, true, 1.25, 'applied'),
(256, 'C3', -1,
 'Courts should be able to temporarily take guns from people shown to be a danger to themselves or others.',
 NULL, 258, true, 1.25, 'applied'),

-- =====================
-- Race-conscious policy (C2 / C6; see keying note above)
-- =====================
(257, 'C2', -1,
 'Schools and employers should be able to give extra consideration to applicants from groups that faced historical exclusion.',
 NULL, 259, true, 1.25, 'applied'),
(258, 'C6', 1,
 'Admissions and hiring should be strictly colorblind - the same criteria for everyone, regardless of group history.',
 NULL, 260, true, 1.25, 'applied'),
(259, 'C2', -1,
 'Communities that were dispossessed through slavery, segregation, or seized land are owed real compensation today.',
 NULL, 261, true, 1.25, 'applied'),
(260, 'C2', 1,
 'Preferences based on group identity are unfair to individuals who did nothing wrong, whatever the historical justification.',
 NULL, 262, true, 1.25, 'applied'),

-- =====================
-- Intergenerational obligation (C2 / C9)
-- =====================
(261, 'C2', 1,
 'Public borrowing that pushes today''s costs onto future generations is unfair, even when it funds programs people want now.',
 NULL, 263, true, 1.25, 'applied'),
(262, 'C9', 1,
 'Harms to people fifty years from now should weigh as heavily in policy as harms to people today.',
 NULL, 264, true, 1.25, 'applied'),
(263, 'C9', -1,
 'It''s reasonable to focus on today''s poverty and disease before spending heavily against risks that mainly affect future generations.',
 NULL, 265, true, 1.25, 'applied'),

-- =====================
-- Bodily autonomy position item (C5; the bank previously asked only the
-- meta-question of whether reasonable people can disagree on abortion)
-- =====================
(264, 'C5', 1,
 'Ending a pregnancy in its early months should be legal, with the decision left to the woman and her doctor.',
 NULL, 266, true, 1.25, 'applied');

-- Step 4: axis links (primary for every item; tradeoff/secondary where
-- the scenario prices another axis's value)
INSERT INTO question_axis_links (question_id, axis_id, role, axis_key, weight) VALUES
  (221, 'F4', 'primary',  1, 1.0),
  (222, 'F4', 'primary', -1, 1.0),
  (223, 'F4', 'primary',  1, 1.0),
  (224, 'F4', 'primary', -1, 1.0),
  (225, 'F4', 'primary',  1, 1.0),
  (226, 'F4', 'primary', -1, 1.0),
  (227, 'F4', 'primary', -1, 1.25), (227, 'F2', 'tradeoff',  1, 0.6),
  (228, 'F4', 'primary',  1, 1.25), (228, 'F2', 'tradeoff', -1, 0.6),
  (229, 'F4', 'primary', -1, 1.25),
  (230, 'F4', 'primary',  1, 1.25),
  (231, 'F5', 'primary',  1, 1.0),
  (232, 'F5', 'primary', -1, 1.0),
  (233, 'F5', 'primary',  1, 1.0),
  (234, 'F5', 'primary', -1, 1.0),
  (235, 'F5', 'primary',  1, 1.0),
  (236, 'F5', 'primary', -1, 1.0),
  (237, 'F5', 'primary',  1, 1.25),
  (238, 'F5', 'primary', -1, 1.25),
  (239, 'F5', 'primary',  1, 1.25), (239, 'C7', 'tradeoff', -1, 0.5),
  (240, 'F5', 'primary', -1, 1.25),
  (241, 'C5', 'primary', -1, 1.25),
  (242, 'C5', 'primary',  1, 1.25), (242, 'C3', 'tradeoff', -1, 0.6),
  (243, 'C5', 'primary', -1, 1.25), (243, 'C3', 'tradeoff',  1, 0.6),
  (244, 'C2', 'primary', -1, 1.25),
  (245, 'C1', 'primary',  1, 1.25), (245, 'C2', 'tradeoff',  1, 0.6),
  (246, 'C2', 'primary', -1, 1.25), (246, 'C1', 'tradeoff', -1, 0.6),
  (247, 'C2', 'primary',  1, 1.25),
  (248, 'C2', 'primary', -1, 1.25), (248, 'C3', 'tradeoff', -1, 0.6),
  (249, 'C2', 'primary',  1, 1.25), (249, 'C3', 'tradeoff',  1, 0.6),
  (250, 'C2', 'primary', -1, 1.25), (250, 'C3', 'tradeoff', -1, 0.5),
  (251, 'C3', 'primary',  1, 1.25), (251, 'C5', 'secondary', 1, 0.4),
  (252, 'C3', 'primary',  1, 1.25),
  (253, 'C3', 'primary', -1, 1.25),
  (254, 'C3', 'primary',  1, 1.25),
  (255, 'C3', 'primary', -1, 1.25),
  (256, 'C3', 'primary', -1, 1.25),
  (257, 'C2', 'primary', -1, 1.25),
  (258, 'C6', 'primary',  1, 1.25),
  (259, 'C2', 'primary', -1, 1.25),
  (260, 'C2', 'primary',  1, 1.25),
  (261, 'C2', 'primary',  1, 1.25),
  (262, 'C9', 'primary',  1, 1.25),
  (263, 'C9', 'primary', -1, 1.25),
  (264, 'C5', 'primary',  1, 1.25);

SELECT setval('questions_id_seq', 264);

COMMIT;
