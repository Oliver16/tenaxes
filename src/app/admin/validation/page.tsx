'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  MIN_ITEM_N,
  VALIDATION_THRESHOLDS as T,
  type ItemValidation,
  type ValidationReport
} from '@/lib/admin/question-stats'
import {
  BankSelector,
  KIND_LABELS,
  PageSkeleton,
  Stat,
  pct,
  useBankReport,
  type BankOption
} from '@/components/admin/QuestionInsights'

type ValidationData = ValidationReport & {
  bank: string
  banks: BankOption[]
  generated_at: string
}

// What each flag means and what to do about it, in plain terms.
const FLAG_HELP: Record<string, { tone: string; help: string }> = {
  'runs against its axis': {
    tone: 'bg-red-100 text-red-800',
    help: 'People who score high on this axis tend to answer this item the OTHER way. Most often the key (+/−) is backwards; otherwise the wording reads opposite to what was intended.'
  },
  'weakly tied to axis': {
    tone: 'bg-orange-100 text-orange-800',
    help: 'Answers barely track the rest of the axis. The item may measure something else, be ambiguous, or belong on a different axis.'
  },
  'removing it raises α': {
    tone: 'bg-orange-100 text-orange-800',
    help: 'The axis would be more internally consistent without this item.'
  },
  'little disagreement': {
    tone: 'bg-yellow-100 text-yellow-800',
    help: 'Almost everyone answers alike, so the item does little to separate people.'
  },
  'one answer dominates': {
    tone: 'bg-yellow-100 text-yellow-800',
    help: `At least ${pct(T.oneSided)} of people pick the same option.`
  },
  'often "not sure"': {
    tone: 'bg-sky-100 text-sky-800',
    help: `More than ${pct(T.notSure)} answer "not sure" — often unclear wording or a missing premise.`
  }
}

const SEVERITY = Object.keys(FLAG_HELP)

function fmt(v: number | null | undefined, digits = 2) {
  if (v === null || v === undefined) return '—'
  return v.toFixed(digits)
}

function alphaStatus(alpha: number | null) {
  if (alpha === null) return <span className="text-gray-400">needs {MIN_ITEM_N}+ responses</span>
  if (alpha >= 0.8) return <span className="text-green-700">strong</span>
  if (alpha >= 0.7) return <span className="text-green-600">good</span>
  if (alpha >= T.lowAlpha) return <span className="text-amber-600">acceptable</span>
  return <span className="text-red-600 font-medium">low</span>
}

function convergenceStatus(r: number | null) {
  if (r === null) return <span className="text-gray-400">—</span>
  if (r >= 0.5) return <span className="text-green-700">agree</span>
  if (r >= T.conceptualApplied) return <span className="text-amber-600">loosely</span>
  return <span className="text-red-600 font-medium">diverge</span>
}

export default function ValidationPage() {
  const { ready, data, loading, error, setBank } = useBankReport<ValidationData>('/api/admin/validation')
  const [flaggedOnly, setFlaggedOnly] = useState(true)
  const [axisFilter, setAxisFilter] = useState('all')
  const [flagFilter, setFlagFilter] = useState('all')

  const shownItems = useMemo(() => {
    if (!data) return []
    const rank = (i: ItemValidation) =>
      i.flags.length ? Math.min(...i.flags.map(f => SEVERITY.indexOf(f))) : SEVERITY.length
    return data.items
      .filter(i => !flaggedOnly || i.flags.length > 0)
      .filter(i => axisFilter === 'all' || i.axis_id === axisFilter)
      .filter(i => flagFilter === 'all' || i.flags.includes(flagFilter))
      .slice()
      .sort((a, b) => rank(a) - rank(b) || (a.item_rest_r ?? 1) - (b.item_rest_r ?? 1))
  }, [data, flaggedOnly, axisFilter, flagFilter])

  if (!ready) return null
  if (loading && !data) return <PageSkeleton />
  if (error || !data) {
    return (
      <main className="min-h-screen bg-gray-100 py-8 px-4">
        <div className="max-w-7xl mx-auto text-red-600">{error || 'No data'}</div>
      </main>
    )
  }

  const flagged = data.items.filter(i => i.flags.length > 0)
  const flagCounts = SEVERITY.map(f => ({ flag: f, count: data.items.filter(i => i.flags.includes(f)).length }))
  const lowAxes = data.axes.filter(a => a.alpha !== null && a.alpha < T.lowAlpha)
  const divergent = data.axes.filter(a => a.conceptual_applied_r !== null && a.conceptual_applied_r < T.conceptualApplied)
  const highCorrelations = data.correlations
    .filter(c => Math.abs(c.r) >= T.highAxisR)
    .sort((a, b) => Math.abs(b.r) - Math.abs(a.r))
  const smallSample = data.sample_size < MIN_ITEM_N

  return (
    <main className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Question Bank Validation</h1>
            <p className="text-gray-600 mt-1">
              Do the questions measure what their axis claims? Computed from {data.sample_size} completed
              survey{data.sample_size === 1 ? '' : 's'} on bank {data.bank}.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <BankSelector banks={data.banks} value={data.bank} onChange={setBank} />
            <Link href="/admin" className="text-blue-600 hover:underline text-sm">← Dashboard</Link>
          </div>
        </div>

        {smallSample && (
          <div className="p-4 bg-amber-50 border border-amber-300 rounded-lg text-amber-900 text-sm">
            Fewer than {MIN_ITEM_N} completed surveys on this bank. Numbers are shown but nothing is flagged
            until there is enough data for the statistics to mean something.
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Stat label="Questions flagged" value={`${flagged.length} / ${data.items.length}`} hint="see the list below" />
          <Stat label="Possible keying errors" value={String(flagCounts[0].count)} hint="answers run against the axis" />
          <Stat label="Axes with low α" value={String(lowAxes.length)} hint={`α below ${T.lowAlpha}`} />
          <Stat label="Conceptual ≠ applied" value={String(divergent.length)} hint="axes where principles and scenarios disagree" />
        </div>

        {/* Axis health */}
        <section className="bg-white rounded-xl shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900">Axis health</h2>
          <p className="text-sm text-gray-500 mb-4">
            <strong>α</strong> (Cronbach&apos;s alpha) asks whether an axis&apos;s questions move together; 0.7+ is good.
            It uses every available answer pair, so &ldquo;not sure&rdquo; answers no longer knock respondents out.
            <strong> Conceptual ↔ applied</strong> correlates each person&apos;s score from the abstract questions with
            their score from the concrete scenarios on the same axis — low agreement means the two halves are measuring
            different things (or people genuinely apply principles inconsistently).
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b text-gray-500">
                  <th className="py-2 pr-4">Axis</th>
                  <th className="py-2 pr-4 text-right">Items</th>
                  <th className="py-2 pr-4 text-right">n</th>
                  <th className="py-2 pr-4 text-right">α</th>
                  <th className="py-2 pr-4">Reliability</th>
                  <th className="py-2 pr-4 text-right">Avg item r</th>
                  <th className="py-2 pr-4 text-right">Conceptual ↔ applied r</th>
                  <th className="py-2 pr-4" />
                  <th className="py-2 text-right">Flagged items</th>
                </tr>
              </thead>
              <tbody>
                {data.axes.map(axis => {
                  const axisFlagged = flagged.filter(i => i.axis_id === axis.axis_id).length
                  return (
                    <tr key={axis.axis_id} className="border-b last:border-0">
                      <td className="py-2 pr-4 font-medium">{axis.axis_id} — {axis.name}</td>
                      <td className="py-2 pr-4 text-right">{axis.item_count}</td>
                      <td className="py-2 pr-4 text-right">{axis.n}</td>
                      <td className="py-2 pr-4 text-right font-mono">{fmt(axis.alpha)}</td>
                      <td className="py-2 pr-4">{alphaStatus(axis.alpha)}</td>
                      <td className="py-2 pr-4 text-right font-mono">{fmt(axis.mean_inter_item_r)}</td>
                      <td className="py-2 pr-4 text-right font-mono">{fmt(axis.conceptual_applied_r)}</td>
                      <td className="py-2 pr-4">{convergenceStatus(axis.conceptual_applied_r)}</td>
                      <td className="py-2 text-right">
                        {axisFlagged > 0 ? (
                          <button
                            onClick={() => { setAxisFilter(axis.axis_id); setFlaggedOnly(true) }}
                            className="text-blue-600 hover:underline"
                          >
                            {axisFlagged}
                          </button>
                        ) : (
                          <span className="text-gray-400">0</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Items */}
        <section className="bg-white rounded-xl shadow p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <h2 className="text-lg font-semibold text-gray-900">Questions to review</h2>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <select value={axisFilter} onChange={e => setAxisFilter(e.target.value)} className="border border-gray-300 rounded-lg px-2 py-1 bg-white">
                <option value="all">All axes</option>
                {data.axes.map(a => <option key={a.axis_id} value={a.axis_id}>{a.axis_id}</option>)}
              </select>
              <select value={flagFilter} onChange={e => setFlagFilter(e.target.value)} className="border border-gray-300 rounded-lg px-2 py-1 bg-white">
                <option value="all">All issues</option>
                {flagCounts.map(({ flag, count }) => <option key={flag} value={flag}>{flag} ({count})</option>)}
              </select>
              <label className="text-gray-600 flex items-center gap-2">
                <input type="checkbox" checked={flaggedOnly} onChange={e => setFlaggedOnly(e.target.checked)} />
                Flagged only
              </label>
            </div>
          </div>
          <dl className="grid md:grid-cols-2 gap-x-6 gap-y-1 text-xs text-gray-600 mb-4">
            {SEVERITY.map(flag => (
              <div key={flag} className="flex gap-2">
                <dt><span className={`px-1.5 py-0.5 rounded whitespace-nowrap ${FLAG_HELP[flag].tone}`}>{flag}</span></dt>
                <dd>{FLAG_HELP[flag].help}</dd>
              </div>
            ))}
          </dl>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b text-gray-500">
                  <th className="py-2 pr-3">Q</th>
                  <th className="py-2 pr-3">Axis</th>
                  <th className="py-2 pr-3 min-w-[18rem]">Question</th>
                  <th className="py-2 pr-3 text-right" title="Correlation with the rest of the axis (keyed)">Fit r</th>
                  <th className="py-2 pr-3 text-right" title="Axis alpha if this item were removed">α without</th>
                  <th className="py-2 pr-3 text-right">SD</th>
                  <th className="py-2 pr-3 text-right">Mean</th>
                  <th className="py-2 pr-3 text-right">Not sure</th>
                  <th className="py-2">Issues</th>
                </tr>
              </thead>
              <tbody>
                {shownItems.map(item => {
                  const axisAlpha = data.axes.find(a => a.axis_id === item.axis_id)?.alpha ?? null
                  return (
                    <tr key={item.question_id} className="border-b last:border-0 align-top">
                      <td className="py-2 pr-3 font-mono text-gray-500">{item.question_id}</td>
                      <td className="py-2 pr-3">
                        {item.axis_id}
                        <div className="text-xs text-gray-400">{KIND_LABELS[item.kind]}{item.active ? '' : ' · inactive'}</div>
                      </td>
                      <td className="py-2 pr-3 text-gray-700">{item.text}</td>
                      <td className={`py-2 pr-3 text-right font-mono ${item.item_rest_r !== null && item.item_rest_r < T.weak ? 'text-red-600 font-bold' : ''}`}>
                        {fmt(item.item_rest_r)}
                      </td>
                      <td className={`py-2 pr-3 text-right font-mono ${axisAlpha !== null && item.alpha_if_deleted !== null && item.alpha_if_deleted > axisAlpha + T.alphaGain ? 'text-orange-600 font-bold' : ''}`}>
                        {fmt(item.alpha_if_deleted)}
                      </td>
                      <td className="py-2 pr-3 text-right font-mono">{fmt(item.sd)}</td>
                      <td className="py-2 pr-3 text-right font-mono">{fmt(item.mean)}</td>
                      <td className="py-2 pr-3 text-right font-mono">{pct(item.not_sure_rate)}</td>
                      <td className="py-2">
                        <div className="flex flex-wrap gap-1">
                          {item.flags.map(f => (
                            <span key={f} className={`px-1.5 py-0.5 rounded text-xs whitespace-nowrap ${FLAG_HELP[f]?.tone ?? 'bg-gray-100'}`}>{f}</span>
                          ))}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">n = {item.n}</div>
                      </td>
                    </tr>
                  )
                })}
                {shownItems.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-4 text-center text-green-600">
                      Nothing flagged{smallSample ? ' (not enough data yet to flag anything)' : ''}.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Inter-axis overlap */}
        <section className="bg-white rounded-xl shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900">Axis overlap</h2>
          <p className="text-sm text-gray-500 mb-4">
            Axis pairs whose scores correlate at |r| ≥ {T.highAxisR} partly measure the same thing — candidates for
            de-overlapping questions. Some correlation is expected (e.g. the two economic axes).
          </p>
          {highCorrelations.length === 0 ? (
            <p className="text-sm text-green-600">No axis pairs above the threshold{smallSample ? ' (small sample)' : ''}.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {highCorrelations.map(c => (
                <span key={`${c.axis_a}-${c.axis_b}`} className="px-3 py-1.5 rounded-lg bg-gray-100 text-sm">
                  <span className="font-medium">{c.axis_a} × {c.axis_b}</span>
                  <span className="font-mono ml-2">{fmt(c.r)}</span>
                  <span className="text-gray-400 ml-1">n={c.n}</span>
                </span>
              ))}
            </div>
          )}
        </section>

        <p className="text-center text-xs text-gray-400">
          Generated {new Date(data.generated_at).toLocaleString()} · up to the 5,000 most recent completed surveys on this bank.
        </p>
      </div>
    </main>
  )
}
