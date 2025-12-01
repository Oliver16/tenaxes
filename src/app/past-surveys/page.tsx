import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import type { Database } from '@/lib/database.types'

type SurveyResult = Database['public']['Tables']['survey_results']['Row']

async function getUserSession() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

async function getUserResults(userId: string): Promise<SurveyResult[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('survey_results')
    .select('id, session_id, core_axes, facets, top_flavors, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching results:', error)
    return []
  }

  return data || []
}

export default async function PastSurveysPage() {
  const user = await getUserSession()

  if (!user) {
    redirect('/')
  }

  const results = await getUserResults(user.id)

  // Sort results by date, newest first
  const sortedResults = results

  return (
    <main className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Past Surveys</h1>
          <p className="text-gray-600">
            View all surveys you've taken and revisit your results
          </p>
        </div>

        {/* Empty State */}
        {sortedResults.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <svg
              className="w-16 h-16 text-gray-300 mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              No surveys yet
            </h2>
            <p className="text-gray-500 mb-6">
              You haven't taken any surveys while logged in. Take your first survey to see it here.
            </p>
            <Link
              href="/survey"
              className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              Take Survey
            </Link>
          </div>
        ) : (
          <>
            {/* Results Count */}
            <div className="mb-6 flex items-center justify-between">
              <p className="text-gray-600">
                <span className="font-semibold text-gray-900">{sortedResults.length}</span>
                {' '}
                {sortedResults.length === 1 ? 'survey' : 'surveys'} completed
              </p>
              <Link
                href="/survey"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors text-sm"
              >
                Take Another Survey
              </Link>
            </div>

            {/* Results List */}
            <div className="space-y-4">
              {sortedResults.map((result) => {
                const topFlavor = (result.top_flavors as any)?.[0]
                const coreAxes = (result.core_axes as any[]) ?? []
                const date = new Date(result.created_at)

                return (
                  <Link
                    key={result.id}
                    href={`/results/${result.session_id}`}
                    className="block bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:border-blue-400 hover:shadow-md transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        {/* Top Flavor */}
                        <div className="flex items-center gap-3 mb-3">
                          <h3 className="text-xl font-semibold text-gray-900">
                            {topFlavor?.name || 'Political Profile'}
                          </h3>
                          {topFlavor && (
                            <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded-full">
                              {(topFlavor.affinity * 100).toFixed(0)}% match
                            </span>
                          )}
                        </div>

                        {/* Description */}
                        {topFlavor?.description && (
                          <p className="text-gray-600 text-sm mb-4 max-w-2xl">
                            {topFlavor.description}
                          </p>
                        )}

                        {/* Top Axes */}
                        <div className="flex flex-wrap gap-2">
                          {coreAxes.slice(0, 4).map((axis: any) => (
                            <span
                              key={axis.axis_id}
                              className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-md"
                            >
                              <span className="font-medium">{axis.name}:</span> {axis.pole_label}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Date */}
                      <div className="text-right ml-6 flex-shrink-0">
                        <p className="text-sm font-medium text-gray-900">
                          {date.toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {date.toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>

                    {/* View Link Indicator */}
                    <div className="mt-4 pt-4 border-t border-gray-100 flex items-center text-blue-600 text-sm font-medium">
                      View detailed results
                      <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </Link>
                )
              })}
            </div>
          </>
        )}
      </div>
    </main>
  )
}
