import type { AxisCoverage } from '@/lib/database.types'
import type {
  AIQuestionEvidence, AxisCenterSignal, CandidateTension, CenterShape,
  Confidence, EngagementClassification, TopicSignal
} from './types'

export const SIGNAL_THRESHOLDS = {
  topicMinRecorded: 4,
  topicMinNumeric: 3,
  knowledgeGapNotSureRate: 0.35,
  knowledgeGapMinNotSure: 2,
  lowSalienceMinNumeric: 5,
  lowSalienceNeutralRate: 0.45,
  lowSalienceMaxIntensity: 0.35,
  lowSalienceMaxNotSureRate: 0.25,
  stronglyEngagedMinNumeric: 4,
  stronglyEngagedMinIntensity: 0.65,
  stronglyEngagedMinStrongRate: 0.30,
  counterbalancedMinNumeric: 5,
  counterbalancedMinIntensity: 0.55,
  counterbalancedMinPoleShare: 0.30,
  counterbalancedMaxNet: 0.20,
  centerBoundary: 0.20,
  centerMaxLowIntensity: 0.35,
  centerMinNeutralRate: 0.40,
  centerMinCounterbalancedIntensity: 0.55,
  centerMinPoleShare: 0.30,
  centerUncertainNotSureRate: 0.25,
  contextualGap: 0.30,
  domainOpposition: 0.35,
  domainOppositionMinNumeric: 2,
  domainExceptionMinAxisScore: 0.40,
  domainExceptionMinItems: 2,
  avoidanceMinControversyNumeric: 4,
  avoidanceMinNeutralRate: 0.50,
  avoidanceMaxNotSureRate: 0.20,
  avoidanceMinConceptualScore: 0.40,
  avoidanceMinAppliedIntensity: 0.50
} as const

const ratio = (n: number, d: number) => d > 0 ? n / d : 0
const clamp = (n: number) => Math.max(0, Math.min(1, n))

function topicClassification(values: Omit<TopicSignal, 'classification' | 'confidence' | 'supporting_question_ids' | 'topic'>): EngagementClassification {
  const t = SIGNAL_THRESHOLDS
  if (values.recorded_items < t.topicMinRecorded || (values.numeric_items < t.topicMinNumeric && values.not_sure_items < 2)) {
    return 'insufficient_evidence'
  }
  if (values.not_sure_rate >= t.knowledgeGapNotSureRate && values.not_sure_items >= t.knowledgeGapMinNotSure) {
    return 'possible_knowledge_gap'
  }
  if (
    values.numeric_items >= t.lowSalienceMinNumeric &&
    values.neutral_rate_among_numeric >= t.lowSalienceNeutralRate &&
    values.mean_intensity <= t.lowSalienceMaxIntensity &&
    values.not_sure_rate < t.lowSalienceMaxNotSureRate
  ) return 'apparent_low_salience'
  if (
    values.numeric_items >= t.counterbalancedMinNumeric &&
    values.mean_intensity >= t.counterbalancedMinIntensity &&
    values.negative_pole_share >= t.counterbalancedMinPoleShare &&
    values.positive_pole_share >= t.counterbalancedMinPoleShare &&
    Math.abs(values.net_primary_contribution) <= t.counterbalancedMaxNet
  ) return 'counterbalanced_convictions'
  if (
    values.numeric_items >= t.stronglyEngagedMinNumeric &&
    values.mean_intensity >= t.stronglyEngagedMinIntensity &&
    values.strong_rate_among_numeric >= t.stronglyEngagedMinStrongRate
  ) return 'strongly_engaged'
  if (values.mean_intensity <= 0.45 && values.neutral_rate_among_numeric >= 0.25) return 'genuinely_moderate'
  return 'context_dependent'
}

export function buildTopicSignals(evidence: AIQuestionEvidence[]): TopicSignal[] {
  const groups = new Map<string, AIQuestionEvidence[]>()
  for (const item of evidence) {
    const topic = item.policy_domain?.trim() || null
    if (!topic) continue
    const group = groups.get(topic) ?? []
    group.push(item)
    groups.set(topic, group)
  }

  return [...groups.entries()].map(([topic, items]) => {
    const recorded = items.filter(i => Object.prototype.hasOwnProperty.call(i, 'response'))
    const numeric = recorded.filter(i => typeof i.response === 'number')
    const notSure = recorded.filter(i => i.response === null)
    const neutral = numeric.filter(i => i.response === 0)
    const directional = numeric.filter(i => i.response !== 0)
    const strong = numeric.filter(i => Math.abs(i.response as number) === 2)
    const negativeStrength = numeric
      .filter(i => i.contribution_direction === 'negative_pole')
      .reduce((sum, i) => sum + i.contribution_strength, 0)
    const positiveStrength = numeric
      .filter(i => i.contribution_direction === 'positive_pole')
      .reduce((sum, i) => sum + i.contribution_strength, 0)
    const directionalStrength = negativeStrength + positiveStrength
    const net = directionalStrength > 0 ? (positiveStrength - negativeStrength) / directionalStrength : 0
    const base = {
      total_items: items.length,
      recorded_items: recorded.length,
      numeric_items: numeric.length,
      not_sure_items: notSure.length,
      neutral_items: neutral.length,
      directional_items: directional.length,
      strong_items: strong.length,
      coverage: ratio(numeric.length, items.length),
      not_sure_rate: ratio(notSure.length, recorded.length),
      neutral_rate_among_numeric: ratio(neutral.length, numeric.length),
      mean_intensity: ratio(numeric.reduce((sum, i) => sum + Math.abs(i.response as number) / 2, 0), numeric.length),
      strong_rate_among_numeric: ratio(strong.length, numeric.length),
      negative_pole_share: ratio(negativeStrength, directionalStrength),
      positive_pole_share: ratio(positiveStrength, directionalStrength),
      net_primary_contribution: net
    }
    const classification = topicClassification(base)
    const confidence: Confidence = classification === 'insufficient_evidence' ? 'low' : items.length >= 8 && recorded.length >= 6 ? 'high' : 'medium'
    return {
      topic, ...base, classification, confidence,
      // Neutral and Not sure answers are the evidence for low-salience and
      // knowledge-gap signals, so retain their IDs instead of only directional items.
      supporting_question_ids: recorded.map(i => i.question_id)
    }
  }).sort((a, b) => b.recorded_items - a.recorded_items || a.topic.localeCompare(b.topic))
}

export interface CenterShapeInput {
  axisId: string
  score: number
  coverage: AxisCoverage | undefined
  evidence: AIQuestionEvidence[]
  conceptualScore: number | null
  appliedScore: number | null
}

export function classifyCenterShape(input: CenterShapeInput): AxisCenterSignal {
  const t = SIGNAL_THRESHOLDS
  const primary = input.evidence.filter(e => e.primary_axis_id === input.axisId)
  const numeric = primary.filter(e => typeof e.response === 'number')
  const notSure = primary.filter(e => e.response === null)
  const neutral = numeric.filter(e => e.response === 0)
  const negative = numeric.filter(e => e.contribution_direction === 'negative_pole').reduce((n, e) => n + e.contribution_strength, 0)
  const positive = numeric.filter(e => e.contribution_direction === 'positive_pole').reduce((n, e) => n + e.contribution_strength, 0)
  const totalDirection = negative + positive
  const meanIntensity = ratio(numeric.reduce((n, e) => n + Math.abs(e.response as number) / 2, 0), numeric.length)
  const neutralRate = ratio(neutral.length, numeric.length)
  const notSureRate = ratio(notSure.length, primary.length)
  const negativeShare = ratio(negative, totalDirection)
  const positiveShare = ratio(positive, totalDirection)
  const gap = input.conceptualScore === null || input.appliedScore === null ? 0 : Math.abs(input.conceptualScore - input.appliedScore)

  let shape: CenterShape
  if (Math.abs(input.score) >= t.centerBoundary) shape = 'not_center'
  else if (!input.coverage || input.coverage.confidence === 'insufficient') shape = 'insufficient_evidence'
  else if (notSureRate >= t.centerUncertainNotSureRate) shape = 'uncertain_center'
  else if (gap >= t.contextualGap || hasOpposingDomains(primary)) shape = 'contextual_center'
  else if (meanIntensity <= t.centerMaxLowIntensity && neutralRate >= t.centerMinNeutralRate) shape = 'low_intensity_center'
  else if (meanIntensity >= t.centerMinCounterbalancedIntensity && negativeShare >= t.centerMinPoleShare && positiveShare >= t.centerMinPoleShare) shape = 'counterbalanced_center'
  else shape = 'insufficient_evidence'

  return {
    axis_id: input.axisId, shape, coverage_confidence: coverageConfidence(input.coverage),
    mean_intensity: meanIntensity, neutral_rate: neutralRate,
    not_sure_rate: notSureRate, negative_share: negativeShare, positive_share: positiveShare,
    question_ids: primary.map(e => e.question_id)
  }
}

function coverageConfidence(coverage: AxisCoverage | undefined): Confidence {
  if (coverage?.confidence === 'high') return 'high'
  if (coverage?.confidence === 'moderate') return 'medium'
  return 'low'
}

function hasOpposingDomains(items: AIQuestionEvidence[]): boolean {
  const domains = new Map<string, { positive: number; negative: number; numeric: number }>()
  for (const item of items) {
    if (!item.policy_domain || item.response === null || item.response === 0) continue
    const bucket = domains.get(item.policy_domain) ?? { positive: 0, negative: 0, numeric: 0 }
    if (item.contribution_direction === 'positive_pole') bucket.positive += item.contribution_strength
    if (item.contribution_direction === 'negative_pole') bucket.negative += item.contribution_strength
    bucket.numeric += 1
    domains.set(item.policy_domain, bucket)
  }
  const leans = [...domains.values()]
    .filter(domain => domain.numeric >= SIGNAL_THRESHOLDS.domainOppositionMinNumeric)
    .map(domain => ratio(domain.positive - domain.negative, domain.positive + domain.negative))
  return leans.some(v => v >= SIGNAL_THRESHOLDS.domainOpposition) && leans.some(v => v <= -SIGNAL_THRESHOLDS.domainOpposition)
}

export function buildCandidateTensions(args: {
  evidence: AIQuestionEvidence[]
  topicSignals: TopicSignal[]
  centers: AxisCenterSignal[]
  axisComparisons: Array<{ axis_id: string; difference: number; conceptual_score: number; applied_score: number }>
  collisionPairs: Array<{ pair_id: string; classification: string; direction: number; probes_answered: number; contradicts_ideals?: boolean }>
  axisScores?: Record<string, number>
  conceptualScores?: Record<string, number>
}): CandidateTension[] {
  const candidates: CandidateTension[] = []
  for (const gap of args.axisComparisons.filter(g => g.difference >= SIGNAL_THRESHOLDS.contextualGap).slice(0, 6)) {
    const questionIds = args.evidence.filter(e => e.primary_axis_id === gap.axis_id).map(e => e.question_id)
    candidates.push({
      candidate_id: `gap:${gap.axis_id}`, source: 'conceptual_applied_gap', axis_ids: [gap.axis_id],
      question_ids: questionIds, pair_ids: [], deterministic_strength: clamp(gap.difference),
      coverage_confidence: questionIds.length >= 8 ? 'high' : 'medium',
      factual_summary: `Conceptual and applied scores differ by ${gap.difference.toFixed(2)}; authoritative scores are ${gap.conceptual_score.toFixed(2)} and ${gap.applied_score.toFixed(2)}.`
    })
  }
  for (const pair of args.collisionPairs.filter(p => p.classification === 'cross_pressured' || p.contradicts_ideals)) {
    const [pairA, pairB] = pair.pair_id.split('|')
    const ids = args.evidence.filter(e => {
      const axes = new Set([e.primary_axis_id, ...e.tradeoff_links.map(link => link.axis_id)])
      return axes.has(pairA) && axes.has(pairB)
    }).map(e => e.question_id)
    candidates.push({
      candidate_id: `pair:${pair.pair_id}`, source: 'collision_pair', axis_ids: pair.pair_id.split('|'),
      question_ids: ids, pair_ids: [pair.pair_id], deterministic_strength: pair.probes_answered >= 2 ? 0.75 : 0.4,
      coverage_confidence: pair.probes_answered >= 2 ? 'medium' : 'low',
      factual_summary: pair.contradicts_ideals
        ? `The authoritative collision probes include a practical choice that runs against the stronger stated ideal across ${pair.probes_answered} answered probes.`
        : `The authoritative collision analysis is cross-pressured across ${pair.probes_answered} answered probes.`
    })
  }
  for (const center of args.centers.filter(c => c.shape !== 'not_center')) {
    candidates.push({
      candidate_id: `center:${center.axis_id}`, source: 'axis_counterbalance', axis_ids: [center.axis_id],
      question_ids: center.question_ids, pair_ids: [],
      deterministic_strength: center.shape === 'uncertain_center'
        ? center.not_sure_rate
        : center.shape === 'low_intensity_center' ? 1 - center.mean_intensity : center.mean_intensity,
      coverage_confidence: center.coverage_confidence,
      factual_summary: center.shape === 'counterbalanced_center'
        ? 'A near-center score is produced by strong contributions toward both poles, not low intensity.'
        : `The deterministic center-shape classification for ${center.axis_id} is ${center.shape}.`
    })
  }
  for (const center of args.centers.filter(c =>
    c.shape !== 'counterbalanced_center' &&
    c.mean_intensity >= SIGNAL_THRESHOLDS.centerMinCounterbalancedIntensity &&
    c.negative_share >= SIGNAL_THRESHOLDS.centerMinPoleShare &&
    c.positive_share >= SIGNAL_THRESHOLDS.centerMinPoleShare
  )) {
    candidates.push({
      candidate_id: `counterbalance:${center.axis_id}`, source: 'axis_counterbalance', axis_ids: [center.axis_id],
      question_ids: center.question_ids, pair_ids: [], deterministic_strength: center.mean_intensity,
      coverage_confidence: center.coverage_confidence,
      factual_summary: 'High-intensity answers pull toward both poles within this axis even though its net score is not classified as a counterbalanced center.'
    })
  }
  for (const topic of args.topicSignals.filter(t => ['apparent_low_salience', 'possible_knowledge_gap'].includes(t.classification))) {
    candidates.push({
      candidate_id: `topic:${topic.topic}`, source: 'topic_engagement', axis_ids: [],
      question_ids: topic.supporting_question_ids, pair_ids: [],
      deterministic_strength: topic.classification === 'possible_knowledge_gap' ? topic.not_sure_rate : 1 - topic.mean_intensity,
      coverage_confidence: topic.confidence, factual_summary: `${topic.topic} is deterministically classified as ${topic.classification}.`
    })
  }
  if (isSelectivelyEngaged(args.topicSignals)) {
    const relevant = args.topicSignals.filter(signal =>
      signal.classification === 'strongly_engaged' ||
      signal.classification === 'apparent_low_salience' ||
      signal.classification === 'possible_knowledge_gap'
    )
    candidates.push({
      candidate_id: 'profile:selectively_engaged', source: 'topic_engagement', axis_ids: [],
      question_ids: [...new Set(relevant.flatMap(signal => signal.supporting_question_ids))], pair_ids: [],
      factual_summary: 'At least two topics are strongly engaged and at least two others meet low-salience or possible-knowledge-gap thresholds.',
      deterministic_strength: 0.8,
      coverage_confidence: relevant.every(signal => signal.confidence === 'high')
        ? 'high'
        : relevant.some(signal => signal.confidence === 'low') ? 'low' : 'medium'
    })
  }
  buildDomainExceptionCandidates(args.evidence, args.axisScores ?? {}).forEach(candidate => candidates.push(candidate))
  buildAvoidanceCandidates(args.evidence, args.conceptualScores ?? {}).forEach(candidate => candidates.push(candidate))
  return candidates
}

function buildDomainExceptionCandidates(
  evidence: AIQuestionEvidence[], axisScores: Record<string, number>
): CandidateTension[] {
  const grouped = new Map<string, { label: string; items: AIQuestionEvidence[] }>()
  for (const item of evidence) {
    if (!item.policy_domain || typeof item.response !== 'number' || item.response === 0) continue
    addDomainGroup(grouped, `${item.primary_axis_id}\u0000domain:${item.policy_domain}`, item.policy_domain, item)
    for (const token of domainThemeTokens(item.policy_domain)) {
      addDomainGroup(grouped, `${item.primary_axis_id}\u0000theme:${token}`, `${token} theme`, item)
    }
  }
  const output: CandidateTension[] = []
  const emittedQuestionSets = new Set<string>()
  for (const [key, group] of grouped) {
    const [axisId] = key.split('\u0000')
    const items = [...new Map(group.items.map(item => [item.question_id, item])).values()]
    const evidenceKey = `${axisId}:${items.map(item => item.question_id).sort((a, b) => a - b).join(',')}`
    if (emittedQuestionSets.has(evidenceKey)) continue
    const axisScore = axisScores[axisId]
    if (Math.abs(axisScore ?? 0) < SIGNAL_THRESHOLDS.domainExceptionMinAxisScore || items.length < SIGNAL_THRESHOLDS.domainExceptionMinItems) continue
    const signed = items.reduce((sum, item) => sum + (
      item.contribution_direction === 'positive_pole' ? item.contribution_strength :
      item.contribution_direction === 'negative_pole' ? -item.contribution_strength : 0
    ), 0)
    const strength = items.reduce((sum, item) => sum + item.contribution_strength, 0)
    const domainLean = strength > 0 ? signed / strength : 0
    if (Math.sign(domainLean) === Math.sign(axisScore) || Math.abs(domainLean) < SIGNAL_THRESHOLDS.domainOpposition) continue
    const latentConflicts = new Set(items.map(item => item.latent_conflict).filter(Boolean))
    const conceptualSupport = evidence.filter(item =>
      item.primary_axis_id === axisId && item.question_type === 'conceptual' &&
      typeof item.response === 'number' && item.response !== 0 &&
      !!item.latent_conflict && latentConflicts.has(item.latent_conflict) &&
      (item.contribution_direction === 'positive_pole' ? 1 : item.contribution_direction === 'negative_pole' ? -1 : 0) === Math.sign(domainLean)
    )
    const citedItems = [...new Map([...items, ...conceptualSupport].map(item => [item.question_id, item])).values()]
    emittedQuestionSets.add(evidenceKey)
    output.push({
      candidate_id: `domain:${axisId}:${group.label}`, source: 'domain_exception', axis_ids: [axisId],
      question_ids: citedItems.map(item => item.question_id), pair_ids: [],
      factual_summary: `Related ${group.label} answers lean ${domainLean > 0 ? 'positive' : 'negative'} while the authoritative overall ${axisId} score leans the opposite way. This is an exception candidate, not a moral classification.`,
      deterministic_strength: clamp(Math.abs(domainLean - axisScore) / 2),
      coverage_confidence: items.length >= 4 ? 'high' : 'medium'
    })
  }
  return output
}

function addDomainGroup(
  groups: Map<string, { label: string; items: AIQuestionEvidence[] }>,
  key: string, label: string, item: AIQuestionEvidence
) {
  const group = groups.get(key) ?? { label, items: [] }
  group.items.push(item)
  groups.set(key, group)
}

function domainThemeTokens(domain: string): string[] {
  const stop = new Set(['and', 'general', 'principles', 'policy', 'policies', 'other'])
  return [...new Set(domain.toLowerCase().match(/[a-z0-9]+/g) ?? [])]
    .filter(token => token.length >= 4 && !stop.has(token))
}

function buildAvoidanceCandidates(
  evidence: AIQuestionEvidence[], conceptualScores: Record<string, number>
): CandidateTension[] {
  const byTopic = new Map<string, AIQuestionEvidence[]>()
  for (const item of evidence.filter(item => item.item_family === 'controversy_stress')) {
    // The four-item v2.2 stress sets share a latent conflict while often using
    // a different narrow policy_domain per scenario. This grouping is only for
    // the model-reviewed avoidance candidate; ordinary topic aggregates remain
    // strictly policy_domain based.
    const topic = item.latent_conflict?.trim() || item.policy_domain?.trim() || null
    if (!topic) continue
    byTopic.set(topic, [...(byTopic.get(topic) ?? []), item])
  }
  const output: CandidateTension[] = []
  for (const [topic, controversy] of byTopic) {
    const numeric = controversy.filter(item => typeof item.response === 'number')
    const neutralRate = ratio(numeric.filter(item => item.response === 0).length, numeric.length)
    const notSureRate = ratio(controversy.filter(item => item.response === null).length, controversy.length)
    const axisIds = [...new Set(controversy.map(item => item.primary_axis_id))]
    const conceptualStrong = axisIds.some(axisId => Math.abs(conceptualScores[axisId] ?? 0) >= SIGNAL_THRESHOLDS.avoidanceMinConceptualScore)
    const nearbyApplied = evidence.filter(item =>
      axisIds.includes(item.primary_axis_id) && item.question_type === 'applied' &&
      item.item_family !== 'controversy_stress' && typeof item.response === 'number'
    )
    const appliedIntensity = ratio(
      nearbyApplied.reduce((sum, item) => sum + Math.abs(item.response as number) / 2, 0), nearbyApplied.length
    )
    if (
      numeric.length < SIGNAL_THRESHOLDS.avoidanceMinControversyNumeric ||
      neutralRate < SIGNAL_THRESHOLDS.avoidanceMinNeutralRate ||
      notSureRate >= SIGNAL_THRESHOLDS.avoidanceMaxNotSureRate ||
      !conceptualStrong || appliedIntensity < SIGNAL_THRESHOLDS.avoidanceMinAppliedIntensity
    ) continue
    output.push({
      candidate_id: `avoidance:${topic}`, source: 'controversy_stress', axis_ids: axisIds,
      question_ids: [...controversy, ...nearbyApplied].map(item => item.question_id), pair_ids: [],
      factual_summary: `${topic} has selective numeric neutrality on controversy-stress items despite strong related conceptual and noncontroversial applied responses. The model must distinguish avoidance, ambivalence, discomfort, and deliberate moderation.`,
      deterministic_strength: neutralRate, coverage_confidence: numeric.length >= 6 ? 'high' : 'medium'
    })
  }
  return output
}

export function isSelectivelyEngaged(signals: TopicSignal[]): boolean {
  return signals.filter(s => s.classification === 'strongly_engaged').length >= 2 &&
    signals.filter(s => s.classification === 'apparent_low_salience' || s.classification === 'possible_knowledge_gap').length >= 2
}
