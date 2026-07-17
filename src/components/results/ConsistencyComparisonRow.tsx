import Link from 'next/link'
import type { AxisComparison } from '@/lib/results/load-result-analysis'

function RegisterBar({ label, value, barClass }: { label: string; value: number; barClass: string }) {
  return (
    <div>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <div className="flex items-center gap-2">
        <div className="flex-1 bg-gray-200 rounded-full h-2">
          <div
            className={`${barClass} h-2 rounded-full transition-all`}
            style={{
              width: `${Math.min(Math.abs(value) * 100, 100)}%`,
              marginLeft: value < 0 ? '0' : 'auto',
              marginRight: value < 0 ? 'auto' : '0'
            }}
          />
        </div>
        <span className="text-sm font-medium text-gray-700 w-12 text-right">
          {value.toFixed(2)}
        </span>
      </div>
    </div>
  )
}

/**
 * One axis's principles-vs-practical-choices comparison, linked to the
 * axis detail page. Neutral language throughout: a gap is "different
 * under constraint", never an accusation.
 */
export function ConsistencyComparisonRow({
  sessionId,
  comparison,
  highlight = false
}: {
  sessionId: string
  comparison: AxisComparison
  highlight?: boolean
}) {
  const notable = comparison.difference >= 0.25

  return (
    <div className={`p-4 rounded-lg border ${highlight && notable ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-200'}`}>
      <div className="flex justify-between items-start gap-3 mb-3 flex-wrap">
        <div>
          <h3 className="font-semibold text-gray-800">{comparison.name}</h3>
          <p className="text-xs text-gray-500">
            {comparison.pole_negative} ↔ {comparison.pole_positive}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {notable && (
            <span className="text-xs bg-amber-100 text-amber-900 border border-amber-300 px-2 py-1 rounded-full font-medium">
              {Math.round(comparison.difference * 100)}% register gap
            </span>
          )}
          <Link
            href={`/results/${sessionId}/axes/${comparison.axis_id}`}
            className="text-xs font-medium text-blue-600 hover:text-blue-800 whitespace-nowrap"
          >
            Details →
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <RegisterBar label="Principles" value={comparison.conceptual_score} barClass="bg-blue-500" />
        <RegisterBar label="Practical choices" value={comparison.applied_score} barClass="bg-green-500" />
      </div>

      {!notable && (
        <p className="mt-2 text-xs text-gray-400">
          Difference: {Math.round(comparison.difference * 100)}%
        </p>
      )}
    </div>
  )
}
