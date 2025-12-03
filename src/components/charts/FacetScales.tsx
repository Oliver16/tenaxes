'use client'

import { AxisScale } from './AxisScale'
import type { AxisScore } from '@/lib/supabase'

type Props = {
  facets: AxisScore[]
}

type FacetInfo = {
  id: string
  name: string
  description: string
  icon: string
}

const FACET_INFO: Record<string, FacetInfo> = {
  'F1': {
    id: 'F1',
    name: 'Change Strategy',
    description: 'How you prefer to implement political and social change',
    icon: '🔄'
  },
  'F2': {
    id: 'F2',
    name: 'Institutional Trust',
    description: 'Your confidence in established institutions and systems',
    icon: '🏛️'
  },
  'F3': {
    id: 'F3',
    name: 'Justice Style',
    description: 'Your approach to fairness, punishment, and accountability',
    icon: '⚖️'
  }
}

export function FacetScales({ facets }: Props) {
  if (!facets || facets.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No facet data available</p>
      </div>
    )
  }

  // Sort facets by ID to ensure consistent order (F1, F2, F3)
  const sortedFacets = [...facets].sort((a, b) => a.axis_id.localeCompare(b.axis_id))

  return (
    <div className="space-y-8">
      {sortedFacets.map(facet => {
        const info = FACET_INFO[facet.axis_id] || {
          id: facet.axis_id,
          name: facet.name,
          description: '',
          icon: '📊'
        }

        return (
          <div key={facet.axis_id} className="bg-white rounded-lg shadow-sm border p-6">
            {/* Header */}
            <div className="mb-4">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-3xl">{info.icon}</span>
                <div>
                  <h3 className="text-xl font-bold text-gray-800">{info.name}</h3>
                  <p className="text-sm text-gray-600">{info.description}</p>
                </div>
              </div>
            </div>

            {/* Scale */}
            <AxisScale axis={facet} showLabels={true} compact={false} />

            {/* Interpretation */}
            <div className="mt-4 p-3 bg-gray-50 rounded border border-gray-200">
              <p className="text-sm text-gray-700">
                <strong>Your position:</strong> {getInterpretation(facet)}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function getInterpretation(facet: AxisScore): string {
  const score = facet.score
  const absScore = Math.abs(score)
  const isNegative = score < 0

  // Determine intensity
  let intensity = ''
  if (absScore < 0.3) {
    intensity = 'slightly'
  } else if (absScore < 0.6) {
    intensity = 'moderately'
  } else {
    intensity = 'strongly'
  }

  // Get the pole label
  const pole = isNegative ? facet.pole_negative : facet.pole_positive

  // Special handling for specific facets
  switch (facet.axis_id) {
    case 'F1': // Change Strategy
      if (absScore < 0.2) {
        return 'You favor a balanced approach to change, combining incremental and transformative strategies as needed.'
      }
      return `You are ${intensity} oriented toward ${pole} when it comes to implementing change.`

    case 'F2': // Institutional Trust
      if (absScore < 0.2) {
        return 'You have a nuanced view of institutions, trusting some while questioning others.'
      }
      return `You have ${intensity} ${isNegative ? 'low' : 'high'} trust in established institutions (${pole}).`

    case 'F3': // Justice Style
      if (absScore < 0.2) {
        return 'You balance different approaches to justice depending on the context.'
      }
      return `You ${intensity} favor ${pole} approaches to justice and accountability.`

    default:
      return `You lean ${intensity} toward ${pole} (${(score * 100).toFixed(0)}%).`
  }
}

// Compact version for smaller displays
export function FacetScalesCompact({ facets }: Props) {
  if (!facets || facets.length === 0) return null

  const sortedFacets = [...facets].sort((a, b) => a.axis_id.localeCompare(b.axis_id))

  return (
    <div className="space-y-4">
      {sortedFacets.map(facet => {
        const info = FACET_INFO[facet.axis_id] || {
          id: facet.axis_id,
          name: facet.name,
          description: '',
          icon: '📊'
        }

        return (
          <div key={facet.axis_id} className="bg-white rounded-lg shadow-sm border p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">{info.icon}</span>
              <h4 className="font-bold text-gray-800">{info.name}</h4>
            </div>
            <AxisScale axis={facet} showLabels={true} compact={true} />
          </div>
        )
      })}
    </div>
  )
}
