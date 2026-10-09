import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'

// End-to-end data-access checks against the LOCAL stack and a running
// `npm run dev`. Creates throwaway users and one survey result.
//
//   npm run dev            # in another terminal
//   npm run db:security-check

try { process.loadEnvFile('.env.development.local') } catch {
  console.error('Missing .env.development.local. Run: npm run db:env')
  process.exit(1)
}
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL, ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
if (!['127.0.0.1', 'localhost'].includes(new URL(URL_).hostname)) {
  console.error('Refusing to run against non-local Supabase.')
  process.exit(1)
}
const APP = process.env.APP_URL ?? 'http://localhost:3000'
let failures = 0
const out = (label, ok, detail = '') => {
  if (!ok) failures += 1
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? '  — ' + detail : ''}`)
}

// 1. Submit a full survey through the app
const questionClient = createClient(URL_, ANON, { auth: { persistSession: false } })
const { data: questions, error: questionError } = await questionClient
  .from('questions').select('id, bank_version').eq('active', true)
if (questionError || !questions?.length) throw new Error(`Could not load questions: ${questionError?.message}`)
const payload = JSON.stringify({
  bank_version: questions[0].bank_version,
  responses: Object.fromEntries(questions.map(q => [q.id, (q.id % 5) - 2]))
})
const sub = await fetch(APP + '/api/survey/submit', { method: 'POST', headers: { 'content-type': 'application/json' }, body: payload })
const { sessionId } = await sub.json()
out('survey submit works (server writes via service role)', sub.status === 200 && !!sessionId, `status ${sub.status}`)
for (const p of ['', '/axes', '/conflicts', '/consistency', '/types']) {
  const r = await fetch(`${APP}/results/${sessionId}${p}`)
  out(`result page /results/<id>${p} loads by link`, r.status === 200, `status ${r.status}`)
}
const typesHtml = await fetch(`${APP}/results/${sessionId}/types`).then(r => r.text())
const flavorId = typesHtml.match(/\/archetypes\/([a-z_]+)\?sessionId=/)?.[1]
const archHtml = flavorId ? await fetch(`${APP}/archetypes/${flavorId}?sessionId=${sessionId}`).then(r => r.text()) : ''
out('archetype page shows the result\'s match', archHtml.includes('Your Match'), flavorId ?? 'no archetype link found')

// 2. Anonymous key can no longer list or write survey data
const anon = createClient(URL_, ANON, { auth: { persistSession: false } })
for (const t of ['survey_results', 'survey_responses', 'aggregate_scores', 'popular_flavors', 'daily_responses']) {
  const { data, error } = await anon.from(t).select('*').limit(5)
  out(`anon cannot read ${t}`, !!error || data.length === 0, error ? error.message : `${data.length} rows`)
}
const ins = await anon.from('survey_responses').insert({ session_id: `forged-${Date.now()}`, responses: {} })
out('anon cannot insert forged survey data', !!ins.error, ins.error?.message)
const anonLink = await anon.rpc('link_result_to_user', { p_session_id: sessionId, p_user_id: '00000000-0000-0000-0000-000000000000' })
out('anon cannot call link_result_to_user', !!anonLink.error, anonLink.error?.message)

// 3. Signed-in users act only as themselves
const signUp = async email => {
  const c = createClient(URL_, ANON, { auth: { persistSession: false } })
  const { data, error } = await c.auth.signUp({ email, password: 'local-test-pw' })
  if (error) throw error
  return { c, id: data.user.id }
}
const stamp = Date.now()
const alice = await signUp(`alice-${stamp}@local.test`)
const bob = await signUp(`bob-${stamp}@local.test`)
const forge = await bob.c.rpc('link_result_to_user', { p_session_id: sessionId, p_user_id: alice.id })
out("bob cannot link a result to alice's account", !!forge.error, forge.error?.message)
const own = await alice.c.rpc('link_result_to_user', { p_session_id: sessionId, p_user_id: alice.id })
out('alice can save the result to her own account', own.data === true, JSON.stringify(own.error ?? own.data))
const steal = await bob.c.rpc('link_result_to_user', { p_session_id: sessionId, p_user_id: bob.id })
out("bob cannot take over alice's saved result", steal.data === false, JSON.stringify(steal.error ?? steal.data))
const aliceOwn = await alice.c.rpc('get_user_results', { p_user_id: alice.id })
out('alice sees her own results', aliceOwn.data?.length === 1, `${aliceOwn.data?.length} rows`)
const peek = await bob.c.rpc('get_user_results', { p_user_id: alice.id })
out("bob cannot read alice's results", !peek.error && peek.data.length === 0, `${peek.data?.length} rows`)
const aliceTable = await alice.c.from('survey_results').select('session_id')
out('alice can read own rows directly (past-surveys)', aliceTable.data?.length === 1, `${aliceTable.data?.length} rows`)
const bobTable = await bob.c.from('survey_results').select('session_id')
out('bob sees none of the rows directly', bobTable.data?.length === 0, `${bobTable.data?.length} rows`)

// 4. Logged-in pages through the app (cookie session)
const jar = new Map()
const ssr = createServerClient(URL_, ANON, { cookies: { getAll: () => [...jar].map(([name, value]) => ({ name, value })), setAll: cs => cs.forEach(c => jar.set(c.name, c.value)) } })
await ssr.auth.signInWithPassword({ email: `alice-${stamp}@local.test`, password: 'local-test-pw' })
const cookie = [...jar].map(([k, v]) => `${k}=${v}`).join('; ')
for (const p of ['/profile', '/past-surveys']) {
  const r = await fetch(APP + p, { headers: { cookie }, redirect: 'manual' })
  const html = await r.text()
  out(`${p} shows alice's saved result`, r.status === 200 && html.includes(sessionId.slice(0, 8)), `status ${r.status}`)
}

console.log(failures === 0 ? '\nAll checks passed.' : `\n${failures} check(s) failed.`)
process.exit(failures === 0 ? 0 : 1)
