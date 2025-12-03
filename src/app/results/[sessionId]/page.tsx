import { createClient } from '@/lib/supabase/server'
import { fetchQuestionsWithLinks } from '@/lib/api/questions'
import { ValueTensionsSection } from '@/components/results/ValueTensionsSection'
import { CoreAxesRadar } from '@/components/charts/CoreAxesRadar'
import { ConceptualVsAppliedChart } from '@/components/charts/ConceptualVsAppliedChart'
import { FlavorBarChart, FlavorList } from '@/components/charts/FlavorCharts'
import { FacetScales } from '@/components/charts/FacetScales'
import { CollisionScore, Database } from '@/lib/database.types'
import type { AxisScore, FlavorMatch } from '@/lib/supabase'

type SurveyResult = Database['public']['Tables']['survey_results']['Row']

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
      <div className="container mx-auto py-12">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-800 mb-4">Results Not Found</h1>
          <p className="text-gray-600">We couldn't find results for this session.</p>
        </div>
      </div>
    )
  }

  // Fetch questions with links
  const questions = await fetchQuestionsWithLinks()

  // Extract data from survey results
  const coreAxes = (surveyResult.core_axes || []) as unknown as AxisScore[]
  const facets = (surveyResult.facets || []) as unknown as AxisScore[]
  const topFlavors = (surveyResult.top_flavors || []) as unknown as FlavorMatch[]
  const conceptualScores = (surveyResult.conceptual_scores || []) as unknown as AxisScore[]
  const appliedScores = (surveyResult.applied_scores || []) as unknown as AxisScore[]
  const collisionScores = (surveyResult.collision_pairs || []) as unknown as CollisionScore[]

  return (
    <div className="container mx-auto py-12 space-y-16 max-w-6xl">
      {/* Header */}
      <section className="text-center">
        <h1 className="text-5xl font-bold mb-4 text-gray-900">Your Political Compass Results</h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          A comprehensive analysis of your political values, ideological patterns, and belief structures
        </p>
      </section>

      {/* 1. RADAR CHART - Core Values Visualization */}
      {coreAxes.length > 0 && (
        <section className="bg-white rounded-xl shadow-lg p-8 border border-gray-200">
          <div className="mb-6">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Your Political Profile</h2>
            <p className="text-gray-600">
              This radar chart visualizes your position across 10 core political dimensions
            </p>
          </div>
          <CoreAxesRadar axes={coreAxes} />
        </section>
      )}

      {/* 2. ARCHETYPES - Political Flavor Matches */}
      {topFlavors.length > 0 && (
        <section className="bg-white rounded-xl shadow-lg p-8 border border-gray-200">
          <div className="mb-6">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Your Political Archetypes</h2>
            <p className="text-gray-600">
              These are the political ideologies and movements that best match your belief system
            </p>
          </div>

          {/* Bar Chart */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Archetype Match Strength</h3>
            <FlavorBarChart flavors={topFlavors} showAll={false} sessionId={params.sessionId} />
          </div>

          {/* Cards */}
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Top Matches</h3>
            <FlavorList flavors={topFlavors} sessionId={params.sessionId} />
          </div>
        </section>
      )}

      {/* 3. CONCEPTUAL VS APPLIED - Ideology/Practice Gap */}
      {conceptualScores.length > 0 && appliedScores.length > 0 && (
        <section className="bg-white rounded-xl shadow-lg p-8 border border-gray-200">
          <div className="mb-6">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Ideology vs. Practice</h2>
            <p className="text-gray-600">
              How your theoretical beliefs compare to your practical judgments
            </p>
          </div>
          <ConceptualVsAppliedChart
            conceptualScores={conceptualScores}
            appliedScores={appliedScores}
          />
        </section>
      )}

      {/* 4. FACETS - Change Strategy, Institutional Trust, Justice Style */}
      {facets.length > 0 && (
        <section className="bg-white rounded-xl shadow-lg p-8 border border-gray-200">
          <div className="mb-6">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Your Political Facets</h2>
            <p className="text-gray-600">
              Additional dimensions that shape your political worldview
            </p>
          </div>
          <FacetScales facets={facets} />
        </section>
      )}

      {/* 5. VALUE TENSIONS - Collision Detection */}
      {collisionScores.length > 0 && (
        <section className="bg-white rounded-xl shadow-lg p-8 border border-gray-200">
          <div className="mb-6">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Value Tensions & Contradictions</h2>
            <p className="text-gray-600">
              Areas where your responses show internal conflicts or competing values
            </p>
          </div>
          <ValueTensionsSection
            collisions={collisionScores}
            questions={questions}
          />
        </section>
      )}

      {/* Footer */}
      <section className="text-center py-8 border-t border-gray-200">
        <p className="text-gray-500 text-sm mb-4">
          Your results have been saved. You can view them anytime from your profile.
        </p>
        <div className="flex justify-center gap-4">
          <a
            href="/past-surveys"
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
          >
            View Past Surveys
          </a>
          <a
            href="/survey"
            className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition font-medium"
          >
            Take Survey Again
          </a>
        </div>
      </section>
    </div>
  )
}
