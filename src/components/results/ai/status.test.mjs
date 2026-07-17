import assert from 'node:assert/strict'
import test from 'node:test'

import { aiAnalysisStatusMessage, analysisVersions, shouldRefreshGenerationStatus } from './status.ts'
import { makeAnalysis } from '../../../lib/ai-analysis/__tests__/helpers.mjs'

test('UI status copy distinguishes pending, capped, invalid-provider, and unavailable states', () => {
  assert.match(aiAnalysisStatusMessage(409), /already being generated/i)
  assert.match(aiAnalysisStatusMessage(429), /generation limit/i)
  assert.match(aiAnalysisStatusMessage(502), /safely validated/i)
  assert.match(aiAnalysisStatusMessage(503), /temporarily unavailable/i)
  assert.match(aiAnalysisStatusMessage(503), /^Deeper Analysis/)
})

test('provider failures refresh attempt allowance while request-validation failures do not', () => {
  assert.equal(shouldRefreshGenerationStatus(502), true)
  assert.equal(shouldRefreshGenerationStatus(503), true)
  assert.equal(shouldRefreshGenerationStatus(429), true)
  assert.equal(shouldRefreshGenerationStatus(400), false)
})

test('version helper retains the selected provisional report when history omits it', () => {
  const analysis = makeAnalysis()
  const record = {
    id: 'provisional', stage: 'provisional', provider: 'openai', model: 'test',
    prompt_version: 'v1', schema_version: '1', bank_version: 'v2.2',
    created_at: '2026-07-17T00:00:00Z', completed_at: '2026-07-17T00:00:01Z'
  }
  const versions = analysisVersions({
    enabled: true, analysis, record, versions: [], stale: false, can_generate: true, remaining_generations: 2
  })
  assert.equal(versions.length, 1)
  assert.equal(versions[0].record.stage, 'provisional')
})

test('version helper returns no history before generation', () => {
  assert.deepEqual(analysisVersions({
    enabled: true, analysis: null, record: null, stale: false, can_generate: true, remaining_generations: 3
  }), [])
})
