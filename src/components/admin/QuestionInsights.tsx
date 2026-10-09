'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

export interface BankOption {
  id: string
  name: string
  status: string
}

/**
 * Admin-gated fetch of a bank-scoped report. `bank` is null until the
 * server picks the published bank, after which the selector drives it.
 */
export function useBankReport<T extends { bank: string }>(endpoint: string) {
  const { user, isAdmin, loading: authLoading } = useAuth()
  const router = useRouter()
  const [bank, setBank] = useState<string | null>(null)
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) router.push('/')
  }, [user, isAdmin, authLoading, router])

  useEffect(() => {
    if (!user || !isAdmin) return
    let cancelled = false
    setLoading(true)
    setError(null)
    fetch(bank ? `${endpoint}?bank=${encodeURIComponent(bank)}` : endpoint)
      .then(res => (res.ok ? res.json() : Promise.reject(new Error('Request failed'))))
      .then((json: T) => {
        if (cancelled) return
        setData(json)
        if (!bank) setBank(json.bank)
      })
      .catch(() => !cancelled && setError('Failed to load data'))
      .finally(() => !cancelled && setLoading(false))
    return () => { cancelled = true }
  }, [user, isAdmin, endpoint, bank])

  return { ready: !authLoading && !!user && isAdmin, data, loading, error, bank, setBank }
}

export function BankSelector({
  banks,
  value,
  onChange
}: {
  banks: BankOption[]
  value: string
  onChange: (bank: string) => void
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-gray-600">
      Question bank
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="border border-gray-300 rounded-lg px-2 py-1 bg-white text-gray-800"
      >
        {banks.map(b => (
          <option key={b.id} value={b.id}>
            {b.id} — {b.name}{b.status === 'published' ? ' (live)' : b.status === 'draft' ? ' (draft)' : ''}
          </option>
        ))}
      </select>
    </label>
  )
}

const DIST_COLORS = ['bg-red-600', 'bg-red-400', 'bg-gray-400', 'bg-green-400', 'bg-green-600']
const DIST_LABELS = ['Strongly disagree', 'Disagree', 'Neither', 'Agree', 'Strongly agree']

/** Stacked bar of -2..2 answers plus "not sure", proportional to all responses. */
export function AnswerDistribution({
  distribution,
  notSure
}: {
  distribution: number[]
  notSure: number
}) {
  const total = distribution.reduce((a, b) => a + b, 0) + notSure
  if (total === 0) return <span className="text-gray-300 text-xs">no answers</span>
  const segments = [
    ...distribution.map((count, i) => ({ count, color: DIST_COLORS[i], label: DIST_LABELS[i] })),
    { count: notSure, color: 'bg-sky-300', label: 'Not sure' }
  ]
  return (
    <div
      className="flex h-3 w-32 rounded overflow-hidden bg-gray-100"
      title={segments.map(s => `${s.label}: ${s.count}`).join('\n')}
    >
      {segments.map(s =>
        s.count > 0 ? (
          <div key={s.label} className={s.color} style={{ width: `${(s.count / total) * 100}%` }} />
        ) : null
      )}
    </div>
  )
}

export const KIND_LABELS: Record<string, string> = {
  conceptual: 'Conceptual',
  applied: 'Applied',
  collision: 'Collision'
}

export function pct(v: number | null | undefined, digits = 0) {
  if (v === null || v === undefined) return '—'
  return `${(v * 100).toFixed(digits)}%`
}

export function PageSkeleton() {
  return (
    <main className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-7xl mx-auto animate-pulse">
        <div className="h-8 bg-gray-300 rounded w-64 mb-8" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-gray-300 rounded-xl" />)}
        </div>
        <div className="h-96 bg-gray-300 rounded-xl" />
      </div>
    </main>
  )
}

export function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="bg-white rounded-xl shadow p-4">
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
      {hint && <p className="text-xs text-gray-500 mt-1">{hint}</p>}
    </div>
  )
}
