import { createClient } from '@/lib/supabase/server'
import { fetchQuestionsWithLinks } from '@/lib/api/questions'
import { CoreValuesRadarChart } from '@/components/results/RadarChart'
import { ConceptualVsAppliedChart } from '@/components/results/ConceptualVsAppliedChart'
import { ArchetypeDisplay } from '@/components/results/ArchetypeDisplay'
import { FacetScales } from '@/components/results/FacetScales'
import { ValueTensionsSection } from '@/components/results/ValueTensionsSection'
import { CollisionScore, AxisScore as AxisScoreType, Database } from '@/lib/database.types'
import { FlavorMatch } from '@/lib/archetype-calculator'

type SurveyResult = Database['public']['Tables']['survey_results']['Row']
type Axis = Database['public']['Tables']['axes']['Row']

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
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Results Not Found</h1>
          <p className="text-gray-600">The results for this session could not be found.</p>
        </div>
      </div>
    )
  }

  // Fetch questions with links
  const questions = await fetchQuestionsWithLinks()

  // Get data from stored results
  const collisionScores = (surveyResult.collision_pairs || []) as unknown as CollisionScore[]
  const conceptualScores = (surveyResult.conceptual_scores || []) as unknown as AxisScoreType[]
  const appliedScores = (surveyResult.applied_scores || []) as unknown as AxisScoreType[]
  const coreAxes = (surveyResult.core_axes || []) as unknown as AxisScoreType[]
  const facets = (surveyResult.facets || []) as unknown as AxisScoreType[]
  const topFlavors = (surveyResult.top_flavors || []) as unknown as FlavorMatch[]

  return (
    <div className="container mx-auto py-12 px-4 space-y-16">
      {/* Header */}
      <section className="text-center">
        <h1 className="text-4xl font-bold mb-4">Your Political Compass Results</h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          A comprehensive analysis of your political values, beliefs, and how you navigate competing principles
        </p>
      </section>

      {/* Core Values Radar Chart */}
      {coreAxes.length > 0 && (
        <section className="bg-white rounded-lg shadow-md p-8">
          <div className="mb-6">
            <h2 className="text-3xl font-bold mb-2">Your Core Values</h2>
            <p className="text-gray-600">
              This radar chart shows your position across the ten fundamental political dimensions
            </p>
          </div>
          <CoreValuesRadarChart coreAxes={coreAxes} />
        </section>
      )}

      {/* Archetypes/Political Flavors */}
      {topFlavors.length > 0 && (
        <section className="bg-white rounded-lg shadow-md p-8">
          <div className="mb-6">
            <h2 className="text-3xl font-bold mb-2">Your Political Archetypes</h2>
            <p className="text-gray-600">
              These are the political ideologies and orientations that most closely match your values
            </p>
          </div>
          <ArchetypeDisplay
            flavors={topFlavors}
            sessionId={params.sessionId}
          />
        </section>
      )}

      {/* Conceptual vs Applied */}
      {conceptualScores.length > 0 && appliedScores.length > 0 && (
        <section className="bg-white rounded-lg shadow-md p-8">
          <div className="mb-6">
            <h2 className="text-3xl font-bold mb-2">Ideology vs. Practice</h2>
            <p className="text-gray-600">
              How your theoretical beliefs (conceptual) compare with your practical judgments (applied).
              Large gaps may reveal tensions between ideals and real-world constraints.
            </p>
          </div>
          <ConceptualVsAppliedChart
            conceptualScores={conceptualScores}
            appliedScores={appliedScores}
          />

          {/* Gap Analysis */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="font-semibold text-blue-900 mb-2">Understanding the Gap</h3>
            <p className="text-sm text-blue-800">
              <strong>Purple line (Conceptual):</strong> Your abstract principles and ideological commitments
              <br />
              <strong>Green line (Applied):</strong> How you actually respond to concrete scenarios and tradeoffs
              <br />
              <br />
              Divergence between these lines can indicate areas where pragmatic concerns temper ideological purity,
              or where you apply different standards in theory versus practice.
            </p>
          </div>
        </section>
      )}

      {/* Facets */}
      {facets.length > 0 && (
        <section className="bg-white rounded-lg shadow-md p-8">
          <div className="mb-6">
            <h2 className="text-3xl font-bold mb-2">Your Political Style</h2>
            <p className="text-gray-600">
              These facets describe how you approach political change and institutions
            </p>
          </div>
          <FacetScales facets={facets} />
        </section>
      )}

      {/* Value Tensions/Collisions - IMPROVED FORMATTING */}
      {collisionScores.length > 0 && (
        <ValueTensionsSection
          collisions={collisionScores}
          questions={questions}
        />
      )}

      {/* Footer */}
      <section className="text-center text-sm text-gray-500 border-t pt-8">
        <p>Session ID: {params.sessionId}</p>
        <p className="mt-2">
          These results are based on your responses to {questions.length} questions
          across multiple political dimensions
        </p>
      </section>
    </div>
  )
}
