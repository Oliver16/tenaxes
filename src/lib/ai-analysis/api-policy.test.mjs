import assert from 'node:assert/strict'
import test from 'node:test'

import {
  clarificationAnswersBelongToParent,
  conservativeCachedAIAnalysisResponse,
  decideGeneration,
  disabledAIAnalysisResponse,
  publicAnalysisMeta,
  remainingGenerationAllowance,
  remainingGenerationsFromCount
} from './api-policy.ts'
import { makeAnalysis } from './__tests__/helpers.mjs'
import { generationAttemptLimit } from './config.ts'

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

test('API allowance is bounded by completed generations and all recent provider attempts', () => {
  assert.equal(remainingGenerationAllowance(1, 3, 2, 6), 2)
  assert.equal(remainingGenerationAllowance(0, 3, 6, 6), 0)
  assert.equal(remainingGenerationAllowance(3, 3, 3, 6), 0)
})

test('provider-attempt limit validates environment input and never undercuts the completion limit', () => {
  const before = {
    attempts: process.env.AI_ANALYSIS_MAX_ATTEMPTS,
    generations: process.env.AI_ANALYSIS_MAX_REGENERATIONS
  }
  try {
    process.env.AI_ANALYSIS_MAX_REGENERATIONS = '3'
    process.env.AI_ANALYSIS_MAX_ATTEMPTS = '9'
    assert.equal(generationAttemptLimit(), 9)
    process.env.AI_ANALYSIS_MAX_ATTEMPTS = '2'
    assert.equal(generationAttemptLimit(), 3)
    process.env.AI_ANALYSIS_MAX_ATTEMPTS = 'not-a-number'
    assert.equal(generationAttemptLimit(), 6)
  } finally {
    restoreEnvironment('AI_ANALYSIS_MAX_ATTEMPTS', before.attempts)
    restoreEnvironment('AI_ANALYSIS_MAX_REGENERATIONS', before.generations)
  }
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

test('conservative cached response exposes only the validated hit when ancillary reads fail', () => {
  const analysis = makeAnalysis()
  const response = conservativeCachedAIAnalysisResponse({
    id: 'cached-id', stage: 'provisional', provider: 'openai', model: 'model-id',
    prompt_version: 'v1', schema_version: '1', bank_version: 'v2.2',
    created_at: '2026-07-17T00:00:00.000Z', completed_at: '2026-07-17T00:00:01.000Z'
  }, analysis)
  assert.equal(response.analysis, analysis)
  assert.equal(response.record.id, 'cached-id')
  assert.equal(response.versions.length, 1)
  assert.equal(response.can_generate, false)
  assert.equal(response.remaining_generations, 0)
  assert.equal(response.stale, false)
})

function restoreEnvironment(name, value) {
  if (value === undefined) delete process.env[name]
  else process.env[name] = value
}
