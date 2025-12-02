'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts'
import { AxisScore } from '@/lib/database.types'

interface ConceptualVsAppliedProps {
  conceptualScores: AxisScore[]
  appliedScores: AxisScore[]
}

export function ConceptualVsAppliedChart({ conceptualScores, appliedScores }: ConceptualVsAppliedProps) {
  // Merge scores by axis
  const axisIds = [...new Set([
    ...conceptualScores.map(s => s.axis_id),
    ...appliedScores.map(s => s.axis_id)
  ])].sort()

  const data = axisIds.map(axisId => {
    const conceptual = conceptualScores.find(s => s.axis_id === axisId)
    const applied = appliedScores.find(s => s.axis_id === axisId)

    return {
      axis: conceptual?.name || applied?.name || axisId,
      axisId,
      conceptual: conceptual ? ((conceptual.score + 1) / 2) * 100 : null,
      applied: applied ? ((applied.score + 1) / 2) * 100 : null,
      gap: conceptual && applied ? Math.abs(conceptual.score - applied.score) * 50 : 0
    }
  })

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={400}>
        <LineChart
          data={data}
          margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="axis"
            angle={-45}
            textAnchor="end"
            height={100}
            tick={{ fill: '#374151', fontSize: 11 }}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fill: '#6b7280', fontSize: 11 }}
            label={{ value: 'Score %', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            verticalAlign="top"
            height={36}
          />
          <ReferenceLine y={50} stroke="#9ca3af" strokeDasharray="3 3" />
          <Line
            type="monotone"
            dataKey="conceptual"
            stroke="#8b5cf6"
            strokeWidth={2}
            name="Conceptual (Ideology)"
            dot={{ fill: '#8b5cf6', r: 4 }}
            activeDot={{ r: 6 }}
          />
          <Line
            type="monotone"
            dataKey="applied"
            stroke="#10b981"
            strokeWidth={2}
            name="Applied (Practice)"
            dot={{ fill: '#10b981', r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null

  const conceptual = payload.find((p: any) => p.dataKey === 'conceptual')?.value
  const applied = payload.find((p: any) => p.dataKey === 'applied')?.value
  const gap = conceptual && applied ? Math.abs(conceptual - applied) : 0

  return (
    <div className="bg-white shadow-lg rounded-lg p-4 border border-gray-200">
      <p className="font-semibold text-gray-900 mb-2">{label}</p>
      {conceptual !== undefined && conceptual !== null && (
        <div className="flex items-center gap-2 mb-1">
          <div className="w-3 h-3 rounded-full bg-purple-500" />
          <span className="text-sm">Conceptual: {conceptual.toFixed(0)}%</span>
        </div>
      )}
      {applied !== undefined && applied !== null && (
        <div className="flex items-center gap-2 mb-1">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span className="text-sm">Applied: {applied.toFixed(0)}%</span>
        </div>
      )}
      {gap > 5 && (
        <div className="mt-2 pt-2 border-t border-gray-200">
          <p className="text-xs text-orange-600 font-medium">
            Gap: {gap.toFixed(0)}% - {gap > 20 ? 'Significant divergence' : 'Notable difference'}
          </p>
        </div>
      )}
    </div>
  )
}
