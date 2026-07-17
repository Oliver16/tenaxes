import 'server-only'
import { loadResultAnalysis, type ResultAnalysis } from '@/lib/results/load-result-analysis'
import { isSampleSession } from '@/lib/results/sample-result'
import { supabaseAdmin } from '@/lib/supabase-admin'
import type { Database } from '@/lib/database.types'
import type { AIQuestionEvidence } from './types'

type Metadata = Database['public']['Tables']['question_metadata']['Row']

const responseLabels: Record<string, AIQuestionEvidence['response_label']> = {
  '-2': 'strongly_disagree', '-1': 'disagree', '0': 'neutral_balanced',
  '1': 'agree', '2': 'strongly_agree', null: 'not_sure'
}

export async function loadAIAnalysisContext(sessionId: string): Promise<{
  resultAnalysis: ResultAnalysis
  evidence: AIQuestionEvidence[]
} | null> {
  if (isSampleSession(sessionId)) return null

  const resultAnalysis = await loadResultAnalysis(sessionId)
  if (!resultAnalysis) return null
  const questionIds = resultAnalysis.questions.map(q => q.id)
  let metadata: Metadata[] = []
  if (questionIds.length > 0) {
    let query = supabaseAdmin.from('question_metadata').select('*').in('question_id', questionIds)
    if (resultAnalysis.bankVersion) query = query.eq('bank_version', resultAnalysis.bankVersion)
    const response = await query
    if (!response.error) metadata = (response.data ?? []) as Metadata[]
  }
  const metadataById = new Map(metadata.map(m => [m.question_id, m]))
  const axesById = new Map(resultAnalysis.axes.map(a => [a.id, a]))

  const evidence: AIQuestionEvidence[] = resultAnalysis.questions
    .filter(q => Object.prototype.hasOwnProperty.call(resultAnalysis.responses, q.id))
    .map(q => {
      const primary = q.question_axis_links.find(link => link.role === 'primary') ?? {
        axis_id: q.axis_id, axis_key: q.key as -1 | 1, weight: q.weight
      }
      const response = resultAnalysis.responses[q.id] as AIQuestionEvidence['response']
      const signed = typeof response === 'number' ? response * primary.axis_key : null
      const meta = metadataById.get(q.id)
      return {
        question_id: q.id,
        display_order: q.display_order,
        bank_version: q.bank_version,
        text: q.text,
        question_type: q.question_type === 'conceptual' ? 'conceptual' : 'applied',
        response,
        response_label: responseLabels[String(response)],
        primary_axis_id: primary.axis_id,
        primary_axis_name: axesById.get(primary.axis_id)?.name ?? primary.axis_id,
        primary_axis_key: primary.axis_key as -1 | 1,
        primary_weight: primary.weight,
        contribution_direction: signed === null ? 'unscored' : signed > 0 ? 'positive_pole' : signed < 0 ? 'negative_pole' : 'neutral',
        contribution_strength: signed === null ? 0 : Math.abs(response as number) / 2 * primary.weight,
        tradeoff_links: q.question_axis_links
          .filter(link => link.role === 'tradeoff' || link.role === 'collision')
          .map(link => ({ axis_id: link.axis_id, axis_name: axesById.get(link.axis_id)?.name ?? link.axis_id, axis_key: link.axis_key })),
        policy_domain: meta?.policy_domain ?? null,
        latent_conflict: meta?.latent_conflict ?? null,
        actor_level: meta?.actor_level ?? null,
        policy_instrument: meta?.policy_instrument ?? null,
        scenario_conditions: meta?.scenario_conditions ?? null,
        item_family: meta?.item_family ?? null,
        collision_pair: meta?.collision_pair ?? null
      }
    })

  return { resultAnalysis, evidence }
}
