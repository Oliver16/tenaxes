'use client'

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine
} from 'recharts'
import type { DailyCount, AxisAggregate, FlavorPopularity } from '@/lib/analytics'

// Color palette for flavors
const COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
  '#14b8a6', '#a855f7', '#eab308', '#22c55e', '#0ea5e9'
]

export function ResponsesOverTimeChart({ data }: { data: DailyCount[] }) {
  const formattedData = data.map(d => ({
    ...d,
    displayDate: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }))

  return (
    <div className="w-full h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={formattedData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis 
            dataKey="displayDate" 
            tick={{ fill: '#6b7280', fontSize: 11 }}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis 
            tick={{ fill: '#6b7280', fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'white', 
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
            }}
            formatter={(value: number) => [`${value} responses`, 'Count']}
            labelFormatter={(label) => `Date: ${label}`}
          />
          <Line 
            type="monotone" 
            dataKey="count" 
            stroke="#3b82f6" 
            strokeWidth={2}
            dot={{ fill: '#3b82f6', strokeWidth: 0, r: 3 }}
            activeDot={{ r: 6, fill: '#2563eb' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export function AxisDistributionChart({ data }: { data: AxisAggregate[] }) {
  const formattedData = data.map(d => ({
    ...d,
    shortName: getShortAxisName(d.axis_name),
    avgPercent: Math.round(d.avg_score * 100),
    stdPercent: Math.round(d.std_dev * 100)
  }))

  return (
    <div className="w-full h-[400px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart 
          data={formattedData} 
          layout="vertical"
          margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={true} vertical={false} />
          <XAxis 
            type="number" 
            domain={[-100, 100]}
            tick={{ fill: '#6b7280', fontSize: 12 }}
            tickFormatter={(v) => `${v > 0 ? '+' : ''}${v}%`}
          />
          <YAxis 
            type="category" 
            dataKey="shortName"
            tick={{ fill: '#374151', fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            width={75}
          />
          <ReferenceLine x={0} stroke="#9ca3af" strokeWidth={2} />
          <Tooltip content={<AxisTooltip />} />
          <Bar dataKey="avgPercent" radius={[0, 4, 4, 0]}>
            {formattedData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={entry.avgPercent < 0 ? '#ef4444' : '#10b981'} 
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function AxisTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  
  const data = payload[0].payload
  
  return (
    <div className="bg-white shadow-lg rounded-lg p-3 border border-gray-200">
      <p className="font-bold text-gray-800">{data.axis_name}</p>
      <p className="text-sm mt-1">
        Average: <span className={data.avgPercent < 0 ? 'text-red-600' : 'text-green-600'}>
          {data.avgPercent > 0 ? '+' : ''}{data.avgPercent}%
        </span>
      </p>
      <p className="text-sm text-gray-500">
        Std Dev: ±{data.stdPercent}%
      </p>
      <p className="text-xs text-gray-400 mt-1">
        n = {data.sample_size}
      </p>
    </div>
  )
}

export function FlavorPopularityChart({ data }: { data: FlavorPopularity[] }) {
  const formattedData = data.slice(0, 10).map((d, i) => ({
    ...d,
    shortName: d.flavor_name.length > 18 ? d.flavor_name.substring(0, 16) + '...' : d.flavor_name,
    color: COLORS[i % COLORS.length]
  }))

  return (
    <div className="w-full h-[350px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart 
          data={formattedData}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 120, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={true} vertical={false} />
          <XAxis 
            type="number"
            tick={{ fill: '#6b7280', fontSize: 12 }}
            tickLine={false}
          />
          <YAxis 
            type="category" 
            dataKey="shortName"
            tick={{ fill: '#374151', fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            width={115}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'white', 
              border: '1px solid #e5e7eb',
              borderRadius: '8px'
            }}
            formatter={(value: number, name: string) => {
              if (name === 'count') return [`${value} points`, 'Weighted Score']
              return [value, name]
            }}
          />
          <Bar dataKey="count" radius={[0, 4, 4, 0]}>
            {formattedData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// Stat card component
export function StatCard({ 
  title, 
  value, 
  subtitle,
  trend 
}: { 
  title: string
  value: string | number
  subtitle?: string
  trend?: { value: number; label: string }
}) {
  return (
    <div className="bg-white rounded-xl shadow p-6">
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
      {subtitle && <p className="text-sm text-gray-400 mt-1">{subtitle}</p>}
      {trend && (
        <p className={`text-sm mt-2 ${trend.value >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)} {trend.label}
        </p>
      )}
    </div>
  )
}

function getShortAxisName(name: string): string {
  const map: Record<string, string> = {
    'Economic Control': 'Econ Control',
    'Economic Equality': 'Econ Equality',
    'Coercive Power': 'Coercive Power',
    'Where Power Sits': 'Power Locus',
    'Cultural Orientation': 'Culture',
    'Group Boundaries': 'Group Bounds',
    'Sovereignty Scope': 'Sovereignty',
    'Technology Stance': 'Technology',
    "Nature's Moral Weight": 'Nature',
    'Moral Foundation': 'Moral Found.',
    'Change Strategy': 'Change Style',
    'Institutional Trust': 'Inst. Trust',
    'Justice Style': 'Justice Style'
  }
  return map[name] || name
}
