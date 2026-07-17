'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AxisScale } from '@/components/charts/AxisScale'
import type { AxisScore as AxisScoreSummary } from '@/lib/supabase'

export interface AxisRowData {
  axis: AxisScoreSummary
  isFacet: boolean
  /** Coverage in [0, 1], null when unknown (very old results). */
  coverage: number | null
  confidence: 'high' | 'moderate' | 'low' | 'insufficient' | null
  answeredItems: number | null
  availableItems: number | null
  /** |conceptual - applied| for this axis, null when a register is missing. */
  gap: number | null
  /** Decisive (non-inconclusive) collision pairs this axis participates in. */
  conflictCount: number
}

const GAP_BADGE_THRESHOLD = 0.25

/** One compact linked row on the axes index page. */
export function ResultAxisRow({ sessionId, row }: { sessionId: string; row: AxisRowData }) {
  const { axis } = row

  return (
    <Link
      href={`/results/${sessionId}/axes/${axis.axis_id}`}
      className="block p-4 rounded-lg border border-gray-200 hover:border-blue-400 hover:shadow-md transition-all bg-white"
    >
      <AxisScale axis={axis} compact />
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 -mt-1 text-xs text-gray-500">
        <span className="font-medium text-gray-600">{axis.pole_label}</span>
        {row.coverage !== null && (
          <span className={row.confidence === 'insufficient' ? 'text-red-600' : undefined}>
            {row.confidence === 'insufficient'
              ? `Insufficient data (${row.answeredItems} of ${row.availableItems} items)`
              : `${Math.round(row.coverage * 100)}% answered · ${row.confidence} confidence`}
          </span>
        )}
        {row.gap !== null && row.gap >= GAP_BADGE_THRESHOLD && (
          <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
            {Math.round(row.gap * 100)}% principles/practice gap
          </span>
        )}
        {row.conflictCount > 0 && (
          <span>
            {row.conflictCount} decisive value conflict{row.conflictCount !== 1 ? 's' : ''}
          </span>
        )}
        <span className="ml-auto font-medium text-blue-600">Details →</span>
      </div>
    </Link>
  )
}

type SortMode = 'construct' | 'strongest' | 'confidence'

const CONFIDENCE_RANK: Record<string, number> = {
  insufficient: 0, low: 1, moderate: 2, high: 3
}

function sortRows(rows: AxisRowData[], mode: SortMode): AxisRowData[] {
  if (mode === 'construct') return rows
  const sorted = [...rows]
  if (mode === 'strongest') {
    sorted.sort((a, b) => Math.abs(b.axis.score) - Math.abs(a.axis.score))
  } else {
    sorted.sort(
      (a, b) =>
        (CONFIDENCE_RANK[a.confidence ?? 'high'] ?? 3) - (CONFIDENCE_RANK[b.confidence ?? 'high'] ?? 3) ||
        (a.coverage ?? 1) - (b.coverage ?? 1)
    )
  }
  return sorted
}

/**
 * The axes index: all core axes and facets as compact linked rows, in
 * construct order by default with optional re-sorting.
 */
export function AxesList({ sessionId, rows }: { sessionId: string; rows: AxisRowData[] }) {
  const [sort, setSort] = useState<SortMode>('construct')
  const sorted = sortRows(rows, sort)
  const grouped = sort === 'construct'

  const coreRows = sorted.filter(r => !r.isFacet)
  const facetRows = sorted.filter(r => r.isFacet)

  const renderRows = (list: AxisRowData[]) => (
    <div className="space-y-3">
      {list.map(row => (
        <ResultAxisRow key={row.axis.axis_id} sessionId={sessionId} row={row} />
      ))}
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end gap-2">
        <label htmlFor="axis-sort" className="text-sm text-gray-500">Sort:</label>
        <select
          id="axis-sort"
          value={sort}
          onChange={e => setSort(e.target.value as SortMode)}
          className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 bg-white text-gray-700"
        >
          <option value="construct">Construct order</option>
          <option value="strongest">Strongest first</option>
          <option value="confidence">Lowest confidence first</option>
        </select>
      </div>

      {grouped ? (
        <>
          <section>
            <h2 className="text-lg font-bold text-gray-800 mb-3">Core axes</h2>
            {renderRows(coreRows)}
          </section>
          <section>
            <h2 className="text-lg font-bold text-gray-800 mb-1">Political style facets</h2>
            <p className="text-sm text-gray-500 mb-3">
              How you pursue your beliefs — your approach to change, institutions, justice, and force.
            </p>
            {renderRows(facetRows)}
          </section>
        </>
      ) : (
        renderRows(sorted)
      )}
    </div>
  )
}
