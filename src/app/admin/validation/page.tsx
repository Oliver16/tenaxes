'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

interface ItemValidation {
  question_id: number
  axis_id: string
  question_type: string
  text: string
  answered: number
  skip_rate: number
  mean: number
  sd: number
  item_rest_r: number | null
}

interface AxisValidation {
  axis_id: string
  name: string
  item_count: number
  cronbach_alpha: number | null
  complete_cases: number
}

interface AxisCorrelation {
  axis_a: string
  axis_b: string
  r: number
  n: number
}

interface ValidationData {
  sample_size: number
  generated_at: string
  items: ItemValidation[]
  axes: AxisValidation[]
  correlations: AxisCorrelation[]
}

const MIN_SAMPLE = 30
const LOW_ITEM_REST = 0.2
const LOW_SD = 0.6
const HIGH_SKIP = 0.1
const LOW_ALPHA = 0.65
const HIGH_AXIS_R = 0.6

function fmt(v: number | null | undefined, digits = 2) {
  if (v === null || v === undefined) return '—'
  return v.toFixed(digits)
}

export default function ValidationPage() {
  const { user, isAdmin, loading: authLoading } = useAuth()
  const router = useRouter()
  const [data, setData] = useState<ValidationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [flaggedOnly, setFlaggedOnly] = useState(true)

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      router.push('/')
    }
  }, [user, isAdmin, authLoading, router])

  useEffect(() => {
    if (!user || !isAdmin) return

    async function load() {
      setLoading(true)
      try {
        const res = await fetch('/api/admin/validation')
        if (!res.ok) throw new Error('Request failed')
        setData(await res.json())
      } catch {
        setError('Failed to load validation data')
      }
      setLoading(false)
    }
    load()
  }, [user, isAdmin])

  if (authLoading || !user || !isAdmin) return null

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-100 py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-300 rounded w-64 mb-8" />
            <div className="h-96 bg-gray-300 rounded-xl" />
          </div>
        </div>
      </main>
    )
  }

  if (error || !data) {
    return (
      <main className="min-h-screen bg-gray-100 py-8 px-4">
        <div className="max-w-7xl mx-auto text-red-600">{error || 'No data'}</div>
      </main>
    )
  }

  const itemFlags = (item: ItemValidation) => {
    const flags: string[] = []
    if (item.item_rest_r !== null && item.item_rest_r < LOW_ITEM_REST) flags.push('low discrimination')
    if (item.sd < LOW_SD && item.answered > 0) flags.push('low variance')
    if (item.skip_rate > HIGH_SKIP) flags.push('high skip rate')
    if (Math.abs(item.mean) > 1.2) flags.push('skewed')
    return flags
  }

  const flaggedItems = data.items.filter(i => itemFlags(i).length > 0)
  const shownItems = (flaggedOnly ? flaggedItems : data.items)
    .slice()
    .sort((a, b) => (a.item_rest_r ?? 1) - (b.item_rest_r ?? 1))

  const highCorrelations = data.correlations
    .filter(c => Math.abs(c.r) >= HIGH_AXIS_R)
    .sort((a, b) => Math.abs(b.r) - Math.abs(a.r))

  const smallSample = data.sample_size < MIN_SAMPLE

  return (
    <main className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Question Bank Validation</h1>
            <p className="text-gray-600 mt-1">
              Psychometric health of the instrument, computed from {data.sample_size} response
              set{data.sample_size !== 1 ? 's' : ''}.
            </p>
          </div>
          <Link href="/admin" className="text-blue-600 hover:underline">
            ← Back to Dashboard
          </Link>
        </div>

        {smallSample && (
          <div className="p-4 bg-amber-50 border border-amber-300 rounded-lg text-amber-900 text-sm">
            Fewer than {MIN_SAMPLE} responses — every statistic below is unstable. Treat flags
            as hints, not verdicts, until more data arrives.
          </div>
        )}

        {/* Axis reliability */}
        <section className="bg-white rounded-xl shadow p-6">
          <h2 className="text-xl font-semibold mb-1">Axis Reliability (Cronbach&apos;s α)</h2>
          <p className="text-sm text-gray-500 mb-4">
            Internal consistency of each axis&apos;s items. Rule of thumb: α ≥ 0.7 good,
            0.65–0.7 acceptable, below {LOW_ALPHA} means items may not measure one construct.
            Computed over respondents who answered every item on the axis.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b text-gray-500">
                  <th className="py-2 pr-4">Axis</th>
                  <th className="py-2 pr-4">Items</th>
                  <th className="py-2 pr-4">α</th>
                  <th className="py-2 pr-4">Complete cases</th>
                  <th className="py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.axes.map(axis => (
                  <tr key={axis.axis_id} className="border-b last:border-0">
                    <td className="py-2 pr-4 font-medium">{axis.axis_id} — {axis.name}</td>
                    <td className="py-2 pr-4">{axis.item_count}</td>
                    <td className="py-2 pr-4 font-mono">{fmt(axis.cronbach_alpha)}</td>
                    <td className="py-2 pr-4">{axis.complete_cases}</td>
                    <td className="py-2">
                      {axis.cronbach_alpha === null ? (
                        <span className="text-gray-400">insufficient data</span>
                      ) : axis.cronbach_alpha < LOW_ALPHA ? (
                        <span className="text-red-600 font-medium">low consistency</span>
                      ) : (
                        <span className="text-green-600">ok</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Inter-axis correlations */}
        <section className="bg-white rounded-xl shadow p-6">
          <h2 className="text-xl font-semibold mb-1">Axis Independence</h2>
          <p className="text-sm text-gray-500 mb-4">
            Axis pairs correlating above |r| ≥ {HIGH_AXIS_R} partially measure the same thing —
            candidates for de-overlapping items or merging. (Some correlation is expected:
            e.g. economic axes.)
          </p>
          {highCorrelations.length === 0 ? (
            <p className="text-sm text-green-600">
              No axis pairs above the threshold{smallSample ? ' (small sample)' : ''}.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b text-gray-500">
                    <th className="py-2 pr-4">Pair</th>
                    <th className="py-2 pr-4">r</th>
                    <th className="py-2">n</th>
                  </tr>
                </thead>
                <tbody>
                  {highCorrelations.map(c => (
                    <tr key={`${c.axis_a}-${c.axis_b}`} className="border-b last:border-0">
                      <td className="py-2 pr-4 font-medium">{c.axis_a} × {c.axis_b}</td>
                      <td className="py-2 pr-4 font-mono">{fmt(c.r)}</td>
                      <td className="py-2">{c.n}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Item quality */}
        <section className="bg-white rounded-xl shadow p-6">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-xl font-semibold">Item Quality</h2>
            <label className="text-sm text-gray-600 flex items-center gap-2">
              <input
                type="checkbox"
                checked={flaggedOnly}
                onChange={e => setFlaggedOnly(e.target.checked)}
              />
              Flagged only ({flaggedItems.length} of {data.items.length})
            </label>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Item–rest correlation below {LOW_ITEM_REST} means an item barely tracks its own
            axis (candidate for rewording or reassignment). Low variance means everyone
            answers the same way; skew means the average answer is far off-center.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b text-gray-500">
                  <th className="py-2 pr-4">Q</th>
                  <th className="py-2 pr-4">Axis</th>
                  <th className="py-2 pr-4 max-w-md">Text</th>
                  <th className="py-2 pr-4">item–rest r</th>
                  <th className="py-2 pr-4">SD</th>
                  <th className="py-2 pr-4">Mean</th>
                  <th className="py-2 pr-4">Skip</th>
                  <th className="py-2">Flags</th>
                </tr>
              </thead>
              <tbody>
                {shownItems.map(item => {
                  const flags = itemFlags(item)
                  return (
                    <tr key={item.question_id} className="border-b last:border-0 align-top">
                      <td className="py-2 pr-4 font-mono">{item.question_id}</td>
                      <td className="py-2 pr-4">{item.axis_id}</td>
                      <td className="py-2 pr-4 max-w-md text-gray-700">{item.text}</td>
                      <td className={`py-2 pr-4 font-mono ${item.item_rest_r !== null && item.item_rest_r < LOW_ITEM_REST ? 'text-red-600 font-bold' : ''}`}>
                        {fmt(item.item_rest_r)}
                      </td>
                      <td className="py-2 pr-4 font-mono">{fmt(item.sd)}</td>
                      <td className="py-2 pr-4 font-mono">{fmt(item.mean)}</td>
                      <td className="py-2 pr-4 font-mono">{(item.skip_rate * 100).toFixed(0)}%</td>
                      <td className="py-2 text-xs text-red-600">{flags.join(', ')}</td>
                    </tr>
                  )
                })}
                {shownItems.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-4 text-center text-green-600">
                      No flagged items{smallSample ? ' (small sample)' : ''} 🎉
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  )
}
