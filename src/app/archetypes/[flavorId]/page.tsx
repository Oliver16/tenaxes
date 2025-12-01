import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import { FLAVOR_ARCHETYPES, AXES } from '@/lib/instrument'
import type { SurveyResult, FlavorMatch, AxisScore } from '@/lib/supabase'
import type { Database } from '@/lib/database.types'

interface Props {
  params: { flavorId: string }
  searchParams: { sessionId?: string }
}

export default async function ArchetypePage({ params, searchParams }: Props) {
  const { flavorId } = params
  const { sessionId } = searchParams

  // Find the archetype definition
  const archetype = FLAVOR_ARCHETYPES.find(f => f.id === flavorId)
  if (!archetype) {
    notFound()
  }

  // Load user's survey results if sessionId provided
  let userResults: SurveyResult | null = null
  let userMatch: FlavorMatch | null = null
  let userAxes: AxisScore[] = []

  if (sessionId) {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('survey_results')
      .select('*')
      .eq('session_id', sessionId)
      .single()

    if (!error && data) {
      // Type the data explicitly and cast JSONB fields to proper types
      const row = data as Database['public']['Tables']['survey_results']['Row']

      userResults = {
        id: row.id,
        session_id: row.session_id,
        user_id: row.user_id,
        core_axes: row.core_axes as unknown as AxisScore[],
        facets: row.facets as unknown as AxisScore[],
        top_flavors: row.top_flavors as unknown as FlavorMatch[],
        created_at: row.created_at
      }

      userAxes = userResults.core_axes
      userMatch = userResults.top_flavors.find(
        f => f.flavor_id === flavorId
      ) || null
    }
  }

  // Calculate component details
  const componentDetails = archetype.components.map(comp => {
    const axis = AXES[comp.axis as keyof typeof AXES]
    const userAxisScore = userAxes.find(a => a.axis_id === comp.axis)

    let alignment = 0
    let alignmentStrength = ''
    let alignmentDescription = ''

    if (userAxisScore && comp.direction !== 0) {
      alignment = userAxisScore.score * comp.direction

      if (alignment >= 0.7) {
        alignmentStrength = 'Very Strong'
        alignmentDescription = 'strongly aligns with'
      } else if (alignment >= 0.5) {
        alignmentStrength = 'Strong'
        alignmentDescription = 'strongly aligns with'
      } else if (alignment >= 0.3) {
        alignmentStrength = 'Moderate'
        alignmentDescription = 'moderately aligns with'
      } else if (alignment >= 0.1) {
        alignmentStrength = 'Weak'
        alignmentDescription = 'weakly aligns with'
      } else if (alignment >= -0.1) {
        alignmentStrength = 'Neutral'
        alignmentDescription = 'is neutral toward'
      } else {
        alignmentStrength = 'Opposing'
        alignmentDescription = 'diverges from'
      }
    }

    return {
      axis,
      component: comp,
      userScore: userAxisScore,
      alignment,
      alignmentStrength,
      alignmentDescription,
    }
  })

  // Sort by weight to show most important factors first
  componentDetails.sort((a, b) => b.component.weight - a.component.weight)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-8">
          {sessionId && (
            <Link
              href={`/results/${sessionId}`}
              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 mb-4 inline-block"
            >
              ← Back to Results
            </Link>
          )}

          <div
            className="border-l-4 pl-6 py-4 mb-6"
            style={{ borderColor: archetype.color }}
          >
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
              {archetype.name}
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              {archetype.description}
            </p>
          </div>

          {/* User's Match Info */}
          {userMatch && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-3">
                Your Match
              </h2>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full flex items-center justify-end pr-3 text-white text-sm font-semibold"
                      style={{
                        width: `${((userMatch.affinity + 1) / 2) * 100}%`,
                        backgroundColor: archetype.color,
                      }}
                    >
                      {Math.round(((userMatch.affinity + 1) / 2) * 100)}%
                    </div>
                  </div>
                </div>
                <span className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                  {userMatch.match_strength} Match
                </span>
              </div>
            </div>
          )}
        </div>

        {/* What Defines This Archetype */}
        <section className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
            What Defines This Archetype
          </h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            The {archetype.name} archetype is characterized by specific positions across multiple political axes.
            Here are the key dimensions that define this political orientation:
          </p>

          <div className="space-y-4">
            {componentDetails.map(({ axis, component }) => {
              if (!axis) return null

              const idealPosition = component.direction === 1
                ? axis.pole_positive
                : axis.pole_negative
              const importance = component.weight >= 1 ? 'Core' : 'Supporting'

              return (
                <div key={axis.id} className="border-l-2 border-gray-300 dark:border-gray-600 pl-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {axis.name}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        <span className="font-medium">{importance} dimension:</span> Leans toward{' '}
                        <span className="font-semibold">{idealPosition}</span>
                      </p>
                    </div>
                    <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                      Weight: {component.weight}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* Why You Matched (if user data available) */}
        {userMatch && userAxes.length > 0 && (
          <section className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              Why You Matched This Archetype
            </h2>
            <p className="text-gray-700 dark:text-gray-300 mb-6">
              Based on your survey responses, here's how your political positions align with
              the {archetype.name} archetype:
            </p>

            <div className="space-y-6">
              {componentDetails.map(({ axis, component, userScore, alignment, alignmentStrength, alignmentDescription }) => {
                if (!axis || !userScore) return null

                const idealPosition = component.direction === 1
                  ? axis.pole_positive
                  : axis.pole_negative
                const oppositePosition = component.direction === 1
                  ? axis.pole_negative
                  : axis.pole_positive

                // Calculate position percentage (0-100)
                const userPositionPercent = ((userScore.score + 1) / 2) * 100
                const idealPositionPercent = component.direction === 1 ? 100 : 0

                return (
                  <div key={axis.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {axis.name}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Your position {alignmentDescription} this archetype
                        </p>
                      </div>
                      <span
                        className={`text-xs px-3 py-1 rounded-full font-semibold ${
                          alignment >= 0.5
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : alignment >= 0.1
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                            : alignment >= -0.1
                            ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        }`}
                      >
                        {alignmentStrength}
                      </span>
                    </div>

                    {/* Visual scale */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                        <span>{axis.pole_negative}</span>
                        <span>{axis.pole_positive}</span>
                      </div>

                      <div className="relative h-12 bg-gradient-to-r from-blue-200 via-gray-100 to-red-200 dark:from-blue-900 dark:via-gray-700 dark:to-red-900 rounded">
                        {/* Ideal position marker */}
                        <div
                          className="absolute top-0 bottom-0 w-1 bg-gray-400 dark:bg-gray-500"
                          style={{ left: `${idealPositionPercent}%` }}
                          title={`Ideal: ${idealPosition}`}
                        >
                          <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
                            ↓ Ideal
                          </div>
                        </div>

                        {/* User position marker */}
                        <div
                          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-white shadow-lg"
                          style={{
                            left: `${userPositionPercent}%`,
                            backgroundColor: archetype.color,
                          }}
                          title={`Your score: ${userScore.score.toFixed(2)}`}
                        >
                          <div className="absolute top-6 left-1/2 -translate-x-1/2 text-xs font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">
                            You ↑
                          </div>
                        </div>
                      </div>

                      <div className="text-sm text-gray-600 dark:text-gray-400 mt-3">
                        <span className="font-medium">Your position:</span> {userScore.pole_label}
                        {component.weight > 1 && (
                          <span className="ml-2 text-xs italic">(Core dimension for this archetype)</span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Overall explanation */}
            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">
                Overall Match Calculation
              </h3>
              <p className="text-sm text-blue-800 dark:text-blue-300">
                Your {Math.round(((userMatch.affinity + 1) / 2) * 100)}% match with {archetype.name} was
                calculated by measuring how closely your positions on each axis align with this archetype's
                ideal positions, weighted by the importance of each dimension. The closer your positions
                align with the archetype's core dimensions, the stronger your match.
              </p>
            </div>
          </section>
        )}

        {/* No user data message */}
        {!sessionId && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-6 border border-yellow-200 dark:border-yellow-800">
            <h3 className="font-semibold text-yellow-900 dark:text-yellow-200 mb-2">
              See Your Personal Match
            </h3>
            <p className="text-sm text-yellow-800 dark:text-yellow-300 mb-4">
              Take the TenAxes survey to see how your positions align with this archetype
              and get a personalized explanation of your match.
            </p>
            <Link
              href="/survey"
              className="inline-block bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded font-semibold transition-colors"
            >
              Take the Survey
            </Link>
          </div>
        )}

        {/* Related navigation */}
        {sessionId && (
          <div className="mt-8 text-center">
            <Link
              href={`/results/${sessionId}`}
              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-semibold"
            >
              View All Your Results →
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
