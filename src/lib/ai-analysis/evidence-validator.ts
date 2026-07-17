import type { PersonalizedAnalysis, PersonalizedAnalysisInput } from './types'
import { isSelectivelyEngaged, SIGNAL_THRESHOLDS } from './signals'

export interface EvidenceValidationResult {
  valid: boolean
  errors: string[]
}

export function validateAnalysisEvidence(analysis: PersonalizedAnalysis, input: PersonalizedAnalysisInput): EvidenceValidationResult {
  const errors: string[] = []
  const axisById = new Map([...input.profile.core_axes, ...input.profile.facets].map(a => [a.axis_id, a]))
  const axes = new Set(axisById.keys())
  const questions = new Map(input.questions.map(q => [q.question_id, q]))
  const pairs = new Set(input.collision_pairs.map(p => p.pair_id))
  const topics = new Map(input.topic_signals.map(t => [t.topic, t]))

  const checkAxes = (ids: string[], path: string) => ids.forEach(id => { if (!axes.has(id)) errors.push(`${path}: nonexistent axis ${id}`) })
  const checkPairs = (ids: string[], path: string) => ids.forEach(id => { if (!pairs.has(id)) errors.push(`${path}: nonexistent collision pair ${id}`) })
  const checkQuestions = (ids: number[], path: string, axisIds: string[] = [], pairIds: string[] = []) => {
    if (new Set(ids).size !== ids.length) errors.push(`${path}: duplicate question IDs are not independent evidence`)
    if (new Set(axisIds).size !== axisIds.length) errors.push(`${path}: duplicate axis IDs are not independent evidence`)
    if (new Set(pairIds).size !== pairIds.length) errors.push(`${path}: duplicate pair IDs are not independent evidence`)
    const citedQuestions = ids.map(id => questions.get(id)).filter((q): q is NonNullable<typeof q> => !!q)
    ids.forEach(id => {
    const q = questions.get(id)
    if (!q) { errors.push(`${path}: nonexistent or wrong-bank question ${id}`); return }
    if (q.bank_version !== input.bank_version && input.bank_version !== null) errors.push(`${path}: question ${id} is from bank ${q.bank_version}`)
    if (axisIds.length || pairIds.length) {
      const relatedAxis = axisIds.includes(q.primary_axis_id) || q.tradeoff_links.some(l => axisIds.includes(l.axis_id))
      const relatedPair = pairIds.some(pairId => {
        const [a, b] = pairId.split('|')
        const linkedAxes = new Set([q.primary_axis_id, ...q.tradeoff_links.map(link => link.axis_id)])
        return linkedAxes.has(a) && linkedAxes.has(b)
      })
      if (!relatedAxis && !relatedPair) errors.push(`${path}: question ${id} is not relevant to the cited axes or pair`)
    }
    })
    axisIds.forEach(axisId => {
      if (!citedQuestions.some(question => questionAxes(question).has(axisId))) {
        errors.push(`${path}: cited axis ${axisId} has no supporting question evidence`)
      }
    })
    pairIds.forEach(pairId => {
      const [a, b] = pairId.split('|')
      if (!citedQuestions.some(question => {
        const linked = questionAxes(question)
        return linked.has(a) && linked.has(b)
      })) errors.push(`${path}: cited pair ${pairId} has no mirrored question evidence`)
    })
  }
  const axisIsUnreliable = (axisId: string) => {
    const axis = axisById.get(axisId)
    return !!axis && (axis.coverage < 0.5 || axis.confidence === 'insufficient')
  }
  const selectiveProfile = isSelectivelyEngaged(input.topic_signals)
  if (analysis.overall_assessment.engagement === 'selectively_engaged' && !selectiveProfile) {
    errors.push('overall_assessment: selectively_engaged requires two strongly engaged and two low-salience or knowledge-gap topics')
  }
  if (selectiveProfile && analysis.overall_assessment.engagement !== 'selectively_engaged') {
    errors.push('overall_assessment: deterministic profile is selectively_engaged')
  }

  analysis.defining_commitments.forEach((item, i) => {
    const path = `defining_commitments[${i}]`; checkAxes(item.axis_ids, path); checkQuestions(item.question_ids, path, item.axis_ids)
    if (item.axis_ids.length === 0 || item.question_ids.length === 0) {
      errors.push(`${path}: defining commitments require a cited axis and relevant question evidence`)
    }
    if (item.confidence === 'high' && item.axis_ids.some(axisIsUnreliable)) {
      errors.push(`${path}: insufficient scorer reliability cannot support a high-confidence defining commitment`)
    }
  })
  analysis.center_explanations.forEach((item, i) => {
    const path = `center_explanations[${i}]`; checkAxes([item.axis_id], path); checkQuestions(item.question_ids, path, [item.axis_id])
    if (item.question_ids.length === 0) errors.push(`${path}: center explanations require cited question evidence`)
    const source = axisById.get(item.axis_id)
    if (source?.center_shape === 'not_center') errors.push(`${path}: axis is not near center`)
    if (source && item.shape !== source.center_shape) errors.push(`${path}: shape must match deterministic classification ${source.center_shape}`)
  })
  const expectedCenterAxes = [...axisById.values()]
    .filter(axis => axis.center_shape !== 'not_center')
    .map(axis => axis.axis_id)
  const explainedCenterAxes = analysis.center_explanations.map(item => item.axis_id)
  if (new Set(explainedCenterAxes).size !== explainedCenterAxes.length) {
    errors.push('center_explanations: each near-center axis must be explained exactly once')
  }
  expectedCenterAxes.forEach(axisId => {
    if (explainedCenterAxes.filter(candidate => candidate === axisId).length !== 1) {
      errors.push(`center_explanations: near-center axis ${axisId} must be explained exactly once`)
    }
  })
  analysis.tensions.forEach((item, i) => {
    const path = `tensions[${i}]`; checkAxes(item.axis_ids, path); checkPairs(item.pair_ids, path); checkQuestions(item.question_ids, path, item.axis_ids, item.pair_ids)
    if (item.classification !== 'insufficient_evidence' && item.axis_ids.length === 0 && item.pair_ids.length === 0) {
      errors.push(`${path}: a substantive tension requires a cited axis or collision pair`)
    }
    if (item.classification !== 'insufficient_evidence' && item.question_ids.length === 0) {
      errors.push(`${path}: a substantive tension requires cited question evidence`)
    }
    const uniqueQuestionIds = [...new Set(item.question_ids)]
    const evidence = uniqueQuestionIds.map(id => questions.get(id)).filter((q): q is NonNullable<typeof q> => !!q)
    const findingAxisIds = [...new Set([...item.axis_ids, ...item.pair_ids.flatMap(pair => pair.split('|'))])]
    if (item.classification === 'likely_hypocrisy') {
      const conceptual = evidence.filter(q => q.question_type === 'conceptual')
      const applied = evidence.filter(q => q.question_type === 'applied' || q.item_family === 'collision')
      const families = new Set(evidence.map(q => q.item_family).filter(Boolean))
      const domains = new Set(evidence.map(q => q.policy_domain).filter(Boolean))
      const scenarios = new Set(evidence.map(q => q.scenario_conditions).filter(Boolean))
      if (uniqueQuestionIds.length < 4) errors.push(`${path}: likely_hypocrisy requires at least four evidence questions, all independent`)
      if (conceptual.length < 2) errors.push(`${path}: likely_hypocrisy requires two independent conceptual/general-policy items`)
      if (applied.length < 2) errors.push(`${path}: likely_hypocrisy requires two independent applied/collision items`)
      if (!hasHypocrisyPattern(evidence, findingAxisIds, 2)) {
        errors.push(`${path}: likely_hypocrisy requires two aligned principle items and two directionally opposing applications on a cited axis`)
      }
      if (families.size < 2 && domains.size < 2 && scenarios.size < 2) {
        errors.push(`${path}: likely_hypocrisy requires multiple item families, scenarios, or policy domains`)
      }
      if (domains.size < 2) {
        const qualifyingPairs = new Set(item.pair_ids.filter(pairId => {
          const pair = input.collision_pairs.find(candidate => candidate.pair_id === pairId)
          return pair?.classification === 'cross_pressured' || pair?.contradicts_ideals === true
        }))
        const mirroredEvidence = evidence.filter(question => [...qualifyingPairs].some(pairId => {
          const [a, b] = pairId.split('|')
          const linkedAxes = new Set([question.primary_axis_id, ...question.tradeoff_links.map(link => link.axis_id)])
          return linkedAxes.has(a) && linkedAxes.has(b)
        }))
        if (qualifyingPairs.size === 0 || mirroredEvidence.length < 2) {
          errors.push(`${path}: one-domain likely_hypocrisy requires repeated cross-pressured or ideal-contradicting mirrored collision evidence`)
        }
      }
      if (item.confidence !== 'high') errors.push(`${path}: likely_hypocrisy requires high confidence`)
      if (item.why_it_may_be_coherent.length === 0 || !item.generalization_test.trim()) errors.push(`${path}: likely_hypocrisy must analyze coherent exceptions and symmetry`)
    }
    if (item.classification === 'possible_hypocrisy') {
      const stronglyEndorsedPrinciples = evidence.filter(q =>
        q.question_type === 'conceptual' && typeof q.response === 'number' && Math.abs(q.response) === 2
      )
      const applied = evidence.filter(q => q.question_type === 'applied')
      const pattern = hasHypocrisyPattern(evidence, findingAxisIds, 1)
      if (stronglyEndorsedPrinciples.length < 1 || applied.length < 2 || !pattern || item.confidence === 'low') {
        errors.push(`${path}: possible_hypocrisy requires a strongly endorsed broad principle, repeated applied evidence, and medium confidence`)
      }
      if (findingAxisIds.some(axisIsUnreliable)) {
        errors.push(`${path}: possible_hypocrisy requires at least medium scorer reliability on every cited axis`)
      }
    }
    if (item.classification === 'selective_application') {
      const applications = evidence.filter(question =>
        question.question_type === 'applied' || question.item_family === 'collision'
      )
      const candidate = findSupportingCandidate(input, item.axis_ids, item.question_ids, item.pair_ids, [
        'conceptual_applied_gap', 'collision_pair', 'domain_exception', 'controversy_stress'
      ])
      if (applications.length < 2 || !candidate || !hasSelectiveApplicationPattern(evidence, findingAxisIds, input)) {
        errors.push(`${path}: selective_application requires repeated directionally uneven applied or collision evidence and a matching deterministic candidate`)
      }
    }
    if (item.classification === 'irrational_tension') {
      if (item.question_ids.length < 2 || new Set(item.question_ids).size < 2) errors.push(`${path}: irrational_tension requires two independent commitments`)
      if (!item.principle_or_commitment.trim() || !item.conflicting_pattern.trim()) errors.push(`${path}: irrational_tension must state incompatible premises`)
      const candidate = findSupportingCandidate(input, item.axis_ids, item.question_ids, item.pair_ids, ['collision_pair'])
      const supportedAxes = findingAxisIds.filter(axisId =>
        evidence.some(question => directionOnAxis(question, axisId) !== null && directionOnAxis(question, axisId) !== 0)
      )
      if (
        !candidate || candidate.deterministic_strength < 0.75 || candidate.coverage_confidence === 'low' ||
        new Set(supportedAxes).size < 2
      ) {
        errors.push(`${path}: irrational_tension requires a strong deterministic incompatibility candidate with independently supported commitments`)
      }
    }
    for (const axisId of findingAxisIds) {
      if (axisIsUnreliable(axisId) && item.confidence === 'high') {
        errors.push(`${path}: low-coverage axis ${axisId} or insufficient scorer confidence cannot support a definitive high-confidence finding`)
      }
    }
  })
  analysis.engagement_and_knowledge.topics.forEach((item, i) => {
    const path = `engagement_and_knowledge.topics[${i}]`
    checkQuestions(item.question_ids, path)
    if (item.classification === 'possible_avoidance_or_ambivalence') {
      const candidate = input.candidate_tensions.find(candidate =>
        candidate.source === 'controversy_stress' && candidate.candidate_id === `avoidance:${item.topic}`
      )
      if (!candidate) {
        errors.push(`${path}: avoidance or ambivalence requires a deterministic review candidate`)
        return
      }
      const supporting = new Set(candidate.question_ids)
      item.question_ids.forEach(id => {
        if (questions.has(id) && !supporting.has(id)) {
          errors.push(`${path}: question ${id} is not support for avoidance candidate ${item.topic}`)
        }
      })
      if (item.question_ids.length === 0) errors.push(`${path}: topic findings require cited evidence`)
      if (item.confidence === 'high' && candidate.coverage_confidence !== 'high') {
        errors.push(`${path}: topic confidence exceeds deterministic candidate confidence`)
      }
      return
    }
    const signal = topics.get(item.topic)
    if (!signal) { errors.push(`${path}: nonexistent deterministic topic ${item.topic}`); return }
    if (item.question_ids.length === 0) errors.push(`${path}: topic findings require cited evidence`)
    item.question_ids.forEach(id => {
      const question = questions.get(id)
      if (question && question.policy_domain !== item.topic) {
        errors.push(`${path}: question ${id} is not evidence for topic ${item.topic}`)
      }
    })
    const supporting = new Set(signal.supporting_question_ids)
    item.question_ids.forEach(id => {
      if (questions.has(id) && !supporting.has(id)) errors.push(`${path}: question ${id} is not recorded support for topic ${item.topic}`)
    })
    if (item.confidence === 'high' && signal.confidence !== 'high') {
      errors.push(`${path}: topic confidence exceeds deterministic evidence confidence`)
    }
    if (item.confidence === 'high' && signal.classification === 'insufficient_evidence') {
      errors.push(`${path}: insufficient topic evidence cannot be high confidence`)
    }
    if (item.classification === 'apparent_low_salience' && signal.classification === 'possible_knowledge_gap') {
      errors.push(`${path}: knowledge-gap thresholds dominate low-salience labeling`)
    }
    const thresholdClassifications = new Set([
      'insufficient_evidence', 'possible_knowledge_gap', 'apparent_low_salience',
      'strongly_engaged', 'counterbalanced_convictions'
    ])
    if (
      (thresholdClassifications.has(signal.classification) || thresholdClassifications.has(item.classification)) &&
      item.classification !== signal.classification
    ) {
      errors.push(`${path}: classification must respect deterministic topic result ${signal.classification}`)
    }
  })
  analysis.domain_specific_exceptions.forEach((item, i) => {
    const path = `domain_specific_exceptions[${i}]`; checkAxes(item.axis_ids, path); checkQuestions(item.question_ids, path, item.axis_ids)
    if (item.axis_ids.length === 0) errors.push(`${path}: a domain exception requires a cited axis`)
    const uniqueEvidence = [...new Set(item.question_ids)].map(id => questions.get(id)).filter((q): q is NonNullable<typeof q> => !!q)
    if (uniqueEvidence.length < 2) errors.push(`${path}: a domain exception requires repeated evidence`)
    if ((item.status === 'coherent' || item.status === 'plausibly_coherent') && !item.generalizable_rule?.trim()) {
      errors.push(`${path}: a coherent exception requires a generalizable rule`)
    }
    if (item.status === 'coherent' && item.axis_ids.some(axisIsUnreliable)) {
      errors.push(`${path}: an insufficient-reliability axis cannot support a definitive coherent exception`)
    }
    const repeatedDomain = [...new Set(uniqueEvidence.map(q => q.policy_domain).filter(Boolean))].some(domain =>
      uniqueEvidence.filter(q => q.policy_domain === domain).length >= 2
    )
    const distinctScenarios = new Set(uniqueEvidence.map(q => q.scenario_conditions).filter(Boolean)).size
    if (!repeatedDomain && distinctScenarios < 2) {
      errors.push(`${path}: a domain exception requires repeated domain or scenario evidence`)
    }
    if (!findSupportingCandidate(input, item.axis_ids, item.question_ids, [], ['domain_exception'])) {
      errors.push(`${path}: a domain exception must match a deterministic opposite-direction exception candidate`)
    }
  })
  analysis.tensions.forEach((tension, i) => {
    if (tension.classification !== 'principled_domain_exception') return
    const matchingException = analysis.domain_specific_exceptions.find(exception =>
      (exception.status === 'coherent' || exception.status === 'plausibly_coherent') &&
      !!exception.generalizable_rule?.trim() && !!exception.analogous_case_test.trim() &&
      exception.axis_ids.some(axisId => tension.axis_ids.includes(axisId)) &&
      exception.question_ids.some(questionId => tension.question_ids.includes(questionId))
    )
    if (!matchingException) {
      errors.push(`tensions[${i}]: principled_domain_exception requires a matching coherent exception with a generalizable rule and analogous-case test`)
    }
  })
  analysis.blind_spots.forEach((item, i) => {
    const path = `blind_spots[${i}]`
    checkQuestions(item.question_ids, path)
    if (item.question_ids.length === 0) errors.push(`${path}: blind spots require cited question evidence`)
  })
  const tensionIdList = analysis.tensions.map(tension => tension.tension_id)
  const clarificationIdList = analysis.clarifying_questions.map(question => question.clarification_id)
  if (new Set(tensionIdList).size !== tensionIdList.length) errors.push('tensions: tension_id values must be unique')
  if (new Set(clarificationIdList).size !== clarificationIdList.length) errors.push('clarifying_questions: clarification_id values must be unique')
  const tensionById = new Map(analysis.tensions.map(tension => [tension.tension_id, tension]))
  const clarificationById = new Map(analysis.clarifying_questions.map(question => [question.clarification_id, question]))
  analysis.tensions.forEach((tension, i) => {
    if (!tension.clarifying_question_id) return
    const clarification = clarificationById.get(tension.clarifying_question_id)
    if (!clarification) errors.push(`tensions[${i}]: nonexistent clarification ${tension.clarifying_question_id}`)
    else if (!clarification.related_tension_ids.includes(tension.tension_id)) {
      errors.push(`tensions[${i}]: clarification link is not reciprocal`)
    }
  })
  analysis.clarifying_questions.forEach((item, i) => {
    if (new Set(item.related_tension_ids).size !== item.related_tension_ids.length) {
      errors.push(`clarifying_questions[${i}]: related tension IDs must be unique`)
    }
    item.related_tension_ids.forEach(id => {
      const tension = tensionById.get(id)
      if (!tension) errors.push(`clarifying_questions[${i}]: nonexistent tension ${id}`)
      else if (tension.clarifying_question_id !== item.clarification_id) {
        errors.push(`clarifying_questions[${i}]: tension link is not reciprocal`)
      }
    })
  })
  return { valid: errors.length === 0, errors }
}

function questionAxes(question: PersonalizedAnalysisInput['questions'][number]): Set<string> {
  return new Set([question.primary_axis_id, ...question.tradeoff_links.map(link => link.axis_id)])
}

function directionOnAxis(
  question: PersonalizedAnalysisInput['questions'][number], axisId: string
): -1 | 0 | 1 | null {
  if (typeof question.response !== 'number') return null
  const axisKey = question.primary_axis_id === axisId
    ? question.primary_axis_key
    : question.tradeoff_links.find(link => link.axis_id === axisId)?.axis_key
  if (!axisKey) return null
  return Math.sign(question.response * axisKey) as -1 | 0 | 1
}

function hasHypocrisyPattern(
  evidence: PersonalizedAnalysisInput['questions'], axisIds: string[], requiredPrinciples: number
): boolean {
  return [...new Set(axisIds)].some(axisId => ([-1, 1] as const).some(direction => {
    const principles = evidence.filter(question =>
      question.question_type === 'conceptual' &&
      typeof question.response === 'number' && Math.abs(question.response) === 2 &&
      directionOnAxis(question, axisId) === direction
    )
    const violations = evidence.filter(question =>
      (question.question_type === 'applied' || question.item_family === 'collision') &&
      directionOnAxis(question, axisId) === -direction
    )
    return principles.length >= requiredPrinciples && violations.length >= 2
  }))
}

function hasSelectiveApplicationPattern(
  evidence: PersonalizedAnalysisInput['questions'],
  axisIds: string[],
  input: PersonalizedAnalysisInput
): boolean {
  const axisById = new Map([...input.profile.core_axes, ...input.profile.facets].map(axis => [axis.axis_id, axis]))
  return [...new Set(axisIds)].some(axisId => {
    const applications = evidence.filter(question =>
      question.question_type === 'applied' || question.item_family === 'collision'
    )
    const applicationDirections = applications
      .map(question => directionOnAxis(question, axisId))
      .filter((direction): direction is -1 | 1 => direction === -1 || direction === 1)
    if (new Set(applicationDirections).size >= 2) return true

    const conceptualDirections = new Set(evidence
      .filter(question => question.question_type === 'conceptual')
      .map(question => directionOnAxis(question, axisId))
      .filter((direction): direction is -1 | 1 => direction === -1 || direction === 1))
    if ([...conceptualDirections].some(direction => applicationDirections.filter(item => item === -direction).length >= 2)) {
      return true
    }

    const axisScore = axisById.get(axisId)?.score ?? 0
    const axisDirection = Math.sign(axisScore)
    return Math.abs(axisScore) >= SIGNAL_THRESHOLDS.centerBoundary &&
      applicationDirections.filter(direction => direction === -axisDirection).length >= 2
  })
}

function findSupportingCandidate(
  input: PersonalizedAnalysisInput,
  axisIds: string[],
  questionIds: number[],
  pairIds: string[],
  sources: PersonalizedAnalysisInput['candidate_tensions'][number]['source'][]
) {
  const citedAxes = new Set(axisIds)
  pairIds.flatMap(pairId => pairId.split('|')).forEach(axisId => citedAxes.add(axisId))
  const citedQuestions = new Set(questionIds)
  const citedPairs = new Set(pairIds)
  return input.candidate_tensions.find(candidate =>
    sources.includes(candidate.source) &&
    (candidate.axis_ids.some(axisId => citedAxes.has(axisId)) || candidate.pair_ids.some(pairId => citedPairs.has(pairId))) &&
    (
      candidate.question_ids.filter(questionId => citedQuestions.has(questionId)).length >= 2 ||
      candidate.pair_ids.some(pairId => citedPairs.has(pairId))
    )
  )
}
