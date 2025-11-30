import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import type { AxisScore, FlavorMatch } from '@/lib/supabase'
import { ResultsActions } from '@/components/ResultsActions'
import { SaveResultsPrompt } from '@/components/SaveResultsPrompt'
import { CoreAxesRadar } from '@/components/charts/CoreAxesRadar'
import { AxisScale } from '@/components/charts/AxisScale'
import { FlavorList, FlavorBarChart } from '@/components/charts/FlavorCharts'

type Props = {
  params: { sessionId: string }
}

async function getResults(sessionId: string) {
  const { data, error } = await supabase
    .from('survey_results')
    .select('*')
    .eq('session_id', sessionId)
    .single()

  if (error || !data) return null
  return data
}

export default async function ResultsPage({ params }: Props) {
  const results = await getResults(params.sessionId)

  if (!results) {
    notFound()
  }

  const { core_axes, facets, top_flavors } = results

  return (
    <main className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Your Political Profile</h1>
          <p className="text-gray-600">Based on your 98 responses</p>
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
          <FlavorList flavors={top_flavors} />
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
