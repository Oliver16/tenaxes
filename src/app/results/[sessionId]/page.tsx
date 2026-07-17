import { createClient } from '@/lib/supabase/server'
import { fetchQuestionsWithLinks } from '@/lib/api/questions'
import { analyzeTensions, analyzeCollisionPairs } from '@/lib/tension-analyzer'
import { buildAxisSummaries, computeFlavorMatches, scoresById } from '@/lib/flavor-matcher'
import { ResultsActions } from '@/components/ResultsActions'
import { SaveResultsPrompt } from '@/components/SaveResultsPrompt'
import { CoreAxesRadar } from '@/components/charts/CoreAxesRadar'
import { AxisScale } from '@/components/charts/AxisScale'
import { FlavorList, FlavorBarChart } from '@/components/charts/FlavorCharts'
import { AxisDrillDown } from '@/components/AxisDrillDown'
import { ValueTensionsSection } from '@/components/results/ValueTensionsSection'
import { IdeologicalConsistency } from '@/components/results/IdeologicalConsistency'
import { AxisCollisionDetails } from '@/components/results/AxisCollisionDetails'
import { AxisScore as AxisScoreType, Database } from '@/lib/database.types'
import type { AxisScore as LegacyAxisScore, FlavorMatch } from '@/lib/supabase'
import type { Question } from '@/lib/questions'

type SurveyResult = Database['public']['Tables']['survey_results']['Row']
type Axis = Database['public']['Tables']['axes']['Row']

type AxisComparison = {
  axis_id: string
  name: string
  conceptual_score: number
  applied_score: number
  difference: number
  pole_negative: string
  pole_positive: string
}

export default async function ResultsPage({
  params
}: {
  params: { sessionId: string }
}) {
  const supabase = await createClient()

  // Fetch survey results
  const { data, error } = await (supabase
    .from('survey_results')
    .select('*')
    .eq('session_id', params.sessionId)
    .single() as any)

  const surveyResult = data as SurveyResult | null

  if (error || !surveyResult) {
    return (
      <main className="min-h-screen bg-gray-100 py-16 px-4">
        <div className="max-w-md mx-auto text-center bg-white rounded-xl shadow-lg p-8">
          <h1 className="text-xl font-bold text-gray-800 mb-2">Results not found</h1>
          <p className="text-gray-500 text-sm">
            This session may have expired or the link may be incorrect.
          </p>
        </div>
      </main>
    )
  }

  // Fetch questions with links (used for drill-downs and tension
  // analysis), pinned to the bank version this result was answered on so
  // later bank changes never reinterpret old answers
  const questions = await fetchQuestionsWithLinks({
    bankVersion: (surveyResult as { bank_version?: string }).bank_version ?? null
  })

  // Fetch axes metadata
  const { data: axesData } = await (supabase
    .from('axes')
    .select('*')
    .order('id') as any)

  const axes = (axesData || []) as Axis[]

  // Profile summary (radar chart, axis scales, archetype matches). Older
  // sessions may predate stored summaries; rebuild them from raw scores so
  // every session gets the current archetypes and labels.
  const rawScores = (surveyResult.scores || []) as unknown as { axis_id: string; score: number }[]
  const summaries = surveyResult.core_axes
    ? {
        core_axes: surveyResult.core_axes as unknown as LegacyAxisScore[],
        facets: (surveyResult.facets || []) as unknown as LegacyAxisScore[]
      }
    : buildAxisSummaries(rawScores, axes)
  const coreAxes = summaries.core_axes
  const facets = summaries.facets
  const topFlavors = surveyResult.top_flavors
    ? (surveyResult.top_flavors as unknown as FlavorMatch[])
    : computeFlavorMatches(scoresById(rawScores))

  // Responses map
  const responses = (surveyResult.responses || {}) as Record<number, number>
  const responseCount = Object.keys(responses).length
  const conceptualCount = questions.filter(
    q => q.question_type === 'conceptual' && responses[q.id] !== undefined
  ).length
  const appliedCount = questions.filter(
    q => q.question_type === 'applied' && responses[q.id] !== undefined
  ).length

  // Conceptual vs applied scores, for the "Talk the Talk vs Walk the Walk" comparison
  const conceptualScores = (surveyResult.conceptual_scores || []) as unknown as AxisScoreType[]
  const appliedScores = (surveyResult.applied_scores || []) as unknown as AxisScoreType[]

  // Recompute tensions from the stored responses rather than reading the
  // stored snapshot, so past sessions benefit from link fixes and analyzer
  // improvements automatically
  const appliedQuestions = questions.filter(q => q.question_type === 'applied')
  const tensionScores = analyzeTensions(responses, appliedQuestions, axes, conceptualScores)
  const collisionPairs = analyzeCollisionPairs(tensionScores)

  const conceptualByAxis = Object.fromEntries(conceptualScores.map(s => [s.axis_id, s.score]))
  const appliedByAxis = Object.fromEntries(appliedScores.map(s => [s.axis_id, s.score]))

  const axisComparisons: AxisComparison[] = coreAxes
    .map(axis => {
      const conceptual = conceptualByAxis[axis.axis_id] ?? 0
      const applied = appliedByAxis[axis.axis_id] ?? 0
      // Scores are in [-1, 1] and the bars/labels below render them on a
      // 1.0 = 100% basis, so the gap is expressed on that same scale:
      // e.g. 0.80 vs 0.60 => 0.20 => "20%". A full opposite-pole flip
      // (e.g. +0.8 vs -0.8) can therefore exceed 100%.
      const diff = Math.abs(conceptual - applied)

      return {
        axis_id: axis.axis_id,
        name: axis.name,
        conceptual_score: conceptual,
        applied_score: applied,
        difference: diff,
        pole_negative: axis.pole_negative,
        pole_positive: axis.pole_positive
      }
    })
    .sort((a, b) => b.difference - a.difference)

  return (
    <main className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center mb-2">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Your Polyaxis Profile</h1>
          <p className="text-gray-600">
            Based on your {responseCount} responses ({conceptualCount} conceptual, {appliedCount} practical)
          </p>
          <p className="text-sm text-gray-400 mt-1">Session: {params.sessionId}</p>
        </div>

        {/* Radar Chart - Core Axes Overview */}
        {coreAxes.length > 0 && (
          <section className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Core Axes Overview</h2>
            <p className="text-gray-500 text-sm mb-4">
              Your position across the core dimensions. Outer edge = stronger position, center = neutral.
            </p>
            <CoreAxesRadar axes={coreAxes} />
          </section>
        )}

        {/* Core Axes Detail - Scales */}
        {coreAxes.length > 0 && (
          <section className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 pb-2 border-b">
              Core Axes Detail
            </h2>
            {coreAxes.map(axis => (
              <div key={axis.axis_id}>
                <AxisScale axis={axis} />
                <AxisCollisionDetails
                  axisId={axis.axis_id}
                  axisName={axis.name}
                  pairs={collisionPairs}
                  tensions={tensionScores}
                />
              </div>
            ))}
          </section>
        )}

        {/* Facets - Political Style */}
        {facets.length > 0 && (
          <section className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-2 pb-2 border-b">
              Political Style
            </h2>
            <p className="text-gray-500 text-sm mb-6">
              How you pursue your beliefs — your approach to change, institutional confidence, views on justice,
              majorities vs. constitutional limits, experts vs. elected judgment, direct vs. representative democracy,
              and force &amp; peace.
            </p>
            {facets.map(axis => (
              <div key={axis.axis_id}>
                <AxisScale axis={axis} />
                <AxisCollisionDetails
                  axisId={axis.axis_id}
                  axisName={axis.name}
                  pairs={collisionPairs}
                  tensions={tensionScores}
                />
              </div>
            ))}
          </section>
        )}

        {/* Value Tensions - which values you prioritize when they collide */}
        <ValueTensionsSection
          tensions={tensionScores}
          pairs={collisionPairs}
          questions={appliedQuestions}
          responses={responses}
        />

        {/* Ideals vs practice: archetypes matched per register + consistency rating */}
        <IdeologicalConsistency
          conceptualScores={conceptualScores}
          appliedScores={appliedScores}
          tensions={tensionScores}
        />

        {/* Talk the Talk vs Walk the Walk - Conceptual vs Practical Comparison */}
        {axisComparisons.length > 0 && (
          <section className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-2 pb-2 border-b">
              Talk the Talk vs. Walk the Walk
            </h2>
            <p className="text-gray-500 text-sm mb-6">
              Comparing your responses to conceptual principles vs. practical scenarios reveals consistency between beliefs and action.
              Larger differences may indicate areas where abstract values differ from real-world choices.
            </p>

            <div className="space-y-4">
              {axisComparisons.slice(0, 5).map((comparison) => {
                const showWarning = comparison.difference > 0.6
                return (
                  <div key={comparison.axis_id} className={`p-4 rounded-lg border ${showWarning ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-200'}`}>
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold text-gray-800">{comparison.name}</h3>
                        <p className="text-xs text-gray-500">{comparison.pole_negative} ↔ {comparison.pole_positive}</p>
                      </div>
                      {showWarning && (
                        <span className="text-xs bg-amber-200 text-amber-800 px-2 py-1 rounded-full font-medium">
                          Notable Gap
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-2">
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Conceptual Beliefs</p>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-500 h-2 rounded-full transition-all"
                              style={{
                                width: `${Math.abs(comparison.conceptual_score) * 100}%`,
                                marginLeft: comparison.conceptual_score < 0 ? '0' : 'auto',
                                marginRight: comparison.conceptual_score < 0 ? 'auto' : '0'
                              }}
                            />
                          </div>
                          <span className="text-sm font-medium text-gray-700 w-12 text-right">
                            {comparison.conceptual_score.toFixed(2)}
                          </span>
                        </div>
                      </div>

                      <div>
                        <p className="text-xs text-gray-600 mb-1">Practical Application</p>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-green-500 h-2 rounded-full transition-all"
                              style={{
                                width: `${Math.abs(comparison.applied_score) * 100}%`,
                                marginLeft: comparison.applied_score < 0 ? '0' : 'auto',
                                marginRight: comparison.applied_score < 0 ? 'auto' : '0'
                              }}
                            />
                          </div>
                          <span className="text-sm font-medium text-gray-700 w-12 text-right">
                            {comparison.applied_score.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-2 text-xs text-gray-500">
                      Difference: {(comparison.difference * 100).toFixed(0)}%
                      {showWarning && (
                        <span className="ml-2 text-amber-700">
                          — Your practical choices show a different stance than your stated principles
                        </span>
                      )}
                    </div>

                    <AxisDrillDown
                      axisId={comparison.axis_id}
                      axisName={comparison.name}
                      conceptualScore={comparison.conceptual_score}
                      appliedScore={comparison.applied_score}
                      questions={questions as unknown as Question[]}
                      responses={responses}
                    />
                  </div>
                )
              })}
            </div>

            {axisComparisons.every(c => c.difference < 0.4) && (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800">
                  ✓ Your responses show strong consistency between conceptual beliefs and practical application across all axes.
                </p>
              </div>
            )}
          </section>
        )}

        {/* Flavors Section */}
        {topFlavors.length > 0 && (
          <section className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-2 pb-2 border-b">
              Your Political Types
            </h2>
            <p className="text-gray-500 text-sm mb-6">
              Archetypes that match your combination of beliefs and style. Higher percentage = stronger match.
            </p>

            {/* Bar Chart */}
            <div className="mb-8">
              <h3 className="text-sm font-medium text-gray-600 mb-3">Match Strength</h3>
              <FlavorBarChart flavors={topFlavors} />
            </div>

            {/* Expandable Card List */}
            <h3 className="text-sm font-medium text-gray-600 mb-3">Detailed Profiles</h3>
            <FlavorList flavors={topFlavors} sessionId={params.sessionId} />
          </section>
        )}

        {/* Quick Summary Card */}
        <section className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl shadow-lg p-6 text-white">
          <h2 className="text-xl font-bold mb-4">Quick Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-blue-100 text-sm">Top Political Type</p>
              <p className="text-xl font-bold">{topFlavors[0]?.name || 'N/A'}</p>
            </div>
            <div>
              <p className="text-blue-100 text-sm">Strongest Axis</p>
              <p className="text-xl font-bold">
                {[...coreAxes].sort((a, b) => Math.abs(b.score) - Math.abs(a.score))[0]?.name || 'N/A'}
              </p>
            </div>
          </div>
        </section>

        {/* Save Results Prompt */}
        <SaveResultsPrompt sessionId={params.sessionId} />

        {/* Actions: take again, copy, share */}
        <ResultsActions
          sessionId={params.sessionId}
          coreAxes={coreAxes}
          topFlavor={topFlavors[0] || null}
        />
      </div>
    </main>
  )
}
