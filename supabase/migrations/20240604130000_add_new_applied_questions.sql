-- =====================================================
-- MIGRATION: Add 52 new applied questions (151-202)
-- 4 questions per axis × 13 axes
-- =====================================================

-- 52 new applied questions: 4 per axis × 13 axes
-- Assumes existing applied questions end at id 150, display_order 152

INSERT INTO questions (id, axis_id, key, text, display_order, active, weight, question_type) VALUES

-- =====================
-- C1: Economic Control (State-Directed ↔ Market-Directed)
-- =====================
(151, 'C1',  1,
 'In cities where rents are soaring, I oppose strict rent caps; it''s better to let landlords charge market rates so more housing gets built over time.',
 153, true, 1.25, 'applied'),
(152, 'C1', -1,
 'Public transit should be owned and operated by the city, even if private bus companies say they could run the system more cheaply for a profit.',
 154, true, 1.25, 'applied'),
(153, 'C1',  1,
 'If a supermarket chain replaces most cashiers with self-checkout machines to keep prices low, that tradeoff is acceptable even though it eliminates some jobs.',
 155, true, 1.25, 'applied'),
(154, 'C1', -1,
 'During a recession, the government should directly subsidize struggling companies to keep workers employed, even if the businesses were poorly managed.',
 156, true, 1.25, 'applied'),

-- =====================
-- C2: Economic Equality (Redistributionist ↔ Property Rights)
-- =====================
(155, 'C2', -1,
 'If a city has many vacant luxury condos, I support taxing or converting them into affordable housing even if it reduces returns for investors.',
 157, true, 1.25, 'applied'),
(156, 'C2',  1,
 'I oppose broad student loan forgiveness; borrowers should repay what they agreed to rather than shifting the cost to taxpayers.',
 158, true, 1.25, 'applied'),
(157, 'C2', -1,
 'I support a yearly wealth tax on multimillionaires to fund universal childcare and healthcare, even if some wealthy people move away.',
 159, true, 1.25, 'applied'),
(158, 'C2',  1,
 'A flat income tax where everyone pays the same percentage is fairer than higher tax rates on top earners.',
 160, true, 1.25, 'applied'),

-- =====================
-- C3: Coercive Power (Security/Order ↔ Civil Liberties)
-- =====================
(159, 'C3',  1,
 'I oppose installing facial-recognition cameras throughout my city, even if police argue it would significantly reduce crime.',
 161, true, 1.25, 'applied'),
(160, 'C3', -1,
 'Police should be allowed to use predictive algorithms to identify likely offenders, even if those systems sometimes reflect biased historical data.',
 162, true, 1.25, 'applied'),
(161, 'C3',  1,
 'During a pandemic, I am uncomfortable with smartphone location tracking to enforce quarantine, even if it would slow the spread of disease.',
 163, true, 1.25, 'applied'),
(162, 'C3', -1,
 'In high-crime neighborhoods, I support imposing temporary curfews even though it restricts the freedom of residents who have done nothing wrong.',
 164, true, 1.25, 'applied'),

-- =====================
-- C4: Where Power Sits (Centralized ↔ Localized)
-- =====================
(163, 'C4',  1,
 'Neighborhoods should have real power over local zoning decisions, even if that slows down new housing construction citywide.',
 165, true, 1.25, 'applied'),
(164, 'C4', -1,
 'Use-of-force standards for police should be set at the national level so departments can''t adopt looser local policies.',
 166, true, 1.25, 'applied'),
(165, 'C4',  1,
 'Local school boards should be free to adopt their own curriculum on controversial topics, even if national experts disagree.',
 167, true, 1.25, 'applied'),
(166, 'C4', -1,
 'The national government should be able to override cities that declare themselves sanctuary cities for undocumented immigrants.',
 168, true, 1.25, 'applied'),

-- =====================
-- C5: Cultural Orientation (Traditionalist ↔ Progressivist)
-- =====================
(167, 'C5',  1,
 'Adults should be allowed to change the gender marker on their IDs based on self-identification, without requiring medical procedures or court hearings.',
 169, true, 1.25, 'applied'),
(168, 'C5', -1,
 'Classic books that contain racist or sexist language should be taught in their original form, not replaced with edited versions or removed from classes.',
 170, true, 1.25, 'applied'),
(169, 'C5',  1,
 'Public schools should allow students to form clubs around any gender or sexual identity, even if some parents strongly object.',
 171, true, 1.25, 'applied'),
(170, 'C5', -1,
 'Elementary school teachers should avoid discussing topics like open relationships or nontraditional sexual lifestyles, even if some families are comfortable with them.',
 172, true, 1.25, 'applied'),

-- =====================
-- C6: Group Boundaries (Particularist ↔ Universalist)
-- =====================
(171, 'C6',  1,
 'When our country accepts refugees, priority should go to the most vulnerable people globally rather than those from allied or culturally similar nations.',
 173, true, 1.25, 'applied'),
(172, 'C6', -1,
 'If my country faces a natural disaster, I think we should fully fund domestic recovery before sending major aid to other countries.',
 174, true, 1.25, 'applied'),
(173, 'C6',  1,
 'I''d rather donate to a charity that fights extreme poverty overseas than one that funds relatively minor improvements in my own neighborhood.',
 175, true, 1.25, 'applied'),
(174, 'C6', -1,
 'When hiring for competitive jobs, citizens and veterans from my own country should get priority over equally qualified foreign applicants.',
 176, true, 1.25, 'applied'),

-- =====================
-- C7: Sovereignty Scope (Sovereigntist ↔ Integrationist)
-- =====================
(175, 'C7', -1,
 'I oppose international courts having the power to prosecute my country''s soldiers for actions taken in war.',
 177, true, 1.25, 'applied'),
(176, 'C7',  1,
 'During serious global pandemics, the World Health Organization should be able to impose binding travel restrictions that member countries must follow.',
 178, true, 1.25, 'applied'),
(177, 'C7', -1,
 'Our national legislature should set immigration levels on its own; international refugee agreements shouldn''t force us to take more people than we choose.',
 179, true, 1.25, 'applied'),
(178, 'C7',  1,
 'I support a binding global treaty that limits autonomous weapons and AI military systems, even if it restricts my country''s technological edge.',
 180, true, 1.25, 'applied'),

-- =====================
-- C8: Technology Stance (Tech-Skeptical ↔ Tech-Solutionist)
-- =====================
(179, 'C8',  1,
 'My city should install a dense network of traffic and air-quality sensors to optimize flows and health, even though it means constant monitoring of public spaces.',
 181, true, 1.25, 'applied'),
(180, 'C8', -1,
 'I would rather have a human judge decide criminal sentences than rely on an algorithm, even if data shows the algorithm is slightly more consistent.',
 182, true, 1.25, 'applied'),
(181, 'C8',  1,
 'If advanced AI and automation dramatically increase profits, I support funding a universal basic income from those gains to soften job losses.',
 183, true, 1.25, 'applied'),
(182, 'C8', -1,
 'Even if brain–computer interfaces could treat serious disabilities, I am uneasy about normalizing implants that let companies or governments access people''s thoughts.',
 184, true, 1.25, 'applied'),

-- =====================
-- C9: Nature''s Moral Weight (Anthropocentric ↔ Ecocentric)
-- =====================
(183, 'C9',  1,
 'I support banning commercial fishing in fragile coral reef areas, even if it raises seafood prices and hurts some local businesses.',
 185, true, 1.25, 'applied'),
(184, 'C9', -1,
 'Building a new highway through a rural area is acceptable if it significantly cuts commute times, even though it fragments wildlife habitat.',
 186, true, 1.25, 'applied'),
(185, 'C9',  1,
 'To fight climate change, I would back strict limits on frequent air travel, even if it makes personal vacations much harder.',
 187, true, 1.25, 'applied'),
(186, 'C9', -1,
 'In dense cities, converting remaining vacant green lots into affordable housing is an acceptable tradeoff, even if it reduces access to nature.',
 188, true, 1.25, 'applied'),

-- =====================
-- C10: Moral Foundation (Moral Universalist ↔ Moral Pluralist)
-- =====================
(187, 'C10',  1,
 'When two countries handle hate speech very differently, I think each approach can be morally appropriate for its own culture.',
 189, true, 1.25, 'applied'),
(188, 'C10', -1,
 'Cultural traditions that involve permanently harming children''s bodies, like genital cutting, are wrong everywhere and should be discouraged globally.',
 190, true, 1.25, 'applied'),
(189, 'C10',  1,
 'I can accept that some societies see the death penalty as morally justified while others reject it; both positions can be ethically valid in context.',
 191, true, 1.25, 'applied'),
(190, 'C10', -1,
 'I believe there are universal human rights that all governments must respect, even when those rights conflict with long-standing local customs.',
 192, true, 1.25, 'applied'),

-- =====================
-- F1: Change Strategy (Gradualist ↔ Radical)
-- =====================
(191, 'F1',  1,
 'If peaceful protest keeps being ignored, tactics like occupying buildings or blocking major roads can be justified to force change.',
 193, true, 1.25, 'applied'),
(192, 'F1', -1,
 'Even when I''m deeply frustrated with the system, political change should come through elections and courts, not property damage or street clashes.',
 194, true, 1.25, 'applied'),
(193, 'F1',  1,
 'I admire movements that refuse to compromise on core demands, even if it means they lose in the short term.',
 195, true, 1.25, 'applied'),
(194, 'F1', -1,
 'I prefer leaders who avoid inflaming tensions and seek incremental agreements, even if that means slower progress on issues I care about.',
 196, true, 1.25, 'applied'),

-- =====================
-- F2: Institutional Trust (Trusting ↔ Skeptical)
-- =====================
(195, 'F2',  1,
 'I assume large tech companies are hiding important information about how they collect and use people''s data.',
 197, true, 1.25, 'applied'),
(196, 'F2', -1,
 'When multiple levels of courts uphold a law over many years, I generally trust that the law is constitutional even if I dislike it.',
 198, true, 1.25, 'applied'),
(197, 'F2',  1,
 'I think official economic statistics and political polls are often manipulated, so I don''t put much stock in them.',
 199, true, 1.25, 'applied'),
(198, 'F2', -1,
 'If several independent news outlets report the same event, I usually trust the basic facts even if details might be off.',
 200, true, 1.25, 'applied'),

-- =====================
-- F3: Justice Style (Retributive ↔ Restorative)
-- =====================
(199, 'F3',  1,
 'For non-violent drug offenses, I prefer treatment and clearing people''s records over sending them to prison.',
 201, true, 1.25, 'applied'),
(200, 'F3', -1,
 'People who repeatedly commit serious violent crimes should receive long mandatory prison sentences, even if rehabilitation programs might work in some cases.',
 202, true, 1.25, 'applied'),
(201, 'F3',  1,
 'I support giving victims a say in restorative justice programs, even when the law would allow a much harsher sentence.',
 203, true, 1.25, 'applied'),
(202, 'F3', -1,
 'Publicly naming and shaming serious offenders is important, even after they have completed their prison sentences.',
 204, true, 1.25, 'applied');

-- Update sequence to continue after new questions
SELECT setval('questions_id_seq', 202);

COMMENT ON TABLE questions IS 'Survey questions table - now includes 202 applied questions (99-202) covering all 13 axes';
