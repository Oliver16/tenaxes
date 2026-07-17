import assert from 'node:assert/strict'
import test from 'node:test'

import {
  mergeClarificationAnswers, mergeGeneralContext, RequestValidationError, validateGenerateRequest
} from './request.ts'

test('generation request trims context and rejects force-regeneration fields', () => {
  assert.deepEqual(validateGenerateRequest({ action: 'generate', general_context: '  context  ' }), {
    action: 'generate', general_context: 'context'
  })
  assert.throws(() => validateGenerateRequest({ action: 'generate', force: true }), RequestValidationError)
})

test('generation request rejects oversized context', () => {
  assert.throws(() => validateGenerateRequest({ action: 'generate', general_context: 'x'.repeat(2001) }), RequestValidationError)
})

test('refinement accepts at most five trimmed answers and rejects oversized answers', () => {
  const parent = '123e4567-e89b-42d3-a456-426614174000'
  const answers = Array.from({ length: 5 }, (_, i) => ({ clarification_id: `q${i}`, answer: ' yes ' }))
  assert.equal(validateGenerateRequest({ action: 'refine', parent_analysis_id: parent, clarification_answers: answers }).clarification_answers.length, 5)
  assert.throws(() => validateGenerateRequest({
    action: 'refine', parent_analysis_id: parent,
    clarification_answers: [...answers, { clarification_id: 'q6', answer: 'six' }]
  }), RequestValidationError)
  assert.throws(() => validateGenerateRequest({
    action: 'refine', parent_analysis_id: parent,
    clarification_answers: [{ clarification_id: 'q', answer: 'x'.repeat(1001) }]
  }), RequestValidationError)
})

test('refinement requires a UUID parent and strips blank optional answers', () => {
  assert.throws(() => validateGenerateRequest({ action: 'refine', parent_analysis_id: 'other-session', clarification_answers: [] }), RequestValidationError)
  const valid = validateGenerateRequest({
    action: 'refine', parent_analysis_id: '123e4567-e89b-42d3-a456-426614174000',
    clarification_answers: [{ clarification_id: 'q1', answer: '   ' }]
  })
  assert.deepEqual(valid.clarification_answers, [])
})

test('refinement context preserves prior context and clarification answers', () => {
  assert.equal(mergeGeneralContext('Original context', 'Additional context'), 'Original context\n\nAdditional context')
  assert.deepEqual(mergeClarificationAnswers(
    [{ clarification_id: 'first', answer: 'Earlier answer' }],
    [{ clarification_id: 'second', answer: 'New answer' }]
  ), [
    { clarification_id: 'first', answer: 'Earlier answer' },
    { clarification_id: 'second', answer: 'New answer' }
  ])
})

test('combined refinement context remains subject to the configured maximum', () => {
  assert.throws(() => mergeGeneralContext('a'.repeat(1500), 'b'.repeat(600)), RequestValidationError)
})
