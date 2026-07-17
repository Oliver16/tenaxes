import assert from 'node:assert/strict'
import { mock, test } from 'node:test'

import { makeAnalysis } from './__tests__/helpers.mjs'

const state = {
  enabled: true,
  hash: 'hash-success',
  rows: [],
  nextId: 1,
  providerCalls: 0,
  providerMode: 'success',
  sourceExists: true,
  bankVersion: 'v2.2',
  lastBuildArgs: null,
  parentLookupCount: 0,
  beforePendingInsert: null
}

class TestProviderError extends Error {
  constructor(code, message, invalidOutput, attempt) {
    super(message)
    this.name = 'AnalysisProviderError'
    this.code = code
    this.invalidOutput = invalidOutput
    this.attempt = attempt
  }
}

function attempt(id, inputTokens = 10, outputTokens = 20) {
  return { inputTokens, outputTokens, latencyMs: 5, providerRequestId: id }
}

function analysisRow(overrides = {}) {
  const id = overrides.id ?? `seed-${state.nextId++}`
  return {
    id,
    session_id: 'session-1',
    parent_analysis_id: null,
    user_id: null,
    stage: 'provisional',
    status: 'completed',
    provider: 'openai',
    model: 'test-model',
    prompt_version: 'v1',
    schema_version: '1',
    bank_version: 'v2.2',
    input_hash: state.hash,
    context_json: {},
    deterministic_signals: { result_fingerprint: state.hash },
    analysis_json: makeAnalysis(),
    created_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
    ...overrides
  }
}

function reset(nextHash) {
  state.hash = nextHash
  state.rows.splice(0)
  state.nextId = 1
  state.providerCalls = 0
  state.providerMode = 'success'
  state.sourceExists = true
  state.bankVersion = 'v2.2'
  state.lastBuildArgs = null
  state.parentLookupCount = 0
  state.beforePendingInsert = null
}

function recursivelyContains(value, expected) {
  if (!expected || typeof expected !== 'object' || Array.isArray(expected)) return value === expected
  if (!value || typeof value !== 'object') return false
  return Object.entries(expected).every(([key, nested]) => recursivelyContains(value[key], nested))
}

class FakeQuery {
  constructor(operation, payload = null) {
    this.operation = operation
    this.payload = payload
    this.filters = []
    this.columns = '*'
    this.options = {}
    this.ordering = null
    this.limitValue = null
    this.returning = false
  }

  select(columns = '*', options = {}) {
    this.columns = columns
    this.options = options
    if (this.operation !== 'select') this.returning = true
    return this
  }
  eq(column, value) {
    if (column === 'id' && typeof value === 'string' && /^[0-9a-f-]{36}$/i.test(value)) {
      state.parentLookupCount += 1
    }
    this.filters.push(row => row[column] === value)
    return this
  }
  is(column, value) { this.filters.push(row => row[column] === value); return this }
  in(column, values) { this.filters.push(row => values.includes(row[column])); return this }
  gte(column, value) { this.filters.push(row => row[column] != null && row[column] >= value); return this }
  lt(column, value) { this.filters.push(row => row[column] != null && row[column] < value); return this }
  contains(column, value) { this.filters.push(row => recursivelyContains(row[column], value)); return this }
  order(column, { ascending = true } = {}) { this.ordering = { column, ascending }; return this }
  limit(value) { this.limitValue = value; return this }
  single() { return this.execute('single') }
  maybeSingle() { return this.execute('maybeSingle') }
  then(resolve, reject) { return this.execute('many').then(resolve, reject) }

  matchingRows() {
    let rows = state.rows.filter(row => this.filters.every(filter => filter(row)))
    if (this.ordering) {
      const { column, ascending } = this.ordering
      rows = [...rows].sort((left, right) => {
        const result = String(left[column] ?? '').localeCompare(String(right[column] ?? ''))
        return ascending ? result : -result
      })
    }
    if (this.limitValue != null) rows = rows.slice(0, this.limitValue)
    return rows
  }

  project(row) {
    if (this.columns === '*' || !row) return row
    const keys = this.columns.split(',').map(key => key.trim())
    return Object.fromEntries(keys.map(key => [key, row[key]]))
  }

  async execute(cardinality) {
    let rows
    if (this.operation === 'insert') {
      if (state.beforePendingInsert) {
        const hook = state.beforePendingInsert
        state.beforePendingInsert = null
        hook()
      }
      const row = analysisRow({
        ...this.payload,
        id: `generated-${state.nextId++}`,
        analysis_json: this.payload.analysis_json ?? null,
        created_at: this.payload.created_at ?? new Date().toISOString(),
        completed_at: this.payload.completed_at ?? null
      })
      state.rows.push(row)
      rows = [row]
    } else if (this.operation === 'delete') {
      rows = this.matchingRows()
      const ids = new Set(rows.map(row => row.id))
      for (let index = state.rows.length - 1; index >= 0; index -= 1) {
        if (ids.has(state.rows[index].id)) state.rows.splice(index, 1)
      }
    } else if (this.operation === 'update') {
      rows = this.matchingRows()
      rows.forEach(row => Object.assign(row, this.payload))
    } else {
      rows = this.matchingRows()
    }

    if (this.options?.count === 'exact' && this.options?.head) {
      return { data: null, error: null, count: rows.length }
    }
    if (cardinality === 'single') {
      return rows.length === 1
        ? { data: this.project(rows[0]), error: null }
        : { data: null, error: { code: 'PGRST116' } }
    }
    if (cardinality === 'maybeSingle') {
      return rows.length <= 1
        ? { data: rows[0] ? this.project(rows[0]) : null, error: null }
        : { data: null, error: { code: 'PGRST116' } }
    }
    return { data: this.returning || this.operation === 'select' ? rows.map(row => this.project(row)) : null, error: null }
  }
}

const fakeSupabase = {
  from(table) {
    assert.equal(table, 'result_ai_analyses')
    return {
      select: (columns = '*', options = {}) => new FakeQuery('select').select(columns, options),
      insert: payload => new FakeQuery('insert', payload),
      update: payload => new FakeQuery('update', payload),
      delete: () => new FakeQuery('delete')
    }
  }
}

const input = {
  schema_version: '1', prompt_version: 'v1', bank_version: 'v2.2',
  profile: { core_axes: [], facets: [], archetypes: [] },
  response_summary: { total_questions: 0, recorded: 0, numeric: 0, neutral: 0, not_sure: 0 },
  topic_signals: [], candidate_tensions: [], collision_pairs: [], questions: [], user_context: null
}

const base = new URL('./', import.meta.url)
mock.module(new URL('../supabase-admin.ts', base), { namedExports: { supabaseAdmin: fakeSupabase } })
mock.module(new URL('./build-context.ts', base), {
  namedExports: {
    buildPersonalizedAnalysisInput: args => {
      state.lastBuildArgs = args
      return {
        ...structuredClone(input),
        bank_version: state.bankVersion,
        user_context: args.generalContext
          ? { general_context: args.generalContext, clarification_answers: args.clarificationAnswers ?? [] }
          : null
      }
    }
  }
})
mock.module(new URL('./load-ai-analysis-context.ts', base), {
  namedExports: {
    loadAIAnalysisContext: async () => state.sourceExists
      ? {
          resultAnalysis: { bankVersion: state.bankVersion, result: { user_id: null } },
          evidence: []
        }
      : null
  }
})
mock.module(new URL('./evidence-validator.ts', base), {
  namedExports: { validateAnalysisEvidence: () => ({ valid: true, errors: [] }) }
})
mock.module(new URL('./hash.ts', base), { namedExports: { hashAnalysisInput: () => state.hash } })
mock.module(new URL('./config.ts', base), {
  namedExports: {
    AI_ANALYSIS_SCHEMA_VERSION: '1',
    analysisPromptVersion: () => 'v1',
    analysisTimeoutMs: () => 1000,
    contextMaxChars: () => 2000,
    DEFAULT_CLARIFICATION_MAX_CHARS: 1000,
    DEFAULT_CLARIFICATION_LINEAGE_MAX_ANSWERS: 10,
    DEFAULT_CLARIFICATION_LINEAGE_MAX_CHARS: 8000,
    generationAttemptLimit: () => 6,
    generationLimit: () => 3
  }
})
mock.module(new URL('./providers/index.ts', base), {
  namedExports: {
    AnalysisProviderError: TestProviderError,
    configuredModel: () => 'test-model',
    configuredProviderName: () => 'openai',
    isAIAnalysisEnabled: () => state.enabled,
    createAnalysisProvider: () => ({
      async generate(_input, stage) {
        state.providerCalls += 1
        if (state.providerMode === 'malformed-once' && state.providerCalls === 1) {
          throw new TestProviderError('malformed_output', 'Malformed first response', { bad: true }, attempt('bad', 3, 4))
        }
        const analysis = makeAnalysis()
        analysis.analysis_stage = stage
        return { analysis, ...attempt(`request-${state.providerCalls}`) }
      }
    }),
    summarizeProviderAttempts: attempts => ({
      inputTokens: attempts.reduce((sum, item) => sum + (item.inputTokens ?? 0), 0),
      outputTokens: attempts.reduce((sum, item) => sum + (item.outputTokens ?? 0), 0),
      latencyMs: attempts.reduce((sum, item) => sum + item.latencyMs, 0),
      providerRequestId: attempts.map(item => item.providerRequestId).filter(Boolean).join(',') || null
    })
  }
})

const routeUrl = new URL('../../app/api/results/[sessionId]/ai-analysis/route.ts', base)
const routeModule = await import(routeUrl.href)
const routeHandlers = [routeModule, routeModule.default, routeModule['module.exports']]
  .find(candidate => typeof candidate?.GET === 'function' && typeof candidate?.POST === 'function')
const exportShape = Object.entries(routeModule).map(([key, value]) =>
  `${key}:${typeof value}${value && typeof value === 'object' ? `[${Object.keys(value).join('|')}]` : ''}`
).join(', ')
assert.ok(routeHandlers, `route exports: ${exportShape}`)
const { GET, POST } = routeHandlers

function request(body) {
  return new Request('http://localhost/api/results/session-1/ai-analysis', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body)
  })
}

test('Next route orchestrates success, cache, repair, pending, caps, and parent ownership', async t => {
  mock.method(console, 'info', () => {})

  await t.test('disabled GET never loads or generates', async () => {
    reset('disabled')
    state.enabled = false
    const response = await GET(new Request('http://localhost'), { params: { sessionId: 'session-1' } })
    assert.equal(response.status, 200)
    assert.equal((await response.json()).enabled, false)
    assert.equal(state.providerCalls, 0)
    state.enabled = true
  })

  await t.test('successful generation is persisted and an identical request is cached', async () => {
    reset('hash-success')
    const first = await POST(request({ action: 'generate' }), { params: { sessionId: 'session-1' } })
    assert.equal(first.status, 201)
    assert.equal((await first.json()).cached, false)
    assert.equal(state.providerCalls, 1)
    assert.equal(state.rows[0].status, 'completed')

    const second = await POST(request({ action: 'generate' }), { params: { sessionId: 'session-1' } })
    assert.equal(second.status, 200)
    assert.equal((await second.json()).cached, true)
    assert.equal(state.providerCalls, 1, 'cache hit must suppress the provider call')
  })

  await t.test('a completion that wins just before pending insert suppresses a duplicate provider call', async () => {
    reset('hash-delayed-cache')
    state.beforePendingInsert = () => {
      state.rows.push(analysisRow({ id: 'winner-cache', input_hash: state.hash }))
    }
    const response = await POST(request({ action: 'generate' }), { params: { sessionId: 'session-1' } })
    assert.equal(response.status, 200)
    assert.equal((await response.json()).cached, true)
    assert.equal(state.providerCalls, 0)
    assert.equal(state.rows.some(row => row.status === 'pending'), false)
  })

  await t.test('a third completion that wins just before pending insert rechecks the cap', async () => {
    reset('hash-delayed-cap')
    state.rows.push(analysisRow({ input_hash: 'completed-1' }))
    state.rows.push(analysisRow({ input_hash: 'completed-2' }))
    state.beforePendingInsert = () => {
      state.rows.push(analysisRow({ id: 'winner-cap', input_hash: 'completed-3' }))
    }
    const response = await POST(request({ action: 'generate' }), { params: { sessionId: 'session-1' } })
    assert.equal(response.status, 429)
    assert.equal(state.providerCalls, 0)
    assert.equal(state.rows.some(row => row.status === 'pending'), false)
  })

  await t.test('optional raw context is persisted privately but never returned', async () => {
    reset('hash-private-context')
    const secret = 'PRIVATE-CONTEXT-SENTINEL-4815'
    const response = await POST(request({ action: 'generate', general_context: secret }), {
      params: { sessionId: 'session-1' }
    })
    assert.equal(response.status, 201)
    const payload = await response.json()
    assert.equal(JSON.stringify(payload).includes(secret), false)
    assert.equal(state.rows[0].context_json.general_context, secret)
    assert.equal(state.lastBuildArgs.generalContext, secret)
  })

  await t.test('oversized optional context is rejected before provider or database work', async () => {
    reset('hash-oversized')
    const response = await POST(request({ action: 'generate', general_context: 'x'.repeat(2001) }), {
      params: { sessionId: 'session-1' }
    })
    assert.equal(response.status, 400)
    assert.equal(state.providerCalls, 0)
    assert.equal(state.rows.length, 0)
  })

  await t.test('a live pending row returns 409 without provider work', async () => {
    reset('hash-pending')
    state.rows.push(analysisRow({ status: 'pending', completed_at: null, input_hash: 'other-hash' }))
    const response = await POST(request({ action: 'generate' }), { params: { sessionId: 'session-1' } })
    assert.equal(response.status, 409)
    assert.equal(state.providerCalls, 0)
  })

  await t.test('the failed-attempt ceiling returns 429 without provider work', async () => {
    reset('hash-capped')
    for (let index = 0; index < 6; index += 1) {
      state.rows.push(analysisRow({ status: 'failed', input_hash: `failed-${index}`, completed_at: null }))
    }
    const response = await POST(request({ action: 'generate' }), { params: { sessionId: 'session-1' } })
    assert.equal(response.status, 429)
    assert.equal(state.providerCalls, 0)
  })

  await t.test('three completed generations in the rolling window return 429', async () => {
    reset('hash-completed-cap')
    for (let index = 0; index < 3; index += 1) {
      state.rows.push(analysisRow({ input_hash: `completed-${index}` }))
    }
    const response = await POST(request({ action: 'generate' }), { params: { sessionId: 'session-1' } })
    assert.equal(response.status, 429)
    assert.equal(state.providerCalls, 0)
  })

  await t.test('one malformed provider response is repaired exactly once', async () => {
    reset('hash-repair')
    state.providerMode = 'malformed-once'
    const response = await POST(request({ action: 'generate' }), { params: { sessionId: 'session-1' } })
    assert.equal(response.status, 201)
    assert.equal(state.providerCalls, 2)
    assert.equal(state.rows[0].input_tokens, 13)
    assert.equal(state.rows[0].output_tokens, 24)
  })

  await t.test('a refinement parent owned by another session is rejected', async () => {
    reset('hash-parent')
    const parent = analysisRow({ id: '11111111-1111-4111-8111-111111111111', session_id: 'other-session' })
    state.rows.push(parent)
    const response = await POST(request({
      action: 'refine', parent_analysis_id: parent.id, clarification_answers: []
    }), { params: { sessionId: 'session-1' } })
    assert.equal(response.status, 400)
    assert.equal(state.providerCalls, 0)
    assert.equal(state.parentLookupCount, 1, 'the valid parent UUID must reach the session-scoped database lookup')
  })

  await t.test('GET returns a bank-null historical analysis without substituting the active bank', async () => {
    reset('hash-historical')
    state.bankVersion = null
    state.rows.push(analysisRow({ bank_version: null }))
    const response = await GET(new Request('http://localhost'), { params: { sessionId: 'session-1' } })
    assert.equal(response.status, 200)
    const payload = await response.json()
    assert.equal(payload.record.bank_version, null)
    assert.equal(payload.stale, false)
    assert.equal(state.lastBuildArgs.resultAnalysis.bankVersion, null)
  })
})
