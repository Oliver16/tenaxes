'use client'

import { useState } from 'react'
import type { CollisionPairViewModel } from '@/lib/results/collision-view'
import { CompactCollisionPair } from './CompactCollisionPair'

type Filter = 'informative' | 'cross_pressured' | 'protected' | 'traded_away' | 'inconclusive'

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'informative', label: 'Most informative' },
  { id: 'cross_pressured', label: 'Cross-pressured' },
  { id: 'protected', label: 'Protected' },
  { id: 'traded_away', label: 'Traded away' },
  { id: 'inconclusive', label: 'Inconclusive' }
]

function matches(pair: CollisionPairViewModel, filter: Filter): boolean {
  switch (filter) {
    case 'informative': return true
    case 'cross_pressured': return pair.classification === 'cross_pressured'
    case 'protected': return pair.classification === 'aligned' && pair.direction > 0
    case 'traded_away': return pair.classification === 'aligned' && pair.direction < 0
    case 'inconclusive': return pair.classification === 'inconclusive'
  }
}

/**
 * Filterable list of collision pairs. `pairs` arrives pre-ranked by the
 * shared ranking utility, so "most informative" is simply that order.
 */
export function ConflictsExplorer({
  pairs,
  axisOptions
}: {
  pairs: CollisionPairViewModel[]
  axisOptions: { id: string; name: string }[]
}) {
  const [filter, setFilter] = useState<Filter>('informative')
  const [axisFilter, setAxisFilter] = useState<string>('')

  const visible = pairs.filter(
    p => matches(p, filter) && (!axisFilter || p.axisA === axisFilter || p.axisB === axisFilter)
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div role="group" aria-label="Filter by classification" className="flex flex-wrap gap-1.5">
          {FILTERS.map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              aria-pressed={filter === f.id}
              className={`px-3 py-1.5 text-sm rounded-full border font-medium transition-colors ${
                filter === f.id
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'bg-white border-gray-300 text-gray-600 hover:border-gray-400'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <select
          aria-label="Filter by axis"
          value={axisFilter}
          onChange={e => setAxisFilter(e.target.value)}
          className="ml-auto text-sm border border-gray-300 rounded-lg px-2 py-1.5 bg-white text-gray-700"
        >
          <option value="">All axes</option>
          {axisOptions.map(a => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
      </div>

      {visible.length > 0 ? (
        <div className="space-y-4">
          {visible.map(pair => (
            <CompactCollisionPair key={pair.pairId} pair={pair} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-500 py-8 text-center">
          No collision pairs match this filter.
        </p>
      )}
    </div>
  )
}
