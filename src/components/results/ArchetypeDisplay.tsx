'use client'

import Link from 'next/link'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { FlavorMatch } from '@/lib/archetype-calculator'

interface ArchetypeDisplayProps {
  flavors: FlavorMatch[]
  sessionId?: string
  showAll?: boolean
}

export function ArchetypeDisplay({ flavors, sessionId, showAll = false }: ArchetypeDisplayProps) {
  const displayFlavors = showAll ? flavors.filter(f => f.affinity > 0) : flavors.slice(0, 5)

  const chartData = displayFlavors.map(f => ({
    name: f.name.length > 20 ? f.name.substring(0, 18) + '...' : f.name,
    fullName: f.name,
    value: Math.round(f.affinity * 100),
    color: f.color,
    description: f.description,
    matchStrength: f.match_strength
  }))

  return (
    <div className="space-y-6">
      {/* Bar Chart */}
      <div className="w-full h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
          >
            <XAxis
              type="number"
              domain={[-100, 100]}
              tick={{ fill: '#6b7280', fontSize: 12 }}
              tickFormatter={(v) => `${v}%`}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fill: '#374151', fontSize: 12 }}
              width={95}
            />
            <Tooltip content={<ArchetypeTooltip />} />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Archetype Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {displayFlavors.slice(0, 6).map((flavor, i) => (
          <ArchetypeCard
            key={flavor.flavor_id}
            flavor={flavor}
            rank={i + 1}
            sessionId={sessionId}
          />
        ))}
      </div>
    </div>
  )
}

function ArchetypeTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null

  const data = payload[0].payload

  return (
    <div className="bg-white shadow-lg rounded-lg p-3 border border-gray-200 max-w-xs">
      <div className="flex items-center gap-2 mb-1">
        <div
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: data.color }}
        />
        <p className="font-bold text-gray-800">{data.fullName}</p>
      </div>
      <p className="text-sm text-gray-600">{data.description}</p>
      <p className="text-sm font-mono mt-2">
        <span style={{ color: data.color }}>{data.value}%</span>
        <span className="text-gray-400 ml-2">({data.matchStrength})</span>
      </p>
    </div>
  )
}

function ArchetypeCard({
  flavor,
  rank,
  sessionId
}: {
  flavor: FlavorMatch
  rank: number
  sessionId?: string
}) {
  const percent = ((flavor.affinity + 1) / 2) * 100
  const href = sessionId
    ? `/archetypes/${flavor.flavor_id}?sessionId=${sessionId}`
    : `/archetypes/${flavor.flavor_id}`

  return (
    <Link href={href}>
      <div
        className="bg-white rounded-lg shadow-sm border-l-4 p-4 hover:shadow-md transition-all cursor-pointer h-full"
        style={{ borderLeftColor: flavor.color }}
      >
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center gap-2">
            <span
              className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
              style={{ backgroundColor: flavor.color }}
            >
              {rank}
            </span>
            <span className="font-bold text-gray-800 text-sm">{flavor.name}</span>
          </div>
          <div className="text-right">
            <span
              className="text-lg font-mono font-bold"
              style={{ color: flavor.color }}
            >
              {(flavor.affinity * 100).toFixed(0)}%
            </span>
            <p className="text-xs text-gray-500">{flavor.match_strength}</p>
          </div>
        </div>
        <p className="text-xs text-gray-600 mb-3 line-clamp-2">{flavor.description}</p>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${percent}%`, backgroundColor: flavor.color }}
          />
        </div>
      </div>
    </Link>
  )
}
