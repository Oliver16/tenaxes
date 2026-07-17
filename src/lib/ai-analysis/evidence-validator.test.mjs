import assert from 'node:assert/strict'
import test from 'node:test'

import { validateAnalysisEvidence } from './evidence-validator.ts'
import { personalizedAnalysisSchema } from './schema.ts'
import { buildTopicSignals } from './signals.ts'
import { makeAnalysis, makeEvidence, makeInput } from './__tests__/helpers.mjs'

function validHypocrisyEvidence(bankVersion = 'v2.2') {
  return [
    makeEvidence({ id: 1, bankVersion, questionType: 'conceptual', domain: 'Principle A', family: 'principle-a' }),
    makeEvidence({ id: 2, bankVersion, questionType: 'conceptual', domain: 'Principle B', family: 'principle-b' }),
    makeEvidence({ id: 3, bankVersion, questionType: 'applied', domain: 'Applied A', family: 'application-a' }),
    makeEvidence({ id: 4, bankVersion, questionType: 'applied', domain: 'Applied B', family: 'application-b' })
  ]
}

function likelyHypocrisy(overrides = {}) {
  return {
    classification: 'likely_hypocrisy',
    confidence: 'high',
    question_ids: [1, 2, 3, 4],
    ...overrides
  }
}

test('schema-constrained analysis accepts a complete known-good object', () => {
  const parsed = personalizedAnalysisSchema.safeParse(makeAnalysis())
  assert.equal(parsed.success, true)
})

test('schema-constrained analysis rejects unknown output fields', () => {
  const analysis = { ...makeAnalysis(), invented_score: 0.91 }
  const parsed = personalizedAnalysisSchema.safeParse(analysis)
  assert.equal(parsed.success, false)
})

test('rejects likely hypocrisy based on one item', () => {
  const questions = [makeEvidence({ id: 1, questionType: 'conceptual' })]
  const result = validateAnalysisEvidence(
    makeAnalysis(likelyHypocrisy({ question_ids: [1] })),
    makeInput({ questions })
  )
  assert.equal(result.valid, false)
  assert.ok(result.errors.some(error => error.includes('at least four evidence questions')))
  assert.ok(result.errors.some(error => error.includes('two independent applied')))
})

test('rejects likely hypocrisy based on only one conceptual and one applied item', () => {
  const questions = [
    makeEvidence({ id: 1, questionType: 'conceptual', family: 'principle' }),
    makeEvidence({ id: 2, questionType: 'applied', family: 'application' })
  ]
  const result = validateAnalysisEvidence(
    makeAnalysis(likelyHypocrisy({ question_ids: [1, 2] })),
    makeInput({ questions })
  )
  assert.equal(result.valid, false)
  assert.ok(result.errors.some(error => error.includes('two independent conceptual')))
  assert.ok(result.errors.some(error => error.includes('two independent applied')))
})

test('duplicate citations never satisfy independent hypocrisy evidence thresholds', () => {
  const questions = [
    makeEvidence({ id: 1, questionType: 'conceptual', family: 'base' }),
    makeEvidence({ id: 2, questionType: 'applied', family: 'base' })
  ]
  const result = validateAnalysisEvidence(
    makeAnalysis(likelyHypocrisy({ question_ids: [1, 1, 2, 2] })),
    makeInput({ questions })
  )
  assert.equal(result.valid, false)
  assert.ok(result.errors.some(error => error.includes('duplicate question IDs')))
  assert.ok(result.errors.some(error => error.includes('all independent')))
})

test('accepts structurally valid likely hypocrisy with repeated, cross-domain evidence', () => {
  const questions = validHypocrisyEvidence()
  const result = validateAnalysisEvidence(
    makeAnalysis(likelyHypocrisy()),
    makeInput({ questions })
  )
  assert.deepEqual(result, { valid: true, errors: [] })
})

test('cross-domain evidence is sufficient even when real-bank item families are all base', () => {
  const questions = [
    makeEvidence({ id: 1, questionType: 'conceptual', domain: 'Domain A', family: 'base' }),
    makeEvidence({ id: 2, questionType: 'conceptual', domain: 'Domain B', family: 'base' }),
    makeEvidence({ id: 3, questionType: 'applied', domain: 'Domain C', family: 'base' }),
    makeEvidence({ id: 4, questionType: 'applied', domain: 'Domain D', family: 'base' })
  ]
  const result = validateAnalysisEvidence(makeAnalysis(likelyHypocrisy()), makeInput({ questions }))
  assert.deepEqual(result, { valid: true, errors: [] })
})

test('likely hypocrisy requires high confidence', () => {
  const questions = validHypocrisyEvidence()
  const result = validateAnalysisEvidence(
    makeAnalysis(likelyHypocrisy({ confidence: 'medium' })),
    makeInput({ questions })
  )
  assert.equal(result.valid, false)
  assert.ok(result.errors.some(error => error.includes('requires high confidence')))
})

test('likely hypocrisy requires an explicit coherent-exception and symmetry analysis', () => {
  const questions = validHypocrisyEvidence()
  const result = validateAnalysisEvidence(
    makeAnalysis(likelyHypocrisy({ why_it_may_be_coherent: [], generalization_test: ' ' })),
    makeInput({ questions })
  )
  assert.equal(result.valid, false)
  assert.ok(result.errors.some(error => error.includes('analyze coherent exceptions and symmetry')))
})

test('possible hypocrisy requires a strongly endorsed principle, repeated applied evidence, and medium confidence', () => {
  const questions = [
    makeEvidence({ id: 1, questionType: 'conceptual', response: 2 }),
    makeEvidence({ id: 2, questionType: 'applied' }),
    makeEvidence({ id: 3, questionType: 'applied' })
  ]
  const accepted = validateAnalysisEvidence(
    makeAnalysis({ classification: 'possible_hypocrisy', confidence: 'medium', question_ids: [1, 2, 3] }),
    makeInput({ questions })
  )
  assert.equal(accepted.valid, true)

  const rejected = validateAnalysisEvidence(
    makeAnalysis({ classification: 'possible_hypocrisy', confidence: 'low', question_ids: [2, 3] }),
    makeInput({ questions })
  )
  assert.equal(rejected.valid, false)
  assert.ok(rejected.errors.some(error => error.includes('strongly endorsed broad principle')))
})

test('rejects irrational tension without two independent commitments', () => {
  const questions = [makeEvidence({ id: 1 })]
  const result = validateAnalysisEvidence(
    makeAnalysis({ classification: 'irrational_tension', confidence: 'high', question_ids: [1] }),
    makeInput({ questions })
  )
  assert.equal(result.valid, false)
  assert.ok(result.errors.some(error => error.includes('two independent commitments')))
})

test('accepts an irrational tension with two distinct, cited commitments', () => {
  const questions = [makeEvidence({ id: 1 }), makeEvidence({ id: 2 })]
  const result = validateAnalysisEvidence(
    makeAnalysis({ classification: 'irrational_tension', confidence: 'high', question_ids: [1, 2] }),
    makeInput({ questions })
  )
  assert.equal(result.valid, true)
})

test('rejects a nonexistent question ID', () => {
  const questions = [makeEvidence({ id: 1 })]
  const result = validateAnalysisEvidence(
    makeAnalysis({ question_ids: [999] }),
    makeInput({ questions })
  )
  assert.equal(result.valid, false)
  assert.ok(result.errors.some(error => error.includes('nonexistent or wrong-bank question 999')))
})

test('rejects a nonexistent axis ID', () => {
  const questions = [makeEvidence({ id: 1 })]
  const result = validateAnalysisEvidence(
    makeAnalysis({ axis_ids: ['MISSING'], question_ids: [] }),
    makeInput({ questions })
  )
  assert.equal(result.valid, false)
  assert.ok(result.errors.some(error => error.includes('nonexistent axis MISSING')))
})

test('rejects a nonexistent collision pair ID', () => {
  const questions = [makeEvidence({ id: 1 })]
  const result = validateAnalysisEvidence(
    makeAnalysis({ pair_ids: ['A1|B1'], question_ids: [] }),
    makeInput({ questions })
  )
  assert.equal(result.valid, false)
  assert.ok(result.errors.some(error => error.includes('nonexistent collision pair A1|B1')))
})

test('rejects a cited question from the wrong pinned bank', () => {
  const questions = [makeEvidence({ id: 1, bankVersion: 'v2.2' })]
  const result = validateAnalysisEvidence(
    makeAnalysis({ question_ids: [1] }),
    makeInput({ questions, bankVersion: 'v2.1' })
  )
  assert.equal(result.valid, false)
  assert.ok(result.errors.some(error => error.includes('question 1 is from bank v2.2')))
})

test('accepts valid historical-bank evidence without consulting the active bank', () => {
  const questions = [makeEvidence({ id: 1, bankVersion: 'v2.0' })]
  const result = validateAnalysisEvidence(
    makeAnalysis({ question_ids: [1] }),
    makeInput({ questions, bankVersion: 'v2.0' })
  )
  assert.deepEqual(result, { valid: true, errors: [] })
})

test('rejects a question unrelated to every cited axis and pair', () => {
  const questions = [makeEvidence({ id: 1, axisId: 'B1' })]
  const result = validateAnalysisEvidence(
    makeAnalysis({ axis_ids: ['A1'], question_ids: [1] }),
    makeInput({ questions, axes: ['A1', 'B1'] })
  )
  assert.equal(result.valid, false)
  assert.ok(result.errors.some(error => error.includes('not relevant to the cited axes or pair')))
})

test('a low-coverage axis cannot support a definitive high-confidence finding', () => {
  const questions = [makeEvidence({ id: 1 })]
  const input = makeInput({ questions })
  input.profile.core_axes[0].coverage = 0.4
  const result = validateAnalysisEvidence(
    makeAnalysis({ confidence: 'high', question_ids: [1] }),
    input
  )
  assert.equal(result.valid, false)
  assert.ok(result.errors.some(error => error.includes('low-coverage axis A1')))
})

test('insufficient scorer confidence blocks high-confidence findings even at full coverage', () => {
  const questions = [makeEvidence({ id: 1 })]
  const input = makeInput({ questions })
  input.profile.core_axes[0].confidence = 'insufficient'
  const result = validateAnalysisEvidence(
    makeAnalysis({ confidence: 'high', question_ids: [1] }),
    input
  )
  assert.equal(result.valid, false)
  assert.ok(result.errors.some(error => error.includes('insufficient scorer confidence')))
})

test('knowledge-gap deterministic thresholds dominate a low-salience model label', () => {
  const questions = [makeEvidence({ id: 1 })]
  const topic = {
    topic: 'Monetary policy', total_items: 6, recorded_items: 6, numeric_items: 2,
    not_sure_items: 4, neutral_items: 0, directional_items: 2, strong_items: 1,
    coverage: 1 / 3, not_sure_rate: 2 / 3, neutral_rate_among_numeric: 0,
    mean_intensity: 0.75, strong_rate_among_numeric: 0.5,
    negative_pole_share: 0, positive_pole_share: 1, net_primary_contribution: 1,
    classification: 'possible_knowledge_gap', confidence: 'medium', supporting_question_ids: [1]
  }
  const input = makeInput({ questions, topics: [topic] })
  const analysis = makeAnalysis()
  analysis.engagement_and_knowledge.topics = [{
    topic: 'Monetary policy', classification: 'apparent_low_salience', confidence: 'medium',
    analysis: 'The topic seems unimportant.', alternative_explanations: ['It could instead reflect uncertainty.'],
    question_ids: [1]
  }]
  const result = validateAnalysisEvidence(analysis, input)
  assert.equal(result.valid, false)
  assert.ok(result.errors.some(error => error.includes('knowledge-gap thresholds dominate')))
})

test('insufficient deterministic topic evidence cannot support a high-confidence topic finding', () => {
  const questions = [makeEvidence({ id: 1 })]
  const topic = {
    topic: 'Sparse topic', total_items: 1, recorded_items: 1, numeric_items: 1,
    not_sure_items: 0, neutral_items: 0, directional_items: 1, strong_items: 1,
    coverage: 1, not_sure_rate: 0, neutral_rate_among_numeric: 0,
    mean_intensity: 1, strong_rate_among_numeric: 1,
    negative_pole_share: 0, positive_pole_share: 1, net_primary_contribution: 1,
    classification: 'insufficient_evidence', confidence: 'low', supporting_question_ids: [1]
  }
  const input = makeInput({ questions, topics: [topic] })
  const analysis = makeAnalysis()
  analysis.engagement_and_knowledge.topics = [{
    topic: 'Sparse topic', classification: 'strongly_engaged', confidence: 'high',
    analysis: 'A definitive claim.', alternative_explanations: ['The sample is sparse.'], question_ids: [1]
  }]
  const result = validateAnalysisEvidence(analysis, input)
  assert.equal(result.valid, false)
  assert.ok(result.errors.some(error => error.includes('insufficient topic evidence cannot be high confidence')))
})

test('topic citations must belong to the named deterministic topic', () => {
  const questions = [
    makeEvidence({ id: 1, domain: 'Named topic' }),
    makeEvidence({ id: 2, domain: 'Named topic' }),
    makeEvidence({ id: 3, domain: 'Named topic' }),
    makeEvidence({ id: 4, domain: 'Named topic' }),
    makeEvidence({ id: 5, domain: 'Different topic' })
  ]
  const topics = buildTopicSignals(questions)
  const analysis = makeAnalysis()
  analysis.engagement_and_knowledge.topics = [{
    topic: 'Named topic', classification: topics.find(topic => topic.topic === 'Named topic').classification,
    confidence: 'medium', analysis: 'A grounded topic assessment.',
    alternative_explanations: ['Another explanation remains possible.'], question_ids: [5]
  }]
  const result = validateAnalysisEvidence(analysis, makeInput({ questions, topics }))
  assert.equal(result.valid, false)
  assert.ok(result.errors.some(error => error.includes('question 5 is not evidence for topic Named topic')))
})

test('model topic labels cannot contradict decisive deterministic engagement thresholds', () => {
  const questions = [1, 2, 3, 4].map(id => makeEvidence({ id, response: 2, domain: 'Strong topic' }))
  const topics = buildTopicSignals(questions)
  const analysis = makeAnalysis()
  analysis.engagement_and_knowledge.topics = [{
    topic: 'Strong topic', classification: 'possible_knowledge_gap', confidence: 'medium',
    analysis: 'An unsupported uncertainty claim.', alternative_explanations: ['Strong engagement is possible.'],
    question_ids: [1, 2, 3, 4]
  }]
  const result = validateAnalysisEvidence(analysis, makeInput({ questions, topics }))
  assert.equal(result.valid, false)
  assert.ok(result.errors.some(error => error.includes('must respect deterministic topic result strongly_engaged')))
})

test('avoidance or ambivalence is accepted only from its exact deterministic review candidate', () => {
  const questions = [
    makeEvidence({ id: 1, domain: 'Narrow A' }),
    makeEvidence({ id: 2, domain: 'Narrow B' }),
    makeEvidence({ id: 3, domain: 'Narrow C' }),
    makeEvidence({ id: 4, domain: 'Narrow D' })
  ]
  const input = makeInput({ questions, topics: buildTopicSignals(questions) })
  input.candidate_tensions = [{
    candidate_id: 'avoidance:Shared controversy', source: 'controversy_stress', axis_ids: ['A1'],
    question_ids: [1, 2, 3, 4], pair_ids: [], factual_summary: 'A model-reviewed candidate.',
    deterministic_strength: 0.75, coverage_confidence: 'medium'
  }]
  const analysis = makeAnalysis()
  analysis.engagement_and_knowledge.topics = [{
    topic: 'Shared controversy', classification: 'possible_avoidance_or_ambivalence', confidence: 'medium',
    analysis: 'Several readings remain plausible.', alternative_explanations: ['Deliberate moderation is possible.'],
    question_ids: [1, 2, 3, 4]
  }]
  assert.deepEqual(validateAnalysisEvidence(analysis, input), { valid: true, errors: [] })

  analysis.engagement_and_knowledge.topics[0].topic = 'Invented controversy'
  const rejected = validateAnalysisEvidence(analysis, input)
  assert.equal(rejected.valid, false)
  assert.ok(rejected.errors.some(error => error.includes('requires a deterministic review candidate')))
})

test('facet center explanations must match the deterministic facet center shape', () => {
  const questions = [makeEvidence({ id: 1, axisId: 'F1' })]
  const input = makeInput({ questions })
  input.profile.facets.push({
    axis_id: 'F1', name: 'Facet F1', score: 0.02, pole_negative: 'Negative', pole_positive: 'Positive',
    favored_pole: 'Positive', coverage: 1, confidence: 'high', conceptual_score: 0.1,
    applied_score: 0.05, center_shape: 'low_intensity_center'
  })
  const analysis = makeAnalysis()
  analysis.center_explanations = [{
    axis_id: 'F1', shape: 'contextual_center', analysis: 'A mismatched facet explanation.', question_ids: [1]
  }]
  const result = validateAnalysisEvidence(analysis, input)
  assert.equal(result.valid, false)
  assert.ok(result.errors.some(error => error.includes('shape must match deterministic classification low_intensity_center')))
})

test('a coherent domain exception requires a generalizable rule and repeated domain evidence', () => {
  const questions = [
    makeEvidence({ id: 1, domain: 'Network utility' }),
    makeEvidence({ id: 2, domain: 'Network utility' })
  ]
  const analysis = makeAnalysis()
  analysis.domain_specific_exceptions = [{
    title: 'Utility exception', status: 'coherent', analysis: 'The exception may be coherent.',
    generalizable_rule: null, analogous_case_test: 'Apply the rule to another network monopoly.',
    axis_ids: ['A1'], question_ids: [1, 2]
  }]
  const result = validateAnalysisEvidence(analysis, makeInput({ questions }))
  assert.equal(result.valid, false)
  assert.ok(result.errors.some(error => error.includes('requires a generalizable rule')))
})
