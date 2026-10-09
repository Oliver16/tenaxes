import assert from 'node:assert/strict'
import test from 'node:test'

import { aiAnalysisClientKey } from './client-key.ts'

const headers = values => new Headers(values)

test('client key uses the first forwarded IP and never exposes it', () => {
  const key = aiAnalysisClientKey(headers({ 'x-forwarded-for': '203.0.113.7, 10.0.0.1' }), 'secret')
  assert.match(key, /^[0-9a-f]{32}$/)
  assert.ok(!key.includes('203'))
  assert.equal(key, aiAnalysisClientKey(headers({ 'x-forwarded-for': '203.0.113.7' }), 'secret'))
  assert.equal(key, aiAnalysisClientKey(headers({ 'x-real-ip': '203.0.113.7' }), 'secret'))
})

test('client key differs by IP and by secret', () => {
  const base = aiAnalysisClientKey(headers({ 'x-forwarded-for': '203.0.113.7' }), 'secret')
  assert.notEqual(base, aiAnalysisClientKey(headers({ 'x-forwarded-for': '203.0.113.8' }), 'secret'))
  assert.notEqual(base, aiAnalysisClientKey(headers({ 'x-forwarded-for': '203.0.113.7' }), 'other'))
})

test('client key is null without an IP or a secret', () => {
  assert.equal(aiAnalysisClientKey(headers({}), 'secret'), null)
  assert.equal(aiAnalysisClientKey(headers({ 'x-forwarded-for': ' ' }), 'secret'), null)
  assert.equal(aiAnalysisClientKey(headers({ 'x-forwarded-for': '203.0.113.7' }), undefined), null)
})
