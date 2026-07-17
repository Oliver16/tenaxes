import assert from 'node:assert/strict'
import test from 'node:test'

import {
  clarificationAnswersBelongToParent,
  decideGeneration,
  disabledAIAnalysisResponse,
  publicAnalysisMeta,
  remainingGenerationsFromCount
} from './api-policy.ts'

test('API generation gate returns a cache hit without a provider call even when capped or pending', () => {
  assert.deepEqual(decideGeneration({
    has_cached_analysis: true,
    has_pending_analysis: true,
    remaining_generations: 0
  }), { kind: 'cached', provider_call_required: false })
})

test('API generation gate prevents concurrent pending generation before starting a provider call', () => {
  assert.deepEqual(decideGeneration({
    has_cached_analysis: false,
    has_pending_analysis: true,
    remaining_generations: 3
  }), { kind: 'pending', provider_call_required: false })
})

test('API generation gate enforces the rolling generation cap', () => {
  assert.equal(remainingGenerationsFromCount(3, 3), 0)
  assert.deepEqual(decideGeneration({
    has_cached_analysis: false,
    has_pending_analysis: false,
    remaining_generations: 0
  }), { kind: 'capped', provider_call_required: false })
  assert.equal(remainingGenerationsFromCount(8, 3), 0)
})

test('API refinement accepts only clarification IDs issued by its parent analysis', () => {
  const allowed = ['clarification-1', 'clarification-2']
  assert.equal(clarificationAnswersBelongToParent(allowed, [
    { clarification_id: 'clarification-1' }
  ]), true)
  assert.equal(clarificationAnswersBelongToParent(allowed, [
    { clarification_id: 'different-analysis-question' }
  ]), false)
})

test('API public metadata preserves historical null bank versions without leaking private row fields', () => {
  const row = {
    id: 'analysis-id',
    stage: 'provisional',
    provider: 'openai',
    model: 'model-id',
    prompt_version: 'v1',
    schema_version: '1',
    bank_version: null,
    created_at: '2026-07-17T00:00:00.000Z',
    completed_at: '2026-07-17T00:00:01.000Z',
    context_json: { general_context: 'private context' },
    deterministic_signals: { private: true },
    provider_request_id: 'provider-request-id',
    user_id: 'user-id',
    error_message: 'private error'
  }
  const result = publicAnalysisMeta(row)
  assert.equal(result.bank_version, null)
  assert.deepEqual(Object.keys(result).sort(), [
    'bank_version', 'completed_at', 'created_at', 'id', 'model', 'prompt_version',
    'provider', 'schema_version', 'stage'
  ])
  assert.doesNotMatch(JSON.stringify(result), /private context|provider-request-id|user-id|private error/)
})

test('disabled API response is safe and cannot trigger generation', () => {
  assert.deepEqual(disabledAIAnalysisResponse(), {
    enabled: false,
    analysis: null,
    record: null,
    stale: false,
    can_generate: false,
    remaining_generations: 0
  })
})
