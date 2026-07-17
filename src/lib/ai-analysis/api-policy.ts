import type { AnalysisRecordMeta, GetAIAnalysisResponse, PersonalizedAnalysis } from './types'

export type GenerationGate =
  | { kind: 'cached'; provider_call_required: false }
  | { kind: 'pending'; provider_call_required: false }
  | { kind: 'capped'; provider_call_required: false }
  | { kind: 'generate'; provider_call_required: true }

export function decideGeneration(input: {
  has_cached_analysis: boolean
  has_pending_analysis: boolean
  remaining_generations: number
}): GenerationGate {
  if (input.has_cached_analysis) return { kind: 'cached', provider_call_required: false }
  if (input.has_pending_analysis) return { kind: 'pending', provider_call_required: false }
  if (input.remaining_generations <= 0) return { kind: 'capped', provider_call_required: false }
  return { kind: 'generate', provider_call_required: true }
}

export function remainingGenerationsFromCount(completed: number, limit: number): number {
  return Math.max(0, limit - Math.max(0, completed))
}

export function remainingGenerationAllowance(
  completed: number,
  completedLimit: number,
  attempts: number,
  attemptLimit: number
): number {
  return Math.min(
    remainingGenerationsFromCount(completed, completedLimit),
    remainingGenerationsFromCount(attempts, attemptLimit)
  )
}

export function clarificationAnswersBelongToParent(
  allowedClarificationIds: Iterable<string>,
  answers: ReadonlyArray<{ clarification_id: string }>
): boolean {
  const allowed = new Set(allowedClarificationIds)
  return answers.every(answer => allowed.has(answer.clarification_id))
}

export function publicAnalysisMeta(row: {
  id: string
  stage: AnalysisRecordMeta['stage']
  provider: AnalysisRecordMeta['provider']
  model: string
  prompt_version: string
  schema_version: string
  bank_version: string | null
  created_at: string
  completed_at: string | null
}): AnalysisRecordMeta {
  return {
    id: row.id,
    stage: row.stage,
    provider: row.provider,
    model: row.model,
    prompt_version: row.prompt_version,
    schema_version: row.schema_version,
    bank_version: row.bank_version,
    created_at: row.created_at,
    completed_at: row.completed_at
  }
}

export function disabledAIAnalysisResponse(): GetAIAnalysisResponse {
  return {
    enabled: false,
    analysis: null,
    record: null,
    stale: false,
    can_generate: false,
    remaining_generations: 0
  }
}

export function conservativeCachedAIAnalysisResponse(
  row: Parameters<typeof publicAnalysisMeta>[0],
  analysis: PersonalizedAnalysis
): GetAIAnalysisResponse {
  const record = publicAnalysisMeta(row)
  return {
    enabled: true,
    analysis,
    record,
    versions: [{ analysis, record }],
    stale: false,
    can_generate: false,
    remaining_generations: 0
  }
}
