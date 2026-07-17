export type Confidence = 'low' | 'medium' | 'high'

export type TensionClassification =
  | 'principled_domain_exception'
  | 'coherent_tradeoff'
  | 'context_dependent_preference'
  | 'unresolved_inconsistency'
  | 'selective_application'
  | 'possible_hypocrisy'
  | 'likely_hypocrisy'
  | 'irrational_tension'
  | 'insufficient_evidence'

export type EngagementClassification =
  | 'strongly_engaged'
  | 'selectively_engaged'
  | 'genuinely_moderate'
  | 'counterbalanced_convictions'
  | 'context_dependent'
  | 'apparent_low_salience'
  | 'possible_knowledge_gap'
  | 'possible_avoidance_or_ambivalence'
  | 'insufficient_evidence'

export type CenterShape =
  | 'not_center'
  | 'low_intensity_center'
  | 'counterbalanced_center'
  | 'contextual_center'
  | 'uncertain_center'
  | 'insufficient_evidence'

export interface AIQuestionEvidence {
  question_id: number
  display_order: number
  bank_version: string
  text: string
  question_type: 'conceptual' | 'applied'
  response: -2 | -1 | 0 | 1 | 2 | null
  response_label: 'strongly_disagree' | 'disagree' | 'neutral_balanced' | 'agree' | 'strongly_agree' | 'not_sure'
  primary_axis_id: string
  primary_axis_name: string
  primary_axis_key: -1 | 1
  primary_weight: number
  contribution_direction: 'negative_pole' | 'positive_pole' | 'neutral' | 'unscored'
  contribution_strength: number
  tradeoff_links: Array<{ axis_id: string; axis_name: string; axis_key: -1 | 1 }>
  policy_domain: string | null
  latent_conflict: string | null
  actor_level: string | null
  policy_instrument: string | null
  scenario_conditions: string | null
  item_family: string | null
  collision_pair: string | null
}

export type AIQuestionDisplayEvidence = Pick<
  AIQuestionEvidence,
  | 'question_id'
  | 'display_order'
  | 'text'
  | 'response_label'
  | 'primary_axis_id'
  | 'primary_axis_name'
  | 'contribution_direction'
  | 'policy_domain'
>

export interface TopicSignal {
  topic: string
  total_items: number
  recorded_items: number
  numeric_items: number
  not_sure_items: number
  neutral_items: number
  directional_items: number
  strong_items: number
  coverage: number
  not_sure_rate: number
  neutral_rate_among_numeric: number
  mean_intensity: number
  strong_rate_among_numeric: number
  negative_pole_share: number
  positive_pole_share: number
  net_primary_contribution: number
  classification: EngagementClassification
  confidence: Confidence
  supporting_question_ids: number[]
}

export interface AxisCenterSignal {
  axis_id: string
  shape: CenterShape
  coverage_confidence: Confidence
  mean_intensity: number
  neutral_rate: number
  not_sure_rate: number
  negative_share: number
  positive_share: number
  question_ids: number[]
}

export interface CandidateTension {
  candidate_id: string
  source: 'conceptual_applied_gap' | 'collision_pair' | 'axis_counterbalance' | 'domain_exception' | 'controversy_stress' | 'topic_engagement'
  axis_ids: string[]
  question_ids: number[]
  pair_ids: string[]
  factual_summary: string
  deterministic_strength: number
  coverage_confidence: Confidence
}

export interface PersonalizedAnalysisInput {
  schema_version: '1'
  prompt_version: string
  bank_version: string | null
  profile: {
    core_axes: AnalysisAxisInput[]
    facets: AnalysisAxisInput[]
    archetypes: Array<{ id: string; name: string; affinity: number; description: string }>
  }
  response_summary: { total_questions: number; recorded: number; numeric: number; neutral: number; not_sure: number }
  topic_signals: TopicSignal[]
  candidate_tensions: CandidateTension[]
  collision_pairs: Array<{
    pair_id: string
    classification: string
    direction: number
    shared_value: string
    shared_axis_id: string
    opposing_axis_ids: string[]
    narrative: string
    probes_answered: number
    contradicts_ideals: boolean
    evidence_question_ids: number[]
  }>
  questions: AIQuestionEvidence[]
  user_context: {
    general_context: string | null
    clarification_answers: Array<{ clarification_id: string; answer: string }>
  } | null
}

export interface AnalysisAxisInput {
  axis_id: string
  name: string
  score: number
  pole_negative: string
  pole_positive: string
  favored_pole: string
  coverage: number
  confidence: 'high' | 'moderate' | 'low' | 'insufficient'
  conceptual_score: number | null
  applied_score: number | null
  center_shape: CenterShape
}

export interface PersonalizedAnalysis {
  schema_version: '1'
  analysis_stage: 'provisional' | 'refined'
  headline: string
  executive_summary: string
  overall_assessment: {
    ideological_coherence: 'high' | 'mostly_coherent' | 'mixed' | 'significant_unresolved_tensions' | 'insufficient_evidence'
    engagement: 'strongly_engaged' | 'selectively_engaged' | 'broadly_moderate' | 'apparent_low_salience' | 'uncertain'
    candor_summary: string
    confidence: Confidence
  }
  defining_commitments: Array<{ title: string; analysis: string; axis_ids: string[]; question_ids: number[]; confidence: Confidence }>
  center_explanations: Array<{ axis_id: string; shape: CenterShape; analysis: string; question_ids: number[] }>
  tensions: Array<{
    tension_id: string
    classification: TensionClassification
    severity: 1 | 2 | 3 | 4 | 5
    confidence: Confidence
    title: string
    verdict: string
    principle_or_commitment: string
    conflicting_pattern: string
    why_it_may_be_coherent: string[]
    why_it_may_be_incoherent: string[]
    generalization_test: string
    axis_ids: string[]
    question_ids: number[]
    pair_ids: string[]
    clarifying_question_id: string | null
  }>
  engagement_and_knowledge: {
    overall_analysis: string
    topics: Array<{ topic: string; classification: EngagementClassification; confidence: Confidence; analysis: string; alternative_explanations: string[]; question_ids: number[] }>
  }
  domain_specific_exceptions: Array<{
    title: string
    status: 'coherent' | 'plausibly_coherent' | 'self_serving_risk' | 'unresolved'
    analysis: string
    generalizable_rule: string | null
    analogous_case_test: string
    axis_ids: string[]
    question_ids: number[]
  }>
  blind_spots: Array<{ title: string; analysis: string; confidence: Confidence; question_ids: number[] }>
  clarifying_questions: Array<{ clarification_id: string; question: string; why_it_matters: string; related_tension_ids: string[] }>
  reflection_questions: string[]
  limitations: string[]
}

export interface AnalysisRecordMeta {
  id: string
  stage: 'provisional' | 'refined'
  provider: 'openai' | 'anthropic'
  model: string
  prompt_version: string
  schema_version: string
  bank_version: string | null
  created_at: string
  completed_at: string | null
}

export interface GetAIAnalysisResponse {
  enabled: boolean
  analysis: PersonalizedAnalysis | null
  record: AnalysisRecordMeta | null
  versions?: Array<{ analysis: PersonalizedAnalysis; record: AnalysisRecordMeta }>
  stale: boolean
  can_generate: boolean
  remaining_generations: number
}
