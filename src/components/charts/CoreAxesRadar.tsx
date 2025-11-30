'use client'

import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip
} from 'recharts'
import type { AxisScore } from '@/lib/supabase'

type Props = {
  axes: AxisScore[]
}

export function CoreAxesRadar({ axes }: Props) {
  const data = axes.map(axis => ({
    axis: axis.name.replace(/([A-Z])/g, ' $1').trim(),
    shortName: getShortName(axis.name),
    score: axis.score,
    fullMark: 1,
    // For display, shift to 0-100 scale
    displayScore: ((axis.score + 1) / 2) * 100,
    poleLabel: axis.pole_label,
    negative: axis.pole_negative,
    positive: axis.pole_positive
  }))

  return (
    <div className="w-full h-[400px] md:h-[500px]">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
          <PolarGrid gridType="polygon" stroke="#e5e7eb" />
          <PolarAngleAxis 
            dataKey="shortName" 
            tick={{ fill: '#374151', fontSize: 11 }}
            tickLine={false}
          />
          <PolarRadiusAxis 
            angle={90} 
            domain={[0, 100]} 
            tick={{ fill: '#9ca3af', fontSize: 10 }}
            tickCount={5}
            axisLine={false}
          />
          <Radar
            name="Your Position"
            dataKey="displayScore"
            stroke="#3b82f6"
            fill="#3b82f6"
            fillOpacity={0.3}
            strokeWidth={2}
          />
          <Tooltip content={<CustomTooltip />} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  
  const data = payload[0].payload
  const score = data.score
  
  return (
    <div className="bg-white shadow-lg rounded-lg p-3 border border-gray-200 max-w-xs">
      <p className="font-bold text-gray-800">{data.axis}</p>
      <p className="text-sm text-gray-600 mt-1">
        <span className={score < 0 ? 'text-red-600' : 'text-green-600'}>
          {data.poleLabel}
        </span>
      </p>
      <div className="flex justify-between text-xs text-gray-500 mt-2">
        <span>{data.negative}</span>
        <span className="font-mono font-bold">
          {score > 0 ? '+' : ''}{(score * 100).toFixed(0)}%
        </span>
        <span>{data.positive}</span>
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
