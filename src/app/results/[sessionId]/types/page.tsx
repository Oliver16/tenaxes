import { notFound } from 'next/navigation'
import { loadResultAnalysis } from '@/lib/results/load-result-analysis'
import { computeConsistency } from '@/lib/results/consistency'
import { FlavorBarChart, FlavorList } from '@/components/charts/FlavorCharts'

export default async function TypesPage({
  params
}: {
  params: { sessionId: string }
}) {
  const analysis = await loadResultAnalysis(params.sessionId)
  if (!analysis) notFound()

  const { topFlavors, conceptualScores, appliedScores } = analysis
  const top = topFlavors[0] ?? null
  const consistency = computeConsistency(conceptualScores, appliedScores)

  return (
    <>
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Your political types</h1>
        <p className="text-gray-500 text-sm mt-1">
          Archetypes that match your combination of beliefs and style. Higher percentage = stronger
          match.
        </p>
      </div>

      {top ? (
        <>
          <section className="bg-white rounded-xl shadow-lg p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
              Top archetype
            </p>
            <div className="flex items-baseline gap-3 flex-wrap">
              <h2 className="text-2xl font-bold" style={{ color: top.color }}>{top.name}</h2>
              <span className="font-mono font-semibold text-gray-600">
                {Math.round(top.affinity * 100)}% match · {top.match_strength}
              </span>
            </div>
            <p className="text-gray-600 mt-1">{top.description}</p>

            {consistency && (
              <p className="text-sm text-gray-500 mt-3">
                Matched from principles alone: <span className="font-medium text-gray-700">
                  {consistency.conceptualFlavors[0]?.name ?? '—'}</span>.
                From practical choices alone: <span className="font-medium text-gray-700">
                  {consistency.appliedFlavors[0]?.name ?? '—'}</span>.
                {consistency.sameTopArchetype
                  ? ' The two registers agree.'
                  : ' The two registers differ — see Ideals vs. practice.'}
              </p>
            )}
          </section>

          <section className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-3">Match strength</h2>
            <FlavorBarChart flavors={topFlavors} />
          </section>

          <section className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-3">Detailed profiles</h2>
            <FlavorList flavors={topFlavors} sessionId={params.sessionId} />
          </section>
        </>
      ) : (
        <section className="bg-white rounded-xl shadow-lg p-6">
          <p className="text-gray-500 text-sm">Not enough answers to match a political type.</p>
        </section>
      )}
    </>
  )
}
