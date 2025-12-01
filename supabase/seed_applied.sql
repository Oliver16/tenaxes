-- Seed data for applied questions (scenario-based)
-- Run AFTER 002_add_question_weights.sql migration
-- Total: 52 applied questions (4 per axis × 13 axes)
-- Weight: 1.25x for all applied questions

INSERT INTO questions (id, axis_id, key, text, display_order, active, weight, question_type) VALUES

-- =====================
-- C1: Economic Control (State-Directed ↔ Market-Directed)
-- =====================
(99, 'C1', 1, 'When ride-sharing apps like Uber entered my city, I supported letting them compete with traditional taxis rather than banning or heavily restricting them.', 101, true, 1.25, 'applied'),
(100, 'C1', -1, 'During the recent spike in gas prices, I would have supported the government temporarily capping fuel prices, even knowing it might cause some supply issues.', 102, true, 1.25, 'applied'),
(101, 'C1', 1, 'If a local hospital is struggling financially, it''s better to let a private company take it over than to have the government step in to run it.', 103, true, 1.25, 'applied'),
(102, 'C1', -1, 'Electricity should be provided by a single public utility rather than competing private companies, even if competition might lower some prices.', 104, true, 1.25, 'applied'),

-- =====================
-- C2: Economic Equality (Redistributionist ↔ Property Rights)
-- =====================
(103, 'C2', -1, 'If a billionaire dies and leaves $5 billion to their adult children, I support taxing at least half of that inheritance.', 105, true, 1.25, 'applied'),
(104, 'C2', 1, 'A family farm that''s been passed down for generations shouldn''t face estate taxes that might force a sale, even if it''s now worth millions.', 106, true, 1.25, 'applied'),
(105, 'C2', -1, 'My city should add a tax on homes worth over $2 million to fund affordable housing, even if it reduces property values for wealthy homeowners.', 107, true, 1.25, 'applied'),
(106, 'C2', 1, 'A business owner who built a successful company from nothing has earned the right to pay themselves whatever they want, regardless of what their employees make.', 108, true, 1.25, 'applied'),

-- =====================
-- C3: Coercive Power (Security/Order ↔ Civil Liberties)
-- =====================
(107, 'C3', 1, 'Even if it makes catching criminals harder, I oppose requiring tech companies to build ''back doors'' that let police access encrypted messages.', 109, true, 1.25, 'applied'),
(108, 'C3', -1, 'Schools should be allowed to randomly search student lockers and backpacks for weapons and drugs without needing specific suspicion.', 110, true, 1.25, 'applied'),
(109, 'C3', 1, 'Protesters who block a highway to demand political action shouldn''t face serious criminal charges, even though they disrupted traffic.', 111, true, 1.25, 'applied'),
(110, 'C3', -1, 'Social media platforms should be required to quickly remove content that authorities flag as potentially dangerous misinformation.', 112, true, 1.25, 'applied'),

-- =====================
-- C4: Where Power Sits (Centralized ↔ Localized)
-- =====================
(111, 'C4', 1, 'If my state wants to set a minimum wage different from the federal level, it should be free to do so without federal interference.', 113, true, 1.25, 'applied'),
(112, 'C4', -1, 'When some local governments refused to enforce public health measures during COVID, state governments were right to override them.', 114, true, 1.25, 'applied'),
(113, 'C4', 1, 'My city should be able to set its own rules about short-term rentals like Airbnb, even if state law tries to prevent local regulation.', 115, true, 1.25, 'applied'),
(114, 'C4', -1, 'Education standards should be set nationally so that a high school diploma means the same thing whether you''re in Mississippi or Massachusetts.', 116, true, 1.25, 'applied'),

-- =====================
-- C5: Cultural Orientation (Traditionalist ↔ Progressivist)
-- =====================
(115, 'C5', 1, 'Elementary schools should teach that families come in many forms—single parents, same-sex parents, grandparents raising kids—as equally valid.', 117, true, 1.25, 'applied'),
(116, 'C5', -1, 'A historic nativity scene on public land should stay up during Christmas, even if some residents object to religious displays.', 118, true, 1.25, 'applied'),
(117, 'C5', 1, 'Workplaces that ask employees to share their preferred pronouns are making a reasonable accommodation for changing social norms.', 119, true, 1.25, 'applied'),
(118, 'C5', -1, 'When a century-old statue becomes controversial, communities should lean toward keeping it with added historical context rather than removing it.', 120, true, 1.25, 'applied'),

-- =====================
-- C6: Group Boundaries (Particularist ↔ Universalist)
-- =====================
(119, 'C6', 1, 'A college scholarship historically limited to one ethnic group should be opened to all qualified students regardless of background.', 121, true, 1.25, 'applied'),
(120, 'C6', -1, 'When affordable housing is limited, long-term residents and their families should get priority over recent arrivals.', 122, true, 1.25, 'applied'),
(121, 'C6', 1, 'If our country has more vaccines than we need, we should donate the surplus based on global need rather than stockpiling for ourselves.', 123, true, 1.25, 'applied'),
(122, 'C6', -1, 'A small business owner isn''t wrong to prefer hiring people from their own community, all else being equal.', 124, true, 1.25, 'applied'),

-- =====================
-- C7: Sovereignty Scope (Sovereigntist ↔ Integrationist)
-- =====================
(123, 'C7', -1, 'If an international trade court rules against our country''s policy, we should be able to ignore that ruling if we disagree.', 125, true, 1.25, 'applied'),
(124, 'C7', 1, 'I support a global minimum corporate tax rate, even though it limits our country''s ability to attract businesses with lower rates.', 126, true, 1.25, 'applied'),
(125, 'C7', -1, 'Our country shouldn''t have to change its food safety standards just to comply with international trade agreements.', 127, true, 1.25, 'applied'),
(126, 'C7', 1, 'Countries that fail to meet binding international climate commitments should face real penalties, even wealthy powerful ones.', 128, true, 1.25, 'applied'),

-- =====================
-- C8: Technology Stance (Tech-Skeptical ↔ Tech-Solutionist)
-- =====================
(127, 'C8', 1, 'A city should replace bus drivers with autonomous vehicles if data shows it would reduce accidents, even though it eliminates jobs.', 129, true, 1.25, 'applied'),
(128, 'C8', -1, 'I would decline a free genetic test that predicts disease risk if it meant a company would store my DNA data indefinitely.', 130, true, 1.25, 'applied'),
(129, 'C8', 1, 'If lab-grown meat becomes affordable, society should actively encourage switching from traditional beef, even if it hurts ranchers.', 131, true, 1.25, 'applied'),
(130, 'C8', -1, 'Schools should limit students'' use of AI writing tools even if it makes them less competitive, because learning to write matters.', 132, true, 1.25, 'applied'),

-- =====================
-- C9: Nature's Moral Weight (Anthropocentric ↔ Ecocentric)
-- =====================
(131, 'C9', 1, 'A hydroelectric dam that would provide clean energy to 50,000 homes should be blocked if it destroys habitat for an endangered species.', 133, true, 1.25, 'applied'),
(132, 'C9', -1, 'If reintroduced wolves are killing livestock, ranchers should be allowed to shoot them even if wolf populations are still recovering.', 134, true, 1.25, 'applied'),
(133, 'C9', 1, 'Old-growth forest shouldn''t be logged even for well-paying jobs, because some ecosystems can never be replaced once destroyed.', 135, true, 1.25, 'applied'),
(134, 'C9', -1, 'A mining project that would create 500 good jobs should proceed even if it damages a remote wilderness area few people ever visit.', 136, true, 1.25, 'applied'),

-- =====================
-- C10: Moral Foundation (Moral Universalist ↔ Moral Pluralist)
-- =====================
(135, 'C10', 1, 'Different cultures can reach opposite conclusions about end-of-life care, and neither position is more objectively correct.', 137, true, 1.25, 'applied'),
(136, 'C10', -1, 'Arranged marriages for teenagers are wrong regardless of whether the practice is accepted in the families'' culture.', 138, true, 1.25, 'applied'),
(137, 'C10', 1, 'On abortion, I believe reasonable people with good intentions can reach completely different conclusions based on equally valid moral frameworks.', 139, true, 1.25, 'applied'),
(138, 'C10', -1, 'Some business practices are simply unethical everywhere—it''s not just ''cultural differences'' when companies exploit workers in poor countries.', 140, true, 1.25, 'applied'),

-- =====================
-- F1: Change Strategy (Gradualist ↔ Radical)
-- =====================
(139, 'F1', 1, 'When activists block traffic or disrupt businesses to demand urgent action, their tactics can be justified by the importance of their cause.', 141, true, 1.25, 'applied'),
(140, 'F1', -1, 'A political movement should accept a partial compromise now rather than holding out for everything, even if full victory might come later.', 142, true, 1.25, 'applied'),
(141, 'F1', 1, 'Sometimes you have to break rules to expose injustice—whistleblowers who leak classified documents can be heroes even if they broke the law.', 143, true, 1.25, 'applied'),
(142, 'F1', -1, 'Dramatic political changes usually backfire; lasting progress comes from winning small battles over many years.', 144, true, 1.25, 'applied'),

-- =====================
-- F2: Institutional Trust (Trusting ↔ Skeptical)
-- =====================
(143, 'F2', 1, 'When public health officials recommend a new vaccine, I want to see independent verification before fully accepting their guidance.', 145, true, 1.25, 'applied'),
(144, 'F2', -1, 'When a major newspaper retracts a story after discovering errors, it shows the system works—media can correct itself.', 146, true, 1.25, 'applied'),
(145, 'F2', 1, 'Exposed scandals probably represent just a fraction of institutional wrongdoing—most misconduct never comes to light.', 147, true, 1.25, 'applied'),
(146, 'F2', -1, 'Despite their flaws, universities, courts, and scientific institutions are genuinely trying to pursue truth and fairness.', 148, true, 1.25, 'applied'),

-- =====================
-- F3: Justice Style (Retributive ↔ Restorative)
-- =====================
(147, 'F3', 1, 'If a teenager vandalized my car, I''d prefer they do community service and pay me back directly rather than go through the criminal system.', 149, true, 1.25, 'applied'),
(148, 'F3', -1, 'An executive who defrauded retirees of their savings should go to prison even if they''ve repaid every penny and shown genuine remorse.', 150, true, 1.25, 'applied'),
(149, 'F3', 1, 'For most non-violent crimes, programs that connect offenders with victims and community members work better than jail time.', 151, true, 1.25, 'applied'),
(150, 'F3', -1, 'Some crimes are so serious that punishment is deserved regardless of whether it rehabilitates the offender or deters others.', 152, true, 1.25, 'applied');

-- Reset sequence to continue after seed data
SELECT setval('questions_id_seq', 150);
