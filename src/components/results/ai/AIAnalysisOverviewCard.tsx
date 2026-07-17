'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import type { GetAIAnalysisResponse } from '@/lib/ai-analysis/types'

const COHERENCE_LABELS: Record<
  NonNullable<GetAIAnalysisResponse['analysis']>['overall_assessment']['ideological_coherence'],
  string
> = {
  high: 'High coherence',
  mostly_coherent: 'Mostly coherent',
  mixed: 'Mixed coherence',
  significant_unresolved_tensions: 'Significant unresolved tensions',
  insufficient_evidence: 'Not enough evidence'
}

const SIGNIFICANT_TENSIONS = new Set([
  'unresolved_inconsistency',
  'selective_application',
  'possible_hypocrisy',
  'likely_hypocrisy',
  'irrational_tension'
])

const KNOWLEDGE_OR_SALIENCE = new Set([
  'apparent_low_salience',
  'possible_knowledge_gap'
])

export function AIAnalysisOverviewCard({ sessionId }: { sessionId: string }) {
  const [payload, setPayload] = useState<GetAIAnalysisResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [unavailable, setUnavailable] = useState(false)
  const href = `/results/${sessionId}/analysis`

  useEffect(() => {
    const controller = new AbortController()

    async function load() {
      try {
        const response = await fetch(`/api/results/${sessionId}/ai-analysis`, {
          cache: 'no-store',
          signal: controller.signal
        })
        if (!response.ok) throw new Error('unavailable')
        const next = await response.json() as GetAIAnalysisResponse
        setPayload(next)
        setUnavailable(!next.enabled)
      } catch (error) {
        if ((error as Error).name !== 'AbortError') setUnavailable(true)
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    void load()
    return () => controller.abort()
  }, [sessionId])

  if (loading) {
    return (
      <section className="rounded-xl border border-violet-200 bg-gradient-to-br from-violet-50 to-white p-6 shadow-sm" aria-busy="true">
        <p className="text-sm font-semibold text-violet-900">Personalized AI analysis</p>
        <p className="mt-2 text-sm text-violet-700">Checking for a saved analysis&hellip;</p>
      </section>
    )
  }

  if (unavailable) {
    return (
      <section className="rounded-xl border border-gray-200 bg-gray-50 p-6">
        <p className="text-sm font-semibold text-gray-700">Personalized AI analysis</p>
        <p className="mt-1 text-sm text-gray-500">AI analysis is temporarily unavailable. Your verified results are unaffected.</p>
      </section>
    )
  }

  if (payload?.stale) {
    return (
      <section className="rounded-xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">Saved AI analysis</p>
        <h2 className="mt-1 text-lg font-bold text-amber-950">A previous analysis is out of date</h2>
        <p className="mt-2 text-sm leading-relaxed text-amber-900">
          Its method or verified source evidence no longer matches the current analysis configuration, so this overview does not present its findings as current.
        </p>
        <Link href={href} className="mt-4 inline-block text-sm font-semibold text-amber-950 underline decoration-amber-400 underline-offset-2">
          Review the saved report and refresh options &rarr;
        </Link>
      </section>
    )
  }

  const analysis = payload?.analysis
  if (!analysis) {
    const pending = !payload?.can_generate && (payload?.remaining_generations ?? 0) > 0
    const capped = !payload?.can_generate && (payload?.remaining_generations ?? 0) === 0
    return (
      <section className="rounded-xl border border-violet-200 bg-gradient-to-br from-violet-50 via-white to-blue-50 p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">Optional</p>
            <h2 className="mt-1 text-lg font-bold text-gray-900">Personalized AI analysis</h2>
            <p className="mt-1 text-sm leading-relaxed text-gray-600">
              {pending
                ? 'An analysis request is already being generated and evidence-validated for this result.'
                : capped
                  ? 'The rolling generation allowance is currently exhausted; saved versions remain available.'
                  : 'Get a candid, evidence-linked reading of your strongest commitments, possible blind spots, knowledge gaps, and internal tensions.'}
            </p>
          </div>
          <Link
            href={href}
            className="inline-flex shrink-0 items-center justify-center rounded-lg bg-violet-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-violet-800 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2"
          >
            {pending ? 'View generation status' : capped ? 'View analysis status' : 'Generate analysis'}
          </Link>
        </div>
      </section>
    )
  }

  const tensionCount = analysis.tensions.filter(tension =>
    SIGNIFICANT_TENSIONS.has(tension.classification)
  ).length
  const knowledgeCount = analysis.engagement_and_knowledge.topics.filter(topic =>
    KNOWLEDGE_OR_SALIENCE.has(topic.classification)
  ).length

  return (
    <section className="rounded-xl border border-violet-200 bg-gradient-to-br from-violet-50 via-white to-blue-50 p-6 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">AI-assisted interpretation</p>
      <h2 className="mt-1 text-xl font-bold text-gray-900">{analysis.headline}</h2>
      <div className="mt-3 flex flex-wrap gap-2 text-sm">
        <span className="rounded-full border border-violet-200 bg-white px-3 py-1 font-medium text-violet-900">
          {COHERENCE_LABELS[analysis.overall_assessment.ideological_coherence]}
        </span>
        <span className="rounded-full border border-gray-200 bg-white px-3 py-1 text-gray-700">
          {tensionCount} significant tension{tensionCount === 1 ? '' : 's'}
        </span>
        <span className="rounded-full border border-gray-200 bg-white px-3 py-1 text-gray-700">
          {knowledgeCount} knowledge or low-salience area{knowledgeCount === 1 ? '' : 's'}
        </span>
      </div>
      <Link href={href} className="mt-4 inline-block text-sm font-semibold text-violet-700 hover:text-violet-900">
        Read full analysis &rarr;
      </Link>
    </section>
  )
}
