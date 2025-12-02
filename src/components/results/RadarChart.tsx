'use client'

import { Radar, RadarChart as RechartsRadar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { AxisScore } from '@/lib/database.types'

interface RadarChartProps {
  coreAxes: AxisScore[]
}

export function CoreValuesRadarChart({ coreAxes }: RadarChartProps) {
  // Transform data for radar chart
  const data = coreAxes.map(axis => ({
    axis: axis.name,
    value: ((axis.score + 1) / 2) * 100, // Convert from -1..1 to 0..100
    fullName: axis.name
  }))

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={400}>
        <RechartsRadar data={data}>
          <PolarGrid stroke="#e5e7eb" />
          <PolarAngleAxis
            dataKey="axis"
            tick={{ fill: '#374151', fontSize: 12 }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={{ fill: '#6b7280', fontSize: 10 }}
          />
          <Radar
            name="Your Position"
            dataKey="value"
            stroke="#2563eb"
            fill="#3b82f6"
            fillOpacity={0.6}
          />
          <Tooltip
            content={<CustomTooltip />}
          />
        </RechartsRadar>
      </ResponsiveContainer>
    </div>
  )
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null

  const data = payload[0].payload
  const value = payload[0].value

  return (
    <div className="bg-white shadow-lg rounded-lg p-3 border border-gray-200">
      <p className="font-semibold text-gray-900">{data.fullName}</p>
      <p className="text-sm text-blue-600 font-mono">
        {value.toFixed(0)}%
      </p>
    </div>
  )
}
