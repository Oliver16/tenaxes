import { redirect } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/database.types'

async function getUserSession() {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

async function getUserResults(userId: string) {
  const params: Database['public']['Functions']['get_user_results']['Args'] = {
    p_user_id: userId
  }

  const { data, error } = await supabase.rpc('get_user_results', params)

  if (error) {
    console.error('Error fetching results:', error)
    return []
  }

  return data || []
}

export default async function ProfilePage() {
  const user = await getUserSession()

  if (!user) {
    redirect('/')
  }

  const results = await getUserResults(user.id)

  return (
    <main className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">My Profile</h1>
              <p className="text-gray-600 mt-1">{user.email}</p>
            </div>
            <Link
              href="/"
              className="px-4 py-2 border border-gray-300 hover:border-gray-400 text-gray-700 rounded-lg font-medium transition-colors"
            >
              Home
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-blue-600 text-sm font-medium">Total Tests Taken</p>
              <p className="text-3xl font-bold text-blue-900 mt-1">{results.length}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <p className="text-green-600 text-sm font-medium">Account Created</p>
              <p className="text-lg font-semibold text-green-900 mt-1">
                {new Date(user.created_at || '').toLocaleDateString()}
              </p>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <p className="text-purple-600 text-sm font-medium">Last Login</p>
              <p className="text-lg font-semibold text-purple-900 mt-1">
                {new Date(user.last_sign_in_at || '').toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        {/* Results History */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Your Results History</h2>
            <Link
              href="/survey"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              Take Test Again
            </Link>
          </div>

          {results.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-gray-500 text-lg mb-4">No saved results yet</p>
              <p className="text-gray-400 text-sm mb-6">Take the political compass test to see your results here</p>
              <Link
                href="/survey"
                className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                Take Test Now
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {results.map((result: any) => {
                const topFlavor = result.top_flavors?.[0]
                const date = new Date(result.created_at)

                return (
                  <Link
                    key={result.id}
                    href={`/results/${result.session_id}`}
                    className="block border border-gray-200 rounded-lg p-4 hover:border-blue-400 hover:shadow-md transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-800">
                            {topFlavor?.name || 'Political Profile'}
                          </h3>
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                            {topFlavor ? `${(topFlavor.affinity * 100).toFixed(0)}% match` : 'N/A'}
                          </span>
                        </div>

                        <p className="text-gray-600 text-sm mb-3">
                          {topFlavor?.description || 'View your detailed political profile'}
                        </p>

                        <div className="flex flex-wrap gap-2">
                          {result.core_axes?.slice(0, 3).map((axis: any) => (
                            <span
                              key={axis.axis_id}
                              className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                            >
                              {axis.name}: {axis.pole_label}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="text-right ml-4">
                        <p className="text-sm text-gray-500">{date.toLocaleDateString()}</p>
                        <p className="text-xs text-gray-400">{date.toLocaleTimeString()}</p>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* Sign Out Button */}
        <div className="mt-6 text-center">
          <form action="/api/auth/signout" method="POST">
            <button
              type="submit"
              className="text-sm text-gray-500 hover:text-gray-700 underline"
            >
              Sign Out
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}
