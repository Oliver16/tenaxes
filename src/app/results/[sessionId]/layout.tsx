import Link from 'next/link'
import { loadResultAnalysis } from '@/lib/results/load-result-analysis'
import { isSampleSession } from '@/lib/results/sample-result'
import { ResultsSubnav } from '@/components/results/ResultsSubnav'
import { ResultsActions } from '@/components/ResultsActions'

export default async function ResultsLayout({
  children,
  params
}: {
  children: React.ReactNode
  params: { sessionId: string }
}) {
  const analysis = await loadResultAnalysis(params.sessionId)
  const isSample = isSampleSession(params.sessionId)
  const aiAnalysisEnabled = !isSample && process.env.AI_ANALYSIS_ENABLED === 'true'

  if (!analysis) {
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

  return (
    <main className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800 text-center sm:text-left">
              {isSample ? 'Sample Polyaxis Profile' : 'Your Polyaxis Profile'}
            </h1>
            {isSample ? (
              <Link
                href="/survey"
                className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
              >
                Take your own evaluation <span className="ml-1" aria-hidden="true">&rarr;</span>
              </Link>
            ) : (
              <ResultsActions
                sessionId={params.sessionId}
                coreAxes={analysis.coreAxes}
                topFlavor={analysis.topFlavors[0] || null}
                compact
              />
            )}
          </div>
          {isSample && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
              <span className="font-semibold">Fictional example.</span>{' '}
              This profile demonstrates the real result experience and does not describe a real person.
            </div>
          )}
          <ResultsSubnav
            sessionId={params.sessionId}
            showAIAnalysis={aiAnalysisEnabled}
          />
        </header>

        {children}
      </div>
    </main>
  )
}
