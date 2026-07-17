import Link from 'next/link'
import { AxisScale } from '@/components/charts/AxisScale'
import type { AxisScore as AxisScoreSummary } from '@/lib/supabase'
import type { AxisCoverage } from '@/lib/database.types'

const MAX_DEFINING = 4

/**
 * The overview's right column: at most four core axes, selected by
 * absolute score, preferring axes with enough coverage to be reliable.
 */
export function DefiningAxes({
  sessionId,
  coreAxes,
  coverageByAxis
}: {
  sessionId: string
  coreAxes: AxisScoreSummary[]
  coverageByAxis: Record<string, AxisCoverage>
}) {
  const byStrength = [...coreAxes].sort((a, b) => Math.abs(b.score) - Math.abs(a.score))
  const confident = byStrength.filter(
    a => coverageByAxis[a.axis_id]?.confidence !== 'insufficient'
  )
  const defining = (confident.length >= MAX_DEFINING ? confident : byStrength).slice(0, MAX_DEFINING)

  if (defining.length === 0) return null

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
        Your defining dimensions
      </h3>
      {defining.map(axis => {
        const cov = coverageByAxis[axis.axis_id]
        return (
          <div key={axis.axis_id}>
            <AxisScale axis={axis} compact />
            <div className="flex items-baseline justify-between gap-2 -mt-1 mb-1">
              <span className="text-xs text-gray-500">
                {axis.pole_label}
                {cov && ` · ${Math.round(cov.coverage * 100)}% of items answered`}
              </span>
              <Link
                href={`/results/${sessionId}/axes/${axis.axis_id}`}
                className="text-xs font-medium text-blue-600 hover:text-blue-800 whitespace-nowrap"
              >
                Details →
              </Link>
            </div>
          </div>
        )
      })}
    </div>
  )
}
