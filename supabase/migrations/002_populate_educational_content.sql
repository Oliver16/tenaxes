-- Migration: Populate educational_content for all questions
-- Date: 2025-12-01
-- Description: Adds educational context and examples to help users understand each survey question

-- C1: Economic Control (State-Directed ↔ Market-Directed)
UPDATE questions SET educational_content = 'This asks whether competition and profit incentives lead to better outcomes than public administration. Consider examples like postal services vs. private couriers, or public vs. private healthcare systems.' WHERE id = 1;

UPDATE questions SET educational_content = 'This contrasts market pricing (where scarcity raises prices) with price controls (government-set limits). Examples include rent control, agricultural price supports, or pharmaceutical pricing regulations.' WHERE id = 2;

UPDATE questions SET educational_content = 'This addresses whether market discipline (business failure) is preferable to government intervention during economic crises. Think of bank bailouts in 2008 or airline industry support during COVID-19.' WHERE id = 3;

UPDATE questions SET educational_content = 'This weighs competitive markets against public monopolies. Consider whether multiple private insurers serve citizens better than a single public option, or whether competing transit companies improve service.' WHERE id = 4;

UPDATE questions SET educational_content = 'This asks whether market forces should determine costs of essentials, or if government should cap prices to ensure affordability. Examples include rent control, insulin price caps, or bread subsidies.' WHERE id = 5;

UPDATE questions SET educational_content = 'This addresses nationalization versus privatization of critical sectors. Consider whether vital infrastructure functions better under public ownership (like Norway''s oil) or private management.' WHERE id = 6;

UPDATE questions SET educational_content = 'This contrasts deliberate allocation by planners with market-driven distribution. Think of Soviet-style planned economies versus market economies, or centralized healthcare allocation versus insurance markets.' WHERE id = 7;

UPDATE questions SET educational_content = 'This asks whether utilities should be public goods or private businesses. Consider municipal water systems versus private water companies, or public broadband versus commercial ISPs.' WHERE id = 8;

-- C2: Economic Equality (Redistributionist ↔ Property Rights)
UPDATE questions SET educational_content = 'This asks whether reducing inequality itself is a priority, separate from reducing poverty. A society could lift the poor while the rich grow richer, or it could focus on closing the gap itself.' WHERE id = 9;

UPDATE questions SET educational_content = 'UBI provides regular cash payments to all citizens regardless of work status. This asks whether redistributing wealth this way improves fairness compared to conditional welfare or keeping wealth with earners.' WHERE id = 10;

UPDATE questions SET educational_content = 'This addresses whether extreme wealth accumulation poses political and social dangers beyond economic questions. Consider influence over media, politics, and whether billionaires distort democratic processes.' WHERE id = 11;

UPDATE questions SET educational_content = 'This asks whether meeting basic needs is a collective responsibility or individual one. It''s about floors (minimum standards) rather than ceilings or gaps.' WHERE id = 12;

UPDATE questions SET educational_content = 'This prioritizes individual property rights over redistribution. It suggests earnings belong to earners by right, not subject to social allocation based on others'' needs.' WHERE id = 13;

UPDATE questions SET educational_content = 'Estate or inheritance taxes take a portion of wealth transfers between generations. This asks whether taxing inheritance is legitimate redistribution or unjust confiscation of already-taxed assets.' WHERE id = 14;

UPDATE questions SET educational_content = 'This addresses whether progressive taxation reduces incentives to work, invest, or innovate. It weighs revenue for public services against potential economic dampening from high marginal rates.' WHERE id = 15;

UPDATE questions SET educational_content = 'This suggests unequal outcomes reflect unequal inputs (ability, hard work, decisions) rather than systemic unfairness. It frames inequality as meritocratic rather than structural.' WHERE id = 16;

-- C3: Coercive Power (Security/Order ↔ Civil Liberties)
UPDATE questions SET educational_content = 'This weighs the security-privacy tradeoff: should police have broad surveillance powers, or should privacy protections limit investigative tools? Think encrypted phones, warrantless searches, or mass data collection.' WHERE id = 17;

UPDATE questions SET educational_content = 'This addresses free speech boundaries: should government prosecute hate speech, misinformation, or offensive expression? It contrasts legal tolerance of harmful speech with restrictions protecting groups.' WHERE id = 18;

UPDATE questions SET educational_content = 'Encryption protects data from everyone, including police. Back-doors allow government access but create security vulnerabilities. This asks whether absolute privacy or lawful access should prevail.' WHERE id = 19;

UPDATE questions SET educational_content = 'This balances protest rights against public order. Should demonstrations blocking traffic or commerce be protected expression, or should law enforcement clear disruptive actions quickly?' WHERE id = 20;

UPDATE questions SET educational_content = 'This asks whether strong police presence and aggressive enforcement deter crime and create safety, or whether they create tension without improving security.' WHERE id = 21;

UPDATE questions SET educational_content = 'This addresses indefinite detention, secret evidence, or suspension of habeas corpus during emergencies. It weighs immediate security threats against due process protections.' WHERE id = 22;

UPDATE questions SET educational_content = 'This asks whether certain expression (incitement, hate speech, misinformation) warrants criminal penalties, or whether nearly all speech should remain legal despite potential harm.' WHERE id = 23;

UPDATE questions SET educational_content = 'This addresses institutional authority over speech and behavior. Should organizations regulate employee or student expression beyond legal minimums, or should individual liberty take priority?' WHERE id = 24;

-- C4: Where Power Sits (Centralized ↔ Localized)
UPDATE questions SET educational_content = 'This asks whether neighborhood or city control produces better outcomes than state or national mandates. Think local school boards versus federal education standards, or municipal police control versus national oversight.' WHERE id = 25;

UPDATE questions SET educational_content = 'This addresses federalism: should regional governments have wide autonomy, or should national uniformity prevail? Consider state cannabis laws conflicting with federal prohibition, or regional immigration policies.' WHERE id = 26;

UPDATE questions SET educational_content = 'This principle ("subsidiarity") suggests local decision-makers understand local needs better than distant officials. It contrasts decentralized responsiveness with centralized consistency.' WHERE id = 27;

UPDATE questions SET educational_content = 'This frames regional autonomy as "laboratories of democracy" where diverse approaches compete. It weighs innovation and choice against uniform standards and coordination.' WHERE id = 28;

UPDATE questions SET educational_content = 'This argues centralization prevents local tyranny or inequality. Federal civil rights protections, for instance, override local discrimination; national healthcare standards ensure minimum quality.' WHERE id = 29;

UPDATE questions SET educational_content = 'This addresses problems requiring unified action: pandemics, climate change, economic crises. It asks whether national coordination is essential or whether decentralized responses work better.' WHERE id = 30;

UPDATE questions SET educational_content = 'This warns that decentralization creates patchwork systems where rights and services vary by location, producing unfairness and inefficiency from lack of coordination.' WHERE id = 31;

UPDATE questions SET educational_content = 'This suggests certain matters (human rights, major infrastructure, defense) exceed local capability or authority and require national or international handling.' WHERE id = 32;

-- C5: Cultural Orientation (Traditionalist ↔ Progressivist)
UPDATE questions SET educational_content = 'This asks whether social norms about gender, family, sexuality, etc., should change with emerging knowledge and values, or whether traditional frameworks should endure.' WHERE id = 33;

UPDATE questions SET educational_content = 'This weighs cultural innovation and individual exploration against stability from established practices. It asks whether questioning tradition strengthens or weakens communities.' WHERE id = 34;

UPDATE questions SET educational_content = 'This addresses whether conventional gender roles, marriage models, and family structures reflect timeless wisdom or historical limitations that modern society should move beyond.' WHERE id = 35;

UPDATE questions SET educational_content = 'This suggests moral improvement involves rejecting past norms (slavery, patriarchy, etc.). It asks whether modernity represents advancement or whether tradition holds enduring value.' WHERE id = 36;

UPDATE questions SET educational_content = 'This argues customs endure because they encode accumulated knowledge and social capital. Rapid change may discard valuable insights embedded in tradition.' WHERE id = 37;

UPDATE questions SET educational_content = 'This prioritizes traditional family models (typically two-parent, marriage-based) as essential social infrastructure. It suggests deviation weakens community stability.' WHERE id = 38;

UPDATE questions SET educational_content = 'This warns that swift shifts in norms fragment shared identity and undermine social cohesion. Gradual evolution may preserve continuity better than revolutionary cultural change.' WHERE id = 39;

UPDATE questions SET educational_content = 'This suggests traditions provide meaning, identity, and continuity independent of their practical origins. Rituals may matter for what they symbolize rather than what they originally accomplished.' WHERE id = 40;

-- C6: Group Boundaries (Particularist ↔ Universalist)
UPDATE questions SET educational_content = 'This asks whether prioritizing family, neighbors, or co-nationals is morally legitimate or whether equal concern for all humans is required. Think preferring local hiring or "taking care of our own."' WHERE id = 41;

UPDATE questions SET educational_content = 'This suggests resource limits require prioritizing in-group needs. Helping outsiders extensively may deplete capacity to maintain domestic welfare, ultimately harming everyone.' WHERE id = 42;

UPDATE questions SET educational_content = 'This addresses whether favoring cultural in-groups (ethnic nepotism, community preference) is justified, or whether merit and need should ignore group membership.' WHERE id = 43;

UPDATE questions SET educational_content = 'This argues tight-knit groups with shared identity create trust and cooperation that impersonal universal principles cannot match. Think close communities versus cosmopolitan individualism.' WHERE id = 44;

UPDATE questions SET educational_content = 'This cosmopolitan view holds geographic or cultural distance doesn''t reduce moral duties. A stranger''s suffering in another country matters as much as a nearby neighbor''s.' WHERE id = 45;

UPDATE questions SET educational_content = 'This universalist principle says ethical standards don''t vary by group membership. Rights, duties, and treatment should be identical for everyone, without in-group preference.' WHERE id = 46;

UPDATE questions SET educational_content = 'This prioritizes objective need over relationship in distributing help. The most suffering person should receive aid first, whether they''re a neighbor, fellow citizen, or distant stranger.' WHERE id = 47;

UPDATE questions SET educational_content = 'This views borders as accidents of history without moral significance. Being born in a particular country doesn''t make someone more deserving of resources or concern than someone born elsewhere.' WHERE id = 48;

-- C7: Sovereignty Scope (Sovereigntist ↔ Integrationist)
UPDATE questions SET educational_content = 'This addresses whether immigration policy is a sovereign national right or subject to international norms. Should countries freely restrict entry, or do global rules limit that power?' WHERE id = 49;

UPDATE questions SET educational_content = 'This asks whether trade deals requiring regulatory changes (labor laws, environmental rules) illegitimately limit national autonomy, or whether mutual commitments justly bind participants.' WHERE id = 50;

UPDATE questions SET educational_content = 'This questions whether international organizations exceed their mandate and overly constrain member states, or whether their authority remains appropriate and voluntary.' WHERE id = 51;

UPDATE questions SET educational_content = 'This prioritizes national democratic control over international authority. It asks whether domestic sovereignty should supersede global governance commitments.' WHERE id = 52;

UPDATE questions SET educational_content = 'This weighs global human rights enforcement against national sovereignty. Should international tribunals strike down domestic laws, or should nations remain final arbiters?' WHERE id = 53;

UPDATE questions SET educational_content = 'This asks whether solving planetary problems requires binding international authority that nations cannot veto. Climate agreements might mandate emissions cuts or carbon taxes regardless of national preferences.' WHERE id = 54;

UPDATE questions SET educational_content = 'This addresses open borders or migration liberalization: does reducing restrictions create mutual gains through labor mobility and cultural exchange, or does it harm receiving nations?' WHERE id = 55;

UPDATE questions SET educational_content = 'This suggests issues like pandemics, nuclear proliferation, or climate demand mandatory international coordination. National sovereignty may need to yield to enforceable global rules.' WHERE id = 56;

-- C8: Technology Stance (Tech-Skeptical ↔ Tech-Solutionist)
UPDATE questions SET educational_content = 'This questions whether innovation truly improves life or merely shifts problems. Cars solved transportation but created pollution; social media connected people but fostered misinformation.' WHERE id = 57;

UPDATE questions SET educational_content = 'This addresses technological fragility: critical infrastructure (power grids, internet, supply chains) relies on opaque systems. Failures or attacks could cause cascading collapse.' WHERE id = 58;

UPDATE questions SET educational_content = 'This suggests certain innovations are inherently harmful regardless of use. Nuclear weapons, autonomous lethal drones, or advanced surveillance might cause more harm than any benefit justifies.' WHERE id = 59;

UPDATE questions SET educational_content = 'This warns that unforeseen side effects of innovation frequently outweigh intended benefits. Pesticides solved crop loss but created environmental crises; antibiotics saved lives but bred resistant bacteria.' WHERE id = 60;

UPDATE questions SET educational_content = 'This optimistic view holds that while technology displaces jobs, it generates new opportunities and wealth. Historical industrialization raised living standards despite initial disruption.' WHERE id = 61;

UPDATE questions SET educational_content = 'This "move fast" approach prioritizes innovation speed over precaution. It assumes adaptive problem-solving beats preventive restriction, and that benefits outweigh risks.' WHERE id = 62;

UPDATE questions SET educational_content = 'This tech-solutionist view holds that engineering and science, not social or political change, will overcome humanity''s greatest challenges. Think vaccines over behavioral change, or geoengineering over emissions reduction.' WHERE id = 63;

UPDATE questions SET educational_content = 'This asks whether biotechnology (GMOs, gene therapy, designer babies) should be welcomed as progress or restricted as dangerous. It weighs benefits like disease resistance against risks and ethical concerns.' WHERE id = 64;

-- C9: Nature's Moral Weight (Anthropocentric ↔ Ecocentric)
UPDATE questions SET educational_content = 'This asks whether environmental protection is a moral obligation worth economic sacrifice. Should we forgo development, jobs, or growth to protect ecosystems?' WHERE id = 65;

UPDATE questions SET educational_content = 'This anthropocentric view sees nature primarily as raw material for human purposes. Trees are lumber, rivers are power sources, and animals are food or tools.' WHERE id = 66;

UPDATE questions SET educational_content = 'This ecocentric view holds that non-human life and environments matter morally independent of human benefit. A species has worth even if extinction wouldn''t harm people.' WHERE id = 67;

UPDATE questions SET educational_content = 'This prioritizes ecological preservation over growth. Should logging bans, fishing limits, or development restrictions protect nature even at economic cost?' WHERE id = 68;

UPDATE questions SET educational_content = 'This asks whether people not yet born, or non-human beings, have claims on current resources and decisions equal to present humans. It extends moral concern across time and species.' WHERE id = 69;

UPDATE questions SET educational_content = 'This instrumental view values nature for what it does for us: clean water, breathable air, food, medicine. Protection is justified by human benefit, not nature''s own worth.' WHERE id = 70;

UPDATE questions SET educational_content = 'This prioritizes human welfare over ecological concerns when tradeoffs arise. If protecting a wetland costs jobs or housing, human needs win.' WHERE id = 71;

UPDATE questions SET educational_content = 'This questions whether species preservation justifies significant costs. Should we spend billions to save a beetle or obscure fish if it means job losses or restricted development?' WHERE id = 72;

-- C10: Moral Foundation (Moral Universalist ↔ Moral Pluralist)
UPDATE questions SET educational_content = 'This moral relativist view holds ethics vary by society and era. Practices acceptable in one culture or time may be wrong in another; morality is context-dependent.' WHERE id = 73;

UPDATE questions SET educational_content = 'This moral realist position holds certain acts (torture, genocide, slavery) are wrong universally, regardless of cultural approval or historical context. Moral facts exist independent of belief.' WHERE id = 74;

UPDATE questions SET educational_content = 'This suggests ethics are knowable facts that can be found through philosophy, evidence, or spiritual insight. Right and wrong aren''t invented but discovered.' WHERE id = 75;

UPDATE questions SET educational_content = 'This argues moral relativism leads to "anything goes" chaos. If right and wrong are just opinions, there''s no basis to condemn atrocities or defend justice.' WHERE id = 76;

UPDATE questions SET educational_content = 'This claims some ethical rules appear universally: prohibitions on murder, reciprocity norms, care for kin. These commonalities suggest objective moral truths transcending culture.' WHERE id = 77;

UPDATE questions SET educational_content = 'This constructivist view sees ethics as created by humans to serve social needs. As societies change, moral systems adapt; there''s no eternal, fixed morality.' WHERE id = 78;

UPDATE questions SET educational_content = 'This suggests moral debates are sometimes intractable because participants hold fundamentally different values or axioms. Without shared foundations, agreement becomes impossible.' WHERE id = 79;

UPDATE questions SET educational_content = 'This pluralist view accepts multiple legitimate ethical systems. Utilitarian, deontological, virtue-based, or care-based ethics all have validity; none is uniquely correct.' WHERE id = 80;

-- F1: Change Strategy (Gradualist ↔ Radical)
UPDATE questions SET educational_content = 'This asks whether systemic wrongs require revolutionary tactics. When reform fails, are strikes, occupations, or uprisings justified to force change?' WHERE id = 81;

UPDATE questions SET educational_content = 'This addresses whether breaking laws to demand change is morally acceptable. Civil rights sit-ins or climate blockades violate laws to pressure reform.' WHERE id = 82;

UPDATE questions SET educational_content = 'This questions whether compromise with power-holders achieves real change, or whether direct confrontation is necessary to overcome resistance from beneficiaries of injustice.' WHERE id = 83;

UPDATE questions SET educational_content = 'This gradualist view favors working through established systems: legislation, courts, elections. Slow, steady change preserves stability and builds durable support.' WHERE id = 84;

UPDATE questions SET educational_content = 'This argues that disruption carries costs—uncertainty, disorder, lost progress—that may outweigh benefits of rapid change. Preserving continuity has inherent value.' WHERE id = 85;

UPDATE questions SET educational_content = 'This warns that radical upheaval often produces violence, chaos, or authoritarianism worse than original problems. Think French, Russian, or Chinese revolutions'' human costs.' WHERE id = 86;

-- F2: Institutional Trust (Trusting ↔ Skeptical)
UPDATE questions SET educational_content = 'This skeptical view sees powerful organizations as self-serving and deceptive. Institutions spin, hide information, or lie to protect their power and privilege.' WHERE id = 87;

UPDATE questions SET educational_content = 'This questions whether credentialed authorities (scientists, doctors, economists) provide objective truth or whether their conclusions serve institutional or ideological agendas.' WHERE id = 88;

UPDATE questions SET educational_content = 'This cynical view holds that institutional leaders prioritize self-preservation and power over public service. Bureaucrats and executives serve themselves first.' WHERE id = 89;

UPDATE questions SET educational_content = 'This trusting view assumes institutional actors, despite flaws, generally pursue public good. Government, corporations, and NGOs mostly try to serve legitimate purposes.' WHERE id = 90;

UPDATE questions SET educational_content = 'This holds that expertise and professional ethics ensure trustworthy conduct. While some individuals fail, most credentialed professionals are honest and competent.' WHERE id = 91;

UPDATE questions SET educational_content = 'This argues that democratic processes—elections, courts, legislatures—self-correct and tend toward justice even if imperfect. The system works in the long run.' WHERE id = 92;

-- F3: Justice Style (Retributive ↔ Restorative)
UPDATE questions SET educational_content = 'Restorative justice prioritizes healing and rehabilitation over punishment. It seeks to repair damage, restore relationships, and help offenders become productive members of society.' WHERE id = 93;

UPDATE questions SET educational_content = 'This approach uses dialogue and mediation between harmed parties and wrongdoers. Face-to-face reconciliation may achieve closure and prevent reoffending better than imprisonment.' WHERE id = 94;

UPDATE questions SET educational_content = 'This questions incarceration as the default response to crime. It suggests addressing root causes (poverty, addiction, trauma) and providing treatment produces better outcomes than punishment.' WHERE id = 95;

UPDATE questions SET educational_content = 'Retributive justice holds that offenders should suffer consequences matching their crimes. Proportionate punishment is morally required, regardless of deterrence or rehabilitation.' WHERE id = 96;

UPDATE questions SET educational_content = 'This argues punishment affirms societal values and vindicates victims. Without consequences, moral boundaries dissolve and justice isn''t served.' WHERE id = 97;

UPDATE questions SET educational_content = 'This questions whether restorative approaches provide genuine accountability. True responsibility may require suffering consequences, not merely apologizing or making amends.' WHERE id = 98;

-- Update timestamp
-- This migration is idempotent - safe to run multiple times
