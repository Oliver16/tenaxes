-- Seed data for questions table
-- Run this AFTER schema.sql

INSERT INTO questions (id, axis_id, key, text, display_order, active) VALUES
-- C1: Economic Control (State-Directed ↔ Market-Directed)
(1, 'C1', 1, 'Private enterprise generally delivers goods and services more efficiently than government agencies.', 1, true),
(2, 'C1', 1, 'Prices for essential goods should be determined by supply and demand, not government regulation.', 3, true),
(3, 'C1', 1, 'Governments should allow failing businesses to collapse rather than intervene with bailouts.', 5, true),
(4, 'C1', 1, 'Competition between private companies benefits consumers more than public alternatives would.', 6, true),
(5, 'C1', -1, 'Governments should set price controls on necessities like housing, food, and medicine.', 7, true),
(6, 'C1', -1, 'The state should directly control strategic industries like energy, transportation, and banking.', 8, true),
(7, 'C1', -1, 'Central planning can distribute resources more fairly than markets do.', 9, true),
(8, 'C1', -1, 'Essential services (water, electricity, internet) should be publicly owned and operated.', 10, true),

-- C2: Economic Equality (Redistributionist ↔ Property Rights)
(9, 'C2', -1, 'Narrowing the gap between rich and poor should be a central goal of economic policy.', 12, true),
(10, 'C2', -1, 'A universal basic income, funded by taxing wealth, would create a more just society.', 13, true),
(11, 'C2', -1, 'Large concentrations of private wealth are corrosive to democracy and social cohesion.', 14, true),
(12, 'C2', -1, 'Society has an obligation to ensure that no one falls below a decent standard of living.', 15, true),
(13, 'C2', 1, 'People have a fundamental right to keep what they earn, regardless of how much others have.', 17, true),
(14, 'C2', 1, 'Inheritance taxes unfairly prevent families from passing on what they have built.', 18, true),
(15, 'C2', 1, 'High taxes on top earners discourage the productive effort that benefits everyone.', 19, true),
(16, 'C2', 1, 'Wealth inequality is a natural outcome of differences in talent, effort, and choices.', 20, true),

-- C3: Coercive Power (Security/Order ↔ Civil Liberties)
(17, 'C3', 1, 'Protecting individual privacy is more important than making law enforcement''s job easier.', 22, true),
(18, 'C3', 1, 'People should be free to express offensive views without legal penalty.', 23, true),
(19, 'C3', 1, 'Citizens should have access to strong encryption without government back-doors.', 24, true),
(20, 'C3', 1, 'The right to protest, even disruptively, is essential to a free society.', 25, true),
(21, 'C3', -1, 'Strict law enforcement and visible policing are necessary to maintain public safety.', 26, true),
(22, 'C3', -1, 'Governments should be able to detain terrorism suspects without trial when security demands it.', 27, true),
(23, 'C3', -1, 'Some speech is so harmful that it should be legally prohibited.', 28, true),
(24, 'C3', -1, 'Schools and employers should enforce conduct codes even when they limit personal expression.', 90, true),

-- C4: Where Power Sits (Centralized ↔ Localized)
(25, 'C4', 1, 'Local communities should have the final word on matters like zoning, schooling, and policing.', 29, true),
(26, 'C4', 1, 'States or provinces should be able to pass laws that differ from national policy.', 30, true),
(27, 'C4', 1, 'Decisions made closest to the people affected tend to produce better outcomes.', 31, true),
(28, 'C4', 1, 'Regions should be allowed to experiment with different policies rather than follow a single national model.', 32, true),
(29, 'C4', -1, 'National standards are necessary to guarantee equal rights and services everywhere.', 33, true),
(30, 'C4', -1, 'Only a strong central government can coordinate responses to large-scale challenges.', 34, true),
(31, 'C4', -1, 'Too much local autonomy leads to fragmentation and unequal treatment across regions.', 35, true),
(32, 'C4', -1, 'Some issues are too important to leave to local jurisdictions with varying capacities.', 36, true),

-- C5: Cultural Orientation (Traditionalist ↔ Progressivist)
(33, 'C5', 1, 'Cultural norms should evolve to reflect new understandings of identity and relationships.', 37, true),
(34, 'C5', 1, 'Society benefits when people question inherited customs and experiment with new ways of living.', 38, true),
(35, 'C5', 1, 'Traditional expectations about gender and family are outdated constraints that should be discarded.', 39, true),
(36, 'C5', 1, 'Moral progress often requires abandoning practices that previous generations considered normal.', 40, true),
(37, 'C5', -1, 'Longstanding traditions carry wisdom that modern generations too easily dismiss.', 41, true),
(38, 'C5', -1, 'Stable families built on time-tested structures are the foundation of a healthy society.', 42, true),
(39, 'C5', -1, 'Rapid cultural change destabilizes communities and erodes the values that bind people together.', 43, true),
(40, 'C5', -1, 'There is value in preserving customs and rituals even when their original purpose has faded.', 44, true),

-- C6: Group Boundaries (Particularist ↔ Universalist)
(41, 'C6', -1, 'People naturally and rightly owe more loyalty to their own community than to outsiders.', 44, true),
(42, 'C6', -1, 'A society that does not put its own members first will eventually be unable to help anyone.', 45, true),
(43, 'C6', -1, 'It is reasonable to prioritize people who share your culture or heritage in hiring and assistance.', 46, true),
(44, 'C6', -1, 'Strong group identity and mutual obligation within communities produce better outcomes than abstract universalism.', 60, true),
(45, 'C6', 1, 'Our obligations to strangers across the world are just as strong as those to our neighbors.', 63, true),
(46, 'C6', 1, 'Moral rules should apply equally to all people regardless of nationality, ethnicity, or religion.', 64, true),
(47, 'C6', 1, 'Aid and assistance should be allocated based on need, not on shared identity or proximity.', 67, true),
(48, 'C6', 1, 'National borders are morally arbitrary lines that shouldn''t determine who deserves our concern.', 59, true),

-- C7: Sovereignty Scope (Sovereigntist ↔ Integrationist)
(49, 'C7', -1, 'A nation must control its own borders and immigration without outside interference.', 47, true),
(50, 'C7', -1, 'Trade agreements that constrain domestic policy undermine democratic self-determination.', 48, true),
(51, 'C7', -1, 'Supranational bodies like the UN, EU, or WTO have accumulated too much power over national affairs.', 49, true),
(52, 'C7', -1, 'Citizens of a country, not international bodies, should decide the laws that govern them.', 50, true),
(53, 'C7', 1, 'International courts should be able to override national laws that violate human rights.', 52, true),
(54, 'C7', 1, 'Nations should transfer some sovereignty to global institutions to address climate change.', 53, true),
(55, 'C7', 1, 'Free movement of people across borders ultimately benefits both migrants and host countries.', 54, true),
(56, 'C7', 1, 'Global problems require global governance that nations cannot opt out of.', 55, true),

-- C8: Technology Stance (Tech-Skeptical ↔ Tech-Solutionist)
(57, 'C8', -1, 'Technology tends to create new problems as fast as it solves existing ones.', 56, true),
(58, 'C8', -1, 'Society has become dangerously dependent on complex systems that few people understand.', 57, true),
(59, 'C8', -1, 'Some technologies—certain weapons, surveillance tools, AI systems—should never have been built.', 58, true),
(60, 'C8', -1, 'The unintended consequences of new technologies are often worse than the problems they address.', 66, true),
(61, 'C8', 1, 'Automation and AI will create more prosperity than they destroy over time.', 61, true),
(62, 'C8', 1, 'New technologies should generally be deployed quickly; we can address problems as they arise.', 62, true),
(63, 'C8', 1, 'Most major problems—health, poverty, climate—can be solved primarily through technological innovation.', 65, true),
(64, 'C8', 1, 'Genetic engineering of crops and humans should be embraced as a tool for improving life.', 68, true),

-- C9: Nature''s Moral Weight (Anthropocentric ↔ Ecocentric)
(65, 'C9', 1, 'Humans have a duty to preserve wild nature even at significant cost to our own prosperity.', 69, true),
(66, 'C9', -1, 'The natural world exists as a resource for human use and flourishing.', 70, true),
(67, 'C9', 1, 'Ecosystems and species have intrinsic value that does not depend on their usefulness to humans.', 71, true),
(68, 'C9', 1, 'Economic development should be constrained when it threatens biodiversity or ecosystem health.', 72, true),
(69, 'C9', 1, 'Future generations and non-human life deserve moral consideration equal to living humans.', 73, true),
(70, 'C9', -1, 'Nature''s primary value lies in the resources and services it provides to human beings.', 74, true),
(71, 'C9', -1, 'When human well-being and environmental preservation conflict, human needs should come first.', 75, true),
(72, 'C9', -1, 'Protecting endangered species is not worth major economic sacrifice.', 76, true),

-- C10: Moral Foundation (Moral Universalist ↔ Moral Pluralist)
(73, 'C10', 1, 'What counts as right and wrong depends largely on cultural context and historical circumstances.', 77, true),
(74, 'C10', -1, 'Some actions are objectively wrong regardless of what any culture or individual believes.', 78, true),
(75, 'C10', -1, 'Moral truths exist and can be discovered through reason, experience, or revelation.', 79, true),
(76, 'C10', -1, 'Without grounding in universal principles, ethics becomes arbitrary and unstable.', 80, true),
(77, 'C10', -1, 'Across all cultures and eras, certain core moral standards remain constant.', 2, true),
(78, 'C10', 1, 'Morality is a human construction that evolves as societies develop new understandings.', 4, true),
(79, 'C10', 1, 'Ethical disagreements often cannot be resolved because people are starting from incompatible premises.', 16, true),
(80, 'C10', 1, 'There is no single correct moral framework; reasonable people can hold fundamentally different values.', 98, true),

-- F1: Change Strategy (Gradualist ↔ Radical)
(81, 'F1', 1, 'Sometimes dramatic, disruptive action is the only way to overcome entrenched injustice.', 81, true),
(82, 'F1', 1, 'Protest and civil disobedience are legitimate tools when institutions fail to respond.', 82, true),
(83, 'F1', 1, 'Fundamental change requires confrontation, not negotiation with those who benefit from the status quo.', 83, true),
(84, 'F1', -1, 'Lasting reform comes through patient, incremental work within existing institutions.', 86, true),
(85, 'F1', -1, 'Stability and continuity are valuable even when change is desirable in principle.', 11, true),
(86, 'F1', -1, 'Revolutionary movements usually cause more suffering than the injustices they aimed to correct.', 94, true),

-- F2: Institutional Trust (Trusting ↔ Skeptical)
(87, 'F2', 1, 'Major institutions—government, media, corporations—routinely mislead the public to serve their own interests.', 83, true),
(88, 'F2', 1, 'Official experts often conceal important information or present biased conclusions.', 84, true),
(89, 'F2', 1, 'The people who run powerful institutions are more interested in protecting their position than serving the public.', 85, true),
(90, 'F2', -1, 'On balance, the institutions that run society are genuinely trying to do the right thing.', 87, true),
(91, 'F2', -1, 'Most professionals—doctors, scientists, judges—can be trusted to act with integrity.', 88, true),
(92, 'F2', -1, 'Democratic institutions, despite their flaws, generally produce fair outcomes over time.', 89, true),

-- F3: Justice Style (Retributive ↔ Restorative)
(93, 'F3', 1, 'The primary goal of justice should be repairing harm and reintegrating offenders into society.', 91, true),
(94, 'F3', 1, 'Bringing victims and offenders together to seek understanding produces better outcomes than punishment alone.', 92, true),
(95, 'F3', 1, 'Most people who commit crimes need support and rehabilitation, not cages.', 93, true),
(96, 'F3', -1, 'Wrongdoers deserve punishment proportional to the severity of their offense.', 95, true),
(97, 'F3', -1, 'A justice system that does not punish crime fails to uphold moral order.', 96, true),
(98, 'F3', -1, 'Accountability means facing real consequences, not just dialogue and reconciliation.', 97, true);

-- Reset sequence to continue after seed data
SELECT setval('questions_id_seq', 100);
