import type {
  AIQuestionEvidence,
  CandidateTension,
  CenterShape,
  EngagementClassification,
  TensionClassification
} from '../types'

export const SYNTHETIC_BANK_VERSION = 'synthetic-v1'

export interface SyntheticAxisFixture {
  axis_id: string
  name: string
  score: number
  conceptual_score: number | null
  applied_score: number | null
  pole_negative: string
  pole_positive: string
  coverage_confidence: 'high' | 'moderate' | 'low' | 'insufficient'
}

export interface SyntheticFixtureExpectations {
  deterministic_topics?: Record<string, EngagementClassification>
  center_shapes?: Record<string, CenterShape>
  tension_any_of?: TensionClassification[]
  tension_none_of?: TensionClassification[]
  engagement_topics?: Record<string, EngagementClassification[]>
  exception_status_any_of?: Array<'coherent' | 'plausibly_coherent' | 'self_serving_risk' | 'unresolved'>
  clarification_keywords: string[]
}

export interface SyntheticAnalysisFixture {
  id: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H'
  slug: string
  title: string
  scenario: string
  user_context: string | null
  axes: SyntheticAxisFixture[]
  evidence: AIQuestionEvidence[]
  candidate_tensions: CandidateTension[]
  expected: SyntheticFixtureExpectations
}

interface EvidenceSeed {
  id: number
  text: string
  response: AIQuestionEvidence['response']
  axisId: string
  axisName: string
  questionType?: AIQuestionEvidence['question_type']
  axisKey?: -1 | 1
  weight?: number
  domain?: string
  itemFamily?: string
  scenario?: string
  collisionPair?: string
}

function evidence(seed: EvidenceSeed): AIQuestionEvidence {
  const axisKey = seed.axisKey ?? 1
  const weight = seed.weight ?? 1
  const signed = typeof seed.response === 'number' ? seed.response * axisKey : null
  return {
    question_id: seed.id,
    display_order: seed.id,
    bank_version: SYNTHETIC_BANK_VERSION,
    text: seed.text,
    question_type: seed.questionType ?? 'applied',
    response: seed.response,
    response_label: seed.response === null
      ? 'not_sure'
      : seed.response === -2
        ? 'strongly_disagree'
        : seed.response === -1
          ? 'disagree'
          : seed.response === 0
            ? 'neutral_balanced'
            : seed.response === 1
              ? 'agree'
              : 'strongly_agree',
    primary_axis_id: seed.axisId,
    primary_axis_name: seed.axisName,
    primary_axis_key: axisKey,
    primary_weight: weight,
    contribution_direction: signed === null
      ? 'unscored'
      : signed > 0
        ? 'positive_pole'
        : signed < 0
          ? 'negative_pole'
          : 'neutral',
    contribution_strength: signed === null ? 0 : Math.abs(seed.response as number) / 2 * weight,
    tradeoff_links: [],
    policy_domain: seed.domain ?? null,
    latent_conflict: null,
    actor_level: null,
    policy_instrument: null,
    scenario_conditions: seed.scenario ?? null,
    item_family: seed.itemFamily ?? null,
    collision_pair: seed.collisionPair ?? null
  }
}

const marketAxis: SyntheticAxisFixture = {
  axis_id: 'C1', name: 'Economic coordination', score: 0.72,
  conceptual_score: 0.82, applied_score: 0.51,
  pole_negative: 'Public coordination', pole_positive: 'Market coordination',
  coverage_confidence: 'high'
}

const speechAxis: SyntheticAxisFixture = {
  axis_id: 'L1', name: 'Expression and dissent', score: 0.58,
  conceptual_score: 0.91, applied_score: -0.18,
  pole_negative: 'Restricted expression', pole_positive: 'Protected expression',
  coverage_confidence: 'high'
}

const fixtures: SyntheticAnalysisFixture[] = [
  {
    id: 'A',
    slug: 'public-utility-domain-exception',
    title: 'Public-utility domain exception',
    scenario: 'Strong market commitments coexist with public electricity and nuclear infrastructure under a natural-monopoly rule.',
    user_context: 'Network monopolies with reliability obligations and unusually high fixed capital costs should be publicly owned or tightly public-controlled.',
    axes: [marketAxis],
    evidence: [
      evidence({ id: 9101, text: 'Private ownership should normally be preferred.', response: 2, axisId: 'C1', axisName: marketAxis.name, questionType: 'conceptual', domain: 'General economy', itemFamily: 'market_principle' }),
      evidence({ id: 9102, text: 'Competition normally allocates ordinary goods better than ministries.', response: 2, axisId: 'C1', axisName: marketAxis.name, questionType: 'conceptual', domain: 'General economy', itemFamily: 'market_principle' }),
      evidence({ id: 9103, text: 'The state should nationalize most competitive industries.', response: -2, axisId: 'C1', axisName: marketAxis.name, questionType: 'conceptual', axisKey: -1, domain: 'General economy', itemFamily: 'nationalization' }),
      evidence({ id: 9104, text: 'Entrepreneurs should retain ordinary business profits.', response: 2, axisId: 'C1', axisName: marketAxis.name, domain: 'General economy', itemFamily: 'market_principle' }),
      evidence({ id: 9105, text: 'A regional electric grid may be publicly owned where duplication is impractical.', response: 2, axisId: 'C1', axisName: marketAxis.name, axisKey: -1, domain: 'Energy infrastructure', itemFamily: 'network_utility', scenario: 'Natural monopoly and reliability obligation' }),
      evidence({ id: 9106, text: 'Public ownership can be justified for capital-intensive nuclear infrastructure.', response: 2, axisId: 'C1', axisName: marketAxis.name, axisKey: -1, domain: 'Energy infrastructure', itemFamily: 'network_utility', scenario: 'High fixed costs and national reliability' })
    ],
    candidate_tensions: [{
      candidate_id: 'fixture-a-utility-exception', source: 'domain_exception', axis_ids: ['C1'],
      question_ids: [9101, 9102, 9103, 9104, 9105, 9106], pair_ids: [], deterministic_strength: 0.75,
      coverage_confidence: 'high',
      factual_summary: 'Broad opposition to nationalization coexists with public ownership for network electricity and nuclear infrastructure under an explicit natural-monopoly and reliability rule.'
    }],
    expected: {
      tension_any_of: ['principled_domain_exception', 'coherent_tradeoff'],
      tension_none_of: ['possible_hypocrisy', 'likely_hypocrisy'],
      exception_status_any_of: ['coherent', 'plausibly_coherent'],
      clarification_keywords: ['water', 'transmission', 'rail', 'network']
    }
  },
  {
    id: 'B',
    slug: 'self-serving-utility-exception',
    title: 'Self-serving utility exception',
    scenario: 'The same broad market principle is abandoned only for the respondent\'s own industry while analogous monopoly arguments are rejected.',
    user_context: 'Public ownership should protect my industry and preserve our jobs; other utility sectors should remain private.',
    axes: [marketAxis],
    evidence: [
      evidence({ id: 9201, text: 'Private ownership should normally be preferred.', response: 2, axisId: 'C1', axisName: marketAxis.name, questionType: 'conceptual', domain: 'General economy', itemFamily: 'market_principle' }),
      evidence({ id: 9202, text: 'Government ownership usually weakens accountability.', response: 2, axisId: 'C1', axisName: marketAxis.name, questionType: 'conceptual', domain: 'General economy', itemFamily: 'market_principle' }),
      evidence({ id: 9203, text: 'The respondent\'s own electricity industry should be publicly owned.', response: 2, axisId: 'C1', axisName: marketAxis.name, axisKey: -1, domain: 'Energy infrastructure', itemFamily: 'own_industry', scenario: 'Respondent-associated industry' }),
      evidence({ id: 9204, text: 'Public guarantees should protect employment in the respondent\'s own electricity industry.', response: 2, axisId: 'C1', axisName: marketAxis.name, axisKey: -1, domain: 'Energy infrastructure', itemFamily: 'own_industry', scenario: 'Respondent-associated industry' }),
      evidence({ id: 9205, text: 'Water networks should be publicly owned when consumers cannot choose a competing network.', response: -2, axisId: 'C1', axisName: marketAxis.name, axisKey: -1, domain: 'Water infrastructure', itemFamily: 'analogous_network', scenario: 'Natural monopoly' }),
      evidence({ id: 9206, text: 'Rail infrastructure may be publicly owned where duplicate networks are impractical.', response: -2, axisId: 'C1', axisName: marketAxis.name, axisKey: -1, domain: 'Transport infrastructure', itemFamily: 'analogous_network', scenario: 'Natural monopoly' })
    ],
    candidate_tensions: [{
      candidate_id: 'fixture-b-self-serving-exception', source: 'domain_exception', axis_ids: ['C1'],
      question_ids: [9201, 9202, 9203, 9204, 9205, 9206], pair_ids: [], deterministic_strength: 0.85,
      coverage_confidence: 'high',
      factual_summary: 'Public ownership is supported for the respondent-associated industry but rejected for analogous water and rail networks; the supplied rationale emphasizes personal or employer benefit.'
    }],
    expected: {
      tension_any_of: ['selective_application', 'possible_hypocrisy'],
      tension_none_of: ['likely_hypocrisy'],
      exception_status_any_of: ['self_serving_risk'],
      clarification_keywords: ['same rule', 'analogous', 'water', 'rail']
    }
  },
  {
    id: 'C',
    slug: 'likely-free-speech-hypocrisy',
    title: 'Likely free-speech hypocrisy',
    scenario: 'Repeated universal speech commitments coexist with asymmetric censorship choices favoring allies over opponents.',
    user_context: null,
    axes: [speechAxis],
    evidence: [
      evidence({ id: 9301, text: 'Political speech should be protected regardless of viewpoint.', response: 2, axisId: 'L1', axisName: speechAxis.name, questionType: 'conceptual', domain: 'Speech principles', itemFamily: 'universal_speech' }),
      evidence({ id: 9302, text: 'The state must apply speech rules symmetrically to allies and opponents.', response: 2, axisId: 'L1', axisName: speechAxis.name, questionType: 'conceptual', domain: 'Speech principles', itemFamily: 'viewpoint_neutrality' }),
      evidence({ id: 9303, text: 'Authorities should ban a peaceful rally by ideological opponents.', response: 2, axisId: 'L1', axisName: speechAxis.name, axisKey: -1, domain: 'Public protest', itemFamily: 'opponent_rally', scenario: 'Opposing coalition' }),
      evidence({ id: 9304, text: 'Authorities should permit an equivalent peaceful rally by ideological allies.', response: 2, axisId: 'L1', axisName: speechAxis.name, domain: 'Public protest', itemFamily: 'ally_rally', scenario: 'Favored coalition' }),
      evidence({ id: 9305, text: 'A campus should suppress a lawful speaker aligned with ideological opponents.', response: 2, axisId: 'L1', axisName: speechAxis.name, axisKey: -1, domain: 'Campus speech', itemFamily: 'opponent_speaker', scenario: 'Opposing coalition' }),
      evidence({ id: 9306, text: 'A campus should protect an equivalent lawful speaker aligned with ideological allies.', response: 2, axisId: 'L1', axisName: speechAxis.name, domain: 'Campus speech', itemFamily: 'ally_speaker', scenario: 'Favored coalition' })
    ],
    candidate_tensions: [{
      candidate_id: 'fixture-c-speech-symmetry', source: 'controversy_stress', axis_ids: ['L1'],
      question_ids: [9301, 9302, 9303, 9304, 9305, 9306], pair_ids: [], deterministic_strength: 1,
      coverage_confidence: 'high',
      factual_summary: 'Two universal and symmetry principles coexist with repeated opponent censorship and equivalent ally protection across public-protest and campus-speech scenarios.'
    }],
    expected: {
      tension_any_of: ['possible_hypocrisy', 'likely_hypocrisy'],
      tension_none_of: ['principled_domain_exception'],
      clarification_keywords: ['same', 'oppos', 'symmetr', 'viewpoint']
    }
  },
  {
    id: 'D',
    slug: 'irrational-fiscal-package',
    title: 'Irrational fiscal package',
    scenario: 'Large universal guarantees are demanded while every broad financing mechanism and resource tradeoff is denied.',
    user_context: 'The guarantees have no meaningful resource cost, so no financing choice is required.',
    axes: [
      { axis_id: 'C2', name: 'Public guarantees', score: -0.74, conceptual_score: -0.81, applied_score: -0.68, pole_negative: 'Universal guarantees', pole_positive: 'Private provision', coverage_confidence: 'high' },
      { axis_id: 'F1', name: 'Fiscal constraints', score: 0.79, conceptual_score: 0.83, applied_score: 0.76, pole_negative: 'Flexible financing', pole_positive: 'Strict financing limits', coverage_confidence: 'high' }
    ],
    evidence: [
      evidence({ id: 9401, text: 'Government must guarantee expansive universal services.', response: 2, axisId: 'C2', axisName: 'Public guarantees', axisKey: -1, questionType: 'conceptual', domain: 'Public guarantees', itemFamily: 'guarantee_scope' }),
      evidence({ id: 9402, text: 'Universal guarantees must expand even when demand rises sharply.', response: 2, axisId: 'C2', axisName: 'Public guarantees', axisKey: -1, domain: 'Public guarantees', itemFamily: 'guarantee_scope' }),
      evidence({ id: 9403, text: 'Broad taxes may rise to finance universal guarantees.', response: -2, axisId: 'F1', axisName: 'Fiscal constraints', axisKey: -1, domain: 'Taxation', itemFamily: 'tax_financing' }),
      evidence({ id: 9404, text: 'Government may borrow to finance the guarantees.', response: -2, axisId: 'F1', axisName: 'Fiscal constraints', axisKey: -1, domain: 'Borrowing', itemFamily: 'debt_financing' }),
      evidence({ id: 9405, text: 'Monetary financing may cover the guarantees.', response: -2, axisId: 'F1', axisName: 'Fiscal constraints', axisKey: -1, domain: 'Monetary policy', itemFamily: 'monetary_financing' }),
      evidence({ id: 9406, text: 'Other public spending may be reduced to fund the guarantees.', response: -2, axisId: 'F1', axisName: 'Fiscal constraints', axisKey: -1, domain: 'Budget tradeoffs', itemFamily: 'spending_tradeoff' })
    ],
    candidate_tensions: [{
      candidate_id: 'fixture-d-fiscal-impossibility', source: 'collision_pair', axis_ids: ['C2', 'F1'],
      question_ids: [9401, 9402, 9403, 9404, 9405, 9406], pair_ids: [], deterministic_strength: 1,
      coverage_confidence: 'high',
      factual_summary: 'Expansive guarantees require resources, while taxation, borrowing, monetary financing, and spending tradeoffs are all rejected under the explicit premise that the guarantees have no cost.'
    }],
    expected: {
      tension_any_of: ['irrational_tension'],
      clarification_keywords: ['financ', 'resource', 'tax', 'tradeoff']
    }
  },
  {
    id: 'E',
    slug: 'counterbalanced-economic-center',
    title: 'Counterbalanced economic center',
    scenario: 'Strong market ownership commitments and strong redistribution commitments offset to a near-zero economic score.',
    user_context: null,
    axes: [{
      axis_id: 'C1', name: 'Economic coordination', score: 0.04,
      conceptual_score: 0.09, applied_score: -0.04,
      pole_negative: 'Public coordination', pole_positive: 'Market coordination',
      coverage_confidence: 'high'
    }],
    evidence: [
      evidence({ id: 9501, text: 'Private ownership should remain the default.', response: 2, axisId: 'C1', axisName: 'Economic coordination', questionType: 'conceptual', domain: 'Economic structure', itemFamily: 'ownership' }),
      evidence({ id: 9502, text: 'Profit signals are valuable for ordinary production.', response: 2, axisId: 'C1', axisName: 'Economic coordination', domain: 'Economic structure', itemFamily: 'profit' }),
      evidence({ id: 9503, text: 'Competitive entry should usually be allowed.', response: 2, axisId: 'C1', axisName: 'Economic coordination', domain: 'Economic structure', itemFamily: 'competition' }),
      evidence({ id: 9504, text: 'Substantial redistribution is needed to secure a social minimum.', response: 2, axisId: 'C1', axisName: 'Economic coordination', axisKey: -1, questionType: 'conceptual', domain: 'Economic structure', itemFamily: 'redistribution' }),
      evidence({ id: 9505, text: 'Public guarantees should correct unequal bargaining power.', response: 2, axisId: 'C1', axisName: 'Economic coordination', axisKey: -1, domain: 'Economic structure', itemFamily: 'public_guarantee' }),
      evidence({ id: 9506, text: 'High incomes should fund strong universal benefits.', response: 2, axisId: 'C1', axisName: 'Economic coordination', axisKey: -1, domain: 'Economic structure', itemFamily: 'redistribution' })
    ],
    candidate_tensions: [{
      candidate_id: 'fixture-e-counterbalance', source: 'axis_counterbalance', axis_ids: ['C1'],
      question_ids: [9501, 9502, 9503, 9504, 9505, 9506], pair_ids: [], deterministic_strength: 1,
      coverage_confidence: 'high',
      factual_summary: 'The near-center score is formed by equally strong convictions toward both economic poles rather than low-intensity answers.'
    }],
    expected: {
      deterministic_topics: { 'Economic structure': 'counterbalanced_convictions' },
      center_shapes: { C1: 'counterbalanced_center' },
      tension_none_of: ['possible_hypocrisy', 'likely_hypocrisy'],
      clarification_keywords: ['priorit', 'tradeoff', 'conflict']
    }
  },
  {
    id: 'F',
    slug: 'apparent-low-salience',
    title: 'Apparent low salience',
    scenario: 'Foreign-policy responses are predominantly numeric-neutral and low intensity with few not-sure answers, while another topic is strongly engaged.',
    user_context: null,
    axes: [
      { axis_id: 'G1', name: 'International posture', score: 0.03, conceptual_score: 0.02, applied_score: 0.04, pole_negative: 'Restraint', pole_positive: 'Activism', coverage_confidence: 'high' },
      speechAxis
    ],
    evidence: [
      evidence({ id: 9601, text: 'The country should intervene more often abroad.', response: 0, axisId: 'G1', axisName: 'International posture', domain: 'Foreign policy', itemFamily: 'intervention' }),
      evidence({ id: 9602, text: 'Military commitments should be reduced.', response: 0, axisId: 'G1', axisName: 'International posture', domain: 'Foreign policy', itemFamily: 'alliances' }),
      evidence({ id: 9603, text: 'Foreign aid should expand substantially.', response: 0, axisId: 'G1', axisName: 'International posture', domain: 'Foreign policy', itemFamily: 'aid' }),
      evidence({ id: 9604, text: 'Sanctions should be used more frequently.', response: 0, axisId: 'G1', axisName: 'International posture', domain: 'Foreign policy', itemFamily: 'sanctions' }),
      evidence({ id: 9605, text: 'Defense alliances generally improve security.', response: 1, axisId: 'G1', axisName: 'International posture', domain: 'Foreign policy', itemFamily: 'alliances' }),
      evidence({ id: 9606, text: 'Humanitarian intervention can sometimes be justified.', response: -1, axisId: 'G1', axisName: 'International posture', domain: 'Foreign policy', itemFamily: 'intervention' }),
      evidence({ id: 9607, text: 'Civil liberties should constrain government even during controversy.', response: 2, axisId: 'L1', axisName: 'Expression and dissent', questionType: 'conceptual', domain: 'Civil liberties', itemFamily: 'liberty' }),
      evidence({ id: 9608, text: 'Peaceful dissent should be protected.', response: 2, axisId: 'L1', axisName: 'Expression and dissent', domain: 'Civil liberties', itemFamily: 'speech' }),
      evidence({ id: 9609, text: 'Due process should survive political pressure.', response: 2, axisId: 'L1', axisName: 'Expression and dissent', domain: 'Civil liberties', itemFamily: 'due_process' }),
      evidence({ id: 9610, text: 'Viewpoint discrimination should be rejected.', response: 2, axisId: 'L1', axisName: 'Expression and dissent', domain: 'Civil liberties', itemFamily: 'speech' })
    ],
    candidate_tensions: [{
      candidate_id: 'fixture-f-low-salience', source: 'topic_engagement', axis_ids: ['G1'],
      question_ids: [9601, 9602, 9603, 9604, 9605, 9606], pair_ids: [], deterministic_strength: 0.83,
      coverage_confidence: 'medium',
      factual_summary: 'Foreign-policy responses are mostly numeric neutral with low mean intensity and no not-sure pattern, while civil-liberties responses are intense.'
    }],
    expected: {
      deterministic_topics: { 'Foreign policy': 'apparent_low_salience', 'Civil liberties': 'strongly_engaged' },
      center_shapes: { G1: 'low_intensity_center' },
      tension_none_of: ['possible_hypocrisy', 'likely_hypocrisy'],
      engagement_topics: { 'Foreign policy': ['apparent_low_salience'] },
      clarification_keywords: ['interest', 'balance', 'salience', 'priority']
    }
  },
  {
    id: 'G',
    slug: 'possible-knowledge-gap',
    title: 'Possible knowledge gap',
    scenario: 'Not-sure responses cluster in monetary and international-law topics while another topic receives strong numeric answers.',
    user_context: null,
    axes: [
      { axis_id: 'M1', name: 'Monetary institutions', score: 0.01, conceptual_score: null, applied_score: 0.01, pole_negative: 'Discretion', pole_positive: 'Rules', coverage_confidence: 'moderate' },
      { axis_id: 'G2', name: 'International legal order', score: 0.08, conceptual_score: null, applied_score: 0.08, pole_negative: 'Sovereign discretion', pole_positive: 'Binding international law', coverage_confidence: 'low' },
      speechAxis
    ],
    evidence: [
      evidence({ id: 9701, text: 'The central bank should target nominal income.', response: null, axisId: 'M1', axisName: 'Monetary institutions', domain: 'Monetary policy', itemFamily: 'central_bank' }),
      evidence({ id: 9702, text: 'Interest on reserves changes monetary transmission.', response: null, axisId: 'M1', axisName: 'Monetary institutions', domain: 'Monetary policy', itemFamily: 'transmission' }),
      evidence({ id: 9703, text: 'A fixed money-growth rule is preferable.', response: null, axisId: 'M1', axisName: 'Monetary institutions', domain: 'Monetary policy', itemFamily: 'monetary_rule' }),
      evidence({ id: 9704, text: 'Emergency lending should be rules-bound.', response: null, axisId: 'M1', axisName: 'Monetary institutions', domain: 'Monetary policy', itemFamily: 'lender_of_last_resort' }),
      evidence({ id: 9705, text: 'Central-bank independence should be protected.', response: 2, axisId: 'M1', axisName: 'Monetary institutions', domain: 'Monetary policy', itemFamily: 'central_bank' }),
      evidence({ id: 9706, text: 'Price stability matters for long contracts.', response: 1, axisId: 'M1', axisName: 'Monetary institutions', domain: 'Monetary policy', itemFamily: 'inflation' }),
      evidence({ id: 9707, text: 'Treaty obligations should bind governments absent withdrawal.', response: null, axisId: 'G2', axisName: 'International legal order', domain: 'International law', itemFamily: 'treaties' }),
      evidence({ id: 9708, text: 'Customary international law can bind without ratification.', response: null, axisId: 'G2', axisName: 'International legal order', domain: 'International law', itemFamily: 'custom' }),
      evidence({ id: 9709, text: 'International courts should have compulsory jurisdiction.', response: null, axisId: 'G2', axisName: 'International legal order', domain: 'International law', itemFamily: 'courts' }),
      evidence({ id: 9710, text: 'Domestic courts should enforce self-executing treaties.', response: 1, axisId: 'G2', axisName: 'International legal order', domain: 'International law', itemFamily: 'treaties' }),
      evidence({ id: 9711, text: 'Peaceful political speech deserves strong protection.', response: 2, axisId: 'L1', axisName: 'Expression and dissent', domain: 'Civil liberties', itemFamily: 'speech' }),
      evidence({ id: 9712, text: 'Due process should constrain emergency power.', response: 2, axisId: 'L1', axisName: 'Expression and dissent', domain: 'Civil liberties', itemFamily: 'due_process' }),
      evidence({ id: 9713, text: 'Viewpoint-neutral rules are essential.', response: 2, axisId: 'L1', axisName: 'Expression and dissent', domain: 'Civil liberties', itemFamily: 'speech' }),
      evidence({ id: 9714, text: 'Courts should review detention decisions.', response: 2, axisId: 'L1', axisName: 'Expression and dissent', domain: 'Civil liberties', itemFamily: 'due_process' })
    ],
    candidate_tensions: [{
      candidate_id: 'fixture-g-knowledge-gap', source: 'topic_engagement', axis_ids: ['M1'],
      question_ids: [9701, 9702, 9703, 9704, 9705, 9706], pair_ids: [], deterministic_strength: 0.67,
      coverage_confidence: 'medium',
      factual_summary: 'Not-sure answers dominate technical monetary-policy distinctions despite strong engagement elsewhere.'
    }],
    expected: {
      deterministic_topics: { 'Monetary policy': 'possible_knowledge_gap', 'International law': 'possible_knowledge_gap', 'Civil liberties': 'strongly_engaged' },
      center_shapes: { M1: 'uncertain_center' },
      tension_none_of: ['possible_hypocrisy', 'likely_hypocrisy'],
      engagement_topics: {
        'Monetary policy': ['possible_knowledge_gap'],
        'International law': ['possible_knowledge_gap']
      },
      clarification_keywords: ['information', 'knowledge', 'uncertain', 'familiar']
    }
  },
  {
    id: 'H',
    slug: 'ambivalence-or-avoidance',
    title: 'Ambivalence or avoidance',
    scenario: 'Strong conceptual and ordinary applied commitments become selectively neutral on overt controversy-stress items, without a not-sure pattern.',
    user_context: null,
    axes: [speechAxis],
    evidence: [
      evidence({ id: 9801, text: 'Speech rules must be viewpoint neutral.', response: 2, axisId: 'L1', axisName: speechAxis.name, questionType: 'conceptual', domain: 'Civil liberties', itemFamily: 'speech_principle' }),
      evidence({ id: 9802, text: 'Peaceful dissent should be protected even when unpopular.', response: 2, axisId: 'L1', axisName: speechAxis.name, questionType: 'conceptual', domain: 'Civil liberties', itemFamily: 'speech_principle' }),
      evidence({ id: 9803, text: 'A routine permit should not depend on viewpoint.', response: 2, axisId: 'L1', axisName: speechAxis.name, domain: 'Civil liberties', itemFamily: 'ordinary_application' }),
      evidence({ id: 9804, text: 'A newspaper should not lose legal protection for criticizing officials.', response: 2, axisId: 'L1', axisName: speechAxis.name, domain: 'Civil liberties', itemFamily: 'ordinary_application' }),
      evidence({ id: 9805, text: 'An incendiary but lawful opponent rally should be permitted.', response: 0, axisId: 'L1', axisName: speechAxis.name, domain: 'Civil liberties', itemFamily: 'controversy_stress', scenario: 'Overt partisan controversy' }),
      evidence({ id: 9806, text: 'An incendiary but lawful allied rally should be permitted.', response: 0, axisId: 'L1', axisName: speechAxis.name, domain: 'Civil liberties', itemFamily: 'controversy_stress', scenario: 'Overt partisan controversy' }),
      evidence({ id: 9807, text: 'A deeply offensive lawful campus speaker should be allowed.', response: 0, axisId: 'L1', axisName: speechAxis.name, domain: 'Civil liberties', itemFamily: 'controversy_stress', scenario: 'Overt cultural controversy' }),
      evidence({ id: 9808, text: 'A lawful protest against a personally important cause should be allowed.', response: 0, axisId: 'L1', axisName: speechAxis.name, domain: 'Civil liberties', itemFamily: 'controversy_stress', scenario: 'Overt cultural controversy' })
    ],
    candidate_tensions: [{
      candidate_id: 'fixture-h-controversy-neutrality', source: 'controversy_stress', axis_ids: ['L1'],
      question_ids: [9801, 9802, 9803, 9804, 9805, 9806, 9807, 9808], pair_ids: [], deterministic_strength: 0.8,
      coverage_confidence: 'high',
      factual_summary: 'Four controversy-stress items are neutral while conceptual and noncontroversial applied commitments on the same axis are strong; not-sure usage is zero.'
    }],
    expected: {
      tension_none_of: ['likely_hypocrisy'],
      engagement_topics: { 'Civil liberties': ['possible_avoidance_or_ambivalence'] },
      clarification_keywords: ['discomfort', 'ambivalence', 'tradeoff', 'moderation']
    }
  }
]

export const syntheticFixtures: readonly SyntheticAnalysisFixture[] = fixtures

export function getSyntheticFixture(id: SyntheticAnalysisFixture['id']): SyntheticAnalysisFixture {
  const fixture = fixtures.find(item => item.id === id)
  if (!fixture) throw new Error(`Unknown synthetic fixture ${id}`)
  return fixture
}
