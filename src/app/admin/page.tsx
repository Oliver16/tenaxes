'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { fetchAnalytics, type AnalyticsData } from '@/lib/analytics'
import {
  ResponsesOverTimeChart,
  AxisDistributionChart,
  FlavorPopularityChart,
  StatCard
} from '@/components/charts/AdminCharts'

export default function AdminPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const result = await fetchAnalytics()
      if (result) {
        setData(result)
      } else {
        setError('Failed to load analytics data')
      }
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-100 py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-300 rounded w-64 mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-32 bg-gray-300 rounded-xl"></div>
              ))}
            </div>
            <div className="h-96 bg-gray-300 rounded-xl"></div>
          </div>
        </div>
      </main>
    )
  }

  if (error || !data) {
    return (
      <main className="min-h-screen bg-gray-100 py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <p className="text-red-700">{error || 'No data available'}</p>
            <p className="text-sm text-red-500 mt-2">
              Make sure your Supabase tables have data and RLS policies allow reading.
            </p>
            <Link href="/" className="text-blue-600 hover:underline mt-4 block">
              ← Back to home
            </Link>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Analytics Dashboard</h1>
            <p className="text-gray-500">Survey response analytics and insights</p>
          </div>
          <Link
            href="/"
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm"
          >
            ← Back to Survey
          </Link>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <StatCard
            title="Total Responses"
            value={data.totalResponses.toLocaleString()}
            subtitle="All time"
          />
          <StatCard
            title="Last 7 Days"
            value={data.responsesLast7Days.toLocaleString()}
            subtitle="responses"
            trend={data.totalResponses > 0 ? {
              value: Math.round((data.responsesLast7Days / data.totalResponses) * 100),
              label: '% of total'
            } : undefined}
          />
          <StatCard
            title="Last 30 Days"
            value={data.responsesLast30Days.toLocaleString()}
            subtitle="responses"
          />
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Responses Over Time */}
          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Responses Over Time</h2>
            <p className="text-sm text-gray-500 mb-4">Daily submissions (last 30 days)</p>
            {data.dailyCounts.length > 0 ? (
              <ResponsesOverTimeChart data={data.dailyCounts} />
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-400">
                No data yet
              </div>
            )}
          </div>

          {/* Flavor Popularity */}
          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Most Common Political Types</h2>
            <p className="text-sm text-gray-500 mb-4">Weighted by ranking (top match = 5 pts, etc.)</p>
            {data.flavorPopularity.length > 0 ? (
              <FlavorPopularityChart data={data.flavorPopularity} />
            ) : (
              <div className="h-[350px] flex items-center justify-center text-gray-400">
                No data yet
              </div>
            )}
          </div>
        </div>

        {/* Axis Distribution - Full Width */}
        <div className="bg-white rounded-xl shadow p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Average Scores by Axis</h2>
          <p className="text-sm text-gray-500 mb-4">
            Population mean for each dimension. Red = negative pole, Green = positive pole.
          </p>
          {data.axisAggregates.length > 0 ? (
            <AxisDistributionChart data={data.axisAggregates} />
          ) : (
            <div className="h-[400px] flex items-center justify-center text-gray-400">
              No data yet
            </div>
          )}
        </div>

        {/* Recent Sessions */}
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Recent Sessions</h2>
          <p className="text-sm text-gray-500 mb-4">Last 10 completed surveys</p>
          {data.recentSessions.length > 0 ? (
            <div className="space-y-2">
              {data.recentSessions.map((sessionId, i) => (
                <div 
                  key={sessionId}
                  className="flex justify-between items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-500">#{i + 1}</span>
                    <code className="text-sm text-gray-700 font-mono">{sessionId}</code>
                  </div>
                  <Link
                    href={`/results/${sessionId}`}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    View Results →
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-center py-8">No sessions yet</p>
          )}
        </div>

        {/* Axis Legend */}
        <div className="mt-6 bg-white rounded-xl shadow p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Axis Reference</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.axisAggregates.map(axis => (
              <div key={axis.axis_id} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-start">
                  <span className="font-medium text-gray-800">{axis.axis_name}</span>
                  <span className="text-xs text-gray-400">{axis.axis_id}</span>
                </div>
                <div className="mt-2 text-sm">
                  <span className="text-gray-500">Avg: </span>
                  <span className={axis.avg_score < 0 ? 'text-red-600' : 'text-green-600'}>
                    {axis.avg_score > 0 ? '+' : ''}{(axis.avg_score * 100).toFixed(1)}%
                  </span>
                  <span className="text-gray-400 ml-2">
                    (σ = {(axis.std_dev * 100).toFixed(1)}%)
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-1">n = {axis.sample_size}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-400">
          <p>Data refreshes on page load. Last updated: {new Date().toLocaleString()}</p>
        </div>
      </div>
    </main>
  )
}
