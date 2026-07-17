export function makeEvidence({
  id,
  response = 2,
  axisId = 'A1',
  axisKey = 1,
  bankVersion = 'v2.2',
  questionType = 'applied',
  domain = 'Test domain',
  family = `family-${id}`,
  collisionPair = null,
  latentConflict = null,
  scenario = null
}) {
  const signed = typeof response === 'number' ? response * axisKey : null
  return {
    question_id: id,
    display_order: id,
    bank_version: bankVersion,
    text: `Synthetic question ${id}`,
    question_type: questionType,
    response,
    response_label: response === null
      ? 'not_sure'
      : response === -2
        ? 'strongly_disagree'
        : response === -1
          ? 'disagree'
          : response === 0
            ? 'neutral_balanced'
            : response === 1
              ? 'agree'
              : 'strongly_agree',
    primary_axis_id: axisId,
    primary_axis_name: `Axis ${axisId}`,
    primary_axis_key: axisKey,
    primary_weight: 1,
    contribution_direction: signed === null
      ? 'unscored'
      : signed > 0
        ? 'positive_pole'
        : signed < 0
          ? 'negative_pole'
          : 'neutral',
    contribution_strength: signed === null ? 0 : Math.abs(response) / 2,
    tradeoff_links: [],
    policy_domain: domain,
    latent_conflict: latentConflict,
    actor_level: null,
    policy_instrument: null,
    scenario_conditions: scenario,
    item_family: family,
    collision_pair: collisionPair
  }
}

export function makeCoverage(axisId, evidence, confidence = 'high') {
  const primary = evidence.filter(item => item.primary_axis_id === axisId)
  const numeric = primary.filter(item => typeof item.response === 'number')
  return {
    axis_id: axisId,
    answered_primary_items: numeric.length,
    available_primary_items: primary.length,
    answered_weight: numeric.length,
    available_weight: primary.length,
    coverage: primary.length === 0 ? 0 : numeric.length / primary.length,
    confidence
  }
}

export function makeInput({
  questions,
  bankVersion = 'v2.2',
  axes = ['A1'],
  pairs = [],
  topics = []
}) {
  return {
    schema_version: '1',
    prompt_version: 'v1',
    bank_version: bankVersion,
    profile: {
      core_axes: axes.map(axisId => ({
        axis_id: axisId,
        name: `Axis ${axisId}`,
        score: 0.4,
        pole_negative: 'Negative',
        pole_positive: 'Positive',
        favored_pole: 'Positive',
        coverage: 1,
        confidence: 'high',
        conceptual_score: 0.8,
        applied_score: 0.2,
        center_shape: 'not_center'
      })),
      facets: [],
      archetypes: []
    },
    response_summary: {
      total_questions: questions.length,
      recorded: questions.length,
      numeric: questions.filter(question => typeof question.response === 'number').length,
      neutral: questions.filter(question => question.response === 0).length,
      not_sure: questions.filter(question => question.response === null).length
    },
    topic_signals: topics,
    candidate_tensions: [],
    collision_pairs: pairs.map(pairId => ({
      pair_id: pairId,
      classification: 'cross_pressured',
      direction: 0,
      shared_value: 'Shared value',
      shared_axis_id: axes[0],
      opposing_axis_ids: axes.slice(1),
      narrative: 'Synthetic collision.',
      probes_answered: 2,
      contradicts_ideals: true,
      evidence_question_ids: questions
        .filter(question => question.collision_pair === pairId)
        .map(question => question.question_id)
    })),
    questions,
    user_context: null
  }
}

export function makeAnalysis(tension = null) {
  return {
    schema_version: '1',
    analysis_stage: 'provisional',
    headline: 'Synthetic analysis',
    executive_summary: 'A deliberately synthetic evidence-validation report.',
    overall_assessment: {
      ideological_coherence: 'mixed',
      engagement: 'strongly_engaged',
      candor_summary: 'The evidence is mixed.',
      confidence: 'medium'
    },
    defining_commitments: [1, 2, 3].map(index => ({
      title: `Commitment ${index}`,
      analysis: 'A supported synthetic commitment.',
      axis_ids: [],
      question_ids: [],
      confidence: 'medium'
    })),
    center_explanations: [],
    tensions: tension ? [makeTension(tension)] : [],
    engagement_and_knowledge: {
      overall_analysis: 'No topic claim is needed for this validator test.',
      topics: []
    },
    domain_specific_exceptions: [],
    blind_spots: [],
    clarifying_questions: [],
    reflection_questions: ['What would change this view?', 'Would the same rule apply symmetrically?', 'Which value has priority?'],
    limitations: ['Synthetic evidence only.', 'No personal inference is made.']
  }
}

function makeTension(overrides) {
  return {
    tension_id: 'tension-1',
    classification: 'unresolved_inconsistency',
    severity: 3,
    confidence: 'medium',
    title: 'Synthetic tension',
    verdict: 'The commitments may conflict.',
    principle_or_commitment: 'A general principle is asserted.',
    conflicting_pattern: 'Applied choices appear to depart from it.',
    why_it_may_be_coherent: ['A relevant distinction could reconcile the pattern.'],
    why_it_may_be_incoherent: ['No such distinction is yet evident.'],
    generalization_test: 'Would the same rule apply to an analogous opposing case?',
    axis_ids: ['A1'],
    question_ids: [],
    pair_ids: [],
    clarifying_question_id: null,
    ...overrides
  }
}
