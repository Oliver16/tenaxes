-- Polyaxis v2.2 live migration from the deployed v2.1 bank.
-- Preserves v2.0 and v2.1 historical rows. Creates a new 350-item v2.2 bank.
BEGIN;

INSERT INTO public.question_bank_versions (id, name, notes, question_count, collision_count)
VALUES ('v2.2', 'Polyaxis v2.2 — Controversy Stress Test',
        'v2.1 comprehension revision plus 50 overt high-conflict primary items. 350 total questions: 108 conceptual, 242 applied, including the existing 48 collision scenarios.',
        350, 48)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  notes = EXCLUDED.notes,
  question_count = EXCLUDED.question_count,
  collision_count = EXCLUDED.collision_count;

ALTER TABLE public.questions ALTER COLUMN bank_version SET DEFAULT 'v2.2';
ALTER TABLE public.survey_responses ALTER COLUMN bank_version SET DEFAULT 'v2.2';
ALTER TABLE public.survey_results ALTER COLUMN bank_version SET DEFAULT 'v2.2';

-- Deactivate older banks without deleting historical text or results.
UPDATE public.questions SET active = FALSE WHERE bank_version <> 'v2.2';

-- Duplicate the complete v2.1 bank into v2.2. v2.1 is expected at IDs 301..600.
INSERT INTO public.questions
  (id, axis_id, key, text, educational_content, display_order, active, weight, question_type, bank_version)
SELECT id + 300, axis_id, key, text, educational_content, display_order, TRUE, weight, question_type, 'v2.2'
FROM public.questions
WHERE bank_version = 'v2.1' AND id BETWEEN 301 AND 600
ON CONFLICT (id) DO NOTHING;

-- Add the 50 new controversy stress-test items as IDs 901..950.
INSERT INTO public.questions
  (id, axis_id, key, text, educational_content, display_order, active, weight, question_type, bank_version)
VALUES
    (901, 'C1', -1, 'Major banks, electricity systems, and other essential industries should be publicly owned rather than controlled by private shareholders. In other words, society should place core economic infrastructure under public ownership instead of leaving control and profits mainly to private investors.', 'Assume that the enterprises would remain professionally managed, subject to public audits, and required to meet service and financial targets.', 301, TRUE, 1.25, 'applied', 'v2.2'),
    (902, 'C1', -1, 'Government should use binding production and investment targets in major industries instead of relying primarily on market prices and private capital allocation. In other words, public planning should decide much of what is produced and financed in strategic sectors rather than letting markets make most of those choices.', 'Assume that the targets are enacted through ordinary democratic procedures and revised when shortages, waste, or changing needs become evident.', 302, TRUE, 1.25, 'applied', 'v2.2'),
    (903, 'C1', 1, 'Most farms, factories, banks, and large businesses should remain privately owned rather than being owned collectively by the state or society. In other words, individuals and private investors should generally keep ownership and control of productive enterprises.', 'Assume that ordinary labor, antitrust, consumer-protection, safety, and environmental laws still apply.', 303, TRUE, 1.25, 'applied', 'v2.2'),
    (904, 'C1', 1, 'It is legitimate for investors to earn substantial profits from capital they own even when they do not personally work in the business. In other words, supplying money and accepting investment risk can justify receiving profits apart from wages for labor.', 'Assume that the investment was lawful, the firm is not protected by corrupt favoritism, and workers receive the compensation required by law and contract.', 304, TRUE, 1.25, 'applied', 'v2.2'),
    (905, 'C2', -1, 'Society should prevent individuals from accumulating fortunes large enough to create lasting private political and economic power. In other words, taxes or other rules should stop any one person from becoming extraordinarily wealthy, even when the wealth was acquired legally.', 'Assume that the policy leaves people able to become affluent and preserves ordinary retirement savings, homes, and small businesses.', 305, TRUE, 1.25, 'applied', 'v2.2'),
    (906, 'C2', -1, 'Government should provide material reparations to descendants of groups subjected to state-backed slavery or comparable systematic dispossession. In other words, public money or assets should compensate descendants for major historical injustices whose effects continue across generations.', 'Assume that eligibility can be determined under clear rules and that the program is funded through general taxation rather than by identifying individual present-day wrongdoers.', 306, TRUE, 1.25, 'applied', 'v2.2'),
    (907, 'C2', 1, 'People should be free to become billionaires when their wealth is acquired lawfully, even if the resulting inequality is extremely large. In other words, government should not impose a maximum fortune merely because one person becomes vastly richer than most others.', 'Assume that applicable taxes were paid and that the wealth did not come from fraud, theft, slavery, or a government-granted monopoly.', 307, TRUE, 1.25, 'applied', 'v2.2'),
    (908, 'C2', 1, 'Individuals should be allowed to own multiple homes as investments and charge market rents even during a severe housing shortage. In other words, housing scarcity should not by itself remove an owner’s right to buy rental property and set rent through voluntary agreements.', 'Assume that the properties meet health and safety codes and that tenants are not being deceived or unlawfully evicted.', 308, TRUE, 1.25, 'applied', 'v2.2'),
    (909, 'C3', -1, 'Government may require vaccination during a highly lethal epidemic when voluntary uptake is insufficient to prevent widespread transmission. In other words, protecting the public can justify making vaccination legally mandatory during an extreme outbreak.', 'Assume that independent evidence shows the vaccine substantially reduces transmission and severe illness, serious side effects are rare, and medical exemptions are available.', 309, TRUE, 1.25, 'applied', 'v2.2'),
    (910, 'C3', -1, 'Courts should be able to authorize short-term preventive detention when specific evidence shows that a person is preparing a mass-casualty attack but prosecutors cannot yet file ordinary charges. In other words, a person could be confined before a prosecutable crime is complete when the demonstrated danger is exceptionally serious and immediate.', 'Assume that a judge reviews the evidence promptly, the person has a lawyer, the order expires automatically, and the government must repeatedly justify any extension.', 310, TRUE, 1.25, 'applied', 'v2.2'),
    (911, 'C3', 1, 'Law-abiding adults should generally be permitted to own commonly available semiautomatic firearms for lawful self-defense and recreation. In other words, government should not broadly prohibit ordinary civilians from owning these firearms merely because they can fire one round with each trigger pull.', 'Assume that purchasers pass a background check, follow secure-storage rules, and have no violent felony conviction or comparable legal disqualification.', 311, TRUE, 1.25, 'applied', 'v2.2'),
    (912, 'C3', 1, 'Government should not require encrypted communication services to create a special access mechanism for law enforcement. In other words, private messages should remain technically unreadable to the provider and government rather than containing a built-in government-access key.', 'Assume that the access mechanism would also create some additional risk of misuse, theft, or exploitation by hostile actors.', 312, TRUE, 1.25, 'applied', 'v2.2'),
    (913, 'C4', -1, 'A single national law should determine the basic legality of abortion rather than allowing states or provinces to adopt substantially different rules. In other words, the country should have one minimum legal framework for abortion instead of a patchwork based on where a person lives.', 'Assume that the national government has clear constitutional authority to enact and enforce the rule.', 313, TRUE, 1.25, 'applied', 'v2.2'),
    (914, 'C4', 1, 'States or provinces should be free to set substantially different abortion laws even when the result is unequal access across the country. In other words, abortion policy should be decided regionally rather than forced into one national rule.', 'Assume that regional governments have constitutional authority over the issue and that adults remain legally free to travel between regions.', 314, TRUE, 1.25, 'applied', 'v2.2'),
    (915, 'C5', -1, 'Civil marriage should be legally defined as a union between one man and one woman. In other words, same-sex couples would not receive the legal status called marriage, even if another legal partnership status were available.', 'Assume that the alternative status could provide many contractual benefits but would remain legally and symbolically distinct from marriage.', 315, TRUE, 1.25, 'applied', 'v2.2'),
    (916, 'C5', -1, 'Public schools should normally notify parents when a minor asks staff to use a different gender identity, name, or pronouns at school. In other words, schools should not ordinarily keep a student’s social gender transition secret from the student’s parents.', 'Assume that school staff have no specific reason to believe notification would expose the student to abuse or immediate danger.', 316, TRUE, 1.25, 'applied', 'v2.2'),
    (917, 'C5', 1, 'Adults should be able to change the sex or gender marker on government identification through a declaration of identity without proving medical transition. In other words, legal recognition should follow an adult’s affirmed gender rather than require surgery, hormones, or a medical diagnosis.', 'Assume that identity-fraud laws remain enforceable and that separate, narrowly tailored biological-sex data may still be collected when medically or statistically necessary.', 317, TRUE, 1.25, 'applied', 'v2.2'),
    (918, 'C5', 1, 'Consenting adults should be allowed to enter a legally recognized marriage involving more than two spouses. In other words, civil marriage law should permit plural marriages rather than require every marriage to contain exactly two adults.', 'Assume that every spouse is an adult who gives independent consent and that ordinary laws against coercion, abuse, fraud, and child marriage are strictly enforced.', 318, TRUE, 1.25, 'applied', 'v2.2'),
    (919, 'C6', -1, 'Citizens should receive priority over noncitizens for scarce public housing and long-term welfare benefits when their levels of need are otherwise comparable. In other words, political membership should give citizens a stronger claim to limited public resources than equally needy noncitizens.', 'Assume that emergency medical care, disaster relief, and basic protection from starvation or exposure remain available regardless of citizenship.', 319, TRUE, 1.25, 'applied', 'v2.2'),
    (920, 'C6', -1, 'People who knowingly remain in a country without legal permission should normally be deported even after living and working there for many years. In other words, long residence and community ties should not usually defeat the country’s right to enforce its immigration rules.', 'Assume that each person receives an individual hearing, is not being returned to persecution or torture, and has no separate legal claim to remain.', 320, TRUE, 1.25, 'applied', 'v2.2'),
    (921, 'C6', 1, 'A child born in a country should normally receive citizenship at birth regardless of the immigration status of the parents. In other words, children should begin as full members of the society where they are born rather than inherit their parents’ lack of legal status.', 'Assume that the usual narrow exception for children of foreign diplomats remains in place.', 321, TRUE, 1.25, 'applied', 'v2.2'),
    (922, 'C6', 1, 'People should generally be free to live and work in another country when they pass reasonable security and identity checks. In other words, birthplace should not by itself prevent peaceful people from joining another society and labor market.', 'Assume that governments may phase admissions when necessary to maintain basic administrative capacity but may not exclude people merely because of ethnicity or religion.', 322, TRUE, 1.25, 'applied', 'v2.2'),
    (923, 'C7', -1, 'A country with functioning independent courts should not allow an international criminal court to prosecute its citizens without national consent. In other words, final criminal authority over citizens should remain with the country’s own legal system rather than an external court.', 'Assume that domestic courts are genuinely capable of investigating senior military and political leaders rather than shielding them automatically.', 323, TRUE, 1.25, 'applied', 'v2.2'),
    (924, 'C7', 1, 'Countries should accept binding international prosecution of genocide, war crimes, and crimes against humanity even when national leaders object. In other words, an independent international court should be able to prosecute the gravest offenses when national power would otherwise block accountability.', 'Assume that the court has clearly defined jurisdiction, independent judges, meaningful defense rights, and review procedures.', 324, TRUE, 1.25, 'applied', 'v2.2'),
    (925, 'C8', -1, 'Implantable brain-computer interfaces for elective cognitive enhancement should remain prohibited until long-term neurological and security risks are well understood. In other words, people should not yet receive implanted devices merely to improve memory or mental performance when the lasting risks remain uncertain.', 'Assume that the prohibition does not cover medically necessary devices used to restore lost movement, speech, hearing, or vision.', 325, TRUE, 1.25, 'applied', 'v2.2'),
    (926, 'C8', 1, 'Adults should be allowed to use nonheritable gene editing to enhance traits such as strength, endurance, or resistance to disease once safety is established. In other words, regulated biotechnology should be available not only to treat illness but also to improve healthy adult capabilities.', 'Assume that the genetic changes affect only the consenting adult, are not passed to children, and have passed demanding independent safety review.', 326, TRUE, 1.25, 'applied', 'v2.2'),
    (927, 'C9', -1, 'Government may approve a major fossil-fuel project when it is the most practical way to provide affordable and reliable energy, even if it causes substantial ecological and climate harm. In other words, urgent human energy needs can outweigh serious environmental damage when cleaner alternatives are not yet practical at the required scale.', 'Assume that the project complies with pollution controls, but its remaining greenhouse-gas emissions and habitat impacts are still significant.', 327, TRUE, 1.25, 'applied', 'v2.2'),
    (928, 'C9', 1, 'Highly sentient animals should have legal rights that can block profitable human uses causing severe suffering. In other words, some animals should be treated as holders of enforceable interests rather than only as property whose welfare humans may choose to protect.', 'Assume that the protected category is limited by strong scientific evidence of advanced cognition and capacity for suffering.', 328, TRUE, 1.25, 'applied', 'v2.2'),
    (929, 'C10', -1, 'Before fetal viability, a competent adult has an objective moral right to end a pregnancy regardless of local religious or cultural opposition. In other words, early abortion can be protected by a moral right to bodily autonomy that remains valid even when a society strongly rejects it.', 'Assume that the decision is voluntary and medically informed, the pregnancy is pre-viability, and the procedure is performed under ordinary medical safety rules.', 329, TRUE, 1.25, 'applied', 'v2.2'),
    (930, 'C10', -1, 'Deliberately ending a healthy viable pregnancy for nonmedical reasons is objectively wrong regardless of the pregnant person’s beliefs or the surrounding culture. In other words, once a fetus could survive outside the womb, personal or cultural approval cannot by itself make an elective late abortion morally acceptable.', 'Assume that continuing the pregnancy does not pose a serious threat to the pregnant person’s life or long-term health and that safe delivery care is available.', 330, TRUE, 1.25, 'applied', 'v2.2'),
    (931, 'C10', 1, 'Whether abortion early in pregnancy is morally permissible should largely be left to the pregnant person because reasonable moral traditions disagree about fetal status. In other words, early abortion may not have one culture-independent moral answer that government can confidently impose on everyone.', 'Assume that the procedure occurs before fetal viability and that the decision is voluntary and medically informed.', 331, TRUE, 1.25, 'applied', 'v2.2'),
    (932, 'C10', 1, 'A society may legitimately prohibit most elective abortions when its moral tradition regards fetal life as part of the community’s duties, even if other societies permit them. In other words, a restrictive abortion rule can be morally valid within one historical and cultural tradition without proving that every society must adopt the same rule.', 'Assume that the law contains exceptions for serious threats to life or long-term health and that the political process remains open to peaceful disagreement and reform.', 332, TRUE, 1.25, 'applied', 'v2.2'),
    (933, 'C11', -1, 'Protecting innocent human life should always take priority over bodily autonomy when the two values directly conflict in abortion law. In other words, if the fetus counts as innocent human life, its protection should outrank the pregnant person’s control over the pregnancy.', 'Assume that exceptions remain available when pregnancy creates a serious threat to the pregnant person’s life or long-term health.', 333, TRUE, 1.25, 'applied', 'v2.2'),
    (934, 'C11', 1, 'Abortion disputes can involve genuine values on both sides, so no single principle should automatically decide every case. In other words, fetal life, bodily autonomy, health, equality, and family circumstances may all matter without one value always defeating the others.', 'Assume that the legal system may still establish clear presumptions and limits while recognizing exceptional cases.', 334, TRUE, 1.25, 'applied', 'v2.2'),
    (935, 'F1', -1, 'Even when policing and prisons produce serious injustice, reform should proceed through staged changes rather than abolishing and rebuilding the institutions at once. In other words, fixing rules, oversight, staffing, and incentives step by step is safer than replacing the whole system in one rupture.', 'Assume that existing institutions still comply with court orders and that reforms can be independently measured and enforced.', 335, TRUE, 1.25, 'applied', 'v2.2'),
    (936, 'F1', 1, 'A society with persistently abusive policing and incarceration may need to abolish and replace those institutions rather than continue incremental reform. In other words, when repeated reforms fail, creating fundamentally different public-safety institutions can be justified despite major disruption.', 'Assume that multiple audited reform efforts have failed and that a concrete replacement plan provides emergency response, investigation, due process, and protection from violence.', 336, TRUE, 1.25, 'applied', 'v2.2'),
    (937, 'F2', -1, 'A certified election result should be accepted after independent audits and court review even when the losing candidate continues to allege fraud. In other words, verified procedures should outweigh unsupported claims from a political leader who rejects the outcome.', 'Assume that observers from competing parties had access, material claims were examined publicly, and no evidence capable of changing the result was found.', 337, TRUE, 1.25, 'applied', 'v2.2'),
    (938, 'F2', 1, 'Claims from major news organizations and government agencies should be independently verified rather than receiving a presumption of reliability. In other words, institutional reputation alone should not be enough when powerful organizations make important factual claims.', 'Assume that independent evidence and source records can reasonably be examined without exposing an individual to immediate danger.', 338, TRUE, 1.25, 'applied', 'v2.2'),
    (939, 'F3', -1, 'The death penalty should remain available for exceptionally aggravated murder. In other words, some murders are so serious that execution can be a deserved punishment rather than merely a way to prevent future harm.', 'Assume that guilt is supported by multiple independent forms of evidence, the defendant received competent counsel, and automatic appeals have been exhausted.', 339, TRUE, 1.25, 'applied', 'v2.2'),
    (940, 'F3', -1, 'A person who repeatedly sexually abuses a child deserves a severe prison sentence even when treatment could substantially reduce the risk of reoffending. In other words, punishment may be required because of the gravity of the wrong, not only because confinement is needed for public safety.', 'Assume that guilt is established through a fair process and that treatment can still occur during and after the sentence.', 340, TRUE, 1.25, 'applied', 'v2.2'),
    (941, 'F3', 1, 'A person convicted of nonviolent drug distribution should ordinarily receive treatment and supervised reintegration rather than a long prison sentence. In other words, reducing addiction, repairing harm, and preventing future offending should matter more than imposing years of confinement for its own sake.', 'Assume that the offense did not involve violence, threats, trafficking of minors, or deliberate distribution of a substance represented falsely as something safer.', 341, TRUE, 1.25, 'applied', 'v2.2'),
    (942, 'F3', 1, 'Even some people convicted of murder should have a realistic possibility of release after decades in prison if they demonstrate profound rehabilitation and no longer pose a serious danger. In other words, accountability for murder need not always require imprisonment until death when genuine change can be shown.', 'Assume that release requires an independent risk assessment, a public hearing, consideration of victims’ views, and strict supervision.', 342, TRUE, 1.25, 'applied', 'v2.2'),
    (943, 'F4', -1, 'A democratic majority should be able to authorize race-conscious university admissions even when courts interpret general equal-treatment guarantees to forbid them. In other words, elected majorities should usually decide whether public universities may consider race rather than judges deriving a nationwide ban from broad equality language.', 'Assume that the policy is public, limited in duration, periodically reviewed, and does not use rigid racial quotas.', 343, TRUE, 1.25, 'applied', 'v2.2'),
    (944, 'F4', 1, 'Courts should invalidate race-conscious university admissions that violate constitutional equal-treatment rights even when a clear democratic majority supports the policy. In other words, an individual constitutional right to equal treatment can properly block a popular affirmative-action program.', 'Assume that the court applies the same legal standard to comparable racial classifications and explains why less restrictive alternatives are insufficient.', 344, TRUE, 1.25, 'applied', 'v2.2'),
    (945, 'F5', -1, 'Elected lawmakers, not medical regulators, should have the final authority to decide whether puberty blockers or sex hormones used for gender transition may be prescribed to minors. In other words, because treatment of minors involves moral, parental, and developmental judgments, elected representatives should set the controlling rule after hearing medical advice.', 'Assume that regulators publish accurate evidence about benefits, uncertainties, side effects, and alternatives but do not claim expertise over every moral or family-policy question.', 345, TRUE, 1.25, 'applied', 'v2.2'),
    (946, 'F5', 1, 'Independent medical regulators should set evidence-based eligibility and safety standards governing the use of puberty blockers or sex hormones for gender transition in minors even when elected officials face strong public pressure to prohibit them. In other words, trained specialists should decide which patients may receive treatment under clinical safeguards rather than allowing political majorities to impose a blanket medical rule.', 'Assume that the standards require age-appropriate consent, parental involvement except where lawfully waived for safety, careful screening, disclosure of uncertainty, and long-term monitoring.', 346, TRUE, 1.25, 'applied', 'v2.2'),
    (947, 'F6', -1, 'The country’s annual legal immigration level should be set through a binding national referendum rather than left primarily to the legislature. In other words, citizens should vote directly on how many immigrants may be admitted instead of delegating that major choice to representatives.', 'Assume that the referendum clearly states the proposed admission level and separately preserves treaty-based refugee protection and emergency humanitarian duties.', 347, TRUE, 1.25, 'applied', 'v2.2'),
    (948, 'F6', 1, 'Legal immigration levels should be set through elected legislatures after hearings and amendment rather than by a single nationwide referendum. In other words, representatives should negotiate categories, labor needs, family rules, and enforcement details instead of asking voters to accept or reject one fixed number.', 'Assume that proceedings are public, proposals can be amended, agencies publish implementation data, and lawmakers face regular elections.', 348, TRUE, 1.25, 'applied', 'v2.2'),
    (949, 'F7', -1, 'After a nuclear attack on an ally, leaders should seek a ceasefire and use nonnuclear responses rather than retaliate with nuclear weapons. In other words, avoiding further nuclear escalation should take priority even when an alliance partner has suffered a devastating attack.', 'Assume that conventional military, economic, diplomatic, and defensive options remain available, although none can fully undo the attack.', 349, TRUE, 1.25, 'applied', 'v2.2'),
    (950, 'F7', 1, 'A country should be willing to use nuclear weapons first when conventional defeat would otherwise threaten its survival as an independent state. In other words, nuclear first use can be justified as a last resort even when the adversary has not yet used nuclear weapons.', 'Assume that leaders have strong evidence of the existential threat, ordinary conventional options are failing, and any use would still risk massive civilian harm and escalation.', 350, TRUE, 1.25, 'applied', 'v2.2')
ON CONFLICT (id) DO NOTHING;

-- Copy all v2.1 links to the duplicated 300 questions.
INSERT INTO public.question_axis_links (question_id, axis_id, role, axis_key, weight)
SELECT l.question_id + 300, l.axis_id, l.role, l.axis_key, l.weight
FROM public.question_axis_links l
JOIN public.questions q ON q.id = l.question_id
WHERE q.bank_version = 'v2.1' AND q.id BETWEEN 301 AND 600
  AND NOT EXISTS (
    SELECT 1 FROM public.question_axis_links x
    WHERE x.question_id = l.question_id + 300
      AND x.axis_id = l.axis_id
      AND x.role = l.role
  );

-- Primary links for the 50 added items.
INSERT INTO public.question_axis_links (question_id, axis_id, role, axis_key, weight)
VALUES
    (901, 'C1', 'primary', -1, 1.25),
    (902, 'C1', 'primary', -1, 1.25),
    (903, 'C1', 'primary', 1, 1.25),
    (904, 'C1', 'primary', 1, 1.25),
    (905, 'C2', 'primary', -1, 1.25),
    (906, 'C2', 'primary', -1, 1.25),
    (907, 'C2', 'primary', 1, 1.25),
    (908, 'C2', 'primary', 1, 1.25),
    (909, 'C3', 'primary', -1, 1.25),
    (910, 'C3', 'primary', -1, 1.25),
    (911, 'C3', 'primary', 1, 1.25),
    (912, 'C3', 'primary', 1, 1.25),
    (913, 'C4', 'primary', -1, 1.25),
    (914, 'C4', 'primary', 1, 1.25),
    (915, 'C5', 'primary', -1, 1.25),
    (916, 'C5', 'primary', -1, 1.25),
    (917, 'C5', 'primary', 1, 1.25),
    (918, 'C5', 'primary', 1, 1.25),
    (919, 'C6', 'primary', -1, 1.25),
    (920, 'C6', 'primary', -1, 1.25),
    (921, 'C6', 'primary', 1, 1.25),
    (922, 'C6', 'primary', 1, 1.25),
    (923, 'C7', 'primary', -1, 1.25),
    (924, 'C7', 'primary', 1, 1.25),
    (925, 'C8', 'primary', -1, 1.25),
    (926, 'C8', 'primary', 1, 1.25),
    (927, 'C9', 'primary', -1, 1.25),
    (928, 'C9', 'primary', 1, 1.25),
    (929, 'C10', 'primary', -1, 1.25),
    (930, 'C10', 'primary', -1, 1.25),
    (931, 'C10', 'primary', 1, 1.25),
    (932, 'C10', 'primary', 1, 1.25),
    (933, 'C11', 'primary', -1, 1.25),
    (934, 'C11', 'primary', 1, 1.25),
    (935, 'F1', 'primary', -1, 1.25),
    (936, 'F1', 'primary', 1, 1.25),
    (937, 'F2', 'primary', -1, 1.25),
    (938, 'F2', 'primary', 1, 1.25),
    (939, 'F3', 'primary', -1, 1.25),
    (940, 'F3', 'primary', -1, 1.25),
    (941, 'F3', 'primary', 1, 1.25),
    (942, 'F3', 'primary', 1, 1.25),
    (943, 'F4', 'primary', -1, 1.25),
    (944, 'F4', 'primary', 1, 1.25),
    (945, 'F5', 'primary', -1, 1.25),
    (946, 'F5', 'primary', 1, 1.25),
    (947, 'F6', 'primary', -1, 1.25),
    (948, 'F6', 'primary', 1, 1.25),
    (949, 'F7', 'primary', -1, 1.25),
    (950, 'F7', 'primary', 1, 1.25)
ON CONFLICT (question_id, axis_id, role) DO NOTHING;

-- Copy v2.1 metadata to the duplicated 300 questions.
INSERT INTO public.question_metadata
  (question_id, bank_version, policy_domain, latent_conflict, actor_level, policy_instrument, scenario_conditions, item_family, collision_pair)
SELECT question_id + 300, 'v2.2', policy_domain, latent_conflict, actor_level,
       policy_instrument, scenario_conditions, item_family, collision_pair
FROM public.question_metadata
WHERE bank_version = 'v2.1' AND question_id BETWEEN 301 AND 600
ON CONFLICT (question_id) DO NOTHING;

-- Metadata for the 50 added items.
INSERT INTO public.question_metadata
  (question_id, bank_version, policy_domain, latent_conflict, actor_level, policy_instrument, scenario_conditions, item_family, collision_pair)
VALUES
    (901, 'v2.2', 'banking, energy & social ownership', 'State-Directed vs Market-Directed', 'national government/economy', 'public ownership of major enterprises', 'ordinary democratic government; compensation governed by law', 'controversy_stress', NULL),
    (902, 'v2.2', 'industrial planning', 'State-Directed vs Market-Directed', 'national government/major industries', 'binding production and investment targets', 'strategic sectors; published multi-year plan', 'controversy_stress', NULL),
    (903, 'v2.2', 'private ownership of productive property', 'State-Directed vs Market-Directed', 'private owners/economy', 'presumption of private ownership', 'ordinary labor, safety, competition, and environmental law', 'controversy_stress', NULL),
    (904, 'v2.2', 'capital income & profit', 'State-Directed vs Market-Directed', 'investors/firms', 'private return on invested capital', 'lawful investment; no fraud or monopoly privilege', 'controversy_stress', NULL),
    (905, 'v2.2', 'extreme wealth', 'Redistributionist vs Property-Rights', 'national tax system/high-net-worth individuals', 'effective wealth ceiling through taxation', 'lawfully acquired wealth; democratic tax law', 'controversy_stress', NULL),
    (906, 'v2.2', 'racial reparations', 'Redistributionist vs Property-Rights', 'national government/descendants of historically harmed groups', 'tax-funded reparations program', 'documented state-backed injustice; eligibility rules administrable', 'controversy_stress', NULL),
    (907, 'v2.2', 'lawful extreme wealth', 'Redistributionist vs Property-Rights', 'private individuals/state', 'protection of lawful wealth accumulation', 'lawful markets; taxes otherwise paid', 'controversy_stress', NULL),
    (908, 'v2.2', 'rental housing ownership', 'Redistributionist vs Property-Rights', 'private property owners/tenants', 'unrestricted multiple-home ownership subject to ordinary law', 'severe housing shortage; code compliance', 'controversy_stress', NULL),
    (909, 'v2.2', 'vaccination mandates', 'Security/Order vs Civil Liberties', 'government/public', 'temporary compulsory vaccination', 'highly lethal contagious disease; strong efficacy evidence', 'controversy_stress', NULL),
    (910, 'v2.2', 'preventive detention', 'Security/Order vs Civil Liberties', 'courts/security agencies/suspects', 'time-limited preventive detention', 'specific terrorism evidence; no charge yet possible', 'controversy_stress', NULL),
    (911, 'v2.2', 'civilian firearm ownership', 'Security/Order vs Civil Liberties', 'law-abiding adults/state', 'legal ownership of common semiautomatic firearms', 'background check; secure storage; no disqualifying history', 'controversy_stress', NULL),
    (912, 'v2.2', 'encryption', 'Security/Order vs Civil Liberties', 'technology firms/government/users', 'prohibition on mandatory encryption backdoors', 'serious-crime investigations; ordinary warrants available for other evidence', 'controversy_stress', NULL),
    (913, 'v2.2', 'abortion jurisdiction', 'Centralized vs Localized', 'national government/subnational governments', 'single national abortion rule', 'constitutional authority assumed', 'controversy_stress', NULL),
    (914, 'v2.2', 'abortion jurisdiction', 'Centralized vs Localized', 'subnational governments/national government', 'regional abortion lawmaking', 'constitutional authority assumed; interstate travel remains legal', 'controversy_stress', NULL),
    (915, 'v2.2', 'civil marriage definition', 'Traditionalist vs Progressivist', 'state/couples', 'opposite-sex-only civil marriage', 'civil unions may exist but are not marriage', 'controversy_stress', NULL),
    (916, 'v2.2', 'school gender identity policy', 'Traditionalist vs Progressivist', 'public schools/minors/parents', 'parental notification requirement', 'no credible abuse danger; student requests different name/pronouns', 'controversy_stress', NULL),
    (917, 'v2.2', 'legal sex or gender markers', 'Traditionalist vs Progressivist', 'adults/government records', 'self-declared legal gender marker change', 'adult applicant; fraud rules remain', 'controversy_stress', NULL),
    (918, 'v2.2', 'plural marriage', 'Traditionalist vs Progressivist', 'consenting adults/state', 'legal recognition of multi-partner marriage', 'all adults consent; coercion and child marriage prohibited', 'controversy_stress', NULL),
    (919, 'v2.2', 'scarce welfare and housing', 'Particularist vs Universalist', 'government/citizens/noncitizens', 'citizen priority rule', 'applicants have comparable need; emergency aid excluded', 'controversy_stress', NULL),
    (920, 'v2.2', 'long-term unauthorized residence', 'Particularist vs Universalist', 'government/unauthorized residents', 'deportation after due process', 'years of residence; no lawful status; no persecution claim', 'controversy_stress', NULL),
    (921, 'v2.2', 'birthright citizenship', 'Particularist vs Universalist', 'children/state', 'automatic citizenship by place of birth', 'child born and raised in country; diplomats excluded', 'controversy_stress', NULL),
    (922, 'v2.2', 'international migration', 'Particularist vs Universalist', 'migrants/receiving countries', 'broad legal migration presumption', 'security and identity screening; capacity management allowed', 'controversy_stress', NULL),
    (923, 'v2.2', 'international criminal court jurisdiction', 'Sovereigntist vs Integrationist', 'country/citizens/international court', 'refusal of external criminal jurisdiction', 'domestic courts functioning independently', 'controversy_stress', NULL),
    (924, 'v2.2', 'international criminal court jurisdiction', 'Sovereigntist vs Integrationist', 'countries/international court', 'binding international criminal jurisdiction', 'court independent; defined grave crimes; due process', 'controversy_stress', NULL),
    (925, 'v2.2', 'brain-computer interfaces', 'Tech-Cautious vs Tech-Accelerative', 'technology firms/adults/regulators', 'temporary prohibition on elective neural enhancement', 'long-term neurological risks uncertain', 'controversy_stress', NULL),
    (926, 'v2.2', 'genetic enhancement', 'Tech-Cautious vs Tech-Accelerative', 'competent adults/clinicians/regulators', 'regulated somatic gene enhancement', 'changes not inherited; safety established', 'controversy_stress', NULL),
    (927, 'v2.2', 'fossil energy development', 'Anthropocentric vs Ecocentric', 'government/energy firms/communities', 'approval of major fossil-fuel project', 'lower-cost reliable energy; significant ecological and climate harm', 'controversy_stress', NULL),
    (928, 'v2.2', 'legal standing for animals', 'Anthropocentric vs Ecocentric', 'courts/industries/animals', 'limited legal rights for highly sentient animals', 'strong evidence of cognition and suffering', 'controversy_stress', NULL),
    (929, 'v2.2', 'early abortion and objective bodily autonomy', 'Moral Objectivist vs Moral Contextualist', 'pregnant adults/society', 'cross-cultural moral right', 'pre-viability pregnancy; competent voluntary decision', 'controversy_stress', NULL),
    (930, 'v2.2', 'viability and objective fetal protection', 'Moral Objectivist vs Moral Contextualist', 'pregnant adults/viable fetuses/society', 'universal moral prohibition absent serious reason', 'healthy viable fetus; no serious maternal health threat', 'controversy_stress', NULL),
    (931, 'v2.2', 'early abortion and contextual moral permission', 'Moral Objectivist vs Moral Contextualist', 'pregnant adults/state/moral communities', 'context-sensitive moral and legal discretion', 'early pregnancy; fetal moral status disputed', 'controversy_stress', NULL),
    (932, 'v2.2', 'culturally grounded abortion restriction', 'Moral Objectivist vs Moral Contextualist', 'societies/lawmakers/pregnant adults', 'context-sensitive restrictive abortion norm', 'democratic society; tradition assigns early fetal life strong status', 'controversy_stress', NULL),
    (933, 'v2.2', 'abortion and bodily autonomy', 'Moral Monist vs Value Pluralist', 'lawmakers/courts/pregnant adults/fetuses', 'categorical priority for innocent life', 'direct conflict; serious medical threats excepted', 'controversy_stress', NULL),
    (934, 'v2.2', 'abortion and competing values', 'Moral Monist vs Value Pluralist', 'lawmakers/courts/pregnant adults/fetuses', 'case-sensitive balancing', 'reasonable disagreement about fetal status and burdens', 'controversy_stress', NULL),
    (935, 'v2.2', 'police and prison reform', 'Gradualist vs Transformative', 'government/justice institutions', 'incremental reform rather than abolition', 'serious injustice documented; institutions remain partly functional', 'controversy_stress', NULL),
    (936, 'v2.2', 'police and prison abolition', 'Gradualist vs Transformative', 'government/justice institutions', 'institutional abolition and replacement', 'persistent systemic abuse; repeated reform failure', 'controversy_stress', NULL),
    (937, 'v2.2', 'contested election results', 'Trusting vs Skeptical', 'candidates/election officials/courts/public', 'acceptance after audits and litigation', 'independent audits; claims adjudicated', 'controversy_stress', NULL),
    (938, 'v2.2', 'official and major-media claims', 'Trusting vs Skeptical', 'government agencies/news organizations/public', 'default independent verification', 'important contested claims; evidence can be inspected', 'controversy_stress', NULL),
    (939, 'v2.2', 'aggravated murder', 'Retributive vs Restorative', 'courts/convicted murderer/state', 'death penalty', 'exceptionally strong evidence; exhaustive appeals', 'controversy_stress', NULL),
    (940, 'v2.2', 'child sexual abuse', 'Retributive vs Restorative', 'courts/offender/victims', 'severe punitive sentence', 'serious repeated abuse; treatment may reduce future risk', 'controversy_stress', NULL),
    (941, 'v2.2', 'nonviolent drug distribution', 'Retributive vs Restorative', 'courts/offender/community', 'treatment, restitution, and supervised reintegration', 'no violence or coercion; substance-use disorder involved', 'controversy_stress', NULL),
    (942, 'v2.2', 'murder sentencing', 'Retributive vs Restorative', 'parole authority/person convicted of murder/victims', 'reviewable life sentence and possible release', 'decades served; demonstrated rehabilitation; low current risk', 'controversy_stress', NULL),
    (943, 'v2.2', 'race-conscious university admissions', 'Majoritarian vs Constitutionalist', 'voters/legislature/courts/public universities', 'majority-authorized affirmative action', 'clear majority; transparent limited policy; constitutional text disputed', 'controversy_stress', NULL),
    (944, 'v2.2', 'judicial review of race-conscious admissions', 'Majoritarian vs Constitutionalist', 'courts/voters/legislature/public universities', 'constitutional invalidation', 'majority supports policy; court finds individual equal-rights violation', 'controversy_stress', NULL),
    (945, 'v2.2', 'medical transition for minors', 'Popular/Elected Judgment vs Expert Delegation', 'elected lawmakers/medical regulators/clinicians/families', 'legislative control over eligibility rules', 'evidence disclosed; moral and developmental dispute remains', 'controversy_stress', NULL),
    (946, 'v2.2', 'medical transition for minors', 'Popular/Elected Judgment vs Expert Delegation', 'medical regulators/clinicians/elected officials/families', 'expert clinical eligibility standards', 'decision limited to evidence, consent, monitoring, and clinical safeguards', 'controversy_stress', NULL),
    (947, 'v2.2', 'national immigration level', 'Direct Democracy vs Representative Deliberation', 'national electorate/legislature', 'binding referendum on annual immigration ceiling', 'clear numerical proposal; fair campaign and voting rules', 'controversy_stress', NULL),
    (948, 'v2.2', 'national immigration level', 'Direct Democracy vs Representative Deliberation', 'legislature/electorate/agencies', 'deliberative representative immigration lawmaking', 'hearings, amendments, elections, implementation review', 'controversy_stress', NULL),
    (949, 'v2.2', 'response to nuclear attack on ally', 'Dove vs Hawk', 'national leaders/military/alliance', 'non-nuclear response and ceasefire effort', 'ally attacked; country itself not yet struck', 'controversy_stress', NULL),
    (950, 'v2.2', 'existential conventional defeat', 'Dove vs Hawk', 'national leaders/military/adversary', 'first use of nuclear weapons', 'state survival threatened; no nuclear attack yet', 'controversy_stress', NULL)
ON CONFLICT (question_id) DO UPDATE SET
  bank_version = EXCLUDED.bank_version,
  policy_domain = EXCLUDED.policy_domain,
  latent_conflict = EXCLUDED.latent_conflict,
  actor_level = EXCLUDED.actor_level,
  policy_instrument = EXCLUDED.policy_instrument,
  scenario_conditions = EXCLUDED.scenario_conditions,
  item_family = EXCLUDED.item_family,
  collision_pair = EXCLUDED.collision_pair;

SELECT setval(pg_get_serial_sequence('public.questions','id'),
              GREATEST((SELECT max(id) FROM public.questions), 950), true);
SELECT setval(pg_get_serial_sequence('public.question_axis_links','id'),
              COALESCE((SELECT max(id) FROM public.question_axis_links), 1), true);

-- Validation: abort the transaction if the new bank is incomplete or imbalanced.
DO $$
DECLARE v_count integer;
BEGIN
  SELECT count(*) INTO v_count FROM public.questions WHERE bank_version='v2.2';
  IF v_count <> 350 THEN RAISE EXCEPTION 'Expected 350 v2.2 questions, found %', v_count; END IF;

  SELECT count(*) INTO v_count FROM public.questions WHERE bank_version='v2.2' AND active=true;
  IF v_count <> 350 THEN RAISE EXCEPTION 'Expected 350 active v2.2 questions, found %', v_count; END IF;

  SELECT count(*) INTO v_count FROM public.questions
   WHERE bank_version='v2.2' AND question_type='conceptual';
  IF v_count <> 108 THEN RAISE EXCEPTION 'Expected 108 conceptual v2.2 questions, found %', v_count; END IF;

  SELECT count(*) INTO v_count FROM public.questions
   WHERE bank_version='v2.2' AND question_type='applied';
  IF v_count <> 242 THEN RAISE EXCEPTION 'Expected 242 applied v2.2 questions, found %', v_count; END IF;

  SELECT count(*) INTO v_count
  FROM public.question_axis_links l
  JOIN public.questions q ON q.id=l.question_id
  WHERE q.bank_version='v2.2';
  IF v_count <> 398 THEN RAISE EXCEPTION 'Expected 398 v2.2 question-axis links, found %', v_count; END IF;

  SELECT count(*) INTO v_count
  FROM public.question_axis_links l
  JOIN public.questions q ON q.id=l.question_id
  WHERE q.bank_version='v2.2' AND l.role='tradeoff';
  IF v_count <> 48 THEN RAISE EXCEPTION 'Expected 48 v2.2 tradeoff links, found %', v_count; END IF;

  SELECT count(*) INTO v_count FROM public.question_metadata WHERE bank_version='v2.2';
  IF v_count <> 350 THEN RAISE EXCEPTION 'Expected 350 v2.2 metadata rows, found %', v_count; END IF;

  SELECT count(*) INTO v_count FROM public.questions
   WHERE bank_version='v2.2' AND text NOT LIKE '%In other words,%';
  IF v_count <> 0 THEN RAISE EXCEPTION 'All v2.2 questions require an In other words sentence; % are missing', v_count; END IF;

  SELECT count(*) INTO v_count FROM public.questions
   WHERE bank_version='v2.2' AND educational_content LIKE 'Assume that %';
  IF v_count <> 202 THEN RAISE EXCEPTION 'Expected 202 explicit assumptions in v2.2, found %', v_count; END IF;

  SELECT count(*) INTO v_count FROM (
    SELECT q.axis_id,
      count(*) FILTER (WHERE q.key=-1) AS negative_primary,
      count(*) FILTER (WHERE q.key=1) AS positive_primary
    FROM public.questions q
    WHERE q.bank_version='v2.2'
    GROUP BY q.axis_id
    HAVING count(*) FILTER (WHERE q.key=-1) <> count(*) FILTER (WHERE q.key=1)
  ) imbalance;
  IF v_count <> 0 THEN RAISE EXCEPTION 'Primary pole balance failed for % v2.2 axes', v_count; END IF;

  SELECT count(*) INTO v_count FROM (
    SELECT q.id, count(*) FILTER (WHERE l.role='primary') AS n
    FROM public.questions q
    LEFT JOIN public.question_axis_links l ON l.question_id=q.id
    WHERE q.bank_version='v2.2'
    GROUP BY q.id
    HAVING count(*) FILTER (WHERE l.role='primary') <> 1
  ) bad;
  IF v_count <> 0 THEN RAISE EXCEPTION 'Expected exactly one primary link for every v2.2 question; % failed', v_count; END IF;
END $$;

COMMIT;
