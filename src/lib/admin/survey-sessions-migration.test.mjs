import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const migration = readFileSync(new URL('../../../supabase/migrations/20261009120000_add_survey_session_tracking.sql', import.meta.url), 'utf8')
const freshInstall = readFileSync(new URL('../../../supabase/fresh_install.sql', import.meta.url), 'utf8')

function schemaBlock(sql) {
  const start = sql.indexOf('CREATE TABLE public.survey_sessions')
  const grant = sql.indexOf('GRANT ALL ON TABLE public.survey_sessions TO service_role', start)
  assert.ok(start >= 0 && grant >= 0, 'survey_sessions schema block is missing')
  return sql.slice(start, sql.indexOf(';', grant) + 1)
}

const normalize = sql => sql.replace(/--.*$/gm, '').replace(/\s+/g, ' ').trim()

test('fresh install contains the exact survey_sessions migration schema', () => {
  assert.equal(normalize(schemaBlock(freshInstall)), normalize(schemaBlock(migration)))
})

test('session tracking is server-only and stores no answer values', () => {
  assert.match(migration, /ALTER TABLE public\.survey_sessions ENABLE ROW LEVEL SECURITY/)
  assert.match(migration, /REVOKE ALL ON TABLE public\.survey_sessions FROM anon, authenticated/)
  assert.doesNotMatch(migration, /CREATE POLICY/i)
  assert.doesNotMatch(migration, /jsonb/i, 'only id arrays, never a responses map')
})
