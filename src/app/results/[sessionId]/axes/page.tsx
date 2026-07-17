import { notFound } from 'next/navigation'
import { loadResultAnalysis } from '@/lib/results/load-result-analysis'
import { AxesList, type AxisRowData } from '@/components/results/ResultAxisRow'

export default async function AxesPage({
  params
}: {
  params: { sessionId: string }
}) {
  const analysis = await loadResultAnalysis(params.sessionId)
  if (!analysis) notFound()

  const { coreAxes, facets, coverageByAxis, axisComparisons, collisionPairs } = analysis

  const gapByAxis = Object.fromEntries(axisComparisons.map(c => [c.axis_id, c.difference]))
  const decisiveCountByAxis = (axisId: string) =>
    collisionPairs.filter(
      p => (p.axis_a === axisId || p.axis_b === axisId) &&
        p.probes_answered > 0 &&
        p.classification !== 'inconclusive'
    ).length

  const toRow = (axis: (typeof coreAxes)[number], isFacet: boolean): AxisRowData => {
    const cov = coverageByAxis[axis.axis_id]
    return {
      axis,
      isFacet,
      coverage: cov?.coverage ?? null,
      confidence: cov?.confidence ?? null,
      answeredItems: cov?.answered_primary_items ?? null,
      availableItems: cov?.available_primary_items ?? null,
      gap: gapByAxis[axis.axis_id] ?? null,
      conflictCount: decisiveCountByAxis(axis.axis_id)
    }
  }

  const rows: AxisRowData[] = [
    ...coreAxes.map(a => toRow(a, false)),
    ...facets.map(a => toRow(a, true))
  ]

  return (
    <>
      <div>
        <h1 className="text-2xl font-bold text-gray-800">All dimensions</h1>
        <p className="text-gray-500 text-sm mt-1">
          Your position on every axis. Open a row for the full scale, question-level evidence, and
          related value conflicts.
        </p>
      </div>
      <AxesList sessionId={params.sessionId} rows={rows} />
    </>
  )
}
