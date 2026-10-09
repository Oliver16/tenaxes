'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import type { EngagementReport, ItemEngagement } from '@/lib/admin/question-stats'
import {
  AnswerDistribution,
  BankSelector,
  KIND_LABELS,
  PageSkeleton,
  Stat,
  pct,
  useBankReport,
  type BankOption
} from '@/components/admin/QuestionInsights'

type EngagementData = EngagementReport & {
  bank: string
  banks: BankOption[]
  generated_at: string
  tracking_available: boolean
}

type SortKey = 'skip_rate' | 'not_sure_rate' | 'quit_here' | 'left_blank'

const VIEWS: { key: SortKey; label: string; help: string }[] = [
  {
    key: 'skip_rate',
    label: 'Most skipped',
    help: 'Share of people shown the question who moved on without answering (Skip, Previous, or jumping ahead). Many come back later — "left blank" counts the ones who never did.'
  },
  {
    key: 'not_sure_rate',
    label: 'Most "not sure"',
    help: 'Share of completed surveys that answered "Not sure / need more information". High rates usually mean the question is unclear or needs facts people don\'t have.'
  },
  {
    key: 'quit_here',
    label: 'Where people quit',
    help: 'Abandoned surveys (no activity for 24h) whose last on-screen question was this one, unanswered.'
  },
  {
    key: 'left_blank',
    label: 'Left blank',
    help: 'Skipped and still unanswered in a survey that was never submitted.'
  }
]

export default function EngagementPage() {
  const { ready, data, loading, error, setBank } = useBankReport<EngagementData>('/api/admin/engagement')
  const [view, setView] = useState<SortKey>('skip_rate')
  const [axisFilter, setAxisFilter] = useState('all')
  const [kindFilter, setKindFilter] = useState('all')

  const axisIds = useMemo(
    () => Array.from(new Set((data?.items || []).map(i => i.axis_id)))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
    [data]
  )

  const rows = useMemo(() => {
    if (!data) return []
    return data.items
      .filter(i => axisFilter === 'all' || i.axis_id === axisFilter)
      .filter(i => kindFilter === 'all' || i.kind === kindFilter)
      .slice()
      .sort((a, b) => b[view] - a[view] || b.skipped - a.skipped)
  }, [data, view, axisFilter, kindFilter])

  const axisSummary = useMemo(() => {
    if (!data) return []
    const byAxis = new Map<string, ItemEngagement[]>()
    for (const item of data.items) {
      if (!byAxis.has(item.axis_id)) byAxis.set(item.axis_id, [])
      byAxis.get(item.axis_id)!.push(item)
    }
    return Array.from(byAxis, ([axis_id, items]) => {
      const viewed = items.reduce((s, i) => s + i.viewed, 0)
      const skipped = items.reduce((s, i) => s + i.skipped, 0)
      const responses = items.reduce((s, i) => s + i.responses, 0)
      const notSure = items.reduce((s, i) => s + i.not_sure, 0)
      return {
        axis_id,
        skip_rate: viewed ? skipped / viewed : 0,
        not_sure_rate: responses ? notSure / responses : 0,
        quit_here: items.reduce((s, i) => s + i.quit_here, 0)
      }
    }).sort((a, b) => a.axis_id.localeCompare(b.axis_id, undefined, { numeric: true }))
  }, [data])

  if (!ready) return null
  if (loading && !data) return <PageSkeleton />
  if (error || !data) {
    return (
      <main className="min-h-screen bg-gray-100 py-8 px-4">
        <div className="max-w-7xl mx-auto text-red-600">{error || 'No data'}</div>
      </main>
    )
  }

  const f = data.funnel
  const activeView = VIEWS.find(v => v.key === view)!
  const funnelSteps = [
    { label: 'Started', value: f.started },
    { label: '25% answered', value: f.reached_25 },
    { label: '50% answered', value: f.reached_50 },
    { label: '75% answered', value: f.reached_75 },
    { label: 'All answered', value: f.answered_all },
    { label: 'Submitted', value: f.completed }
  ]
  const maxReach = Math.max(f.started, 1)
  const noTracking = !data.tracking_available || f.tracked_sessions === 0
  const maxAxisSkip = Math.max(...axisSummary.map(a => a.skip_rate), 0.0001)
  const maxAxisNotSure = Math.max(...axisSummary.map(a => a.not_sure_rate), 0.0001)

  return (
    <main className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Question Engagement</h1>
            <p className="text-gray-600 mt-1">
              Which questions people skip, mark &ldquo;not sure&rdquo;, or quit on.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <BankSelector banks={data.banks} value={data.bank} onChange={setBank} />
            <Link href="/admin" className="text-blue-600 hover:underline text-sm">← Dashboard</Link>
          </div>
        </div>

        {noTracking && (
          <div className="p-4 bg-amber-50 border border-amber-300 rounded-lg text-amber-900 text-sm">
            {data.tracking_available
              ? 'No in-progress surveys tracked for this bank yet. Skip and drop-off tracking starts with this release; '
              : 'Skip and drop-off tracking needs the survey_sessions migration (20261009120000). Until then, '}
            &ldquo;not sure&rdquo; rates below come from the {data.completed_responses} completed survey
            {data.completed_responses === 1 ? '' : 's'}. Completed surveys can&apos;t show skips because
            every question must be answered before submitting.
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Stat
            label="Completion rate"
            value={f.started ? pct(f.completed / f.started) : '—'}
            hint={`${f.completed} of ${f.started} who answered at least one question`}
          />
          <Stat
            label="Abandoned"
            value={String(f.abandoned)}
            hint={f.median_abandon_progress !== null
              ? `typically after ${pct(f.median_abandon_progress)} of the bank`
              : `${f.in_progress} still in progress`}
          />
          <Stat
            label="Median time to finish"
            value={f.median_completion_minutes !== null ? `${Math.round(f.median_completion_minutes)} min` : '—'}
            hint="first answer to submit, across sittings"
          />
          <Stat
            label="Completed responses"
            value={String(data.completed_responses)}
            hint={`bank ${data.bank}`}
          />
        </div>

        {/* Funnel */}
        <section className="bg-white rounded-xl shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900">Completion funnel</h2>
          <p className="text-sm text-gray-500 mb-4">
            Tracked sittings since {f.tracking_since ? new Date(f.tracking_since).toLocaleDateString() : '—'}.
            &ldquo;All answered&rdquo; but not submitted usually means someone stopped at the results button.
          </p>
          <div className="space-y-2">
            {funnelSteps.map(step => (
              <div key={step.label} className="flex items-center gap-3 text-sm">
                <span className="w-32 text-gray-600 shrink-0">{step.label}</span>
                <div className="flex-1 bg-gray-100 rounded h-5 overflow-hidden">
                  <div className="bg-blue-500 h-full" style={{ width: `${(step.value / maxReach) * 100}%` }} />
                </div>
                <span className="w-24 text-right font-mono text-gray-700">
                  {step.value} <span className="text-gray-400">{f.started ? pct(step.value / f.started) : ''}</span>
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* By axis */}
        <section className="bg-white rounded-xl shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900">By axis</h2>
          <p className="text-sm text-gray-500 mb-4">Click an axis to filter the question list.</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b text-gray-500">
                  <th className="py-2 pr-4">Axis</th>
                  <th className="py-2 pr-4">Skip rate</th>
                  <th className="py-2 pr-4">&ldquo;Not sure&rdquo; rate</th>
                  <th className="py-2">Quit here</th>
                </tr>
              </thead>
              <tbody>
                {axisSummary.map(a => (
                  <tr
                    key={a.axis_id}
                    onClick={() => setAxisFilter(axisFilter === a.axis_id ? 'all' : a.axis_id)}
                    className={`border-b last:border-0 cursor-pointer hover:bg-gray-50 ${axisFilter === a.axis_id ? 'bg-blue-50' : ''}`}
                  >
                    <td className="py-2 pr-4 font-medium">{a.axis_id}</td>
                    <td className="py-2 pr-4">
                      <InlineBar value={a.skip_rate} max={maxAxisSkip} color="bg-amber-400" />
                    </td>
                    <td className="py-2 pr-4">
                      <InlineBar value={a.not_sure_rate} max={maxAxisNotSure} color="bg-sky-400" />
                    </td>
                    <td className="py-2 font-mono">{a.quit_here}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Questions */}
        <section className="bg-white rounded-xl shadow p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div className="flex flex-wrap gap-2">
              {VIEWS.map(v => (
                <button
                  key={v.key}
                  onClick={() => setView(v.key)}
                  className={`px-3 py-1.5 rounded-lg text-sm ${view === v.key ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  {v.label}
                </button>
              ))}
            </div>
            <div className="flex gap-2 text-sm">
              <select value={axisFilter} onChange={e => setAxisFilter(e.target.value)} className="border border-gray-300 rounded-lg px-2 py-1 bg-white">
                <option value="all">All axes</option>
                {axisIds.map(id => <option key={id} value={id}>{id}</option>)}
              </select>
              <select value={kindFilter} onChange={e => setKindFilter(e.target.value)} className="border border-gray-300 rounded-lg px-2 py-1 bg-white">
                <option value="all">All types</option>
                {Object.entries(KIND_LABELS).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
              </select>
            </div>
          </div>
          <p className="text-sm text-gray-500 mb-4">{activeView.help}</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b text-gray-500">
                  <th className="py-2 pr-3">Q</th>
                  <th className="py-2 pr-3">Axis</th>
                  <th className="py-2 pr-3 min-w-[18rem]">Question</th>
                  <th className="py-2 pr-3 text-right">Skipped</th>
                  <th className="py-2 pr-3 text-right">Left blank</th>
                  <th className="py-2 pr-3 text-right">Quit here</th>
                  <th className="py-2 pr-3 text-right">Not sure</th>
                  <th className="py-2">Answers</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 100).map(item => (
                  <tr key={item.question_id} className="border-b last:border-0 align-top">
                    <td className="py-2 pr-3 font-mono text-gray-500">{item.question_id}</td>
                    <td className="py-2 pr-3">
                      {item.axis_id}
                      <div className="text-xs text-gray-400">{KIND_LABELS[item.kind]}{item.active ? '' : ' · inactive'}</div>
                    </td>
                    <td className="py-2 pr-3 text-gray-700">{item.text}</td>
                    <td className={`py-2 pr-3 text-right font-mono ${view === 'skip_rate' ? 'font-bold' : ''}`}>
                      {item.viewed ? pct(item.skip_rate) : '—'}
                      <div className="text-xs text-gray-400 font-sans">{item.skipped}/{item.viewed}</div>
                    </td>
                    <td className={`py-2 pr-3 text-right font-mono ${view === 'left_blank' ? 'font-bold' : ''}`}>{item.left_blank}</td>
                    <td className={`py-2 pr-3 text-right font-mono ${view === 'quit_here' ? 'font-bold' : ''}`}>{item.quit_here}</td>
                    <td className={`py-2 pr-3 text-right font-mono ${view === 'not_sure_rate' ? 'font-bold' : ''}`}>
                      {item.responses ? pct(item.not_sure_rate) : '—'}
                      <div className="text-xs text-gray-400 font-sans">{item.not_sure}/{item.responses}</div>
                    </td>
                    <td className="py-2 pt-3">
                      <AnswerDistribution distribution={item.distribution} notSure={item.not_sure} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length > 100 && (
              <p className="text-xs text-gray-400 mt-3">Showing the top 100 of {rows.length}. Filter by axis or type to see more.</p>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}

function InlineBar({ value, max, color }: { value: number; max: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-32 bg-gray-100 rounded h-2.5 overflow-hidden">
        <div className={`${color} h-full`} style={{ width: `${(value / max) * 100}%` }} />
      </div>
      <span className="font-mono text-gray-700 w-12">{pct(value, 1)}</span>
    </div>
  )
}
