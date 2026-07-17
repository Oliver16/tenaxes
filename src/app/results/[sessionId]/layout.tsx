import { loadResultAnalysis } from '@/lib/results/load-result-analysis'
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
              Your Polyaxis Profile
            </h1>
            <ResultsActions
              sessionId={params.sessionId}
              coreAxes={analysis.coreAxes}
              topFlavor={analysis.topFlavors[0] || null}
              compact
            />
          </div>
          <ResultsSubnav sessionId={params.sessionId} />
        </header>

        {children}
      </div>
    </main>
  )
}
