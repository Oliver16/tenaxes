import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const migration = readFileSync(new URL('../../../supabase/migrations/20260717180000_add_result_ai_analysis.sql', import.meta.url), 'utf8')
const freshInstall = readFileSync(new URL('../../../supabase/fresh_install.sql', import.meta.url), 'utf8')
const checks = readFileSync(new URL('../../../supabase/ai_analysis_post_install_checks.sql', import.meta.url), 'utf8')

function schemaBlock(sql) {
  const start = sql.indexOf('CREATE TABLE public.result_ai_analyses')
  const grant = sql.indexOf('GRANT ALL ON TABLE public.result_ai_analyses TO service_role', start)
  assert.ok(start >= 0 && grant >= 0, 'AI analysis schema block is missing')
  return sql.slice(start, sql.indexOf(';', grant) + 1)
}

function normalize(sql) {
  return sql.replace(/--.*$/gm, '').replace(/\s+/g, ' ').trim()
}

test('fresh install contains the exact normalized AI-analysis migration schema', () => {
  assert.equal(normalize(schemaBlock(freshInstall)), normalize(schemaBlock(migration)))
})

test('migration enforces cache and pending uniqueness with server-only RLS access', () => {
  assert.match(migration, /CREATE UNIQUE INDEX uq_result_ai_analysis_cache[\s\S]*WHERE status = 'completed'/)
  assert.match(migration, /CREATE UNIQUE INDEX uq_result_ai_analysis_pending[\s\S]*WHERE status = 'pending'/)
  assert.match(migration, /ALTER TABLE public\.result_ai_analyses ENABLE ROW LEVEL SECURITY/)
  assert.match(migration, /REVOKE ALL ON TABLE public\.result_ai_analyses FROM anon, authenticated/)
  assert.doesNotMatch(migration, /CREATE POLICY/i)
})

test('post-install database checks cover RLS, grants, cache, pending, and rolling-cap indexes', () => {
  for (const expected of [
    'relrowsecurity', 'anon', 'authenticated', 'service_role',
    'uq_result_ai_analysis_cache', 'uq_result_ai_analysis_pending',
    'idx_result_ai_analyses_session_completed'
  ]) assert.match(checks, new RegExp(expected))
})
