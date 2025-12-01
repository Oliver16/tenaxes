import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import type { AxisScore, FlavorMatch, SurveyResult } from '@/lib/supabase'
import type { Database } from '@/lib/database.types'
import { ResultsActions } from '@/components/ResultsActions'
import { SaveResultsPrompt } from '@/components/SaveResultsPrompt'
import { CoreAxesRadar } from '@/components/charts/CoreAxesRadar'
import { AxisScale } from '@/components/charts/AxisScale'
import { FlavorList, FlavorBarChart } from '@/components/charts/FlavorCharts'
import { calculateScoresFromQuestions } from '@/lib/scorer'
import type { Question } from '@/lib/questions'

type Props = {
  params: { sessionId: string }
}

type AxisComparison = {
  axis_id: string
  name: string
  conceptual_score: number
  applied_score: number
  difference: number
  pole_negative: string
  pole_positive: string
}

async function getResults(sessionId: string): Promise<SurveyResult & {
  responseCount: number
  conceptualCount: number
  appliedCount: number
  axisComparisons: AxisComparison[]
} | null> {
  const { data, error } = await supabase
    .from('survey_results')
    .select('*')
    .eq('session_id', sessionId)
    .single()

  if (error || !data) return null

  // Get the response count from survey_responses
  const { data: responseData } = await supabase
    .from('survey_responses')
    .select('responses')
    .eq('session_id', sessionId)
    .single()

  type SurveyResponseRow = Pick<Database['public']['Tables']['survey_responses']['Row'], 'responses'>
  const typedResponseData = responseData as SurveyResponseRow | null
  const responses = (typedResponseData?.responses as Record<number, number>) || {}
  const responseCount = Object.keys(responses).length

  // Fetch all questions to calculate separate scores
  const { data: questionsData } = await supabase
    .from('questions')
    .select('*')
    .eq('active', true)

  const questions = (questionsData || []).map((q: any) => ({
    ...q,
    weight: q.weight ?? 1.0,
    question_type: q.question_type
  })) as Question[]

  // Separate questions by type
  const conceptualQuestions = questions.filter(q => q.question_type === 'conceptual' || q.question_type === null || q.question_type === undefined)
  const appliedQuestions = questions.filter(q => q.question_type === 'applied')

  // Count responses by type
  const conceptualCount = conceptualQuestions.filter(q => responses[q.id] !== undefined).length
  const appliedCount = appliedQuestions.filter(q => responses[q.id] !== undefined).length

  // Calculate separate scores for conceptual and applied
  const conceptualResults = calculateScoresFromQuestions(responses, conceptualQuestions)
  const appliedResults = calculateScoresFromQuestions(responses, appliedQuestions)

  // Create comparison data for core axes only
  const axisComparisons: AxisComparison[] = conceptualResults.coreAxes.map(conceptualAxis => {
    const appliedAxis = appliedResults.coreAxes.find(a => a.axis_id === conceptualAxis.axis_id)
    return {
      axis_id: conceptualAxis.axis_id,
      name: conceptualAxis.name,
      conceptual_score: conceptualAxis.score,
      applied_score: appliedAxis?.score || 0,
      difference: Math.abs(conceptualAxis.score - (appliedAxis?.score || 0)),
      pole_negative: conceptualAxis.pole_negative,
      pole_positive: conceptualAxis.pole_positive
    }
  }).sort((a, b) => b.difference - a.difference) // Sort by largest difference first

  // Type the data explicitly and cast JSONB fields to proper types
  const row = data as Database['public']['Tables']['survey_results']['Row']

  return {
    id: row.id,
    session_id: row.session_id,
    user_id: row.user_id,
    core_axes: row.core_axes as unknown as AxisScore[],
    facets: row.facets as unknown as AxisScore[],
    top_flavors: row.top_flavors as unknown as FlavorMatch[],
    created_at: row.created_at,
    responseCount,
    conceptualCount,
    appliedCount,
    axisComparisons
  }
}

export default async function ResultsPage({ params }: Props) {
  const results = await getResults(params.sessionId)

  if (!results) {
    notFound()
  }

  const { core_axes, facets, top_flavors, responseCount, conceptualCount, appliedCount, axisComparisons } = results

  return (
    <main className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Your Political Profile</h1>
          <p className="text-gray-600">Based on your {responseCount} responses ({conceptualCount} conceptual, {appliedCount} practical)</p>
          <p className="text-sm text-gray-400 mt-1">Session: {params.sessionId}</p>
        </div>

        {/* Radar Chart - Core Axes Overview */}
        <section className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Core Axes Overview</h2>
          <p className="text-gray-500 text-sm mb-4">
            Your position across 10 dimensions. Outer edge = stronger position, center = neutral.
          </p>
          <CoreAxesRadar axes={core_axes} />
        </section>

        {/* Core Axes Detail - Scales */}
        <section className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 pb-2 border-b">
            Core Axes Detail
          </h2>
          {core_axes.map((axis: AxisScore) => (
            <AxisScale key={axis.axis_id} axis={axis} />
          ))}
        </section>

        {/* Facets - Political Style */}
        <section className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-2 pb-2 border-b">
            Political Style
          </h2>
          <p className="text-gray-500 text-sm mb-6">
            How you pursue your beliefs — your approach to change, trust in institutions, and views on justice.
          </p>
          {facets.map((axis: AxisScore) => (
            <AxisScale key={axis.axis_id} axis={axis} />
          ))}
        </section>

        {/* Talk the Talk vs Walk the Walk - Conceptual vs Practical Comparison */}
        {/* Only show if user answered at least 40 applied questions (out of 52 total) */}
        {appliedCount >= 40 && (
          <section className="bg-white rounded-xl shadow-lg p-6 mb-6">
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
        <section className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-2 pb-2 border-b">
            Your Political Types
          </h2>
          <p className="text-gray-500 text-sm mb-6">
            Archetypes that match your combination of beliefs and style. Higher percentage = stronger match.
          </p>
          
          {/* Bar Chart */}
          <div className="mb-8">
            <h3 className="text-sm font-medium text-gray-600 mb-3">Match Strength</h3>
            <FlavorBarChart flavors={top_flavors} />
          </div>

          {/* Expandable Card List */}
          <h3 className="text-sm font-medium text-gray-600 mb-3">Detailed Profiles</h3>
          <FlavorList flavors={top_flavors} sessionId={params.sessionId} />
        </section>

        {/* Quick Summary Card */}
        <section className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl shadow-lg p-6 mb-6 text-white">
          <h2 className="text-xl font-bold mb-4">Quick Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-blue-100 text-sm">Top Political Type</p>
              <p className="text-xl font-bold">{top_flavors[0]?.name || 'N/A'}</p>
            </div>
            <div>
              <p className="text-blue-100 text-sm">Match Strength</p>
              <p className="text-xl font-bold">
                {top_flavors[0] ? `${(top_flavors[0].affinity * 100).toFixed(0)}%` : 'N/A'}
              </p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-white/20">
            <p className="text-blue-100 text-sm mb-2">Strongest Positions</p>
            <div className="flex flex-wrap gap-2">
              {[...core_axes]
                .sort((a, b) => Math.abs(b.score) - Math.abs(a.score))
                .slice(0, 3)
                .map((axis: AxisScore) => (
                  <span
                    key={axis.axis_id}
                    className="px-3 py-1 bg-white/20 rounded-full text-sm"
                  >
                    {axis.name}: {axis.pole_label}
                  </span>
                ))
              }
            </div>
          </div>
        </section>

        {/* Save Results Prompt */}
        <section className="mb-6">
          <SaveResultsPrompt sessionId={params.sessionId} />
        </section>

        {/* Actions */}
        <ResultsActions
          sessionId={params.sessionId}
          coreAxes={core_axes}
          topFlavor={top_flavors[0] || null}
        />

        {/* Admin Link */}
        <div className="mt-8 text-center">
          <a 
            href="/admin" 
            className="text-sm text-gray-400 hover:text-gray-600"
          >
            View Analytics →
          </a>
        </div>
      </div>
    </main>
  )
}
