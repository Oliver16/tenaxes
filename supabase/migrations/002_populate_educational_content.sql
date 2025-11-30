-- Migration: Populate educational content for all existing questions
-- Date: 2025-11-30
-- Description: Updates all 98 questions with educational content

-- Update questions with educational content based on their ID
-- These match the hardcoded ITEMS in src/lib/instrument.ts

UPDATE questions SET educational_content = 'This question explores the balance between national sovereignty and international cooperation. Sovereigntists believe each nation should independently determine who can enter and reside within its borders, while integrationists may accept international norms or agreements that influence immigration policy.' WHERE id = 1;

UPDATE questions SET educational_content = 'Economic inequality can be measured by comparing the wealth and income of the richest and poorest members of society. Redistributionists prioritize reducing this gap through taxation and social programs, while property rights advocates may view inequality as a natural result of individual differences in productivity and choices.' WHERE id = 2;

UPDATE questions SET educational_content = 'Institutional trust measures confidence in the motivations and integrity of major societal organizations. Skeptics believe power structures systematically prioritize self-preservation over public welfare, while those more trusting view institutional flaws as exceptions rather than patterns.' WHERE id = 3;

UPDATE questions SET educational_content = 'This reflects the principle of subsidiarity—the idea that decisions should be made at the smallest, most local level competent to handle them. Localists argue communities understand their own needs best, while centralists worry about inequality and fragmentation from local variation.' WHERE id = 4;

UPDATE questions SET educational_content = 'Ecocentric perspectives hold that nature has value independent of human needs, while anthropocentric views measure environmental worth primarily by utility to people. This question asks whether biodiversity and wilderness merit protection even when they provide no clear human benefit.' WHERE id = 5;

UPDATE questions SET educational_content = 'Market-directed economies rely on price signals to allocate resources efficiently. Advocates argue free prices prevent shortages and incentivize production, while critics contend that markets for necessities like food and housing need regulation to ensure affordability and prevent exploitation.' WHERE id = 6;

UPDATE questions SET educational_content = 'Tech-skeptics point to unintended consequences like social media''s impact on mental health, automation displacing workers, or AI bias. They argue each technological solution introduces new challenges. Tech-solutionists counter that innovation has historically improved living standards despite short-term disruptions.' WHERE id = 7;

UPDATE questions SET educational_content = 'Progressivists view cultural evolution as necessary for moral and social advancement, believing outdated traditions can perpetuate harm. Traditionalists argue that customs encode valuable wisdom and that rapid change can destabilize communities and erode social cohesion.' WHERE id = 8;

UPDATE questions SET educational_content = 'Restorative justice focuses on healing relationships and addressing root causes of crime through dialogue between victims and offenders. Retributive justice emphasizes proportional punishment and accountability. This reflects different views on whether justice is primarily about restoration or desert.' WHERE id = 9;

UPDATE questions SET educational_content = 'Tech-solutionists believe scientific progress and engineering can address humanity''s greatest challenges, from disease to scarcity to environmental degradation. Skeptics argue many problems are fundamentally social or political, requiring changes in behavior, institutions, and values rather than just new tools.' WHERE id = 10;

UPDATE questions SET educational_content = 'This question explores the tension between civil liberties and security. Privacy advocates prioritize personal autonomy and protection from surveillance, while security-focused perspectives emphasize that law enforcement needs tools like surveillance and data access to prevent crime and terrorism.' WHERE id = 11;

UPDATE questions SET educational_content = 'Moral universalists believe in objective ethical truths that exist independently of human opinion—that acts like torture or slavery are wrong in all contexts. Moral pluralists argue that ethical systems are cultural constructs, and no single framework can claim universal validity across all societies and times.' WHERE id = 12;

UPDATE questions SET educational_content = 'Particularists view in-group preference as natural and beneficial, strengthening social bonds and mutual obligation. Universalists argue moral duties should apply equally to all people regardless of proximity or shared identity, rejecting the idea that nationality or ethnicity creates special obligations.' WHERE id = 13;

UPDATE questions SET educational_content = 'State-directed approaches argue that critical infrastructure is too important to be left to private profit motives and market fluctuations. Market advocates counter that public ownership leads to inefficiency, political interference, and lack of innovation compared to private competition.' WHERE id = 14;

UPDATE questions SET educational_content = 'Trust in institutions reflects whether one views elites and organizations as acting in good faith despite flaws, or as fundamentally self-serving. This affects willingness to accept expert guidance, official narratives, and the legitimacy of existing power structures.' WHERE id = 15;

UPDATE questions SET educational_content = 'Centralists argue uniform policies ensure everyone has the same rights and opportunities regardless of where they live. Localists worry that one-size-fits-all approaches ignore regional differences and prevent communities from tailoring solutions to local needs and values.' WHERE id = 16;

UPDATE questions SET educational_content = 'This reflects the tension between sovereignty and universal human rights. Integrationists believe some rights are so fundamental that global enforcement mechanisms should supersede national law. Sovereigntists argue this undermines democratic self-determination and imposes external values.' WHERE id = 17;

UPDATE questions SET educational_content = 'Property rights advocates view taxation, especially progressive taxation, as a form of coercion that violates individual liberty. Redistributionists counter that wealth accumulation depends on public infrastructure and that society has a collective claim on economic surplus to address inequality and need.' WHERE id = 18;

UPDATE questions SET educational_content = 'Optimists point to historical patterns where automation created new industries and jobs, raising living standards. Skeptics worry modern AI may displace workers faster than new opportunities emerge, concentrating wealth and leaving many behind without comprehensive social support systems.' WHERE id = 19;

UPDATE questions SET educational_content = 'Retributive justice holds that punishment is morally required when someone violates rules—that wrongdoing creates a debt to society that must be paid. This differs from purely practical deterrence or from restorative approaches that prioritize healing over suffering.' WHERE id = 20;

UPDATE questions SET educational_content = 'Security-oriented perspectives emphasize order maintenance through deterrence and rapid response. Civil liberties advocates worry aggressive policing disproportionately harms marginalized communities and that over-policing can erode trust and escalate conflicts.' WHERE id = 21;

UPDATE questions SET educational_content = 'Anthropocentric ethics measures environmental worth instrumentally—clean air, food, recreation, economic resources. This contrasts with views that assign moral status to ecosystems or species themselves, independent of human benefit or preference.' WHERE id = 22;

UPDATE questions SET educational_content = 'Traditionalists argue customs evolved over time to solve real problems and embody accumulated knowledge. Progressivists counter that many traditions reflect historical power imbalances and that ''traditional wisdom'' can be a euphemism for perpetuating outdated prejudices.' WHERE id = 23;

UPDATE questions SET educational_content = 'Market advocates point to competitive incentives, innovation, and responsiveness to consumer preferences. Critics highlight market failures, profit-driven neglect of unprofitable populations, and examples where public provision outperforms private alternatives in quality and cost.' WHERE id = 24;

UPDATE questions SET educational_content = 'Radicals argue powerful interests never voluntarily relinquish privilege, making confrontational tactics necessary for fundamental change. Gradualists counter that disruptive methods often backfire, alienate potential allies, and that patient institutional work produces more durable reforms.' WHERE id = 25;

UPDATE questions SET educational_content = 'Sovereigntists view international treaties that limit national policy autonomy as undemocratic impositions. Integrationists argue cooperative frameworks solve problems individual nations cannot, and that voluntary agreements represent legitimate democratic choices to pool sovereignty.' WHERE id = 26;

UPDATE questions SET educational_content = 'UBI represents a redistributionist approach where wealth is transferred from high earners to provide guaranteed income for all. Supporters argue it reduces poverty and provides security in an automated economy. Critics view it as inefficient wealth transfer that discourages work and production.' WHERE id = 27;

UPDATE questions SET educational_content = 'Tech-solutionists view genetic modification as a powerful tool to eliminate disease, enhance food production, and improve human capabilities. Skeptics worry about unintended consequences, ethical concerns about ''playing God,'' and risks of creating irreversible changes to ecosystems or human genetics.' WHERE id = 28;

UPDATE questions SET educational_content = 'Centralists argue that fundamental rights and critical services require national coordination to prevent inequality. This reflects concern that local control may perpetuate injustice or create ''laboratories of democracy'' that fail vulnerable populations.' WHERE id = 29;

UPDATE questions SET educational_content = 'Institutional skeptics question whether credentialed authorities act as neutral arbiters or serve power structures. This affects views on everything from public health guidance to economic forecasts to scientific consensus on controversial topics.' WHERE id = 30;

UPDATE questions SET educational_content = 'Free speech absolutists argue that protecting unpopular speech is essential to liberty and truth-seeking. Critics counter that some speech causes concrete harm, and that tolerance of hate speech enables oppression of vulnerable groups.' WHERE id = 31;

UPDATE questions SET educational_content = 'This reflects concerns about technological fragility—that modern infrastructure (digital networks, supply chains, financial systems) creates catastrophic vulnerabilities. Tech-skeptics advocate for resilience through simpler, more transparent systems.' WHERE id = 32;

UPDATE questions SET educational_content = 'Restorative justice programs facilitate dialogue to repair harm and address underlying issues. Advocates cite reduced recidivism and victim satisfaction. Retributivists question whether this adequately holds offenders accountable or vindicates victims'' rights.' WHERE id = 33;

UPDATE questions SET educational_content = 'Market discipline advocates argue bailouts create moral hazard, reward poor management, and prevent creative destruction that reallocates resources. Interventionists counter that strategic industries and systemic risks justify stabilization to prevent cascading failures and job losses.' WHERE id = 34;

UPDATE questions SET educational_content = 'Anthropocentrists prioritize human welfare over environmental concerns when tradeoffs are necessary. This contrasts with ecocentric views that grant moral weight to nature itself, potentially requiring human sacrifice for ecological health.' WHERE id = 35;

UPDATE questions SET educational_content = 'Traditionalists view the nuclear family as evolutionarily and socially optimal, providing child-rearing stability and community cohesion. Progressivists argue diverse family structures can thrive, and that ''traditional'' arrangements often embedded patriarchal control.' WHERE id = 36;

UPDATE questions SET educational_content = 'Moral realists believe ethics reflects objective facts about right and wrong, discoverable through philosophy, empirical investigation, or divine guidance. Anti-realists view morality as human invention, shaped by culture and circumstance rather than discovered.' WHERE id = 37;

UPDATE questions SET educational_content = 'Localists support federalism and policy experimentation, allowing regions to reflect local values and conditions. Centralists worry this creates inequality, enables rights violations in some jurisdictions, and fragments national cohesion.' WHERE id = 38;

UPDATE questions SET educational_content = 'Climate integrationists argue planetary challenges require binding international governance that individual nations cannot opt out of. Sovereigntists counter that this creates unaccountable supranational power and that cooperation should remain voluntary.' WHERE id = 39;

UPDATE questions SET educational_content = 'Property rights advocates view inheritance as natural extension of ownership and family bonds. Redistributionists argue concentrated inherited wealth perpetuates aristocracy, and that estate taxes promote equality of opportunity across generations.' WHERE id = 40;

UPDATE questions SET educational_content = 'This measures baseline trust in credentialed expertise. Trusting perspectives view professionals as largely guided by ethics and evidence despite occasional failures. Skeptics see institutional pressures, conflicts of interest, and groupthink as systematically corrupting expert judgment.' WHERE id = 41;

UPDATE questions SET educational_content = 'State-directed advocates argue that coordinated planning prevents waste, prioritizes social needs, and avoids market failures. Market proponents counter that central planners lack the dispersed knowledge needed for efficient allocation and that planning creates opportunities for corruption and inefficiency.' WHERE id = 42;

UPDATE questions SET educational_content = 'Tech-optimists favor rapid deployment to realize benefits quickly, trusting adaptation and iteration. Precautionists advocate for careful testing and regulation before release, warning that some technological harms (ecological damage, social disruption) may be irreversible.' WHERE id = 43;

UPDATE questions SET educational_content = 'Progressivists view conventional gender roles and family structures as socially constructed limits that restrict individual flourishing. Traditionalists argue these patterns reflect biological realities and provide proven frameworks for raising children and organizing communities.' WHERE id = 44;

UPDATE questions SET educational_content = 'Retributivists see punishment as intrinsically required by wrongdoing—not merely instrumental for deterrence or reform, but morally necessary to affirm societal values and vindicate victims. Restorative advocates argue healing is more important than suffering.' WHERE id = 45;

UPDATE questions SET educational_content = 'This reflects the security vs. liberty tradeoff in extreme cases. Security prioritizers argue extraordinary threats justify extraordinary measures. Civil libertarians counter that due process rights are most important precisely when under pressure, and that detention without trial enables abuse.' WHERE id = 46;

UPDATE questions SET educational_content = 'Particularists argue that effective altruism requires strong in-group bonds and resource stability—that universalist obligations may exhaust communities'' capacity to help even their own members. Universalists counter that moral obligations don''t diminish with distance.' WHERE id = 47;

UPDATE questions SET educational_content = 'Ecocentrists prioritize ecological preservation over economic growth when conflicts arise. This may mean limiting development in sensitive areas or accepting lower material living standards. Anthropocentrists weigh environmental protection against human prosperity and development needs.' WHERE id = 48;

UPDATE questions SET educational_content = 'Radicals view disruptive tactics as justified when normal channels prove inadequate, arguing moral urgency can override legal compliance. Gradualists worry that bypassing democratic processes undermines legitimacy and that illegal tactics often backfire politically.' WHERE id = 49;

UPDATE questions SET educational_content = 'Redistributionists argue extreme wealth inequality translates into political power, enabling the rich to shape policy and creating dangerous social divisions. Property rights advocates counter that wealth concentration often reflects value creation and that forced redistribution reduces overall prosperity.' WHERE id = 50;

UPDATE questions SET educational_content = 'Centralists argue crises like pandemics, climate change, or economic collapse require unified national response that local jurisdictions cannot provide. Localists counter that decentralized approaches allow experimentation, adaptation, and avoid catastrophic single points of failure.' WHERE id = 51;

UPDATE questions SET educational_content = 'Tech-skeptics identify innovations whose harms outweigh benefits, arguing some knowledge creates unavoidable dangers. Tech-solutionists counter that technology is neutral, problems stem from misuse, and that attempting to prevent innovation is futile and counterproductive.' WHERE id = 52;

UPDATE questions SET educational_content = 'Sovereigntists view international organizations as unaccountable bureaucracies that override democratic choices. Integrationists argue these bodies provide necessary coordination and that nations voluntarily delegate authority to solve collective action problems.' WHERE id = 53;

UPDATE questions SET educational_content = 'Privacy advocates view encryption as essential for civil liberties in the digital age, protecting dissent, journalism, and personal autonomy. Security proponents argue law enforcement needs access to communications to prevent terrorism and serious crime.' WHERE id = 54;

UPDATE questions SET educational_content = 'Anthropocentrists argue human welfare takes precedence over species preservation when significant economic costs are involved. Ecocentrists counter that biodiversity has intrinsic value and that ecosystem collapse threatens humanity''s long-term survival.' WHERE id = 55;

UPDATE questions SET educational_content = 'Institutional skeptics view elite self-interest as the primary driver of organizational behavior, explaining regulatory capture, institutional inertia, and resistance to reform. Trusters see this as cynical oversimplification that ignores genuine public service motivation.' WHERE id = 56;

UPDATE questions SET educational_content = 'Traditionalists warn that too-rapid social change disrupts institutions, weakens shared norms, and leaves people disoriented. Progressivists argue cultures naturally evolve, and that resistance to change often means clinging to oppressive systems.' WHERE id = 57;

UPDATE questions SET educational_content = 'Market advocates argue competition drives innovation, efficiency, and customer service. Public provision supporters counter that profit motives lead to corner-cutting, exclusion of unprofitable customers, and that some services work better as monopolies or public goods.' WHERE id = 58;

UPDATE questions SET educational_content = 'Restorative perspectives view crime primarily as resulting from poverty, trauma, and lack of opportunity—problems requiring social support rather than punishment. Retributivists argue this excuses personal responsibility and fails to protect society from dangerous individuals.' WHERE id = 59;

UPDATE questions SET educational_content = 'Supply-side economics argues that taxing success reduces incentives to work, invest, and innovate, ultimately harming economic growth that benefits all. Redistributionists counter that marginal tax rates have minimal effect on effort and that inequality itself harms growth and social stability.' WHERE id = 60;

UPDATE questions SET educational_content = 'Moral universalists argue that relativism provides no basis for criticizing practices like slavery or genocide across cultures. Pluralists counter that claims of universal truth often mask cultural imperialism and that diverse moral frameworks can coexist without objective foundations.' WHERE id = 61;

UPDATE questions SET educational_content = 'This reflects the subsidiarity principle—local actors have better information and stronger incentives to solve problems well. Centralists counter that local decision-making can perpetuate injustice, create coordination failures, and lack technical expertise.' WHERE id = 62;

UPDATE questions SET educational_content = 'Integrationists argue migration increases overall prosperity through labor mobility and cultural exchange. Sovereigntists worry about wage suppression, cultural disruption, and argue nations have right to control who enters and becomes a member.' WHERE id = 63;

UPDATE questions SET educational_content = 'Public ownership advocates argue critical infrastructure is too important to be subject to profit motives and market failures. Privatization supporters counter that private management brings efficiency, innovation, and better customer service even for essential utilities.' WHERE id = 64;

UPDATE questions SET educational_content = 'Tech-skeptics cite examples like social media addiction, antibiotic resistance, or nuclear weapons to argue innovation frequently creates worse problems. Tech-optimists counter that we systematically underweight benefits and that adaptation and iteration address emerging issues.' WHERE id = 65;

UPDATE questions SET educational_content = 'Progressivists view history as moral evolution away from practices like slavery, patriarchy, or discrimination that were once accepted. This assumes current generations have ethical insights predecessors lacked. Traditionalists question whether changes represent progress or merely fashion.' WHERE id = 66;

UPDATE questions SET educational_content = 'This explores limits of free expression. Security-oriented perspectives argue hate speech, incitement, or disinformation cause real harm justifying legal restriction. Civil libertarians counter that government power to ban speech is more dangerous than offensive ideas.' WHERE id = 67;

UPDATE questions SET educational_content = 'Gradualists argue that working within systems builds buy-in, avoids backlash, and produces durable change. Radicals counter that powerful interests co-opt incremental reform and only confrontational pressure achieves fundamental transformation.' WHERE id = 68;

UPDATE questions SET educational_content = 'Ecocentric ethics extends moral status beyond present humans to include future people, animals, and ecosystems. This can require substantial sacrifice today for long-term or non-human benefit. Anthropocentrists prioritize current human welfare.' WHERE id = 69;

UPDATE questions SET educational_content = 'Particularists argue in-group preference is natural, strengthens community bonds, and that universal altruism is psychologically unrealistic. Universalists view this as unjust discrimination—that moral obligations and opportunities shouldn''t depend on shared identity.' WHERE id = 70;

UPDATE questions SET educational_content = 'Redistributionists argue collective responsibility for meeting basic needs through social safety nets and guaranteed minimums. Property rights advocates counter that coercive redistribution violates liberty and that voluntary charity should address poverty.' WHERE id = 71;

UPDATE questions SET educational_content = 'Retributivists argue genuine accountability requires meaningful penalties—that restorative processes without punishment don''t adequately vindicate victims or deter wrongdoing. Restorative advocates counter that consequences can include apology, restitution, and behavioral change.' WHERE id = 72;

UPDATE questions SET educational_content = 'Centralists worry that federalism creates patchwork systems where rights and services vary dramatically by location. They argue national standards ensure equal treatment. Localists counter that uniform policies ignore legitimate regional differences and that experimentation produces better solutions.' WHERE id = 73;

UPDATE questions SET educational_content = 'Moral universalists argue geography and identity are morally arbitrary—that suffering matters equally wherever it occurs. Particularists counter that special obligations to family, community, and nation are natural, psychologically necessary, and that universalism demands impossible impartiality.' WHERE id = 74;

UPDATE questions SET educational_content = 'Democratic sovereignty holds that self-governance is fundamental and external authority is illegitimate. Integrationists argue some problems require coordinated global action and that international cooperation doesn''t undermine democracy when nations voluntarily participate.' WHERE id = 75;

UPDATE questions SET educational_content = 'Institutional trust involves believing that democratic processes, checks and balances, and rule of law work despite imperfections. Skeptics view institutions as captured by elites and incapable of self-correction without external pressure.' WHERE id = 76;

UPDATE questions SET educational_content = 'Civil liberties advocates view protest rights as fundamental checks on government power, even when disruptive. Order-focused perspectives argue that illegal disruption undermines rule of law and that protest rights must be balanced against public safety and others'' rights.' WHERE id = 77;

UPDATE questions SET educational_content = 'Price controls represent state intervention to ensure affordability of essentials. Advocates argue markets leave necessities unaffordable for the poor. Market economists counter that price caps create shortages, reduce quality, and that subsidies or income support are more effective.' WHERE id = 78;

UPDATE questions SET educational_content = 'Moral pluralists view ethical systems as products of specific cultural and historical contexts without universal validity. Universalists argue this implies we cannot meaningfully criticize practices like honor killings or oppression as wrong, just different.' WHERE id = 79;

UPDATE questions SET educational_content = 'Traditionalists argue rituals provide meaning, continuity, and community cohesion independent of their functional origins. Progressivists counter that preserving practices whose rationale has disappeared perpetuates empty formalism or conceals oppressive origins.' WHERE id = 80;

UPDATE questions SET educational_content = 'Property rights advocates view wealth distribution as reflecting individual merit and productivity. Redistributionists counter that outcomes depend heavily on inherited advantages, structural barriers, and luck—and that extreme inequality undermines equal opportunity and social cohesion.' WHERE id = 81;

UPDATE questions SET educational_content = 'Gradualists point to violent revolutions that produced authoritarian regimes or chaos. They argue incremental reform is safer and more effective. Radicals counter that gradualism fails when power structures resist change and cite successful revolutionary movements.' WHERE id = 82;

UPDATE questions SET educational_content = 'Universalists believe ethical principles transcend group boundaries—that human rights apply to all equally. Particularists argue different communities legitimately have different values and that universal rules often reflect cultural imperialism disguised as moral truth.' WHERE id = 83;

UPDATE questions SET educational_content = 'Strong integrationists argue that issues like climate change, pandemics, or nuclear proliferation require binding international authority with enforcement power. Sovereigntists view this as undemocratic world government and argue cooperation should remain voluntary.' WHERE id = 84;

UPDATE questions SET educational_content = 'Federalism advocates view policy diversity as beneficial experimentation—different approaches reveal what works best. Centralists worry this creates unfair variation in rights and services, and that some ''experiments'' harm vulnerable populations.' WHERE id = 85;

UPDATE questions SET educational_content = 'Order-focused perspectives prioritize institutional authority to maintain standards and protect others from offensive behavior. Civil libertarians argue conduct codes often suppress legitimate expression and that institutions overreach in regulating personal speech and behavior.' WHERE id = 86;

UPDATE questions SET educational_content = 'Deep ecologists argue moral obligations extend to preserving ecosystems and species even at substantial economic sacrifice. Anthropocentrists counter that while environmental protection matters, human welfare must take priority when tradeoffs are necessary.' WHERE id = 87;

UPDATE questions SET educational_content = 'Moral pluralists argue ethical disagreements often stem from incompatible foundational values rather than factual disputes, and no objective standard can resolve them. Universalists counter that this leads to moral paralysis and inability to condemn clearly evil practices.' WHERE id = 88;

UPDATE questions SET educational_content = 'Radicals argue power concedes nothing without demand and that elites will compromise only when forced. Gradualists counter that confrontational approaches polarize societies, create backlash, and that building coalitions through negotiation achieves more lasting change.' WHERE id = 89;

UPDATE questions SET educational_content = 'Universalists argue resources should go where they do the most good regardless of group membership. Particularists counter that communities have special obligations to their own members and that effective aid requires the trust and accountability that come from shared bonds.' WHERE id = 90;

UPDATE questions SET educational_content = 'Moral constructivists view ethics as created by humans through culture and social agreement, changing over time like language or art. Realists argue this implies no moral criticism across cultures is valid and that it confuses changing beliefs with changing truths.' WHERE id = 91;

UPDATE questions SET educational_content = 'Anthropocentric views measure nature''s value instrumentally—by its usefulness to humanity. This perspective prioritizes human development and assumes environmental protection should serve human interests. Ecocentrists reject the premise that nature exists for human benefit.' WHERE id = 92;

UPDATE questions SET educational_content = 'Progressivists argue social norms must adapt as knowledge advances about gender, sexuality, family structure, and identity. They view resistance as clinging to outdated categories. Traditionalists counter that constant redefinition erodes shared meaning and social stability.' WHERE id = 93;

UPDATE questions SET educational_content = 'Moral pluralists argue many disagreements reflect fundamentally different value systems with no common ground for resolution. Universalists counter that moral truth exists independently of disagreement and that reasoning can resolve apparent conflicts.' WHERE id = 94;

UPDATE questions SET educational_content = 'Cosmopolitans view nationality as an accident of birth that shouldn''t affect moral obligations. Particularists argue borders reflect meaningful political communities with shared institutions and mutual obligations that legitimately create special duties to fellow citizens.' WHERE id = 95;

UPDATE questions SET educational_content = 'Moral universalists believe fundamental ethical truths (like prohibitions on murder or torture) transcend cultural variation. Pluralists point to dramatic historical and cross-cultural moral differences to argue no unchanging core exists.' WHERE id = 96;

UPDATE questions SET educational_content = 'Communitarians argue that thick local ties create trust, accountability, and effective cooperation that abstract universal principles cannot match. Universalists counter that in-group favoritism perpetuates tribalism and that moral obligations shouldn''t depend on group membership.' WHERE id = 97;

UPDATE questions SET educational_content = 'Gradualists emphasize that disruption carries costs—institutional knowledge lost, social bonds broken, uncertainty created. Even beneficial changes should proceed carefully. Radicals counter that valuing stability privileges existing power structures and delays necessary reforms.' WHERE id = 98;
