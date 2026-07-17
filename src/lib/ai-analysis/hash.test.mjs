import assert from 'node:assert/strict'
import test from 'node:test'

import { canonicalize, hashAnalysisInput } from './hash.ts'

test('identical input produces an identical SHA-256 hash', () => {
  const input = { schema_version: '1', prompt_version: 'v1', bank_version: 'v2.2', answers: [2, 0, null] }
  assert.equal(hashAnalysisInput(input), hashAnalysisInput(structuredClone(input)))
  assert.match(hashAnalysisInput(input), /^[a-f0-9]{64}$/)
})

test('object key order does not affect input hashing at any depth', () => {
  const left = { b: 2, nested: { z: 3, a: 1 }, a: 1 }
  const right = { a: 1, nested: { a: 1, z: 3 }, b: 2 }
  assert.deepEqual(canonicalize(left), canonicalize(right))
  assert.equal(hashAnalysisInput(left), hashAnalysisInput(right))
})

test('operational timestamps and provider identifiers do not affect the hash', () => {
  const base = {
    payload: { answer: 2, created_at: '2026-01-01T00:00:00Z' },
    completed_at: '2026-01-01T00:01:00Z',
    updated_at: '2026-01-01T00:02:00Z',
    provider_request_id: 'request-a',
    session_id: 'raw-session-a'
  }
  const changed = {
    payload: { answer: 2, created_at: '2030-05-05T00:00:00Z' },
    completed_at: '2030-05-05T00:01:00Z',
    updated_at: '2030-05-05T00:02:00Z',
    provider_request_id: 'request-b',
    session_id: 'raw-session-b'
  }
  assert.equal(hashAnalysisInput(base), hashAnalysisInput(changed))
})

test('user context changes cache identity', () => {
  const base = { user_context: { general_context: 'Natural monopolies justify the exception.' } }
  const changed = { user_context: { general_context: 'Only this employer should receive the exception.' } }
  assert.notEqual(hashAnalysisInput(base), hashAnalysisInput(changed))
})

test('prompt version changes cache identity', () => {
  assert.notEqual(
    hashAnalysisInput({ prompt_version: 'v1', bank_version: 'v2.2' }),
    hashAnalysisInput({ prompt_version: 'v2', bank_version: 'v2.2' })
  )
})

test('bank version changes cache identity', () => {
  assert.notEqual(
    hashAnalysisInput({ prompt_version: 'v1', bank_version: 'v2.1' }),
    hashAnalysisInput({ prompt_version: 'v1', bank_version: 'v2.2' })
  )
})

test('array order remains significant because response ordering is data, not object-key noise', () => {
  assert.notEqual(hashAnalysisInput({ ids: [1, 2] }), hashAnalysisInput({ ids: [2, 1] }))
})
