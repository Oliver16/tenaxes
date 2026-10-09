import assert from 'node:assert/strict'
import test from 'node:test'

import { computeEngagement, computeValidation, MIN_ITEM_N } from './question-stats.ts'

function question(id, axis, key = 1, extra = {}) {
  return {
    id,
    axis_id: axis,
    key,
    text: `Q${id}`,
    educational_content: null,
    display_order: id,
    active: true,
    weight: 1,
    question_type: 'conceptual',
    bank_version: 'v-test',
    created_at: '',
    updated_at: '',
    question_axis_links: [
      { id: id * 10, question_id: id, axis_id: axis, role: 'primary', axis_key: key, weight: 1, created_at: null },
      ...(extra.links || [])
    ],
    ...extra.row
  }
}

// Deterministic pseudo-random so the fixtures are stable.
function rng(seed) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

const clamp = v => Math.max(-2, Math.min(2, Math.round(v)))

test('engagement separates skips, blanks, drop-off points and not-sure answers', () => {
  const qs = [question(1, 'C1'), question(2, 'C1'), question(3, 'C1'), question(4, 'C1')]
  const now = new Date('2026-10-09T12:00:00Z')
  const old = '2026-10-01T00:00:00Z'
  const recent = '2026-10-09T11:00:00Z'

  const sessions = [
    // Completed: skipped Q2 once, came back and answered it.
    { answered_ids: [1, 2, 3, 4], not_sure_ids: [3], skipped_ids: [2], viewed_ids: [1, 2, 3, 4],
      last_question_id: 4, question_count: 4, started_at: '2026-10-01T00:00:00Z',
      last_activity_at: '2026-10-01T00:20:00Z', completed_at: '2026-10-01T00:20:00Z' },
    // Abandoned on Q3 after skipping Q2 and never returning.
    { answered_ids: [1], not_sure_ids: [], skipped_ids: [2], viewed_ids: [1, 2, 3],
      last_question_id: 3, question_count: 4, started_at: old, last_activity_at: old, completed_at: null },
    // Still active: not abandoned yet.
    { answered_ids: [1, 2], not_sure_ids: [], skipped_ids: [], viewed_ids: [1, 2, 3],
      last_question_id: 3, question_count: 4, started_at: recent, last_activity_at: recent, completed_at: null }
  ]
  const responses = [
    { 1: 2, 2: 1, 3: null, 4: -2 },
    { 1: 1, 2: 0, 3: null, 4: -1 }
  ]

  const { funnel, items } = computeEngagement(qs, sessions, responses, now)
  const byId = Object.fromEntries(items.map(i => [i.question_id, i]))

  assert.equal(funnel.started, 3)
  assert.equal(funnel.completed, 1)
  assert.equal(funnel.abandoned, 1)
  assert.equal(funnel.in_progress, 1)
  assert.equal(funnel.reached_50, 2)
  assert.equal(funnel.median_abandon_progress, 0.25)
  assert.equal(funnel.median_completion_minutes, 20)

  assert.equal(byId[2].skipped, 2)
  assert.equal(byId[2].viewed, 3)
  assert.equal(byId[2].left_blank, 1, 'only the abandoned session left Q2 blank')
  assert.equal(byId[3].quit_here, 1)
  assert.equal(byId[3].not_sure_rate, 1)
  assert.deepEqual(byId[1].distribution, [0, 0, 0, 1, 1])
})

test('validation uses pairwise data so "not sure" answers do not wipe out alpha', () => {
  const rand = rng(7)
  const qs = [1, 2, 3, 4, 5, 6].map(id => question(id, 'C1', id % 2 ? 1 : -1))
  const responses = []
  for (let p = 0; p < 200; p++) {
    const trait = rand() * 4 - 2
    const rs = {}
    for (const q of qs) {
      // Every respondent says "not sure" to one random item, so there are
      // zero complete cases — complete-case alpha would be unavailable.
      rs[q.id] = clamp(trait * q.key + (rand() - 0.5) * 1.5)
    }
    rs[qs[Math.floor(rand() * qs.length)].id] = null
    responses.push(rs)
  }

  const report = computeValidation(qs, [{ id: 'C1', name: 'Econ' }], responses)
  const axis = report.axes[0]
  assert.ok(axis.alpha !== null && axis.alpha > 0.8, `alpha ${axis.alpha}`)
  for (const item of report.items) {
    assert.ok(item.item_rest_r > 0.5, `reverse-keyed items are keyed before correlating (${item.item_rest_r})`)
    // ~1 in 6 answers is "not sure" here, so only check discrimination flags
    assert.deepEqual(item.flags.filter(f => !f.includes('not sure')), [])
  }
})

test('validation flags a mis-keyed item and an item that lowers reliability', () => {
  const rand = rng(11)
  const qs = [
    ...[1, 2, 3, 4, 5].map(id => question(id, 'C1', 1)),
    question(6, 'C1', 1), // answered as if reverse-keyed
    question(7, 'C1', 1)  // pure noise
  ]
  const responses = []
  for (let p = 0; p < 150; p++) {
    const trait = rand() * 4 - 2
    const rs = {}
    for (const id of [1, 2, 3, 4, 5]) rs[id] = clamp(trait + (rand() - 0.5))
    rs[6] = clamp(-trait + (rand() - 0.5))
    rs[7] = clamp(rand() * 4 - 2)
    responses.push(rs)
  }

  const items = Object.fromEntries(
    computeValidation(qs, [{ id: 'C1', name: 'Econ' }], responses).items.map(i => [i.question_id, i])
  )
  assert.ok(items[6].flags.includes('runs against its axis'), items[6].flags.join())
  assert.ok(items[6].flags.includes('removing it raises α'))
  assert.ok(items[7].flags.includes('weakly tied to axis'), items[7].flags.join())
  assert.deepEqual(items[1].flags, [])
})

test('small samples report numbers but never flag', () => {
  const qs = [question(1, 'C1'), question(2, 'C1'), question(3, 'C1')]
  const responses = Array.from({ length: MIN_ITEM_N - 1 }, (_, i) => ({ 1: 2, 2: -2, 3: i % 2 ? null : 0 }))
  const report = computeValidation(qs, [{ id: 'C1', name: 'Econ' }], responses)
  assert.equal(report.axes[0].alpha, null)
  for (const item of report.items) assert.deepEqual(item.flags, [])
})

test('conceptual and applied halves of an axis are compared per respondent', () => {
  const rand = rng(3)
  const conceptual = [1, 2, 3].map(id => question(id, 'C2'))
  const applied = [4, 5, 6].map(id => question(id, 'C2', 1, { row: { question_type: 'applied' } }))
  const qs = [...conceptual, ...applied]
  const responses = []
  for (let p = 0; p < 80; p++) {
    const trait = rand() * 4 - 2
    const rs = {}
    for (const q of qs) rs[q.id] = clamp(trait + (rand() - 0.5))
    responses.push(rs)
  }
  const [axis] = computeValidation(qs, [{ id: 'C2', name: 'Dist' }], responses).axes
  assert.equal(axis.conceptual_applied_n, 80)
  assert.ok(axis.conceptual_applied_r > 0.8, `r ${axis.conceptual_applied_r}`)
})

test('collision scenarios are labelled by their tradeoff link', () => {
  const qs = [
    question(1, 'C1'),
    question(2, 'C1', 1, {
      row: { question_type: 'applied' },
      links: [{ id: 99, question_id: 2, axis_id: 'C3', role: 'tradeoff', axis_key: -1, weight: 1, created_at: null }]
    })
  ]
  const { items } = computeEngagement(qs, [], [])
  assert.equal(items[0].kind, 'conceptual')
  assert.equal(items[1].kind, 'collision')
})
