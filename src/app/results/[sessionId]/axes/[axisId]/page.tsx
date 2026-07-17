import Link from 'next/link'
import { notFound } from 'next/navigation'
import { loadResultAnalysis } from '@/lib/results/load-result-analysis'
import { AxisScale } from '@/components/charts/AxisScale'
import { AxisContributionList } from '@/components/results/AxisContributionList'
import { AxisCollisionDetails } from '@/components/results/AxisCollisionDetails'

/** Deterministic strength wording for |score| in [0, 1]. */
function interpretation(score: number, poleNegative: string, polePositive: string): string {
  const abs = Math.abs(score)
  const pole = score < 0 ? poleNegative : polePositive
  if (abs < 0.2) return 'Your answers are broadly mixed on this dimension — neither pole clearly dominates.'
  const strength = abs < 0.45 ? 'mild' : abs < 0.7 ? 'clear' : 'strong'
  return `Your answers show a ${strength} lean toward ${pole}.`
}

export default async function AxisDetailPage({
  params
}: {
  params: { sessionId: string; axisId: string }
}) {
  const analysis = await loadResultAnalysis(params.sessionId)
  if (!analysis) notFound()

  const {
    coreAxes,
    facets,
    axes,
    coverageByAxis,
    axisComparisons,
    tensionScores,
    collisionPairs,
    questions,
    responses
  } = analysis

  const orderedAxes = [...coreAxes, ...facets]
  const index = orderedAxes.findIndex(a => a.axis_id === params.axisId)
  if (index === -1) notFound()

  const axis = orderedAxes[index]
  const meta = axes.find(a => a.id === params.axisId)
  const cov = coverageByAxis[params.axisId]
  const comparison = axisComparisons.find(c => c.axis_id === params.axisId) ?? null
  const prev = index > 0 ? orderedAxes[index - 1] : null
  const next = index < orderedAxes.length - 1 ? orderedAxes[index + 1] : null
  const base = `/results/${params.sessionId}/axes`

  return (
    <>
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <div>
          <p className="text-xs text-gray-400">
            <Link href={base} className="hover:text-gray-600">All dimensions</Link>
            {' '}· {index + 1} of {orderedAxes.length}
          </p>
          <h1 className="text-2xl font-bold text-gray-800">{axis.name}</h1>
        </div>
      </div>

      <section className="bg-white rounded-xl shadow-lg p-6 space-y-4">
        {meta?.description && (
          <p className="text-gray-600 text-sm">{meta.description}</p>
        )}

        <AxisScale axis={axis} />

        <p className="text-sm text-gray-700 -mt-2">
          {interpretation(axis.score, axis.pole_negative, axis.pole_positive)}
        </p>

        {cov && (
          <p className={`text-xs ${cov.confidence === 'insufficient' ? 'text-red-600' : 'text-gray-500'}`}>
            {cov.confidence === 'insufficient'
              ? `Insufficient data for a reliable position (${cov.answered_primary_items} of ${cov.available_primary_items} items answered) — treat this score as indicative only.`
              : `${Math.round(cov.coverage * 100)}% of this axis's items answered (${cov.answered_primary_items} of ${cov.available_primary_items}) · ${cov.confidence} confidence`}
          </p>
        )}

        {comparison && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            {[
              { label: 'Principles (conceptual)', value: comparison.conceptual_score },
              { label: 'Practical choices (applied)', value: comparison.applied_score }
            ].map(item => (
              <div key={item.label} className="p-3 rounded-lg bg-gray-50 border border-gray-200">
                <p className="text-xs text-gray-500 mb-1">{item.label}</p>
                <p className="font-mono font-bold text-gray-800">
                  {item.value > 0 ? '+' : ''}{(item.value * 100).toFixed(0)}%
                </p>
              </div>
            ))}
            <div className={`p-3 rounded-lg border ${comparison.difference >= 0.25 ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-200'}`}>
              <p className="text-xs text-gray-500 mb-1">Register gap</p>
              <p className="font-mono font-bold text-gray-800">
                {(comparison.difference * 100).toFixed(0)}%
              </p>
            </div>
          </div>
        )}
      </section>

      <section className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4">Question-level evidence</h2>
        <AxisContributionList
          axisId={params.axisId}
          poleNegative={axis.pole_negative}
          polePositive={axis.pole_positive}
          conceptualScore={comparison?.conceptual_score ?? axis.score}
          appliedScore={comparison?.applied_score ?? axis.score}
          questions={questions}
          responses={responses}
        />
      </section>

      {collisionPairs.some(
        p => (p.axis_a === params.axisId || p.axis_b === params.axisId) && p.probes_answered > 0
      ) && (
      <section className="bg-white rounded-xl shadow-lg p-6">
        <AxisCollisionDetails
          axisId={params.axisId}
          axisName={axis.name}
          pairs={collisionPairs}
          tensions={tensionScores}
        />
        <p className="text-sm mt-4">
          <Link
            href={`/results/${params.sessionId}/conflicts`}
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            All value conflicts →
          </Link>
        </p>
      </section>
      )}

      <nav aria-label="Axis navigation" className="flex justify-between gap-3">
        {prev ? (
          <Link
            href={`${base}/${prev.axis_id}`}
            className="px-4 py-2 text-sm bg-white border border-gray-300 hover:border-gray-400 rounded-lg text-gray-700 font-medium"
          >
            ← {prev.name}
          </Link>
        ) : <span />}
        {next ? (
          <Link
            href={`${base}/${next.axis_id}`}
            className="px-4 py-2 text-sm bg-white border border-gray-300 hover:border-gray-400 rounded-lg text-gray-700 font-medium"
          >
            {next.name} →
          </Link>
        ) : <span />}
      </nav>
    </>
  )
}
