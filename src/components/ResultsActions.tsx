'use client'

import Link from 'next/link'
import type { AxisScore, FlavorMatch } from '@/lib/supabase'

type Props = {
  sessionId: string
  coreAxes: AxisScore[]
  topFlavor: FlavorMatch | null
}

export function ResultsActions({ sessionId, coreAxes, topFlavor }: Props) {
  const handleCopy = () => {
    const heading = 'My TenAxes Results:'
    const axisLines = coreAxes
      .map(
        a => `${a.name}: ${a.pole_label} (${a.score > 0 ? '+' : ''}${(a.score * 100).toFixed(0)}%)`
      )
      .join('\n')
    const topMatch = `Top Match: ${topFlavor?.name || 'N/A'}`
    const surveyLink = `Take the survey: ${window.location.origin}`

    const text = [heading, axisLines, '', topMatch, '', surveyLink].join('\n')
    navigator.clipboard.writeText(text)
    alert('Results copied to clipboard!')
  }

  return (
    <div className="flex flex-wrap gap-4 justify-center">
      <Link
        href="/survey"
        className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
      >
        Take Again
      </Link>
      <button
        onClick={handleCopy}
        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
      >
        Copy Results
      </button>
      <Link
        href="/"
        className="px-6 py-3 border border-gray-300 hover:border-gray-400 text-gray-700 rounded-lg font-medium transition-colors"
      >
        Home
      </Link>
    </div>
  )
}

export function ShareUrl({ sessionId }: { sessionId: string }) {
  const url = typeof window !== 'undefined'
    ? window.location.href
    : `/results/${sessionId}`

  return (
    <div className="mt-8 text-center">
      <p className="text-sm text-gray-500 mb-2">Share your results:</p>
      <code className="text-xs bg-gray-200 px-3 py-2 rounded text-gray-700 break-all block max-w-md mx-auto">
        {url}
      </code>
    </div>
  )
}
