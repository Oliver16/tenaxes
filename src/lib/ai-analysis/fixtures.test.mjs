import assert from 'node:assert/strict'
import test from 'node:test'

import { syntheticFixtures, SYNTHETIC_BANK_VERSION, getSyntheticFixture } from './fixtures/index.ts'
import { buildTopicSignals, classifyCenterShape } from './signals.ts'
import { makeCoverage } from './__tests__/helpers.mjs'
import {
  buildFixtureProviderInput,
  compareDeterministicExpectations
} from '../../../scripts/evaluate-ai-analysis.mjs'

test('fixture catalog contains exactly the required A-H scenarios', () => {
  assert.deepEqual(syntheticFixtures.map(fixture => fixture.id), ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'])
  assert.equal(new Set(syntheticFixtures.map(fixture => fixture.slug)).size, 8)
})

test('fixture evidence is bank-pinned, internally unique, and provider-safe', () => {
  const allQuestionIds = []
  for (const fixture of syntheticFixtures) {
    assert.ok(fixture.evidence.length >= 4, `${fixture.id} needs enough evidence to exercise a distinction`)
    assert.ok(fixture.candidate_tensions.length > 0, `${fixture.id} needs a deterministic candidate`)
    assert.ok(
      (fixture.expected.tension_any_of?.length ?? 0) > 0 ||
      Object.keys(fixture.expected.engagement_topics ?? {}).length > 0 ||
      Object.keys(fixture.expected.center_shapes ?? {}).length > 0,
      `${fixture.id} needs an expected classification`
    )
    for (const question of fixture.evidence) {
      assert.equal(question.bank_version, SYNTHETIC_BANK_VERSION)
      assert.ok(!('educational_content' in question), 'provider evidence should omit educational content')
      allQuestionIds.push(question.question_id)
    }
  }
  assert.equal(new Set(allQuestionIds).size, allQuestionIds.length)
})

test('fixture deterministic topic expectations match the signal engine', () => {
  for (const fixture of syntheticFixtures) {
    const signals = new Map(buildTopicSignals(fixture.evidence).map(signal => [signal.topic, signal]))
    for (const [topic, classification] of Object.entries(fixture.expected.deterministic_topics ?? {})) {
      assert.equal(signals.get(topic)?.classification, classification, `${fixture.id}:${topic}`)
    }
  }
})

test('fixture center-shape expectations match the signal engine', () => {
  for (const fixture of syntheticFixtures) {
    for (const [axisId, expectedShape] of Object.entries(fixture.expected.center_shapes ?? {})) {
      const axis = fixture.axes.find(item => item.axis_id === axisId)
      assert.ok(axis, `${fixture.id} is missing expected axis ${axisId}`)
      const signal = classifyCenterShape({
        axisId,
        score: axis.score,
        coverage: makeCoverage(axisId, fixture.evidence, axis.coverage_confidence),
        evidence: fixture.evidence,
        conceptualScore: axis.conceptual_score,
        appliedScore: axis.applied_score
      })
      assert.equal(signal.shape, expectedShape, `${fixture.id}:${axisId}`)
    }
  }
})

test('development harness builds privacy-safe provider input for every fixture without a live call', async () => {
  for (const fixture of syntheticFixtures) {
    const input = await buildFixtureProviderInput(fixture)
    assert.equal(input.bank_version, SYNTHETIC_BANK_VERSION)
    assert.equal(input.questions.length, fixture.evidence.length)
    assert.equal(input.response_summary.total_questions, fixture.evidence.length)
    assert.deepEqual(compareDeterministicExpectations(fixture, input), [])
    assert.equal('session_id' in input, false)
    assert.equal('user_id' in input, false)
    assert.equal('email' in input, false)
  }
})

test('fixture A encodes a generalizable public-utility rule rather than hypocrisy', () => {
  const fixture = getSyntheticFixture('A')
  assert.match(fixture.user_context, /network monopol|reliability|fixed capital/i)
  assert.ok(fixture.expected.tension_any_of.includes('principled_domain_exception'))
  assert.ok(fixture.expected.tension_none_of.includes('likely_hypocrisy'))
  assert.ok(fixture.expected.exception_status_any_of.includes('plausibly_coherent'))
  assert.ok(fixture.expected.clarification_keywords.some(word => /water|rail|transmission/.test(word)))
})

test('fixture B encodes self-serving and failed analogous-case evidence without overclaiming likely hypocrisy', () => {
  const fixture = getSyntheticFixture('B')
  assert.match(fixture.user_context, /my industry|our jobs/i)
  assert.ok(fixture.expected.tension_any_of.includes('selective_application'))
  assert.ok(fixture.expected.tension_none_of.includes('likely_hypocrisy'))
  assert.deepEqual(fixture.expected.exception_status_any_of, ['self_serving_risk'])
  const analogousDomains = new Set(fixture.evidence.slice(4).map(question => question.policy_domain))
  assert.deepEqual([...analogousDomains].sort(), ['Transport infrastructure', 'Water infrastructure'])
})

test('fixture C meets the repeated-evidence and symmetry shape for possible or likely speech hypocrisy', () => {
  const fixture = getSyntheticFixture('C')
  const conceptual = fixture.evidence.filter(question => question.question_type === 'conceptual')
  const applied = fixture.evidence.filter(question => question.question_type === 'applied')
  const appliedDomains = new Set(applied.map(question => question.policy_domain))
  assert.equal(conceptual.length, 2)
  assert.equal(applied.length, 4)
  assert.ok(appliedDomains.size >= 2)
  assert.ok(fixture.expected.tension_any_of.includes('likely_hypocrisy'))
  assert.match(fixture.candidate_tensions[0].factual_summary, /opponent.*ally|ally.*opponent/i)
})

test('fixture D explicitly rejects all named financing routes for its universal guarantees', () => {
  const fixture = getSyntheticFixture('D')
  const domains = new Set(fixture.evidence.map(question => question.policy_domain))
  assert.ok(domains.has('Taxation'))
  assert.ok(domains.has('Borrowing'))
  assert.ok(domains.has('Monetary policy'))
  assert.ok(domains.has('Budget tradeoffs'))
  assert.deepEqual(fixture.expected.tension_any_of, ['irrational_tension'])
  assert.match(fixture.candidate_tensions[0].factual_summary, /require resources/i)
})

test('fixture E is high-intensity counterbalance, not apathy or generic centrism', () => {
  const fixture = getSyntheticFixture('E')
  const signal = buildTopicSignals(fixture.evidence)[0]
  assert.equal(signal.classification, 'counterbalanced_convictions')
  assert.equal(signal.mean_intensity, 1)
  assert.equal(signal.negative_pole_share, 0.5)
  assert.equal(signal.positive_pole_share, 0.5)
  assert.ok(fixture.expected.tension_none_of.includes('possible_hypocrisy'))
})

test('fixture F is numeric-neutral low salience rather than a not-sure knowledge pattern', () => {
  const fixture = getSyntheticFixture('F')
  const signal = buildTopicSignals(fixture.evidence).find(item => item.topic === 'Foreign policy')
  assert.equal(signal.classification, 'apparent_low_salience')
  assert.equal(signal.not_sure_items, 0)
  assert.ok(signal.neutral_items >= 4)
  assert.ok(signal.mean_intensity <= 0.35)
})

test('fixture G is not-sure-heavy on the named technical subjects and is not apathy', () => {
  const fixture = getSyntheticFixture('G')
  const signals = new Map(buildTopicSignals(fixture.evidence).map(signal => [signal.topic, signal]))
  assert.equal(signals.get('Monetary policy').classification, 'possible_knowledge_gap')
  assert.equal(signals.get('International law').classification, 'possible_knowledge_gap')
  assert.ok(signals.get('Monetary policy').not_sure_rate >= 0.35)
  assert.notEqual(signals.get('Monetary policy').classification, 'apparent_low_salience')
})

test('fixture H satisfies the review-candidate shape for selective controversy ambivalence or avoidance', () => {
  const fixture = getSyntheticFixture('H')
  const stress = fixture.evidence.filter(question => question.item_family === 'controversy_stress')
  const conceptual = fixture.evidence.filter(question => question.question_type === 'conceptual')
  const ordinaryApplied = fixture.evidence.filter(question => question.item_family === 'ordinary_application')
  const stressNeutralRate = stress.filter(question => question.response === 0).length / stress.length
  const stressNotSureRate = stress.filter(question => question.response === null).length / stress.length
  const ordinaryIntensity = ordinaryApplied.reduce((sum, question) => sum + Math.abs(question.response) / 2, 0) / ordinaryApplied.length
  assert.ok(stress.length >= 4)
  assert.ok(stressNeutralRate >= 0.5)
  assert.ok(stressNotSureRate < 0.2)
  assert.ok(conceptual.every(question => Math.abs(question.response) === 2))
  assert.ok(Math.abs(fixture.axes[0].conceptual_score) >= 0.4)
  assert.ok(ordinaryIntensity >= 0.5)
  assert.equal(fixture.candidate_tensions[0].source, 'controversy_stress')
})
