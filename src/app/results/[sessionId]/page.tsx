import { notFound } from 'next/navigation'
import { loadResultAnalysis } from '@/lib/results/load-result-analysis'
import { computeConsistency } from '@/lib/results/consistency'
import { rankCollisionPairs, buildCollisionPairViewModel } from '@/lib/results/collision-view'
import { CoreAxesRadar } from '@/components/charts/CoreAxesRadar'
import { ResultsProfileHero, strongestAxis } from '@/components/results/ResultsProfileHero'
import { DefiningAxes } from '@/components/results/DefiningAxes'
import { ResultsKeyInsights } from '@/components/results/ResultsKeyInsights'
import { ResultsExploreCards } from '@/components/results/ResultsExploreCards'
import { ResultsActions } from '@/components/ResultsActions'
import { SaveResultsPrompt } from '@/components/SaveResultsPrompt'

export default async function ResultsOverviewPage({
  params
}: {
  params: { sessionId: string }
}) {
  const analysis = await loadResultAnalysis(params.sessionId)
  if (!analysis) notFound()

  const {
    coreAxes,
    facets,
    topFlavors,
    coverageByAxis,
    conceptualScores,
    appliedScores,
    axisComparisons,
    tensionScores,
    collisionPairs,
    conflictCounts,
    questions,
    responseCount,
    notSureCount,
    bankVersion
  } = analysis

  const consistency = computeConsistency(conceptualScores, appliedScores)
  const strongestCore = strongestAxis(coreAxes, coverageByAxis)
  const strongestFacet = strongestAxis(facets, coverageByAxis)

  // Highest-ranked decisive conflict, using the same ranking as the
  // conflicts page (cross-pressured first, then contradictions to ideals;
  // inconclusive pairs excluded)
  const topDecisivePair = rankCollisionPairs(collisionPairs, tensionScores)
    .find(p => p.classification !== 'inconclusive')
  const topConflict = topDecisivePair
    ? buildCollisionPairViewModel(topDecisivePair, tensionScores, analysis.questions, analysis.responses)
    : null

  return (
    <>
      <ResultsProfileHero
        topFlavors={topFlavors}
        coreAxes={coreAxes}
        facets={facets}
        coverageByAxis={coverageByAxis}
        consistency={consistency}
        answeredCount={responseCount - notSureCount}
        totalQuestions={questions.length}
        notSureCount={notSureCount}
      />

      {/* Compact profile map: radar + defining axes */}
      {coreAxes.length > 0 && (
        <section className="bg-white rounded-xl shadow-lg p-6">
          <div className="grid gap-6 md:grid-cols-2 items-start">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-2">
                Core profile
              </h2>
              <CoreAxesRadar axes={coreAxes} height={300} margin={{ top: 10, right: 25, bottom: 10, left: 25 }} />
            </div>
            <DefiningAxes
              sessionId={params.sessionId}
              coreAxes={coreAxes}
              coverageByAxis={coverageByAxis}
            />
          </div>
        </section>
      )}

      <ResultsKeyInsights
        sessionId={params.sessionId}
        strongestCore={strongestCore}
        strongestFacet={strongestFacet}
        largestGap={axisComparisons[0] ?? null}
        topConflict={topConflict}
      />

      <ResultsExploreCards
        sessionId={params.sessionId}
        axisCount={coreAxes.length + facets.length}
        conflictCounts={conflictCounts}
      />

      {/* Footer: save, share/retake, methodology and result details */}
      <SaveResultsPrompt sessionId={params.sessionId} />
      <ResultsActions
        sessionId={params.sessionId}
        coreAxes={coreAxes}
        topFlavor={topFlavors[0] || null}
      />

      <section className="bg-white rounded-xl shadow-lg divide-y">
        <details className="group p-4">
          <summary className="cursor-pointer text-sm font-semibold text-gray-700 hover:text-gray-900 list-none flex items-center gap-2">
            <span className="transition-transform group-open:rotate-90" aria-hidden>›</span>
            How scoring works
          </summary>
          <div className="mt-3 text-sm text-gray-600 space-y-2">
            <p>
              Each question contributes to one or more axes with a fixed direction and weight.
              &ldquo;Not sure&rdquo; answers are recorded but never scored — they reduce coverage
              instead of faking a position — while a &ldquo;neither / balanced&rdquo; answer counts
              as a real neutral. Deliberate collision scenarios are excluded from axis scores and
              analyzed separately as value conflicts.
            </p>
            <p>
              <a href="/methodology" className="text-blue-600 hover:text-blue-800 font-medium">
                Read the full methodology →
              </a>
            </p>
          </div>
        </details>
        <details className="group p-4">
          <summary className="cursor-pointer text-sm font-semibold text-gray-700 hover:text-gray-900 list-none flex items-center gap-2">
            <span className="transition-transform group-open:rotate-90" aria-hidden>›</span>
            Result details
          </summary>
          <dl className="mt-3 text-sm text-gray-600 space-y-1">
            <div className="flex gap-2">
              <dt className="text-gray-400">Session:</dt>
              <dd className="font-mono break-all">{params.sessionId}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-gray-400">Question bank:</dt>
              <dd>{bankVersion ?? 'v1 (legacy)'}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-gray-400">Responses:</dt>
              <dd>
                {responseCount} recorded ({analysis.conceptualCount} conceptual,{' '}
                {analysis.appliedCount} practical
                {notSureCount > 0 ? `, ${notSureCount} not sure` : ''})
              </dd>
            </div>
          </dl>
        </details>
      </section>
    </>
  )
}
