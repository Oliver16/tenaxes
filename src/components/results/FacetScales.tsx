'use client'

import { AxisScore } from '@/lib/database.types'
import { AXES } from '@/lib/instrument'

interface FacetScalesProps {
  facets: AxisScore[]
}

export function FacetScales({ facets }: FacetScalesProps) {
  if (facets.length === 0) return null

  return (
    <div className="space-y-6">
      {facets.map(facet => {
        const axisInfo = AXES[facet.axis_id as keyof typeof AXES]
        const percentage = ((facet.score + 1) / 2) * 100

        // Determine which pole the user is closer to
        const isPositive = facet.score > 0
        const strength = Math.abs(facet.score)
        let label = ''

        if (strength >= 0.7) label = 'Strongly'
        else if (strength >= 0.4) label = 'Moderately'
        else if (strength >= 0.2) label = 'Slightly'
        else label = 'Balanced'

        const poleLabel = strength < 0.2
          ? 'Balanced'
          : isPositive
          ? axisInfo?.pole_positive
          : axisInfo?.pole_negative

        return (
          <div key={facet.axis_id} className="bg-white rounded-lg border p-4">
            <div className="flex justify-between items-center mb-3">
              <div>
                <h3 className="font-semibold text-gray-900">{facet.name}</h3>
                <p className="text-sm text-gray-600">
                  {label} {poleLabel}
                </p>
              </div>
              <div className="text-right">
                <span className="text-lg font-mono font-bold text-blue-600">
                  {percentage.toFixed(0)}%
                </span>
              </div>
            </div>

            {/* Visual scale */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-gray-500">
                <span>{axisInfo?.pole_negative}</span>
                <span>{axisInfo?.pole_positive}</span>
              </div>

              <div className="relative h-8 bg-gradient-to-r from-blue-200 via-gray-100 to-red-200 rounded">
                {/* Center line */}
                <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-gray-400" />

                {/* User position marker */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-white shadow-lg bg-blue-600"
                  style={{ left: `${percentage}%` }}
                  title={`Score: ${facet.score.toFixed(2)}`}
                />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
