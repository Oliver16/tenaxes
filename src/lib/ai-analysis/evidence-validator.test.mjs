import assert from 'node:assert/strict'
import test from 'node:test'

import { validateAnalysisEvidence } from './evidence-validator.ts'
import { personalizedAnalysisSchema } from './schema.ts'
import { buildTopicSignals } from './signals.ts'
import { makeAnalysis, makeEvidence, makeInput } from './__tests__/helpers.mjs'
import { getSyntheticFixture } from './fixtures/index.ts'

function validHypocrisyEvidence(bankVersion = 'v2.2') {
  return [
    makeEvidence({ id: 1, bankVersion, questionType: 'conceptual', domain: 'Principle A', family: 'principle-a' }),
    makeEvidence({ id: 2, bankVersion, questionType: 'conceptual', domain: 'Principle B', family: 'principle-b' }),
    makeEvidence({ id: 3, bankVersion, questionType: 'applied', response: -2, domain: 'Applied A', family: 'application-a' }),
    makeEvidence({ id: 4, bankVersion, questionType: 'applied', response: -2, domain: 'Applied B', family: 'application-b' })
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

test('historical schema remains readable while generation rejects a cutoff headline', () => {
  const analysis = makeAnalysis()
  analysis.headline = 'A market- and property-oriented, culturally traditional, sovereignist profile with constitutional constraints and strong willingness to make bounded exceptions for infrastructure, security, and high-'
  assert.equal(personalizedAnalysisSchema.safeParse(analysis).success, true)

  const result = validateAnalysisEvidence(analysis, makeInput({ questions: [makeEvidence({ id: 1 })] }))
  assert.equal(result.valid, false)
  assert.ok(result.errors.some(error => error.startsWith('headline:')))
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
    makeEvidence({ id: 3, questionType: 'applied', response: -2, domain: 'Domain C', family: 'base' }),
    makeEvidence({ id: 4, questionType: 'applied', response: -2, domain: 'Domain D', family: 'base' })
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
    makeEvidence({ id: 2, questionType: 'applied', response: -2 }),
    makeEvidence({ id: 3, questionType: 'applied', response: -2 })
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

test('possible hypocrisy cannot rely on an insufficient-confidence axis', () => {
  const questions = [
    makeEvidence({ id: 1, questionType: 'conceptual', response: 2 }),
    makeEvidence({ id: 2, questionType: 'applied', response: -2 }),
    makeEvidence({ id: 3, questionType: 'applied', response: -2 })
  ]
  const input = makeInput({ questions })
  input.profile.core_axes[0].confidence = 'insufficient'
  const result = validateAnalysisEvidence(
    makeAnalysis({ classification: 'possible_hypocrisy', confidence: 'medium', question_ids: [1, 2, 3] }),
    input
  )
  assert.equal(result.valid, false)
  assert.ok(result.errors.some(error => error.includes('at least medium scorer reliability')))
})

test('rejects hypocrisy labels when conceptual and applied evidence is directionally aligned', () => {
  const questions = [
    makeEvidence({ id: 1, questionType: 'conceptual', domain: 'Principle A' }),
    makeEvidence({ id: 2, questionType: 'conceptual', domain: 'Principle B' }),
    makeEvidence({ id: 3, questionType: 'applied', domain: 'Applied A' }),
    makeEvidence({ id: 4, questionType: 'applied', domain: 'Applied B' })
  ]
  const likely = validateAnalysisEvidence(makeAnalysis(likelyHypocrisy()), makeInput({ questions }))
  assert.equal(likely.valid, false)
  assert.ok(likely.errors.some(error => error.includes('directionally opposing applications')))

  const possible = validateAnalysisEvidence(
    makeAnalysis({ classification: 'possible_hypocrisy', confidence: 'medium', question_ids: [1, 3, 4] }),
    makeInput({ questions })
  )
  assert.equal(possible.valid, false)
  assert.ok(possible.errors.some(error => error.includes('strongly endorsed broad principle')))
})

test('every cited axis must have its own supporting evidence', () => {
  const questions = validHypocrisyEvidence().map(question => ({ ...question, primary_axis_id: 'A1' }))
  const result = validateAnalysisEvidence(
    makeAnalysis(likelyHypocrisy({ axis_ids: ['A1', 'B1'] })),
    makeInput({ questions, axes: ['A1', 'B1'] })
  )
  assert.equal(result.valid, false)
  assert.ok(result.errors.some(error => error.includes('cited axis B1 has no supporting question evidence')))
})

test('clarification and tension identifiers are unique and reciprocally linked', () => {
  const questions = [makeEvidence({ id: 1 }), makeEvidence({ id: 2 })]
  const analysis = makeAnalysis({
    tension_id: 'duplicate', question_ids: [1, 2], clarifying_question_id: 'missing'
  })
  analysis.tensions.push({ ...analysis.tensions[0] })
  analysis.clarifying_questions = [
    { clarification_id: 'duplicate-id', question: 'First?', why_it_matters: 'It matters.', related_tension_ids: ['duplicate'] },
    { clarification_id: 'duplicate-id', question: 'Second?', why_it_matters: 'It matters too.', related_tension_ids: ['duplicate'] }
  ]
  const result = validateAnalysisEvidence(analysis, makeInput({ questions }))
  assert.equal(result.valid, false)
  assert.ok(result.errors.some(error => error.includes('tension_id values must be unique')))
  assert.ok(result.errors.some(error => error.includes('clarification_id values must be unique')))
  assert.ok(result.errors.some(error => error.includes('nonexistent clarification missing')))
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

test('rejects same-direction answers as an irrational tension without an incompatibility candidate', () => {
  const questions = [makeEvidence({ id: 1 }), makeEvidence({ id: 2 })]
  const result = validateAnalysisEvidence(
    makeAnalysis({ classification: 'irrational_tension', confidence: 'high', question_ids: [1, 2] }),
    makeInput({ questions })
  )
  assert.equal(result.valid, false)
  assert.ok(result.errors.some(error => error.includes('strong deterministic incompatibility candidate')))
})

test('fixture D supports an irrational tension with two incompatible commitment sets', () => {
  const fixture = getSyntheticFixture('D')
  const input = makeInput({
    questions: fixture.evidence, axes: ['C2', 'F1'], bankVersion: fixture.evidence[0].bank_version
  })
  input.candidate_tensions = fixture.candidate_tensions
  const analysis = makeAnalysis({
    classification: 'irrational_tension', axis_ids: ['C2', 'F1'],
    question_ids: fixture.evidence.map(question => question.question_id)
  })
  analysis.defining_commitments.forEach(commitment => {
    commitment.axis_ids = ['C2']
    commitment.question_ids = [9401]
  })
  assert.deepEqual(validateAnalysisEvidence(analysis, input), { valid: true, errors: [] })
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

test('overall selectively engaged label follows the deterministic profile threshold', () => {
  const questions = [
    ...[1, 2, 3, 4].map(id => makeEvidence({ id, response: 2, domain: 'Engaged A' })),
    ...[5, 6, 7, 8].map(id => makeEvidence({ id, response: -2, domain: 'Engaged B' })),
    ...[9, 10, 11, 12, 13].map(id => makeEvidence({ id, response: 0, domain: 'Low A' })),
    makeEvidence({ id: 14, response: null, domain: 'Low B' }),
    makeEvidence({ id: 15, response: null, domain: 'Low B' }),
    makeEvidence({ id: 16, response: 1, domain: 'Low B' }),
    makeEvidence({ id: 17, response: 0, domain: 'Low B' })
  ]
  const input = makeInput({ questions, topics: buildTopicSignals(questions) })
  const analysis = makeAnalysis()
  const rejected = validateAnalysisEvidence(analysis, input)
  assert.equal(rejected.valid, false)
  assert.ok(rejected.errors.some(error => error.includes('deterministic profile is selectively_engaged')))

  analysis.overall_assessment.engagement = 'selectively_engaged'
  assert.deepEqual(validateAnalysisEvidence(analysis, input), { valid: true, errors: [] })
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

test('every deterministic near-center axis must be explained exactly once', () => {
  const questions = [makeEvidence({ id: 1 })]
  const input = makeInput({ questions })
  input.profile.core_axes[0].center_shape = 'counterbalanced_center'
  const missing = validateAnalysisEvidence(makeAnalysis(), input)
  assert.equal(missing.valid, false)
  assert.ok(missing.errors.some(error => error.includes('near-center axis A1 must be explained exactly once')))

  const analysis = makeAnalysis()
  analysis.center_explanations = [1, 2].map(() => ({
    axis_id: 'A1', shape: 'counterbalanced_center', analysis: 'Strong commitments offset.', question_ids: [1]
  }))
  const duplicate = validateAnalysisEvidence(analysis, input)
  assert.equal(duplicate.valid, false)
  assert.ok(duplicate.errors.some(error => error.includes('each near-center axis must be explained exactly once')))
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

test('domain exceptions and principled-exception tensions require deterministic and reciprocal support', () => {
  const questions = [
    makeEvidence({ id: 1, domain: 'Network utility' }),
    makeEvidence({ id: 2, domain: 'Network utility' })
  ]
  const input = makeInput({ questions })
  const analysis = makeAnalysis({
    classification: 'principled_domain_exception', question_ids: [1, 2]
  })
  analysis.domain_specific_exceptions = [{
    title: 'Utility exception', status: 'coherent', analysis: 'A rule may explain it.',
    generalizable_rule: 'Use public provision for natural monopolies.',
    analogous_case_test: 'Apply the same rule to water distribution.', axis_ids: ['A1'], question_ids: [1, 2]
  }]
  const rejected = validateAnalysisEvidence(analysis, input)
  assert.equal(rejected.valid, false)
  assert.ok(rejected.errors.some(error => error.includes('must match a deterministic opposite-direction exception candidate')))

  input.candidate_tensions = [{
    candidate_id: 'domain:A1:utility', source: 'domain_exception', axis_ids: ['A1'],
    question_ids: [1, 2], pair_ids: [], deterministic_strength: 0.8,
    coverage_confidence: 'medium', factual_summary: 'Opposite-direction domain evidence.'
  }]
  assert.deepEqual(validateAnalysisEvidence(analysis, input), { valid: true, errors: [] })
})

test('selective application requires repeated applied evidence and a matching deterministic candidate', () => {
  const questions = [
    makeEvidence({ id: 1, questionType: 'conceptual' }),
    makeEvidence({ id: 2, questionType: 'applied' }),
    makeEvidence({ id: 3, questionType: 'applied' })
  ]
  const input = makeInput({ questions })
  const analysis = makeAnalysis({ classification: 'selective_application', question_ids: [1, 2, 3] })
  const rejected = validateAnalysisEvidence(analysis, input)
  assert.equal(rejected.valid, false)
  assert.ok(rejected.errors.some(error => error.includes('matching deterministic candidate')))

  input.candidate_tensions = [{
    candidate_id: 'gap:A1', source: 'conceptual_applied_gap', axis_ids: ['A1'],
    question_ids: [1, 2, 3], pair_ids: [], deterministic_strength: 0.6,
    coverage_confidence: 'medium', factual_summary: 'Conceptual and applied scores differ.'
  }]
  const aligned = validateAnalysisEvidence(analysis, input)
  assert.equal(aligned.valid, false)
  assert.ok(aligned.errors.some(error => error.includes('directionally uneven')))

  questions[1].response = -2
  questions[2].response = -2
  assert.deepEqual(validateAnalysisEvidence(analysis, input), { valid: true, errors: [] })
})

test('fixture B selective application is supported by its self-serving domain candidate', () => {
  const fixture = getSyntheticFixture('B')
  const input = makeInput({
    questions: fixture.evidence, axes: ['C1'], bankVersion: fixture.evidence[0].bank_version
  })
  input.candidate_tensions = fixture.candidate_tensions
  const analysis = makeAnalysis({
    classification: 'selective_application', axis_ids: ['C1'],
    question_ids: fixture.evidence.map(question => question.question_id)
  })
  analysis.defining_commitments.forEach(commitment => {
    commitment.axis_ids = ['C1']
    commitment.question_ids = [9201]
  })
  analysis.domain_specific_exceptions = [{
    title: 'Own-industry exception', status: 'self_serving_risk',
    analysis: 'The exception protects the respondent-associated industry while rejecting analogous cases.',
    generalizable_rule: null, analogous_case_test: 'Apply the rule to water and rail networks.',
    axis_ids: ['C1'], question_ids: [9203, 9204]
  }]
  assert.deepEqual(validateAnalysisEvidence(analysis, input), { valid: true, errors: [] })
})

test('pair-only selective application can use an exact collision candidate', () => {
  const questions = [1, 2, 3].map(id => makeEvidence({ id, questionType: 'applied' }))
  questions[2].response = -2
  questions.forEach(question => {
    question.tradeoff_links = [{ axis_id: 'B1', axis_key: 1, weight: 1, role: 'tradeoff' }]
  })
  const input = makeInput({ questions, axes: ['A1', 'B1'], pairs: ['A1|B1'] })
  input.candidate_tensions = [{
    candidate_id: 'pair:A1|B1', source: 'collision_pair', axis_ids: ['A1', 'B1'],
    question_ids: [2, 3], pair_ids: ['A1|B1'], deterministic_strength: 0.8,
    coverage_confidence: 'medium', factual_summary: 'Repeated mirrored applications differ.'
  }]
  const analysis = makeAnalysis({
    classification: 'selective_application', axis_ids: [], pair_ids: ['A1|B1'], question_ids: [2, 3]
  })
  assert.deepEqual(validateAnalysisEvidence(analysis, input), { valid: true, errors: [] })
})
