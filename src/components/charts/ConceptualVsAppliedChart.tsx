'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts'
import type { AxisScore } from '@/lib/supabase'

type Props = {
  conceptualScores: AxisScore[]
  appliedScores: AxisScore[]
}

export function ConceptualVsAppliedChart({ conceptualScores, appliedScores }: Props) {
  // Match conceptual and applied scores by axis_id
  const data = conceptualScores.map(conceptual => {
    const applied = appliedScores.find(a => a.axis_id === conceptual.axis_id)
    const gap = applied ? Math.abs(conceptual.score - applied.score) : 0

    return {
      axis: conceptual.name,
      shortName: getShortName(conceptual.name),
      conceptual: conceptual.score * 100, // Convert to -100 to +100
      applied: applied ? applied.score * 100 : 0,
      gap: gap * 100,
      hasGap: gap > 0.2 // Flag significant gaps (> 20%)
    }
  })

  // Sort by gap size (largest first) to highlight discrepancies
  const sortedData = [...data].sort((a, b) => b.gap - a.gap)

  return (
    <div className="w-full">
      <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h3 className="font-semibold text-blue-900 mb-1">Understanding the Gap</h3>
        <p className="text-sm text-blue-700">
          This chart compares your <strong>conceptual beliefs</strong> (what you think should be)
          versus your <strong>applied judgments</strong> (how you actually evaluate situations).
          Large gaps may indicate areas where ideology and practice diverge.
        </p>
      </div>

      <div className="h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={sortedData}
            margin={{ top: 5, right: 30, left: 20, bottom: 60 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="shortName"
              tick={{ fill: '#374151', fontSize: 11 }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis
              domain={[-100, 100]}
              ticks={[-100, -50, 0, 50, 100]}
              tick={{ fill: '#6b7280', fontSize: 12 }}
              label={{
                value: 'Score',
                angle: -90,
                position: 'insideLeft',
                style: { fill: '#6b7280', fontSize: 12 }
              }}
            />
            <ReferenceLine y={0} stroke="#9ca3af" strokeWidth={1} />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="top"
              height={36}
              iconType="line"
              wrapperStyle={{ paddingBottom: '10px' }}
            />
            <Line
              type="monotone"
              dataKey="conceptual"
              stroke="#3b82f6"
              strokeWidth={3}
              name="Conceptual (beliefs)"
              dot={{ r: 4, fill: '#3b82f6' }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="applied"
              stroke="#f59e0b"
              strokeWidth={3}
              name="Applied (judgments)"
              dot={{ r: 4, fill: '#f59e0b' }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Highlight axes with significant gaps */}
      <div className="mt-6">
        <h4 className="font-semibold text-gray-800 mb-3">Largest Ideology/Practice Gaps</h4>
        <div className="space-y-2">
          {sortedData.slice(0, 3).map(item => (
            item.hasGap && (
              <div key={item.axis} className="flex items-center justify-between p-3 bg-amber-50 rounded border border-amber-200">
                <span className="font-medium text-gray-800">{item.axis}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-blue-600 font-mono">
                    {item.conceptual > 0 ? '+' : ''}{item.conceptual.toFixed(0)}
                  </span>
                  <span className="text-gray-400">vs</span>
                  <span className="text-sm text-amber-600 font-mono">
                    {item.applied > 0 ? '+' : ''}{item.applied.toFixed(0)}
                  </span>
                  <span className="text-xs text-gray-500 ml-2">
                    (gap: {item.gap.toFixed(0)}%)
                  </span>
                </div>
              </div>
            )
          ))}
        </div>
      </div>
    </div>
  )
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null

  const conceptual = payload[0]?.value || 0
  const applied = payload[1]?.value || 0
  const gap = Math.abs(conceptual - applied)

  return (
    <div className="bg-white shadow-lg rounded-lg p-3 border border-gray-200 max-w-xs">
      <p className="font-bold text-gray-800 mb-2">{label}</p>
      <div className="space-y-1 text-sm">
        <div className="flex justify-between items-center">
          <span className="text-blue-600">● Conceptual:</span>
          <span className="font-mono font-bold text-blue-700">
            {conceptual > 0 ? '+' : ''}{conceptual.toFixed(0)}%
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-amber-600">● Applied:</span>
          <span className="font-mono font-bold text-amber-700">
            {applied > 0 ? '+' : ''}{applied.toFixed(0)}%
          </span>
        </div>
        {gap > 20 && (
          <div className="mt-2 pt-2 border-t border-gray-200">
            <span className="text-amber-700 font-semibold">
              ⚠ Gap: {gap.toFixed(0)}%
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

function getShortName(name: string): string {
  const map: Record<string, string> = {
    'Economic Control': 'Economy',
    'Economic Equality': 'Equality',
    'Coercive Power': 'Liberty',
    'Where Power Sits': 'Power',
    'Cultural Orientation': 'Culture',
    'Group Boundaries': 'Boundaries',
    'Sovereignty Scope': 'Sovereignty',
    'Technology Stance': 'Technology',
    "Nature's Moral Weight": 'Nature',
    'Moral Foundation': 'Morality'
  }
  return map[name] || name
}
