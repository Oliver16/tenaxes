import assert from 'node:assert/strict'
import test from 'node:test'

import {
  SAMPLE_SESSION_ID,
  buildSampleResultAnalysis,
  isSampleSession,
  loadSampleResultAnalysis
} from './sample-result.ts'
import { computeConsistency } from './consistency.ts'

test('sample analysis is a complete deterministic v2.2 evaluation', () => {
  const sample = buildSampleResultAnalysis()
  const rebuilt = buildSampleResultAnalysis()

  assert.equal(SAMPLE_SESSION_ID, 'sample')
  assert.equal(sample.sessionId, SAMPLE_SESSION_ID)
  assert.equal(sample.bankVersion, 'v2.2')
  assert.equal(sample.questions.length, 350)
  assert.equal(sample.questions.filter(question => question.question_type === 'conceptual').length, 108)
  assert.equal(sample.questions.filter(question => question.question_type === 'applied').length, 242)
  assert.equal(sample.responseCount, 350)
  assert.equal(sample.conceptualCount + sample.appliedCount + sample.notSureCount, 350)
  assert.deepEqual(rebuilt.responses, sample.responses)
})

test('sample questions reproduce primary and tradeoff bank links', () => {
  const sample = loadSampleResultAnalysis()
  const primaryLinks = sample.questions.flatMap(question =>
    question.question_axis_links.filter(link => link.role === 'primary')
  )
  const tradeoffLinks = sample.questions.flatMap(question =>
    question.question_axis_links.filter(link => link.role === 'tradeoff')
  )

  assert.equal(primaryLinks.length, 350)
  assert.equal(tradeoffLinks.length, 48)
  assert.ok(tradeoffLinks.every(link => link.question_id >= 253 && link.question_id <= 300))
  assert.equal(new Set(tradeoffLinks.map(link => link.question_id)).size, 48)
})

test('sample drives the full scoring, archetype, and conflict pipeline', () => {
  const sample = loadSampleResultAnalysis()
  const countedConflicts = Object.values(sample.conflictCounts).reduce((sum, count) => sum + count, 0)

  assert.equal(sample.coreAxes.length, 11)
  assert.equal(sample.facets.length, 7)
  assert.equal(sample.conceptualScores.length, 18)
  assert.equal(sample.appliedScores.length, 18)
  assert.equal(sample.axisComparisons.length, 18)
  assert.equal(sample.axisCoverage.length, 18)
  assert.ok(sample.axisCoverage.every(coverage => coverage.confidence === 'high'))
  assert.ok(sample.topFlavors.length > 0)
  assert.equal(sample.tensionScores.length, 48)
  assert.equal(sample.collisionPairs.length, 24)
  assert.equal(countedConflicts, sample.collisionPairs.length)
  assert.ok(sample.conflictCounts.cross_pressured > 0)
  assert.ok(sample.conflictCounts.protected > 0)
  assert.ok(sample.conflictCounts.traded_away > 0)
  assert.ok(sample.conflictCounts.inconclusive > 0)

  const alignment = computeConsistency(sample.conceptualScores, sample.appliedScores, {
    conceptualCoverage: sample.conceptualCoverage,
    appliedCoverage: sample.appliedCoverage
  })
  assert.equal(alignment?.rating, 80)
  assert.equal(alignment?.band.label, 'Mixed')
})

test('sample session matching is case-insensitive and narrow', () => {
  assert.equal(isSampleSession('sample'), true)
  assert.equal(isSampleSession('SAMPLE'), true)
  assert.equal(isSampleSession('sample-result'), false)
  assert.equal(isSampleSession(' sample '), false)
})
