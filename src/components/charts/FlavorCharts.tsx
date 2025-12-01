'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts'
import type { FlavorMatch } from '@/lib/supabase'
import { buildFlavorChartData, getDisplayFlavors } from '@/lib/flavorDisplay'

type Props = {
  flavors: FlavorMatch[]
  showAll?: boolean
  sessionId?: string
}

export function FlavorBarChart({ flavors, showAll = false, sessionId }: Props) {
  const data = buildFlavorChartData(flavors, showAll)

  return (
    <div className="w-full h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
        >
          <XAxis 
            type="number" 
            domain={[0, 100]} 
            tick={{ fill: '#6b7280', fontSize: 12 }}
            tickFormatter={(v) => `${v}%`}
          />
          <YAxis 
            type="category" 
            dataKey="name" 
            tick={{ fill: '#374151', fontSize: 12 }}
            width={95}
          />
          <Tooltip content={<FlavorTooltip />} />
          <Bar dataKey="affinity" radius={[0, 4, 4, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function FlavorTooltip({ active, payload }: any) {
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
        <span style={{ color: data.color }}>{data.affinity}%</span>
        <span className="text-gray-400 ml-2">({data.matchStrength})</span>
      </p>
    </div>
  )
}

// Expandable flavor list
export function FlavorList({ flavors, sessionId }: { flavors: FlavorMatch[]; sessionId?: string }) {
  const [showAll, setShowAll] = useState(false)
  const positiveFlavors = flavors.filter(f => f.affinity > 0)
  const displayFlavors = getDisplayFlavors(flavors, showAll)

  return (
    <div>
      <div className="space-y-3">
        {displayFlavors.map((flavor, i) => (
          <FlavorCard key={flavor.flavor_id} flavor={flavor} rank={i + 1} sessionId={sessionId} />
        ))}
      </div>
      
      {positiveFlavors.length > 5 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="w-full mt-4 py-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
        >
          {showAll 
            ? '← Show top 5 only' 
            : `Show all ${positiveFlavors.length} matching types →`}
        </button>
      )}
    </div>
  )
}

function FlavorCard({ flavor, rank, sessionId }: { flavor: FlavorMatch; rank: number; sessionId?: string }) {
  const percent = ((flavor.affinity + 1) / 2) * 100
  const href = sessionId
    ? `/archetypes/${flavor.flavor_id}?sessionId=${sessionId}`
    : `/archetypes/${flavor.flavor_id}`

  const cardContent = (
    <>
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          <span
            className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
            style={{ backgroundColor: flavor.color }}
          >
            {rank}
          </span>
          <span className="text-lg font-bold text-gray-800">{flavor.name}</span>
        </div>
        <div className="text-right">
          <span
            className="text-xl font-mono font-bold"
            style={{ color: flavor.color }}
          >
            {(flavor.affinity * 100).toFixed(0)}%
          </span>
          <p className="text-xs text-gray-500">{flavor.match_strength}</p>
        </div>
      </div>
      <p className="text-sm text-gray-600 mb-3">{flavor.description}</p>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${percent}%`, backgroundColor: flavor.color }}
        />
      </div>
      {sessionId && (
        <div className="mt-3 text-sm text-blue-600 font-medium">
          Learn why you matched →
        </div>
      )}
    </>
  )

  return (
    <Link href={href}>
      <div
        className="bg-white rounded-lg shadow p-4 border-l-4 transition-all hover:shadow-md cursor-pointer"
        style={{ borderLeftColor: flavor.color }}
      >
        {cardContent}
      </div>
    </Link>
  )
}
