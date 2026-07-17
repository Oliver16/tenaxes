import assert from 'node:assert/strict'
import test from 'node:test'

import { OpenAIAnalysisProvider } from './openai.ts'
import { AnthropicAnalysisProvider } from './anthropic.ts'
import { AnalysisProviderError } from './provider.ts'
import { configuredModel } from './index.ts'
import { makeAnalysis, makeInput } from '../__tests__/helpers.mjs'

const input = makeInput({ questions: [] })
const analysis = makeAnalysis()

test('OpenAI adapter sends strict stored-off structured output and captures usage', async () => {
  const calls = []
  const client = { responses: { create: async (body, options) => {
    calls.push({ body, options })
    return { output_text: JSON.stringify(analysis), usage: { input_tokens: 17, output_tokens: 23 }, id: 'resp-test' }
  } } }
  const provider = new OpenAIAnalysisProvider({ apiKey: 'test', model: 'openai-test', client, timeoutMs: 100 })
  const result = await provider.generate(input, 'provisional')

  assert.equal(result.analysis.headline, analysis.headline)
  assert.equal(result.inputTokens, 17)
  assert.equal(result.outputTokens, 23)
  assert.equal(result.providerRequestId, 'resp-test')
  assert.equal(calls.length, 1)
  assert.equal(calls[0].body.store, false)
  assert.equal(calls[0].body.tools, undefined)
  assert.equal(calls[0].body.text.format.type, 'json_schema')
  assert.equal(calls[0].body.text.format.strict, true)
  assert.ok(calls[0].options.signal instanceof AbortSignal)
})

test('OpenAI adapter rejects malformed structured output', async () => {
  const client = { responses: { create: async () => ({ output_text: '{bad', usage: null, id: 'bad' }) } }
  const provider = new OpenAIAnalysisProvider({ apiKey: 'test', model: 'openai-test', client, timeoutMs: 100 })
  await assert.rejects(provider.generate(input, 'provisional'), error =>
    error instanceof AnalysisProviderError && error.code === 'malformed_output')
})

test('OpenAI adapter enforces its abort timeout even when a mocked SDK hangs', async () => {
  const client = { responses: { create: async () => new Promise(() => {}) } }
  const provider = new OpenAIAnalysisProvider({ apiKey: 'test', model: 'openai-test', client, timeoutMs: 15 })
  await assert.rejects(provider.generate(input, 'provisional'), error =>
    error instanceof AnalysisProviderError && error.code === 'timeout')
})

test('Anthropic adapter forces one schema tool and captures usage', async () => {
  const calls = []
  const client = { messages: { create: async (body, options) => {
    calls.push({ body, options })
    return {
      content: [{ type: 'tool_use', name: 'submit_polyaxis_analysis', input: analysis }],
      usage: { input_tokens: 31, output_tokens: 47 }, id: 'msg-test'
    }
  } } }
  const provider = new AnthropicAnalysisProvider({ apiKey: 'test', model: 'anthropic-test', client, timeoutMs: 100 })
  const result = await provider.generate(input, 'provisional')

  assert.equal(result.analysis.headline, analysis.headline)
  assert.equal(result.inputTokens, 31)
  assert.equal(result.outputTokens, 47)
  assert.equal(calls[0].body.tools.length, 1)
  assert.equal(calls[0].body.tools[0].name, 'submit_polyaxis_analysis')
  assert.deepEqual(calls[0].body.tool_choice, {
    type: 'tool', name: 'submit_polyaxis_analysis', disable_parallel_tool_use: true
  })
})

test('Anthropic adapter rejects text or multiple schema tool outputs', async () => {
  const client = { messages: { create: async () => ({
    content: [{ type: 'text', text: JSON.stringify(analysis) }],
    usage: { input_tokens: 1, output_tokens: 1 }, id: 'msg-bad'
  }) } }
  const provider = new AnthropicAnalysisProvider({ apiKey: 'test', model: 'anthropic-test', client, timeoutMs: 100 })
  await assert.rejects(provider.generate(input, 'provisional'), error =>
    error instanceof AnalysisProviderError && error.code === 'malformed_output')
})

test('a selected provider failure remains that provider failure and never falls back', async () => {
  let calls = 0
  const client = { responses: { create: async () => { calls++; throw new Error('upstream') } } }
  const provider = new OpenAIAnalysisProvider({ apiKey: 'test', model: 'openai-test', client, timeoutMs: 100 })
  await assert.rejects(provider.generate(input, 'provisional'), error =>
    error instanceof AnalysisProviderError && error.code === 'provider_failure')
  assert.equal(calls, 1)
  assert.equal(provider.provider, 'openai')
})

test('provider availability rejects a configured model when its selected API key is missing', () => {
  const before = {
    provider: process.env.AI_ANALYSIS_PROVIDER,
    model: process.env.OPENAI_ANALYSIS_MODEL,
    key: process.env.OPENAI_API_KEY
  }
  process.env.AI_ANALYSIS_PROVIDER = 'openai'
  process.env.OPENAI_ANALYSIS_MODEL = 'openai-test'
  delete process.env.OPENAI_API_KEY
  try {
    assert.throws(() => configuredModel(), error =>
      error instanceof AnalysisProviderError && error.code === 'configuration')
  } finally {
    restoreEnvironment('AI_ANALYSIS_PROVIDER', before.provider)
    restoreEnvironment('OPENAI_ANALYSIS_MODEL', before.model)
    restoreEnvironment('OPENAI_API_KEY', before.key)
  }
})

function restoreEnvironment(name, value) {
  if (value === undefined) delete process.env[name]
  else process.env[name] = value
}
