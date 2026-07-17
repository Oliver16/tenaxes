import assert from 'node:assert/strict'
import test from 'node:test'

import {
  SIGNAL_THRESHOLDS,
  buildCandidateTensions,
  buildTopicSignals,
  classifyCenterShape,
  isSelectivelyEngaged
} from './signals.ts'
import { makeCoverage, makeEvidence } from './__tests__/helpers.mjs'

function topicEvidence(responses, options = {}) {
  return responses.map((response, index) => makeEvidence({
    id: (options.startId ?? 100) + index,
    response,
    axisId: options.axisId ?? 'A1',
    axisKey: options.axisKeys?.[index] ?? 1,
    domain: options.domain ?? 'Topic'
  }))
}

function onlySignal(evidence) {
  const signals = buildTopicSignals(evidence)
  assert.equal(signals.length, 1)
  return signals[0]
}

test('signal thresholds retain the specification values', () => {
  assert.deepEqual(SIGNAL_THRESHOLDS, {
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
    domainExceptionMinAxisScore: 0.40,
    domainExceptionMinItems: 2,
    avoidanceMinControversyNumeric: 4,
    avoidanceMinNeutralRate: 0.50,
    avoidanceMaxNotSureRate: 0.20,
    avoidanceMinConceptualScore: 0.40,
    avoidanceMinAppliedIntensity: 0.50
  })
})

test('neutral-heavy numeric answers become apparent low salience', () => {
  const signal = onlySignal(topicEvidence([0, 0, 0, 0, 1, -1]))
  assert.equal(signal.classification, 'apparent_low_salience')
  assert.equal(signal.numeric_items, 6)
  assert.equal(signal.neutral_rate_among_numeric, 4 / 6)
  assert.equal(signal.mean_intensity, 1 / 6)
  assert.equal(signal.not_sure_rate, 0)
})

test('not-sure-heavy answers become a possible knowledge gap', () => {
  const signal = onlySignal(topicEvidence([null, null, 1, 2]))
  assert.equal(signal.classification, 'possible_knowledge_gap')
  assert.equal(signal.not_sure_items, 2)
  assert.equal(signal.not_sure_rate, 0.5)
})

test('strong contributions toward both poles become counterbalanced convictions', () => {
  const signal = onlySignal(topicEvidence([2, 2, 2, -2, -2, -2]))
  assert.equal(signal.classification, 'counterbalanced_convictions')
  assert.equal(signal.negative_pole_share, 0.5)
  assert.equal(signal.positive_pole_share, 0.5)
  assert.equal(signal.net_primary_contribution, 0)
  assert.equal(signal.mean_intensity, 1)
})

test('high-intensity one-sided answers become strongly engaged', () => {
  const signal = onlySignal(topicEvidence([2, 2, 1, 2]))
  assert.equal(signal.classification, 'strongly_engaged')
  assert.equal(signal.positive_pole_share, 1)
  assert.equal(signal.mean_intensity, 0.875)
})

test('fewer than four recorded topic items remains insufficient', () => {
  const signal = onlySignal(topicEvidence([2, 2, 2]))
  assert.equal(signal.classification, 'insufficient_evidence')
  assert.equal(signal.confidence, 'low')
})

test('null is excluded from numeric, neutral, coverage, and intensity calculations', () => {
  const signal = onlySignal(topicEvidence([null, null, 0, 2]))
  assert.equal(signal.recorded_items, 4)
  assert.equal(signal.numeric_items, 2)
  assert.equal(signal.not_sure_items, 2)
  assert.equal(signal.neutral_items, 1)
  assert.equal(signal.coverage, 0.5)
  assert.equal(signal.neutral_rate_among_numeric, 0.5)
  assert.equal(signal.mean_intensity, 0.5)
  assert.equal(signal.classification, 'possible_knowledge_gap')
})

test('primary-axis keys determine pole shares rather than raw answer sign alone', () => {
  const evidence = topicEvidence([2, 2, 2, 2], { axisKeys: [1, 1, -1, -1] })
  const signal = onlySignal(evidence)
  assert.equal(signal.negative_pole_share, 0.5)
  assert.equal(signal.positive_pole_share, 0.5)
})

test('selective engagement requires two strongly engaged and two low-information or low-salience topics', () => {
  const evidence = [
    ...topicEvidence([2, 2, 2, 2], { startId: 200, domain: 'Engaged A' }),
    ...topicEvidence([-2, -2, -2, -2], { startId: 210, domain: 'Engaged B' }),
    ...topicEvidence([0, 0, 0, 0, 1], { startId: 220, domain: 'Low A' }),
    ...topicEvidence([null, null, 1, 0], { startId: 230, domain: 'Low B' })
  ]
  assert.equal(isSelectivelyEngaged(buildTopicSignals(evidence)), true)
})

test('weak numeric-neutral center is classified as low-intensity center', () => {
  const evidence = topicEvidence([0, 0, 0, 1, -1])
  const signal = classifyCenterShape({
    axisId: 'A1', score: 0.05, coverage: makeCoverage('A1', evidence), evidence,
    conceptualScore: 0.08, appliedScore: 0.02
  })
  assert.equal(signal.shape, 'low_intensity_center')
})

test('strong offsetting center is classified as counterbalanced center', () => {
  const evidence = topicEvidence([2, 2, 2, -2, -2, -2])
  const signal = classifyCenterShape({
    axisId: 'A1', score: 0.01, coverage: makeCoverage('A1', evidence), evidence,
    conceptualScore: 0.05, appliedScore: -0.04
  })
  assert.equal(signal.shape, 'counterbalanced_center')
  assert.equal(signal.mean_intensity, 1)
})

test('not-sure-heavy center is classified as uncertain center', () => {
  const evidence = topicEvidence([null, null, 2, -2, 0, 0])
  const signal = classifyCenterShape({
    axisId: 'A1', score: 0, coverage: makeCoverage('A1', evidence, 'moderate'), evidence,
    conceptualScore: 0.05, appliedScore: -0.05
  })
  assert.equal(signal.shape, 'uncertain_center')
  assert.equal(signal.not_sure_rate, 1 / 3)
})

test('large conceptual/applied gap is classified as contextual center', () => {
  const evidence = topicEvidence([0, 0, 0, 1, -1])
  const signal = classifyCenterShape({
    axisId: 'A1', score: 0.02, coverage: makeCoverage('A1', evidence), evidence,
    conceptualScore: 0.45, appliedScore: 0.05
  })
  assert.equal(signal.shape, 'contextual_center')
})

test('opposed domain subgroups are classified as contextual center', () => {
  const evidence = [
    ...topicEvidence([2, 2, 2], { startId: 300, domain: 'Domain A' }),
    ...topicEvidence([-2, -2, -2], { startId: 310, domain: 'Domain B' })
  ]
  const signal = classifyCenterShape({
    axisId: 'A1', score: 0, coverage: makeCoverage('A1', evidence), evidence,
    conceptualScore: 0.05, appliedScore: -0.05
  })
  assert.equal(signal.shape, 'contextual_center')
})

test('score at the center boundary is not center', () => {
  const evidence = topicEvidence([0, 0, 0, 0, 0])
  const signal = classifyCenterShape({
    axisId: 'A1', score: SIGNAL_THRESHOLDS.centerBoundary,
    coverage: makeCoverage('A1', evidence), evidence,
    conceptualScore: 0, appliedScore: 0
  })
  assert.equal(signal.shape, 'not_center')
})

test('insufficient scorer coverage remains insufficient evidence', () => {
  const evidence = topicEvidence([2, -2, 0])
  const signal = classifyCenterShape({
    axisId: 'A1', score: 0, coverage: makeCoverage('A1', evidence, 'insufficient'), evidence,
    conceptualScore: 0.1, appliedScore: 0
  })
  assert.equal(signal.shape, 'insufficient_evidence')
})

test('an otherwise unmatched near-center pattern is not mislabeled contextual', () => {
  const evidence = topicEvidence([1, 1, -1, -1, 1, -1])
  const signal = classifyCenterShape({
    axisId: 'A1', score: 0.05, coverage: makeCoverage('A1', evidence), evidence,
    conceptualScore: 0.1, appliedScore: 0.05
  })
  assert.equal(signal.shape, 'insufficient_evidence')
})

test('an opposed policy domain becomes an exception candidate, not a hypocrisy label', () => {
  const evidence = topicEvidence([-2, -2], { domain: 'Network utility' })
  const candidates = buildCandidateTensions({
    evidence, topicSignals: buildTopicSignals(evidence), centers: [], axisComparisons: [], collisionPairs: [],
    axisScores: { A1: 0.7 }, conceptualScores: { A1: 0.8 }
  })
  const candidate = candidates.find(item => item.source === 'domain_exception')
  assert.ok(candidate)
  assert.match(candidate.factual_summary, /exception candidate, not a moral classification/i)
})

test('selective controversy neutrality produces an avoidance-or-ambivalence review candidate', () => {
  const controversy = topicEvidence([0, 0, 0, 0], { startId: 500, domain: 'Contested issue' })
    .map(item => ({ ...item, item_family: 'controversy_stress' }))
  const nearby = topicEvidence([2, 2, -2, -2], { startId: 510, domain: 'Adjacent issue' })
  const evidence = [...controversy, ...nearby]
  const candidates = buildCandidateTensions({
    evidence, topicSignals: buildTopicSignals(evidence), centers: [], axisComparisons: [], collisionPairs: [],
    axisScores: { A1: 0.1 }, conceptualScores: { A1: 0.65 }
  })
  assert.ok(candidates.some(item => item.candidate_id === 'avoidance:Contested issue'))
})

test('v2.2-style controversy probes aggregate by shared conflict across narrow policy domains', () => {
  const controversy = ['Banking', 'Industrial planning', 'Private ownership', 'Capital income'].map((domain, index) =>
    makeEvidence({
      id: 600 + index, response: 0, axisId: 'A1', domain,
      family: 'controversy_stress', latentConflict: 'State-Directed vs Market-Directed'
    })
  )
  const nearby = topicEvidence([2, 2, -2, -2], { startId: 610, domain: 'Adjacent issue' })
  const evidence = [...controversy, ...nearby]
  const signals = buildTopicSignals(evidence)
  assert.equal(signals.some(signal => signal.topic === 'State-Directed vs Market-Directed'), false)
  assert.equal(controversy.every(item => signals.some(signal => signal.topic === item.policy_domain)), true)
  const candidates = buildCandidateTensions({
    evidence, topicSignals: signals, centers: [], axisComparisons: [], collisionPairs: [],
    axisScores: { A1: 0.1 }, conceptualScores: { A1: 0.65 }
  })
  assert.ok(candidates.some(item => item.candidate_id === 'avoidance:State-Directed vs Market-Directed'))
})
