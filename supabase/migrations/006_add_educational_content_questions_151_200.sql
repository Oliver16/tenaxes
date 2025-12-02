-- Migration: Add educational_content for new applied questions 151-200
-- Generated: 2025-12-02
-- Description: Provides educational context for the 50 new applied/scenario questions (151-200)

-- =====================================================
-- C1: Economic Control (State-Directed ↔ Market-Directed)
-- Questions 151-154
-- =====================================================

UPDATE questions SET educational_content = 'This scenario tests your view on rent control policies. Market advocates argue price controls create shortages and discourage new housing construction, while state-directed proponents argue rent caps protect tenants from exploitation and displacement.' WHERE id = 151;

UPDATE questions SET educational_content = 'This scenario examines your preference for public versus private ownership of essential infrastructure. Public ownership supporters argue transit is too important for profit motives, while privatization advocates claim private operators deliver better efficiency and service.' WHERE id = 152;

UPDATE questions SET educational_content = 'This scenario tests whether you prioritize market efficiency and consumer prices over employment protection. Market-directed views accept automation-driven job losses as necessary for progress, while state-directed perspectives may favor policies that preserve employment.' WHERE id = 153;

UPDATE questions SET educational_content = 'This scenario explores your stance on government bailouts and industrial policy. State interventionists argue preserving employment justifies subsidizing struggling firms, while market advocates view this as rewarding failure and misallocating resources.' WHERE id = 154;

-- =====================================================
-- C2: Economic Equality (Redistributionist ↔ Property Rights)
-- Questions 155-158
-- =====================================================

UPDATE questions SET educational_content = 'This scenario tests support for wealth redistribution through housing policy. Redistributionists favor using taxation or conversion to address housing inequality, while property rights advocates view this as unjust confiscation that undermines investment incentives.' WHERE id = 155;

UPDATE questions SET educational_content = 'This scenario examines your view on debt forgiveness and personal responsibility. Property rights advocates argue contracts must be honored and costs shouldn''t shift to taxpayers, while redistributionists emphasize reducing inequality and student debt burdens.' WHERE id = 156;

UPDATE questions SET educational_content = 'This scenario tests support for progressive wealth taxation to fund social programs. Redistributionists argue wealth taxes reduce dangerous inequality and fund essential services, while property rights advocates warn they drive capital flight and reduce overall prosperity.' WHERE id = 157;

UPDATE questions SET educational_content = 'This scenario explores your preference for flat versus progressive taxation. Property rights advocates view flat taxes as fair equal treatment, while redistributionists argue progressive rates are needed to address unequal capacity to pay and reduce inequality.' WHERE id = 158;

-- =====================================================
-- C3: Coercive Power (Security/Order ↔ Civil Liberties)
-- Questions 159-162
-- =====================================================

UPDATE questions SET educational_content = 'This scenario tests the privacy versus security tradeoff with surveillance technology. Civil liberties advocates prioritize freedom from mass surveillance, while security-focused perspectives argue facial recognition is a legitimate crime-fighting tool.' WHERE id = 159;

UPDATE questions SET educational_content = 'This scenario examines your view on algorithmic policing and fairness. Security advocates argue data-driven prediction improves public safety, while civil libertarians worry about bias, lack of due process, and self-fulfilling prophecies in predictive systems.' WHERE id = 160;

UPDATE questions SET educational_content = 'This scenario tests willingness to accept digital surveillance during public health emergencies. Civil liberties advocates view location tracking as dangerous precedent regardless of benefits, while security-oriented perspectives accept temporary restrictions for public health.' WHERE id = 161;

UPDATE questions SET educational_content = 'This scenario explores collective punishment and order maintenance. Security-focused views accept restricting everyone''s freedom to reduce crime, while civil libertarians argue blanket curfews punish the innocent and represent excessive government power.' WHERE id = 162;

-- =====================================================
-- C4: Where Power Sits (Centralized ↔ Localized)
-- Questions 163-166
-- =====================================================

UPDATE questions SET educational_content = 'This scenario tests your preference for local control versus centralized housing policy. Localists argue communities should control their own zoning, while centralists worry local vetoes perpetuate housing crises and inequality.' WHERE id = 163;

UPDATE questions SET educational_content = 'This scenario examines whether critical civil rights protections should be centralized. Centralists argue national standards prevent local jurisdictions from adopting inadequate protections, while localists prefer regional variation reflecting local values.' WHERE id = 164;

UPDATE questions SET educational_content = 'This scenario tests support for local educational autonomy on controversial topics. Localists argue communities should control curriculum, while centralists worry this allows misinformation or rights violations in some jurisdictions.' WHERE id = 165;

UPDATE questions SET educational_content = 'This scenario explores federal versus local authority on immigration enforcement. Centralists argue national government should enforce uniform immigration policy, while localists support local jurisdictions setting their own enforcement priorities.' WHERE id = 166;

-- =====================================================
-- C5: Cultural Orientation (Traditionalist ↔ Progressivist)
-- Questions 167-170
-- =====================================================

UPDATE questions SET educational_content = 'This scenario tests your view on gender identity self-determination. Progressivists support removing bureaucratic barriers to gender marker changes, while traditionalists prefer requiring medical or legal validation of gender status.' WHERE id = 167;

UPDATE questions SET educational_content = 'This scenario examines how to handle historically important but offensive texts. Traditionalists argue preserving original works in full context is essential, while progressivists may favor removing or editing texts that normalize discrimination.' WHERE id = 168;

UPDATE questions SET educational_content = 'This scenario tests support for inclusive student organizations despite parental objections. Progressivists prioritize student autonomy and inclusion, while traditionalists may defer to parental authority and community norms on sensitive topics.' WHERE id = 169;

UPDATE questions SET educational_content = 'This scenario explores age-appropriate education on non-traditional relationships. Traditionalists argue elementary schools should focus on conventional family structures, while progressivists support introducing diverse relationship models to reflect student experiences.' WHERE id = 170;

-- =====================================================
-- C6: Group Boundaries (Particularist ↔ Universalist)
-- Questions 171-174
-- =====================================================

UPDATE questions SET educational_content = 'This scenario tests whether humanitarian criteria should be neutral or favor cultural proximity. Universalists argue moral obligations apply equally to all vulnerable people, while particularists favor helping those with closer cultural or strategic ties.' WHERE id = 171;

UPDATE questions SET educational_content = 'This scenario examines the tension between domestic and international aid priorities. Particularists argue special obligations to fellow citizens justify prioritizing domestic recovery, while universalists view this as unjust favoritism based on nationality.' WHERE id = 172;

UPDATE questions SET educational_content = 'This scenario tests the scope of altruistic obligations. Universalists argue charity should maximize global welfare regardless of proximity, while particularists view local community improvement as a legitimate priority for charitable giving.' WHERE id = 173;

UPDATE questions SET educational_content = 'This scenario explores whether employment should favor national citizens. Particularists argue nations have special obligations to their own citizens, while universalists view citizenship-based preferences as unjust discrimination against equally qualified foreigners.' WHERE id = 174;

-- =====================================================
-- C7: Sovereignty Scope (Sovereigntist ↔ Integrationist)
-- Questions 175-178
-- =====================================================

UPDATE questions SET educational_content = 'This scenario tests willingness to subject national military to international prosecution. Sovereigntists view this as undermining democratic control over armed forces, while integrationists argue international war crimes accountability transcends national sovereignty.' WHERE id = 175;

UPDATE questions SET educational_content = 'This scenario examines support for binding international health authority during crises. Integrationists argue pandemics require coordinated global response overriding national discretion, while sovereigntists prefer voluntary cooperation preserving national autonomy.' WHERE id = 176;

UPDATE questions SET educational_content = 'This scenario tests whether international refugee commitments should bind national policy. Sovereigntists argue immigration levels are core sovereign decisions, while integrationists support binding treaties that create obligations to accept refugees.' WHERE id = 177;

UPDATE questions SET educational_content = 'This scenario explores willingness to accept international arms control limiting national capability. Integrationists support binding treaties preventing dangerous arms races, while sovereigntists prioritize maintaining strategic advantages and national security autonomy.' WHERE id = 178;

-- =====================================================
-- C8: Technology Stance (Tech-Skeptical ↔ Tech-Solutionist)
-- Questions 179-182
-- =====================================================

UPDATE questions SET educational_content = 'This scenario tests acceptance of ubiquitous sensing infrastructure for public benefits. Tech-solutionists view comprehensive monitoring as enabling optimization and better outcomes, while tech-skeptics worry about surveillance normalization and privacy erosion.' WHERE id = 179;

UPDATE questions SET educational_content = 'This scenario examines trust in algorithmic versus human judgment in high-stakes decisions. Tech-skeptics prefer human discretion despite inconsistency, while tech-solutionists favor data-driven systems that may reduce bias and improve fairness.' WHERE id = 180;

UPDATE questions SET educational_content = 'This scenario tests support for using automation gains to fund social safety nets. Tech-solutionists view UBI as solution to technological unemployment, while skeptics may question whether redistribution adequately addresses automation''s social disruption.' WHERE id = 181;

UPDATE questions SET educational_content = 'This scenario explores concerns about invasive enhancement technologies. Tech-skeptics worry about corporations or governments accessing thoughts via neural interfaces, while tech-solutionists may emphasize medical benefits and assume adequate safeguards.' WHERE id = 182;

-- =====================================================
-- C9: Nature''s Moral Weight (Anthropocentric ↔ Ecocentric)
-- Questions 183-186
-- =====================================================

UPDATE questions SET educational_content = 'This scenario tests willingness to prioritize ecosystem preservation over economic activity. Ecocentrists argue fragile habitats merit protection even at economic cost, while anthropocentrists prioritize human livelihoods and food affordability.' WHERE id = 183;

UPDATE questions SET educational_content = 'This scenario examines the tradeoff between human convenience and wildlife habitat. Anthropocentrists accept environmental costs for significant human benefits like reduced commuting, while ecocentrists prioritize maintaining intact ecosystems.' WHERE id = 184;

UPDATE questions SET educational_content = 'This scenario tests willingness to accept personal sacrifice for climate action. Ecocentrists support restricting high-carbon activities even when costly to individuals, while anthropocentrists may prioritize current human welfare over environmental protection.' WHERE id = 185;

UPDATE questions SET educational_content = 'This scenario explores urban land use priorities between housing and green space. Anthropocentrists prioritize human housing needs over access to nature, while ecocentrists view urban green space as essential for both humans and urban ecosystems.' WHERE id = 186;

-- =====================================================
-- C10: Moral Foundation (Moral Universalist ↔ Moral Pluralist)
-- Questions 187-190
-- =====================================================

UPDATE questions SET educational_content = 'This scenario tests whether different legal approaches to speech can be equally valid. Moral pluralists view diverse regulations as reflecting legitimate cultural differences, while universalists argue fundamental free expression principles should apply everywhere.' WHERE id = 187;

UPDATE questions SET educational_content = 'This scenario examines whether some practices are universally wrong regardless of cultural context. Moral universalists argue certain harms violate universal ethical standards, while pluralists may view intervention as cultural imperialism.' WHERE id = 188;

UPDATE questions SET educational_content = 'This scenario tests acceptance of fundamental moral disagreement on capital punishment. Moral pluralists view both positions as potentially valid in context, while universalists believe objective moral truth determines whether execution is ethical.' WHERE id = 189;

UPDATE questions SET educational_content = 'This scenario explores whether human rights transcend cultural variation. Moral universalists argue core rights are objectively valid everywhere, while pluralists worry universal standards impose external values and dismiss legitimate cultural differences.' WHERE id = 190;

-- =====================================================
-- F1: Change Strategy (Gradualist ↔ Radical)
-- Questions 191-194
-- =====================================================

UPDATE questions SET educational_content = 'This scenario tests acceptance of disruptive protest tactics when normal channels fail. Radicals view escalation as justified when peaceful methods prove inadequate, while gradualists worry disruptive tactics undermine legitimacy and create backlash.' WHERE id = 191;

UPDATE questions SET educational_content = 'This scenario examines commitment to institutional processes versus direct action. Gradualists prioritize working through democratic institutions even when frustrated, while radicals may view property damage or confrontation as justified for urgent causes.' WHERE id = 192;

UPDATE questions SET educational_content = 'This scenario tests whether principled inflexibility or pragmatic compromise is more admirable. Radicals value refusing to compromise core demands, while gradualists prefer incremental progress through negotiation and coalition-building.' WHERE id = 193;

UPDATE questions SET educational_content = 'This scenario explores preference for consensus-building versus rapid transformation. Gradualists favor leaders who reduce tensions and build agreement, while radicals may view compromise as capitulation that delays necessary change.' WHERE id = 194;

-- =====================================================
-- F2: Institutional Trust (Trusting ↔ Skeptical)
-- Questions 195-198
-- =====================================================

UPDATE questions SET educational_content = 'This scenario tests baseline skepticism about corporate transparency. Institutional skeptics assume companies hide information about data practices, while trusting perspectives give organizations benefit of doubt absent specific evidence.' WHERE id = 195;

UPDATE questions SET educational_content = 'This scenario examines trust in judicial review and legal precedent. Trusting perspectives view sustained judicial approval as validating constitutionality, while skeptics may view courts as captured by power structures.' WHERE id = 196;

UPDATE questions SET educational_content = 'This scenario tests suspicion about official statistics and polling. Institutional skeptics assume data manipulation by authorities, while trusting perspectives accept official statistics as generally reliable despite imperfections.' WHERE id = 197;

UPDATE questions SET educational_content = 'This scenario explores trust in journalistic consensus across outlets. Trusting perspectives accept corroboration across independent sources as validating facts, while skeptics may view media consensus as evidence of coordination or groupthink.' WHERE id = 198;

-- =====================================================
-- F3: Justice Style (Retributive ↔ Restorative)
-- Questions 199-200
-- =====================================================

UPDATE questions SET educational_content = 'This scenario tests support for treatment-focused approaches to drug offenses. Restorative perspectives view addiction as health issue requiring treatment, while retributive approaches emphasize accountability through punishment for law violations.' WHERE id = 199;

UPDATE questions SET educational_content = 'This scenario examines commitment to mandatory sentencing for serious crimes. Retributivists argue repeat violent offenders require long incarceration regardless of rehabilitation prospects, while restorative advocates prefer individualized approaches considering rehabilitation potential.' WHERE id = 200;

-- Note: Questions 201-202 exist but educational content not included per request (151-200 only)
