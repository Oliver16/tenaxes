import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'

const migration = readFileSync(
  new URL('../../supabase/migrations/20260717210000_add_question_bank_revision_workflow.sql', import.meta.url),
  'utf8'
)
const freshInstall = readFileSync(
  new URL('../../supabase/fresh_install.sql', import.meta.url),
  'utf8'
)
const questionClient = readFileSync(new URL('./questions.ts', import.meta.url), 'utf8')

test('question bank revision migration clones the complete scoring instrument', () => {
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.clone_question_bank_version/)
  assert.match(migration, /INSERT INTO public\.questions/)
  assert.match(migration, /INSERT INTO public\.question_axis_links/)
  assert.match(migration, /role <> 'primary'/)
  assert.match(migration, /INSERT INTO public\.question_metadata/)
  assert.match(migration, /PERFORM public\.refresh_question_bank_version_counts/)
})

test('bank cloning is restricted to the service role', () => {
  assert.match(migration, /REVOKE ALL ON FUNCTION public\.clone_question_bank_version[\s\S]*FROM PUBLIC, anon, authenticated/)
  assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.clone_question_bank_version[\s\S]*TO service_role/)
  assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.publish_question_bank_version[\s\S]*TO service_role/)
})

test('question edits keep primary links and version counts synchronized', () => {
  assert.match(migration, /CREATE TRIGGER sync_question_primary_link_from_question/)
  assert.match(migration, /AFTER INSERT OR UPDATE OF axis_id, key, weight ON public\.questions/)
  assert.match(migration, /CREATE TRIGGER sync_question_counts_from_questions/)
  assert.match(migration, /CREATE TRIGGER sync_question_counts_from_links/)
})

test('fresh installs include the bank revision workflow', () => {
  assert.match(freshInstall, /CREATE OR REPLACE FUNCTION public\.clone_question_bank_version/)
  assert.match(freshInstall, /CREATE TRIGGER sync_question_primary_link_from_question/)
  assert.match(freshInstall, /GRANT EXECUTE ON FUNCTION public\.clone_question_bank_version[\s\S]*TO service_role/)
})

test('only an explicitly published revision can drive the live survey', () => {
  assert.match(migration, /status IN \('draft', 'published', 'archived'\)/)
  assert.match(migration, /CREATE UNIQUE INDEX IF NOT EXISTS one_published_question_bank/)
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.publish_question_bank_version/)
  assert.match(migration, /VALUES \(trim\(p_new_version\)[\s\S]*'draft'\)/)
  assert.match(questionClient, /\.eq\('status', 'published'\)/)
  assert.match(questionClient, /\.eq\('bank_version', liveBankVersion\)/)
})
