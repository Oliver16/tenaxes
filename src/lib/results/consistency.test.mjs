import assert from 'node:assert/strict'
import test from 'node:test'

import { computeConsistency, ratingBand } from './consistency.ts'

const AXIS_IDS = [
  'C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8', 'C9',
  'C10', 'C11', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7'
]

function scores(values) {
  return AXIS_IDS.slice(0, values.length).map((axis_id, index) => ({
    axis_id,
    name: axis_id,
    score: values[index]
  }))
}

function fullCoverage(value = 1) {
  return AXIS_IDS.map(axis_id => ({ axis_id, coverage: value }))
}

const ADEQUATE_EVIDENCE = {
  conceptualCoverage: fullCoverage(),
  appliedCoverage: fullCoverage()
}

test('alignment bands use the stricter calibrated boundaries', () => {
  assert.equal(ratingBand(90).label, 'Highly aligned')
  assert.equal(ratingBand(89).label, 'Broadly aligned')
  assert.equal(ratingBand(82).label, 'Broadly aligned')
  assert.equal(ratingBand(81).label, 'Mixed')
  assert.equal(ratingBand(65).label, 'Mixed')
  assert.equal(ratingBand(64).label, 'Different under constraint')
})

test('identical directional profiles score 100', () => {
  const profile = scores(AXIS_IDS.map(() => 0.6))
  const result = computeConsistency(profile, profile, ADEQUATE_EVIDENCE)

  assert.equal(result?.rating, 100)
  assert.equal(result?.band.label, 'Highly aligned')
  assert.equal(result?.rootMeanSquareGap, 0)
})

test('RMS scoring does not hide localized full reversals in the 18-axis average', () => {
  const baseline = AXIS_IDS.map(() => 0)

  const oneReversal = computeConsistency(
    scores([1, ...baseline.slice(1)]),
    scores([-1, ...baseline.slice(1)]),
    ADEQUATE_EVIDENCE
  )
  const twoReversals = computeConsistency(
    scores([1, 1, ...baseline.slice(2)]),
    scores([-1, -1, ...baseline.slice(2)]),
    ADEQUATE_EVIDENCE
  )
  const threeReversals = computeConsistency(
    scores([1, 1, 1, ...baseline.slice(3)]),
    scores([-1, -1, -1, ...baseline.slice(3)]),
    ADEQUATE_EVIDENCE
  )

  assert.equal(oneReversal?.rating, 76)
  assert.equal(oneReversal?.band.label, 'Mixed')
  assert.equal(twoReversals?.rating, 67)
  assert.equal(twoReversals?.band.label, 'Mixed')
  assert.equal(threeReversals?.rating, 59)
  assert.equal(threeReversals?.band.label, 'Different under constraint')
})

test('a single conspicuous gap caps an otherwise high aggregate rating', () => {
  const conceptual = scores(AXIS_IDS.map(() => 0.4))
  const halfPointGap = computeConsistency(
    conceptual,
    scores([-0.1, ...AXIS_IDS.slice(1).map(() => 0.4)]),
    ADEQUATE_EVIDENCE
  )
  const threeQuarterPointGap = computeConsistency(
    conceptual,
    scores([-0.35, ...AXIS_IDS.slice(1).map(() => 0.4)]),
    ADEQUATE_EVIDENCE
  )

  assert.equal(halfPointGap?.rating, 89)
  assert.equal(halfPointGap?.band.label, 'Broadly aligned')
  assert.equal(threeQuarterPointGap?.rating, 81)
  assert.equal(threeQuarterPointGap?.band.label, 'Mixed')
})

test('axis matching is independent of input order', () => {
  const conceptual = scores(AXIS_IDS.map((_, index) => index % 2 === 0 ? 0.7 : -0.4))
  const applied = [...conceptual].reverse()
  const result = computeConsistency(conceptual, applied, ADEQUATE_EVIDENCE)

  assert.equal(result?.rating, 100)
})

test('sparse profiles are left unrated', () => {
  const directional = scores(AXIS_IDS.map(() => 0.6))
  const lowCoverage = {
    conceptualCoverage: fullCoverage(0.49),
    appliedCoverage: fullCoverage()
  }

  assert.equal(computeConsistency(directional, directional, lowCoverage), null)
  assert.equal(computeConsistency(
    scores(AXIS_IDS.slice(0, 11).map(() => 0.6)),
    scores(AXIS_IDS.slice(0, 11).map(() => 0.6)),
    ADEQUATE_EVIDENCE
  ), null)
  assert.equal(computeConsistency(directional, directional, {}), null)
})

test('fully covered neutral profiles are rated with a low-directional caveat', () => {
  const neutral = scores(AXIS_IDS.map(() => 0))
  const nearMidpoint = scores(AXIS_IDS.map(() => 0.29))
  const directional = scores(AXIS_IDS.map(() => 0.31))
  const asymmetric = computeConsistency(
    scores(AXIS_IDS.map(() => 0.42)),
    neutral,
    ADEQUATE_EVIDENCE
  )
  const nearMidpointGap = computeConsistency(
    scores(AXIS_IDS.map(() => 0.1)),
    scores(AXIS_IDS.map(() => -0.1)),
    ADEQUATE_EVIDENCE
  )

  const neutralResult = computeConsistency(neutral, neutral, ADEQUATE_EVIDENCE)
  const nearMidpointResult = computeConsistency(nearMidpoint, nearMidpoint, ADEQUATE_EVIDENCE)
  const directionalResult = computeConsistency(directional, directional, ADEQUATE_EVIDENCE)

  assert.equal(neutralResult?.rating, 100)
  assert.equal(neutralResult?.band.label, 'Highly aligned')
  assert.equal(neutralResult?.lowDirectionalSignal, true)
  assert.equal(nearMidpointResult?.rating, 100)
  assert.equal(nearMidpointResult?.lowDirectionalSignal, true)
  assert.equal(nearMidpointGap?.rating, 90)
  assert.equal(nearMidpointGap?.lowDirectionalSignal, true)
  assert.equal(directionalResult?.lowDirectionalSignal, false)
  assert.equal(asymmetric?.lowDirectionalSignal, false)
})

test('exactly 12 dimensions at 50% register coverage remain eligible', () => {
  const profile = scores(AXIS_IDS.map(() => 0))
  const thresholdCoverage = AXIS_IDS.map((axis_id, index) => ({
    axis_id,
    coverage: index < 12 ? 0.5 : 0.49
  }))
  const result = computeConsistency(profile, profile, {
    conceptualCoverage: thresholdCoverage,
    appliedCoverage: thresholdCoverage
  })

  assert.equal(result?.gapCount, 12)
  assert.equal(result?.rating, 100)
})

test('a complete reversal on every dimension scores 0', () => {
  const result = computeConsistency(
    scores(AXIS_IDS.map(() => 1)),
    scores(AXIS_IDS.map(() => -1)),
    ADEQUATE_EVIDENCE
  )

  assert.equal(result?.rating, 0)
  assert.equal(result?.band.label, 'Different under constraint')
})
