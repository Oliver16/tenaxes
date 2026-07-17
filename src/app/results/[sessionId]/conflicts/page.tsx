import { notFound } from 'next/navigation'
import { loadResultAnalysis } from '@/lib/results/load-result-analysis'
import { rankCollisionPairs, buildCollisionPairViewModel } from '@/lib/results/collision-view'
import { ConflictsExplorer } from '@/components/results/ConflictsExplorer'

export default async function ConflictsPage({
  params
}: {
  params: { sessionId: string }
}) {
  const analysis = await loadResultAnalysis(params.sessionId)
  if (!analysis) notFound()

  const { tensionScores, collisionPairs, conflictCounts, questions, responses, axes } = analysis

  const ranked = rankCollisionPairs(collisionPairs, tensionScores)
  const pairViewModels = ranked.map(pair =>
    buildCollisionPairViewModel(pair, tensionScores, questions, responses)
  )

  const involvedAxisIds = new Set(ranked.flatMap(p => [p.axis_a, p.axis_b]))
  const axisOptions = axes
    .filter(a => involvedAxisIds.has(a.id))
    .map(a => ({ id: a.id, name: a.name }))

  const countCards = [
    { label: 'Cross-pressured', value: conflictCounts.cross_pressured, note: 'the framing decided' },
    { label: 'Consistently protected', value: conflictCounts.protected, note: 'the value survived both framings' },
    { label: 'Consistently traded away', value: conflictCounts.traded_away, note: 'the value lost both framings' },
    { label: 'Inconclusive', value: conflictCounts.inconclusive, note: 'not enough decisive answers' }
  ]

  return (
    <>
      <div>
        <h1 className="text-2xl font-bold text-gray-800">How you navigate value conflicts</h1>
        <p className="text-gray-500 text-sm mt-1 max-w-3xl">
          Each collision pair prices one value against another, twice — once framed from each side.
          What matters is whether the value at stake survives both framings: a consistent answer
          reveals a real priority, a flip reveals that the framing decided.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {countCards.map(card => (
          <div key={card.label} className="p-3 bg-white rounded-lg border border-gray-200">
            <p className="text-2xl font-bold text-gray-800">{card.value}</p>
            <p className="text-sm font-medium text-gray-700">{card.label}</p>
            <p className="text-xs text-gray-400">{card.note}</p>
          </div>
        ))}
      </div>

      {pairViewModels.length > 0 ? (
        <ConflictsExplorer pairs={pairViewModels} axisOptions={axisOptions} />
      ) : (
        <p className="text-sm text-gray-500 py-8 text-center bg-white rounded-xl shadow">
          No collision scenarios were answered in this session.
        </p>
      )}

      <div className="p-4 bg-white rounded-lg border border-gray-200">
        <p className="text-sm font-medium text-gray-700 mb-1">How we identify these collisions</p>
        <p className="text-sm text-gray-500">
          These insights come only from scenario questions that explicitly price one value against
          another (&quot;even if&hellip;&quot;, &quot;rather than&hellip;&quot;). Every pair is
          probed with two mirrored scenarios that test different pole combinations, so the two
          answers are never averaged into one score. We compare each choice with the ideals you
          expressed in the conceptual questions; each probe is a single scenario, so treat any one
          flag as a prompt for reflection, not a verdict.
        </p>
      </div>
    </>
  )
}
