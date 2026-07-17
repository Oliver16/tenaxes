-- =====================================================
-- MIGRATION: Balance the question bank (round-5 audit follow-up)
-- Run AFTER 20260716160000_expand_coverage.sql.
--
-- Goals (see docs/question-bank-balance.md for the full policy):
--  1. Every axis exactly key-balanced (equal +/- primary items) - the
--     methodology page's acquiescence-control claim becomes literally
--     true (was C2 12/14, C5 10/11, C6 9/8).
--  2. No advertised tension pair below 3 scenarios. C7xF5 had 1 (below
--     the analyzer's MIN_ANSWERED=2, so it could NEVER report) and
--     F2xF4 had 2. Both now have 3.
--  3. Core-tier depth for F5 (Force & Peace) - it displays as a core
--     axis but had half a facet's items (10 -> 18). F4 reaches facet
--     parity (10 -> 14).
--  4. New scenario domains across the ideological gamut: energy and
--     transport infrastructure (nuclear, dams, grids, tolls, rail,
--     mega-project siting), defense policy (conscription, arms sales,
--     bases, diplomacy), electoral mechanics (redistricting,
--     emergency powers) - plus a NEW reportable tension pair C8xC9
--     (Tech-Solutionist vs Ecocentric), which previously had zero
--     tradeoff scenarios despite being a marquee real-world conflict.
--  5. De-duplicate: the round-5 near-duplicates are reworded in place
--     (same construct, same key, fresh manifestation - scoring
--     continuity preserved, per the 20260716150000 precedent), and two
--     true duplicates retire (active=false): 155 (duplicate of 105)
--     and 257 (covered by 259/260) - which is exactly what restores
--     C2's key balance.
--
-- Bank after this migration: 286 active items (112 conceptual + 174
-- applied), 288 rows total (2 inactive), every axis keyed +/- equal,
-- and every tension group (axis pair x pole signature, as the analyzer
-- groups them) at >=3 scenarios.
-- =====================================================

BEGIN;

-- ---------------------------------------------------------------
-- Step 1: retire true duplicates (kept in the table so historical
-- sessions still score; simply no longer served to new sessions)
-- ---------------------------------------------------------------
UPDATE questions SET active = false WHERE id IN (155, 257);

-- ---------------------------------------------------------------
-- Step 2: reword near-duplicates in place (same axis, same key).
-- Each pairs with a round-5 audit finding (docs/question-content-audit.md §2).
-- ---------------------------------------------------------------

-- was near-duplicate of 26 ("states should be able to pass differing laws")
UPDATE questions SET text = 'Taxes should mostly be raised and spent by local and regional governments, not the national one.'
WHERE id = 28;

-- was mirrored restatement of 29 (national standards guarantee equality)
UPDATE questions SET text = 'When every region goes its own way, problems that cross borders - pollution, crime, infrastructure - go unsolved.'
WHERE id = 31;

-- was near-duplicate of 48 (wellbeing shouldn't depend on birthplace)
UPDATE questions SET text = 'Treating a stranger''s child as no less important than a neighbor''s child is a moral ideal worth striving for.'
WHERE id = 45;

-- was near-duplicate of 57 (tech creates new problems as fast as it solves)
UPDATE questions SET text = 'Complex technologies fail in ways that even their designers cannot predict or control.'
WHERE id = 60;

-- was double-barreled (future generations + non-human life); the
-- intergenerational half is now carried by 262/263, and this becomes
-- the bank's animal-ethics item
UPDATE questions SET text = 'Animals'' interests should carry moral weight even when protecting them benefits no human.'
WHERE id = 69;

-- was near-verbatim duplicate of 66 (nature exists as a resource for humans)
UPDATE questions SET text = 'Human beings matter morally in a way that animals and ecosystems simply do not.'
WHERE id = 70;

-- was near-duplicate of 87 (institutions routinely mislead); now the
-- regulatory-capture facet of institutional skepticism
UPDATE questions SET text = 'Even well-designed institutions end up serving the industries and interest groups they were meant to oversee.'
WHERE id = 89;

-- was C6 near-duplicate of 258 (colorblind admissions); in-group axis
-- shifts from ethnicity to nationality, making it genuinely C6
UPDATE questions SET text = 'Universities should award scholarships to the most qualified applicants worldwide, even if that means fewer go to students from our own country.'
WHERE id = 119;

-- "wrong everywhere" template was used 3x (136/138/188); capped at 2
UPDATE questions SET text = 'If a close friend from another culture defended a practice I find deeply wrong, I would say it is wrong - not just ''different''.'
WHERE id = 136;

-- was a conceptual restatement of 86 dressed as applied; now a scenario
UPDATE questions SET text = 'I''d rather see a modest reform pass with broad support than a sweeping overhaul rammed through that the next government could reverse.'
WHERE id = 142;

-- was a conceptual restatement of 87/89; now a scenario
UPDATE questions SET text = 'When a big company settles a fraud case without admitting guilt, I assume the misconduct went far beyond what was proven.'
WHERE id = 145;

-- was a conceptual restatement of 90; now a scenario (distinct from 196/198)
UPDATE questions SET text = 'When a study passes peer review at a major scientific journal, I take its findings seriously even when they cut against my politics.'
WHERE id = 146;

-- was hiring-preference duplicate of 122; now procurement
UPDATE questions SET text = 'Public agencies should buy from suppliers in our own country even when foreign firms offer taxpayers a better price.'
WHERE id = 174;

-- "both positions can be valid" template was used 4x (135/137/187/189)
UPDATE questions SET text = 'If I moved to a country whose laws were built on moral views very different from mine, I would accept its system as no less legitimate than ours.'
WHERE id = 189;

-- was near-verbatim duplicate of 139 (blocking traffic); still prices
-- public order (tradeoff C3 link unchanged)
UPDATE questions SET text = 'Physically blocking construction of a project you believe is deeply harmful - a pipeline, a prison, a highway - can be a legitimate political tactic.'
WHERE id = 191;

-- was near-duplicate of 149 (diversion for non-violent crimes); now the
-- expungement/reintegration facet
UPDATE questions SET text = 'Criminal records for non-violent offenses should be sealed after a few years, so people can genuinely start over.'
WHERE id = 199;

-- was near-duplicate of 124 (global minimum corporate tax); same poles
-- (C7+ with a C2-keyed cost), different domain, keeps C2xC7 at n=3
UPDATE questions SET text = 'Trade agreements should include enforceable minimum labor standards for all member countries, even if that raises prices at home.'
WHERE id = 203;

-- was pandemic-authority duplicate of 176 (WHO travel restrictions);
-- same poles (C7+ / C3- cost), new domain, keeps C3xC7 at n=3
UPDATE questions SET text = 'To fight cross-border crime, international agencies should be able to require member countries to check travelers against shared biometric watchlists, even though ordinary people end up tracked.'
WHERE id = 209;

-- was AI-treaty duplicate of 178 (autonomous weapons); same poles
-- (C7+ / C8- cost), new domain, keeps C7xC8 at n=3
UPDATE questions SET text = 'Nations should accept binding global limits on editing human embryos, even if it slows medical breakthroughs at home.'
WHERE id = 211;

-- was near-identical in structure to 53 (international courts override
-- national law); now explicitly domestic with a different sentence shape
UPDATE questions SET
  text = 'Fundamental rights belong in constitutions precisely so that no election result can take them away.',
  educational_content = 'Constitutionalists entrench rights beyond the reach of ordinary majorities, arguing that what an election can grant, an election can revoke. Majoritarians counter that binding future voters to past decisions lets the dead govern the living, and that rights are safest when a live majority actively defends them.'
WHERE id = 221;

-- ---------------------------------------------------------------
-- Step 3: new questions (265-286)
-- ---------------------------------------------------------------
INSERT INTO questions (id, axis_id, key, text, educational_content, display_order, active, weight, question_type) VALUES

-- =====================
-- F4: Decision Authority - facet parity (10 -> 14), incl. 3rd F2xF4 scenario
-- =====================
(265, 'F4', 1,
 'Election district maps should be drawn by independent commissions, not by the party in power.',
 NULL, 267, true, 1.25, 'applied'),
(266, 'F4', -1,
 'In a genuine emergency, elected leaders should be able to act immediately without waiting for courts or oversight bodies to approve.',
 NULL, 268, true, 1.25, 'applied'),
(267, 'F4', 1,
 'If most residents vote to ban water fluoridation against overwhelming scientific advice, the city should keep fluoridating.',
 NULL, 269, true, 1.25, 'applied'),
(268, 'F4', -1,
 'Mega-projects like new airports, rail lines, and power plants should be approved by public vote, not by planning agencies.',
 NULL, 270, true, 1.25, 'applied'),

-- =====================
-- F5: Force & Peace - core-tier depth (10 -> 18), incl. 2 new C7xF5 scenarios
-- =====================
(269, 'F5', 1,
 'Backing down from a military commitment invites more aggression than honoring it, whatever the cost.',
 'Credibility hawks argue that reneging on commitments teaches adversaries that threats work, making every future crisis more dangerous. Critics call this the commitment trap: fighting unwanted wars to preserve a reputation whose deterrent value is unproven.',
 271, true, 1.0, 'conceptual'),
(270, 'F5', -1,
 'A society that celebrates its military too much ends up finding reasons to use it.',
 'Critics of militarism argue that glorifying armed force builds political pressure to use it and crowds out diplomatic instincts. Others respond that honoring service sustains the morale and recruitment a credible defense requires, and implies nothing about eagerness for war.',
 272, true, 1.0, 'conceptual'),
(271, 'F5', 1,
 'Our country should be willing to strike militarily to stop a genocide, even without UN authorization.',
 NULL, 273, true, 1.25, 'applied'),
(272, 'F5', -1,
 'We should hold off on military action until international bodies authorize it, even if that means acting too late to help.',
 NULL, 274, true, 1.25, 'applied'),
(273, 'F5', 1,
 'If our country faced a serious military threat, bringing back mandatory military service would be justified.',
 NULL, 275, true, 1.25, 'applied'),
(274, 'F5', -1,
 'Even with hostile regimes, keeping embassies open and talking is better than cutting ties and isolating them.',
 NULL, 276, true, 1.25, 'applied'),
(275, 'F5', 1,
 'Our country should sell weapons to friendly governments, even knowing some deals will end up in conflicts we regret.',
 NULL, 277, true, 1.25, 'applied'),
(276, 'F5', -1,
 'Our country should close most of its overseas military bases and bring the troops home.',
 NULL, 278, true, 1.25, 'applied'),

-- =====================
-- C8xC9: NEW tension pair (Tech-Solutionist vs Ecocentric), built on
-- energy infrastructure - previously zero tradeoff scenarios
-- =====================
(277, 'C8', 1,
 'Expanding nuclear power is a good climate strategy, even accepting the waste and accident risks that come with it.',
 NULL, 279, true, 1.25, 'applied'),
(278, 'C8', -1,
 'Even to fight climate change, we shouldn''t deploy planet-scale technologies like solar geoengineering that tinker with systems we barely understand.',
 NULL, 280, true, 1.25, 'applied'),
(279, 'C9', 1,
 'Removing aging dams to restore wild rivers and salmon runs is worth losing the clean power they generate.',
 NULL, 281, true, 1.25, 'applied'),
(280, 'C9', -1,
 'Dams that still provide clean power and flood control should be kept, even where removing them would revive lost ecosystems.',
 NULL, 282, true, 1.25, 'applied'),

-- =====================
-- Transport infrastructure (C1 financing, C4 siting authority)
-- =====================
(281, 'C1', 1,
 'Private companies financing roads and bridges through tolls will build and maintain them better than government agencies funded by taxes.',
 NULL, 283, true, 1.25, 'applied'),
(282, 'C1', -1,
 'Projects like high-speed rail are worth building even when no private investor would fund them - only government can build at that scale.',
 NULL, 284, true, 1.25, 'applied'),
(283, 'C4', 1,
 'Communities should be able to say no to wind farms and transmission lines in their area, even if it slows the national energy transition.',
 NULL, 285, true, 1.25, 'applied'),
(284, 'C4', -1,
 'The national government should be able to fast-track critical energy and transport projects over local objections.',
 NULL, 286, true, 1.25, 'applied'),

-- =====================
-- Key-balance completion items (C5 was 10+/11-, C6 was 9+/8-)
-- =====================
(285, 'C5', 1,
 'When a community asks to be described by a new name or term, adopting the new language is a matter of respect, not ''political correctness''.',
 NULL, 287, true, 1.25, 'applied'),
(286, 'C6', -1,
 'It''s fair for a country to favor citizenship applicants who already share its language, culture, or ancestry.',
 NULL, 288, true, 1.25, 'applied'),

-- =====================
-- C3xC5 signature -1 ("secular neutrality vs religious liberty",
-- advertised since round 4) had only 2 scenarios (242, 243) - below
-- the >=3 bar because the round-5 census collapsed signatures. The
-- analyzer groups by axis pair AND pole signature, so this is a
-- distinct tension from the C3xC5 tradition-vs-liberty group.
-- =====================
(287, 'C5', 1,
 'Religious slaughter practices should have to meet the same animal-welfare rules as everyone else, with no exemptions.',
 NULL, 289, true, 1.25, 'applied'),
(288, 'C5', -1,
 'Parents should be free to raise and school their children according to their religious traditions, even when that means opting out of mainstream curriculum requirements.',
 NULL, 290, true, 1.25, 'applied');

-- ---------------------------------------------------------------
-- Step 4: axis links for the new items
-- ---------------------------------------------------------------
INSERT INTO question_axis_links (question_id, axis_id, role, axis_key, weight) VALUES
  (265, 'F4', 'primary',  1, 1.25),
  (266, 'F4', 'primary', -1, 1.25),
  (267, 'F4', 'primary',  1, 1.25), (267, 'F2', 'tradeoff', -1, 0.6),
  (268, 'F4', 'primary', -1, 1.25),
  (269, 'F5', 'primary',  1, 1.0),
  (270, 'F5', 'primary', -1, 1.0),
  (271, 'F5', 'primary',  1, 1.25), (271, 'C7', 'tradeoff', -1, 0.5),
  (272, 'F5', 'primary', -1, 1.25), (272, 'C7', 'tradeoff',  1, 0.5),
  (273, 'F5', 'primary',  1, 1.25),
  (274, 'F5', 'primary', -1, 1.25),
  (275, 'F5', 'primary',  1, 1.25),
  (276, 'F5', 'primary', -1, 1.25),
  (277, 'C8', 'primary',  1, 1.25), (277, 'C9', 'tradeoff', -1, 0.6),
  (278, 'C8', 'primary', -1, 1.25), (278, 'C9', 'tradeoff',  1, 0.6),
  (279, 'C9', 'primary',  1, 1.25), (279, 'C8', 'tradeoff', -1, 0.6),
  (280, 'C9', 'primary', -1, 1.25), (280, 'C8', 'tradeoff',  1, 0.6),
  (281, 'C1', 'primary',  1, 1.25),
  (282, 'C1', 'primary', -1, 1.25),
  (283, 'C4', 'primary',  1, 1.25),
  (284, 'C4', 'primary', -1, 1.25),
  (285, 'C5', 'primary',  1, 1.25),
  (286, 'C6', 'primary', -1, 1.25),
  (287, 'C5', 'primary',  1, 1.25), (287, 'C3', 'tradeoff', -1, 0.6),
  (288, 'C5', 'primary', -1, 1.25), (288, 'C3', 'tradeoff',  1, 0.6);

SELECT setval('questions_id_seq', 288);

COMMIT;
