import assert from 'node:assert/strict'
import { mock, test } from 'node:test'

const state = {
  metadataResponse: { data: [], error: null },
  queryCount: 0
}

const resultAnalysis = {
  bankVersion: 'v2.2',
  questions: [{
    id: 1, axis_id: 'A1', key: 1, text: 'Pinned historical question',
    display_order: 1, weight: 1, question_type: 'conceptual', bank_version: 'v2.2',
    question_axis_links: []
  }],
  axes: [{ id: 'A1', name: 'Axis A1' }],
  responses: { 1: 2 }
}

const metadataQuery = {
  select() { return this },
  in() { return this },
  eq() { return this },
  then(resolve, reject) {
    state.queryCount += 1
    return Promise.resolve(state.metadataResponse).then(resolve, reject)
  }
}

const base = new URL('./', import.meta.url)
mock.module(new URL('../results/load-result-analysis.ts', base), {
  namedExports: { loadResultAnalysis: async () => resultAnalysis }
})
mock.module(new URL('../results/sample-result.ts', base), {
  namedExports: { isSampleSession: () => false }
})
mock.module(new URL('../supabase-admin.ts', base), {
  namedExports: {
    supabaseAdmin: {
      from(table) {
        assert.equal(table, 'question_metadata')
        return metadataQuery
      }
    }
  }
})

const moduleUrl = new URL('./load-ai-analysis-context.ts', base)
const loaded = await import(moduleUrl.href)
const moduleExports = [loaded, loaded.default, loaded['module.exports']]
  .find(candidate => typeof candidate?.loadAIAnalysisContext === 'function')
assert.ok(moduleExports)
const { loadAIAnalysisContext } = moduleExports

test('metadata query errors fail AI source loading closed', async () => {
  state.metadataResponse = { data: null, error: { message: 'database unavailable' } }
  await assert.rejects(
    () => loadAIAnalysisContext('session-1'),
    /question metadata could not be loaded/
  )
  assert.equal(state.queryCount, 1)
})

test('legitimately absent historical metadata remains null-safe', async () => {
  state.metadataResponse = { data: [], error: null }
  const result = await loadAIAnalysisContext('session-1')
  assert.equal(result.evidence.length, 1)
  assert.equal(result.evidence[0].policy_domain, null)
  assert.equal(result.evidence[0].response, 2)
})
