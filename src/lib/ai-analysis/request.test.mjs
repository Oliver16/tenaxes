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

test('cumulative clarification lineage is bounded by unique answer count', () => {
  const inherited = Array.from({ length: 10 }, (_, index) => ({
    clarification_id: `earlier-${index}`,
    answer: 'retained answer'
  }))
  assert.throws(() => mergeClarificationAnswers(inherited, [{
    clarification_id: 'new-question', answer: 'new answer'
  }]), error => error instanceof RequestValidationError && /at most 10/.test(error.message))

  const replacement = mergeClarificationAnswers(inherited, [{
    clarification_id: 'earlier-0', answer: 'replacement'
  }])
  assert.equal(replacement.length, 10)
  assert.equal(replacement[0].answer, 'replacement')
})

test('cumulative clarification lineage is bounded by total retained characters', () => {
  const inherited = Array.from({ length: 8 }, (_, index) => ({
    clarification_id: `earlier-${index}`,
    answer: 'x'.repeat(1000)
  }))
  assert.equal(mergeClarificationAnswers(inherited, []).length, 8)
  assert.throws(() => mergeClarificationAnswers(inherited, [{
    clarification_id: 'new-question', answer: 'y'
  }]), error => error instanceof RequestValidationError && /total 8000/.test(error.message))
})
