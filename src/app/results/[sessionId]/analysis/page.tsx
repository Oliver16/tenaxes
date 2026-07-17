import { notFound } from 'next/navigation'
import { AIAnalysisClient } from '@/components/results/ai/AIAnalysisClient'
import { loadAIAnalysisContext } from '@/lib/ai-analysis/load-ai-analysis-context'
import { loadResultAnalysis } from '@/lib/results/load-result-analysis'
import { isSampleSession } from '@/lib/results/sample-result'
import type { AIQuestionDisplayEvidence } from '@/lib/ai-analysis/types'
import { contextMaxChars } from '@/lib/ai-analysis/config'

export const dynamic = 'force-dynamic'

export default async function AIAnalysisPage({
  params
}: {
  params: { sessionId: string }
}) {
  if (isSampleSession(params.sessionId)) notFound()

  const result = await loadResultAnalysis(params.sessionId)
  if (!result) notFound()

  const enabled = process.env.AI_ANALYSIS_ENABLED === 'true'
  let evidence: AIQuestionDisplayEvidence[] = []

  // Evidence is display-only and intentionally excludes user context, provider
  // payloads, and the wider deterministic signal bundle. If server analytics
  // configuration is unavailable, the report still renders with ID links.
  if (enabled) {
    try {
      evidence = ((await loadAIAnalysisContext(params.sessionId))?.evidence ?? []).map(item => ({
        question_id: item.question_id,
        display_order: item.display_order,
        text: item.text,
        response_label: item.response_label,
        primary_axis_id: item.primary_axis_id,
        primary_axis_name: item.primary_axis_name,
        contribution_direction: item.contribution_direction,
        policy_domain: item.policy_domain
      }))
    } catch {
      evidence = []
    }
  }

  return (
    <AIAnalysisClient
      sessionId={params.sessionId}
      enabled={enabled}
      evidence={evidence}
      contextMaxLength={contextMaxChars()}
    />
  )
}
