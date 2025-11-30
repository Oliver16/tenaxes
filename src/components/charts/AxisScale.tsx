'use client'

import type { AxisScore } from '@/lib/supabase'

type Props = {
  axis: AxisScore
  showLabels?: boolean
  compact?: boolean
}

export function AxisScale({ axis, showLabels = true, compact = false }: Props) {
  // Convert -1 to 1 score to 0-100 percentage for positioning
  const position = ((axis.score + 1) / 2) * 100
  const isNegative = axis.score < 0
  const isStrong = Math.abs(axis.score) > 0.5
  
  return (
    <div className={`${compact ? 'mb-3' : 'mb-6'}`}>
      {/* Header */}
      <div className={`flex justify-between items-center ${compact ? 'mb-1' : 'mb-2'}`}>
        <span className={`font-bold ${compact ? 'text-sm' : 'text-base'} text-gray-800`}>
          {axis.name}
        </span>
        <span className={`font-mono font-bold ${compact ? 'text-sm' : 'text-base'} ${
          isNegative ? 'text-red-600' : 'text-green-600'
        }`}>
          {axis.score > 0 ? '+' : ''}{(axis.score * 100).toFixed(0)}%
        </span>
      </div>
      
      {/* Scale */}
      <div className="relative">
        {/* Track */}
        <div className={`relative ${compact ? 'h-6' : 'h-8'} rounded-full overflow-hidden bg-gray-100`}>
          {/* Gradient background */}
          <div className="absolute inset-0 flex">
            <div className="w-1/2 bg-gradient-to-r from-red-400 via-red-200 to-gray-100" />
            <div className="w-1/2 bg-gradient-to-r from-gray-100 via-green-200 to-green-400" />
          </div>
          
          {/* Center line */}
          <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-gray-400 transform -translate-x-1/2" />
          
          {/* Position marker */}
          <div 
            className={`absolute top-1/2 transform -translate-x-1/2 -translate-y-1/2 transition-all duration-500 ${
              compact ? 'w-5 h-5' : 'w-7 h-7'
            } rounded-full bg-blue-600 shadow-lg border-2 border-white flex items-center justify-center`}
            style={{ left: `${position}%` }}
          >
            <div className={`${compact ? 'w-2 h-2' : 'w-3 h-3'} rounded-full bg-white`} />
          </div>
        </div>
        
        {/* Pole labels */}
        {showLabels && (
          <div className={`flex justify-between ${compact ? 'mt-1 text-xs' : 'mt-2 text-sm'}`}>
            <span className={`${isNegative && isStrong ? 'font-bold text-red-600' : 'text-gray-500'}`}>
              {axis.pole_negative}
            </span>
            <span className={`text-gray-400 ${compact ? 'text-xs' : 'text-sm'}`}>
              {axis.pole_label}
            </span>
            <span className={`${!isNegative && isStrong ? 'font-bold text-green-600' : 'text-gray-500'}`}>
              {axis.pole_positive}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

// Compact version for lists
export function AxisScaleCompact({ axis }: { axis: AxisScore }) {
  return <AxisScale axis={axis} showLabels={true} compact={true} />
}

// Mini version for small displays
export function AxisScaleMini({ axis }: { axis: AxisScore }) {
  const position = ((axis.score + 1) / 2) * 100
  const isNegative = axis.score < 0
  
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500 w-20 truncate">{axis.name}</span>
      <div className="flex-1 h-2 bg-gray-200 rounded-full relative">
        <div className="absolute inset-0 flex rounded-full overflow-hidden">
          <div className="w-1/2 bg-red-100" />
          <div className="w-1/2 bg-green-100" />
        </div>
        <div 
          className="absolute top-1/2 transform -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-blue-600 shadow"
          style={{ left: `${position}%` }}
        />
      </div>
      <span className={`text-xs font-mono w-10 text-right ${isNegative ? 'text-red-600' : 'text-green-600'}`}>
        {axis.score > 0 ? '+' : ''}{(axis.score * 100).toFixed(0)}
      </span>
    </div>
  )
}
