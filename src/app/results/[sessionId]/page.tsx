import { createClient } from '@/lib/supabase/server'
import { fetchQuestionsWithLinks } from '@/lib/api/questions'
import { ResultsActions } from '@/components/ResultsActions'
import { SaveResultsPrompt } from '@/components/SaveResultsPrompt'
import { CoreAxesRadar } from '@/components/charts/CoreAxesRadar'
import { AxisScale } from '@/components/charts/AxisScale'
import { FlavorList, FlavorBarChart } from '@/components/charts/FlavorCharts'
import { AxisDrillDown } from '@/components/AxisDrillDown'
import { ValueTensionsSection } from '@/components/results/ValueTensionsSection'
import { AxisCollisionDetails } from '@/components/results/AxisCollisionDetails'
import { CollisionScore, AxisScore as AxisScoreType, Database } from '@/lib/database.types'
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

  // Fetch questions with links (used for drill-downs and tension analysis)
  const questions = await fetchQuestionsWithLinks()

  // Fetch axes metadata
  const { data: axesData } = await (supabase
    .from('axes')
    .select('*')
    .order('id') as any)

  const axes = (axesData || []) as Axis[]

  // Stored profile summary (radar chart, axis scales, archetype matches)
  const coreAxes = (surveyResult.core_axes || []) as unknown as LegacyAxisScore[]
  const facets = (surveyResult.facets || []) as unknown as LegacyAxisScore[]
  const topFlavors = (surveyResult.top_flavors || []) as unknown as FlavorMatch[]

  // Collision / tension analysis
  const collisionScores = (surveyResult.collision_pairs || []) as unknown as CollisionScore[]

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

  const conceptualByAxis = Object.fromEntries(conceptualScores.map(s => [s.axis_id, s.score]))
  const appliedByAxis = Object.fromEntries(appliedScores.map(s => [s.axis_id, s.score]))

  const axisComparisons: AxisComparison[] = coreAxes
    .map(axis => {
      const conceptual = conceptualByAxis[axis.axis_id] ?? 0
      const applied = appliedByAxis[axis.axis_id] ?? 0
      // Scores are in [-1, 1], so raw difference is in [0, 2]; normalize to [0, 1]
      const normalizedDiff = Math.abs(conceptual - applied) / 2

      return {
        axis_id: axis.axis_id,
        name: axis.name,
        conceptual_score: conceptual,
        applied_score: applied,
        difference: normalizedDiff,
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
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Your Political Profile</h1>
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
              Your position across 10 dimensions. Outer edge = stronger position, center = neutral.
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
                  collisions={collisionScores}
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
              How you pursue your beliefs — your approach to change, trust in institutions, and views on justice.
            </p>
            {facets.map(axis => (
              <div key={axis.axis_id}>
                <AxisScale axis={axis} />
                <AxisCollisionDetails
                  axisId={axis.axis_id}
                  axisName={axis.name}
                  collisions={collisionScores}
                />
              </div>
            ))}
          </section>
        )}

        {/* Value Tensions - which values you prioritize when they collide */}
        <ValueTensionsSection
          collisions={collisionScores}
          questions={questions}
          responses={responses}
          conceptualScores={conceptualScores}
          appliedScores={appliedScores}
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
                const showWarning = comparison.difference > 0.3
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

            {axisComparisons.every(c => c.difference < 0.2) && (
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
