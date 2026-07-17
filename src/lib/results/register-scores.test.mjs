import assert from 'node:assert/strict'
import test from 'node:test'

import { resolveRegisterScores } from './register-scores.ts'

const AXES = {
  C1: { id: 'C1', name: 'Economic coordination' },
  C2: { id: 'C2', name: 'Public guarantees' }
}

function question({ id, axis = 'C1', key = 1, type = 'conceptual', links } = {}) {
  return {
    id,
    axis_id: axis,
    key,
    weight: 1,
    question_type: type,
    question_axis_links: links ?? [{
      id,
      question_id: id,
      axis_id: axis,
      role: 'primary',
      axis_key: key,
      weight: 1
    }]
  }
}

test('preserves a non-empty stored register profile', () => {
  const stored = [{
    axis_id: 'C1',
    name: 'Stored name',
    score: 0.42,
    raw_sum: 0.84,
    total_weight: 1,
    confidence: 2,
    response_variance: 0
  }]

  const resolved = resolveRegisterScores(
    stored,
    { 1: -2 },
    [question({ id: 1 })],
    AXES
  )

  assert.equal(resolved, stored)
})

test('reconstructs a missing register with production link scoring', () => {
  const resolved = resolveRegisterScores(
    null,
    { 1: 2 },
    [question({
      id: 1,
      links: [
        { id: 1, question_id: 1, axis_id: 'C1', role: 'primary', axis_key: 1, weight: 1 },
        { id: 2, question_id: 1, axis_id: 'C2', role: 'tradeoff', axis_key: -1, weight: 1 }
      ]
    })],
    AXES
  )

  assert.equal(resolved.length, 1)
  assert.equal(resolved[0].axis_id, 'C1')
  assert.equal(resolved[0].score, 1)
  assert.equal(resolved.some(score => score.axis_id === 'C2'), false)
})

test('reconstructs an answered neutral instead of treating it as missing', () => {
  const resolved = resolveRegisterScores(
    {},
    { 1: 0 },
    [question({ id: 1 })],
    AXES
  )

  assert.equal(resolved.length, 1)
  assert.equal(resolved[0].score, 0)
})

test('null responses remain unscored during reconstruction', () => {
  const resolved = resolveRegisterScores(
    [],
    { 1: null },
    [question({ id: 1 })],
    AXES
  )

  assert.deepEqual(resolved, [])
})
