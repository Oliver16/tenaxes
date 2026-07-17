import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'node:crypto'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { buildPersonalizedAnalysisInput } from '@/lib/ai-analysis/build-context'
import {
  clarificationAnswersBelongToParent, conservativeCachedAIAnalysisResponse, decideGeneration,
  disabledAIAnalysisResponse, publicAnalysisMeta, remainingGenerationAllowance
} from '@/lib/ai-analysis/api-policy'
import {
  AI_ANALYSIS_SCHEMA_VERSION, analysisPromptVersion, analysisTimeoutMs,
  generationAttemptLimit, generationLimit
} from '@/lib/ai-analysis/config'
import { validateAnalysisEvidence } from '@/lib/ai-analysis/evidence-validator'
import { hashAnalysisInput } from '@/lib/ai-analysis/hash'
import { loadAIAnalysisContext } from '@/lib/ai-analysis/load-ai-analysis-context'
import { personalizedAnalysisSchema } from '@/lib/ai-analysis/schema'
import {
  mergeClarificationAnswers, mergeGeneralContext, validateGenerateRequest, RequestValidationError
} from '@/lib/ai-analysis/request'
import {
  AnalysisProviderError, configuredModel, configuredProviderName, createAnalysisProvider, isAIAnalysisEnabled,
  summarizeProviderAttempts, type ProviderAttemptMetadata
} from '@/lib/ai-analysis/providers'
import type { GetAIAnalysisResponse, PersonalizedAnalysis } from '@/lib/ai-analysis/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type AnalysisRow = {
  id: string; session_id: string; parent_analysis_id: string | null; stage: 'provisional' | 'refined'
  status: 'pending' | 'completed' | 'failed'; provider: 'openai' | 'anthropic'; model: string
  prompt_version: string; schema_version: string; bank_version: string | null; input_hash: string
  context_json: unknown; deterministic_signals: unknown; analysis_json: unknown
  created_at: string; completed_at: string | null
}

export async function GET(_request: NextRequest, { params }: { params: { sessionId: string } }) {
  if (!isAIAnalysisEnabled()) return NextResponse.json(disabledAIAnalysisResponse())
  try {
    const source = await loadAIAnalysisContext(params.sessionId)
    if (!source) return NextResponse.json({ error: 'Result not found' }, { status: 404 })
    const config = currentConfig()
    const baseInput = buildPersonalizedAnalysisInput({
      resultAnalysis: source.resultAnalysis, evidence: source.evidence, promptVersion: config.promptVersion
    })
    const payload = await buildReadResponse(
      params.sessionId, source.resultAnalysis.bankVersion, config, undefined, resultFingerprint(baseInput)
    )
    return NextResponse.json(payload)
  } catch (error) {
    if (error instanceof AnalysisProviderError && error.code === 'configuration') {
      safeLog('configuration', params.sessionId, { success: false })
      return NextResponse.json({ error: 'AI analysis is temporarily unavailable' }, { status: 503 })
    }
    safeLog('read_failure', params.sessionId, { success: false })
    return NextResponse.json({ error: 'AI analysis is temporarily unavailable' }, { status: 503 })
  }
}

export async function POST(request: NextRequest, { params }: { params: { sessionId: string } }) {
  if (!isAIAnalysisEnabled()) return NextResponse.json({ error: 'AI analysis is unavailable' }, { status: 503 })
  const contentLength = Number(request.headers.get('content-length') || 0)
  if (contentLength > 20_000) return NextResponse.json({ error: 'Request body is too large' }, { status: 400 })

  let body: ReturnType<typeof validateGenerateRequest>
  try {
    const text = await request.text()
    if (text.length > 20_000) throw new RequestValidationError('Request body is too large')
    body = validateGenerateRequest(JSON.parse(text))
  } catch (error) {
    const message = error instanceof RequestValidationError ? error.message : 'Invalid JSON request'
    return NextResponse.json({ error: message }, { status: 400 })
  }

  let pendingId: string | null = null
  const providerAttempts: ProviderAttemptMetadata[] = []
  const started = Date.now()
  try {
    const config = currentConfig()
    const source = await loadAIAnalysisContext(params.sessionId)
    if (!source) return NextResponse.json({ error: 'Result not found' }, { status: 404 })

    let parent: AnalysisRow | null = null
    let priorAnalysis: PersonalizedAnalysis | null = null
    let inheritedContext: string | undefined
    let inheritedClarificationAnswers: Array<{ clarification_id: string; answer: string }> = []
    if (body.action === 'refine') {
      const parentResult = await (supabaseAdmin.from('result_ai_analyses') as any)
        .select('*').eq('id', body.parent_analysis_id).eq('session_id', params.sessionId)
        .eq('status', 'completed').single()
      parent = parentResult.data as AnalysisRow | null
      if (!parent || parentResult.error) return NextResponse.json({ error: 'Parent analysis not found' }, { status: 400 })
      const parsedParent = personalizedAnalysisSchema.safeParse(parent.analysis_json)
      if (!parsedParent.success) return NextResponse.json({ error: 'Parent analysis is unavailable' }, { status: 400 })
      priorAnalysis = parsedParent.data
      const clarificationIds = priorAnalysis.clarifying_questions.map(item => item.clarification_id)
      if (!clarificationAnswersBelongToParent(clarificationIds, body.clarification_answers)) {
        return NextResponse.json({ error: 'Clarification does not belong to the parent analysis' }, { status: 400 })
      }
      const stored = isObject(parent.context_json) ? parent.context_json : {}
      inheritedContext = typeof stored.general_context === 'string' ? stored.general_context : undefined
      inheritedClarificationAnswers = parseStoredClarificationAnswers(stored.clarification_answers)
    }

    const generalContext = body.action === 'refine'
      ? mergeGeneralContext(inheritedContext, body.general_context)
      : body.general_context
    const clarificationAnswers = body.action === 'refine'
      ? mergeClarificationAnswers(inheritedClarificationAnswers, body.clarification_answers)
      : []
    const input = buildPersonalizedAnalysisInput({
      resultAnalysis: source.resultAnalysis, evidence: source.evidence, promptVersion: config.promptVersion,
      generalContext, clarificationAnswers
    })
    const inputHash = hashAnalysisInput({
      input, provider: config.provider, model: config.model,
      prompt_version: config.promptVersion, schema_version: AI_ANALYSIS_SCHEMA_VERSION,
      stage: body.action === 'refine' ? 'refined' : 'provisional',
      // Analysis content affects the refinement prompt; the database row ID does not.
      prior_analysis: priorAnalysis
    })
    const currentResultFingerprint = resultFingerprint(input)

    const cached = await findExactCachedAnalysis(params.sessionId, inputHash, config)
    if (decideGeneration({
      has_cached_analysis: !!cached, has_pending_analysis: false, remaining_generations: 0
    }).kind === 'cached') {
      return NextResponse.json(await cachedReadPayload(
        cached!, params.sessionId, source.resultAnalysis.bankVersion,
        config, currentResultFingerprint, inputHash
      ), { status: 200 })
    }

    await expireAbandonedPending(params.sessionId)
    const pendingResult = await (supabaseAdmin.from('result_ai_analyses') as any)
      .select('id').eq('session_id', params.sessionId).eq('status', 'pending').limit(1)
    if (pendingResult.error) throw new Error('pending_read_failed')
    const hasPending = (pendingResult.data ?? []).length > 0
    if (decideGeneration({
      has_cached_analysis: false, has_pending_analysis: hasPending, remaining_generations: 1
    }).kind === 'pending') {
      return NextResponse.json({ error: 'Analysis generation is already pending' }, { status: 409 })
    }

    const remaining = await remainingGenerations(params.sessionId)
    if (decideGeneration({
      has_cached_analysis: false, has_pending_analysis: false, remaining_generations: remaining
    }).kind === 'capped') {
      return NextResponse.json({ error: 'Generation limit reached. Try again later.' }, { status: 429 })
    }

    const insert = await (supabaseAdmin.from('result_ai_analyses') as any).insert({
      session_id: params.sessionId, parent_analysis_id: parent?.id ?? null,
      user_id: source.resultAnalysis.result.user_id, stage: body.action === 'refine' ? 'refined' : 'provisional',
      status: 'pending', provider: config.provider, model: config.model,
      prompt_version: config.promptVersion, schema_version: AI_ANALYSIS_SCHEMA_VERSION,
      bank_version: source.resultAnalysis.bankVersion, input_hash: inputHash,
      context_json: { general_context: generalContext ?? null, clarification_answers: clarificationAnswers },
      deterministic_signals: {
        result_fingerprint: currentResultFingerprint,
        topic_signals: input.topic_signals, candidate_tensions: input.candidate_tensions
      }
    }).select('id').single()
    if (insert.error) {
      if (insert.error.code === '23505') return NextResponse.json({ error: 'Analysis generation is already pending' }, { status: 409 })
      throw new Error('pending_insert_failed')
    }
    pendingId = insert.data.id as string

    // The partial pending index serializes claims only while the earlier row
    // is pending. If this insert waited until an earlier claim completed or
    // failed, recheck under our newly acquired pending reservation before
    // creating a provider client. No later claim can pass while this row is
    // pending, so these reads close both duplicate-cache and stale-cap races.
    const supersedingCache = await findExactCachedAnalysis(params.sessionId, inputHash, config)
    if (supersedingCache) {
      await releaseUnusedPendingClaim(pendingId)
      pendingId = null
      return NextResponse.json(await cachedReadPayload(
        supersedingCache, params.sessionId, source.resultAnalysis.bankVersion,
        config, currentResultFingerprint, inputHash
      ), { status: 200 })
    }
    if (await remainingGenerations(params.sessionId) <= 0) {
      await releaseUnusedPendingClaim(pendingId)
      pendingId = null
      return NextResponse.json({ error: 'Generation limit reached. Try again later.' }, { status: 429 })
    }

    const provider = createAnalysisProvider()
    const generate = async (repair?: { invalidOutput: unknown; errors: string[] }) => {
      try {
        const result = await provider.generate(input, body.action === 'refine' ? 'refined' : 'provisional', {
          priorAnalysis, signal: AbortSignal.timeout(analysisTimeoutMs()), repair
        })
        providerAttempts.push(result)
        return result
      } catch (error) {
        if (error instanceof AnalysisProviderError && error.attempt) providerAttempts.push(error.attempt)
        throw error
      }
    }
    let generation
    let repairUsed = false
    try {
      generation = await generate()
    } catch (error) {
      if (!(error instanceof AnalysisProviderError) || error.code !== 'malformed_output') throw error
      repairUsed = true
      generation = await generate({ invalidOutput: error.invalidOutput ?? null, errors: [error.message] })
    }
    let evidenceCheck = validateAnalysisEvidence(generation.analysis, input)
    if (generation.analysis.analysis_stage !== (body.action === 'refine' ? 'refined' : 'provisional')) {
      evidenceCheck = { valid: false, errors: [...evidenceCheck.errors, 'analysis_stage does not match the requested stage'] }
    }
    if (!evidenceCheck.valid) {
      if (repairUsed) throw new AnalysisProviderError('malformed_output', 'Provider repair failed evidence validation')
      const firstInvalid = generation.analysis
      repairUsed = true
      generation = await generate({ invalidOutput: firstInvalid, errors: evidenceCheck.errors })
      evidenceCheck = validateAnalysisEvidence(generation.analysis, input)
      if (generation.analysis.analysis_stage !== (body.action === 'refine' ? 'refined' : 'provisional')) {
        evidenceCheck.errors.push('analysis_stage does not match the requested stage'); evidenceCheck.valid = false
      }
      if (!evidenceCheck.valid) throw new AnalysisProviderError('malformed_output', 'Provider repair failed evidence validation')
    }

    const completedAt = new Date().toISOString()
    const usage = summarizeProviderAttempts(providerAttempts)
    const update = await (supabaseAdmin.from('result_ai_analyses') as any).update({
      status: 'completed', analysis_json: generation.analysis, error_code: null, error_message: null,
      input_tokens: usage.inputTokens, output_tokens: usage.outputTokens,
      latency_ms: usage.latencyMs, provider_request_id: usage.providerRequestId,
      completed_at: completedAt
    }).eq('id', pendingId).eq('status', 'pending').select('id').maybeSingle()
    if (update.error || !update.data) throw new Error('completion_update_failed')

    safeLog('generation', params.sessionId, {
      success: true, provider: config.provider, model: config.model,
      latency_ms: Date.now() - started, input_hash_prefix: inputHash.slice(0, 12)
    })
    const response = await buildReadResponse(
      params.sessionId, source.resultAnalysis.bankVersion, config, pendingId, currentResultFingerprint
    )
    return NextResponse.json({ ...response, cached: false }, { status: 201 })
  } catch (error) {
    const code = error instanceof AnalysisProviderError ? error.code : 'internal_failure'
    if (pendingId) {
      const usage = providerAttempts.length > 0 ? summarizeProviderAttempts(providerAttempts) : undefined
      await markFailed(pendingId, code, usage)
    }
    safeLog(code, params.sessionId, { success: false, latency_ms: Date.now() - started })
    if (error instanceof RequestValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    if (error instanceof AnalysisProviderError && error.code === 'configuration') {
      return NextResponse.json({ error: 'AI analysis is temporarily unavailable' }, { status: 503 })
    }
    if (error instanceof AnalysisProviderError && error.code === 'malformed_output') {
      return NextResponse.json({ error: 'The AI provider returned an analysis that could not be verified' }, { status: 502 })
    }
    return NextResponse.json({ error: 'AI analysis generation failed. You can retry.' }, { status: 503 })
  }
}

function currentConfig() {
  return { provider: configuredProviderName(), model: configuredModel(), promptVersion: analysisPromptVersion() }
}

async function findExactCachedAnalysis(
  sessionId: string,
  inputHash: string,
  config: ReturnType<typeof currentConfig>
): Promise<AnalysisRow | null> {
  const result = await (supabaseAdmin.from('result_ai_analyses') as any)
    .select('*').eq('session_id', sessionId).eq('input_hash', inputHash)
    .eq('provider', config.provider).eq('model', config.model).eq('prompt_version', config.promptVersion)
    .eq('schema_version', AI_ANALYSIS_SCHEMA_VERSION).eq('status', 'completed').maybeSingle()
  if (result.error) throw new Error('cache_read_failed')
  return result.data as AnalysisRow | null
}

async function cachedReadPayload(
  cached: AnalysisRow,
  sessionId: string,
  bankVersion: string | null,
  config: ReturnType<typeof currentConfig>,
  fingerprint: string,
  inputHash: string
) {
  const parsedCached = personalizedAnalysisSchema.safeParse(cached.analysis_json)
  if (!parsedCached.success) throw new Error('cached_analysis_invalid')
  try {
    const response = await buildReadResponse(sessionId, bankVersion, config, cached.id, fingerprint)
    return { ...response, cached: true }
  } catch {
    safeLog('cached_status_read_failure', sessionId, {
      success: true, input_hash_prefix: inputHash.slice(0, 12)
    })
    return { ...conservativeCachedAIAnalysisResponse(cached, parsedCached.data), cached: true }
  }
}

async function buildReadResponse(
  sessionId: string, bankVersion: string | null,
  config: ReturnType<typeof currentConfig>, preferredId?: string, fingerprint?: string
): Promise<GetAIAnalysisResponse> {
  const configuredQuery = () => {
    let query = (supabaseAdmin.from('result_ai_analyses') as any)
      .select('*').eq('session_id', sessionId).eq('status', 'completed')
      .eq('provider', config.provider).eq('model', config.model).eq('prompt_version', config.promptVersion)
      .eq('schema_version', AI_ANALYSIS_SCHEMA_VERSION)
    query = bankVersion === null ? query.is('bank_version', null) : query.eq('bank_version', bankVersion)
    if (fingerprint) query = query.contains('deterministic_signals', { result_fingerprint: fingerprint })
    return query
  }
  const currentQuery = configuredQuery()
  const currentResult = await currentQuery.order('created_at', { ascending: false }).limit(10)
  if (currentResult.error) throw new Error('analysis_read_failed')
  const firstProvisionalResult = await configuredQuery()
    .eq('stage', 'provisional').order('created_at', { ascending: true }).limit(1)
  if (firstProvisionalResult.error) throw new Error('analysis_history_read_failed')
  const currentRows = [...((currentResult.data ?? []) as AnalysisRow[])]
  for (const row of (firstProvisionalResult.data ?? []) as AnalysisRow[]) {
    if (!currentRows.some(current => current.id === row.id)) currentRows.push(row)
  }
  if (preferredId && !currentRows.some(row => row.id === preferredId)) {
    const preferredResult = await configuredQuery().eq('id', preferredId).maybeSingle()
    if (preferredResult.error) throw new Error('preferred_analysis_read_failed')
    if (preferredResult.data) currentRows.push(preferredResult.data as AnalysisRow)
  }
  await expireAbandonedPending(sessionId)
  const [anyResult, firstAnyProvisionalResult, pendingResult, remaining] = await Promise.all([
    (supabaseAdmin.from('result_ai_analyses') as any)
      .select('*').eq('session_id', sessionId).eq('status', 'completed')
      .order('created_at', { ascending: false }).limit(10),
    (supabaseAdmin.from('result_ai_analyses') as any)
      .select('*').eq('session_id', sessionId).eq('status', 'completed').eq('stage', 'provisional')
      .order('created_at', { ascending: true }).limit(1),
    (supabaseAdmin.from('result_ai_analyses') as any)
      .select('id').eq('session_id', sessionId).eq('status', 'pending').limit(1),
    remainingGenerations(sessionId)
  ])
  if (anyResult.error || firstAnyProvisionalResult.error || pendingResult.error) {
    throw new Error('analysis_status_read_failed')
  }
  let versionRows = currentRows
  let selected: AnalysisRow | null =
    (preferredId ? currentRows.find(row => row.id === preferredId) : null) ?? currentRows[0] ?? null
  const stale = currentRows.length === 0 && (anyResult.data ?? []).length > 0
  if (!selected && stale) {
    versionRows = [...((anyResult.data ?? []) as AnalysisRow[])]
    for (const row of (firstAnyProvisionalResult.data ?? []) as AnalysisRow[]) {
      if (!versionRows.some(current => current.id === row.id)) versionRows.push(row)
    }
    selected = versionRows.find(row => personalizedAnalysisSchema.safeParse(row.analysis_json).success) ?? null
  }
  const versions = versionRows.flatMap(row => {
    const parsed = personalizedAnalysisSchema.safeParse(row.analysis_json)
    return parsed.success ? [{ analysis: parsed.data, record: publicAnalysisMeta(row) }] : []
  })
  const parsedSelected = selected ? personalizedAnalysisSchema.safeParse(selected.analysis_json) : null
  return {
    enabled: true,
    analysis: parsedSelected?.success ? parsedSelected.data : null,
    record: selected && parsedSelected?.success ? publicAnalysisMeta(selected) : null,
    versions,
    stale,
    can_generate: remaining > 0 && (pendingResult.data ?? []).length === 0,
    remaining_generations: remaining
  }
}

function resultFingerprint(input: ReturnType<typeof buildPersonalizedAnalysisInput>): string {
  return hashAnalysisInput({ ...input, user_context: null })
}

async function remainingGenerations(sessionId: string): Promise<number> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const [completedResult, attemptResult] = await Promise.all([
    (supabaseAdmin.from('result_ai_analyses') as any)
      .select('id', { count: 'exact', head: true }).eq('session_id', sessionId)
      .eq('status', 'completed').gte('completed_at', since),
    (supabaseAdmin.from('result_ai_analyses') as any)
      .select('id', { count: 'exact', head: true }).eq('session_id', sessionId)
      .in('status', ['completed', 'failed']).gte('created_at', since)
  ])
  if (completedResult.error || attemptResult.error) throw new Error('generation_limit_read_failed')
  return remainingGenerationAllowance(
    completedResult.count ?? 0, generationLimit(),
    attemptResult.count ?? 0, generationAttemptLimit()
  )
}

async function expireAbandonedPending(sessionId: string) {
  const cutoff = new Date(Date.now() - Math.max(analysisTimeoutMs() * 3, 5 * 60 * 1000)).toISOString()
  const result = await (supabaseAdmin.from('result_ai_analyses') as any).update({
    status: 'failed', error_code: 'abandoned', error_message: 'Generation did not complete'
  }).eq('session_id', sessionId).eq('status', 'pending').lt('created_at', cutoff)
  if (result.error) throw new Error('pending_expiration_failed')
}

async function markFailed(id: string, code: string, usage?: ProviderAttemptMetadata) {
  const fields: Record<string, unknown> = {
    status: 'failed', error_code: code, error_message: 'AI analysis generation failed'
  }
  if (usage) {
    fields.input_tokens = usage.inputTokens
    fields.output_tokens = usage.outputTokens
    fields.latency_ms = usage.latencyMs
    fields.provider_request_id = usage.providerRequestId
  }
  await (supabaseAdmin.from('result_ai_analyses') as any).update(fields)
    .eq('id', id).eq('status', 'pending')
}

async function releaseUnusedPendingClaim(id: string) {
  const result = await (supabaseAdmin.from('result_ai_analyses') as any)
    .delete().eq('id', id).eq('status', 'pending')
  if (result.error) throw new Error('pending_release_failed')
}

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function parseStoredClarificationAnswers(value: unknown): Array<{ clarification_id: string; answer: string }> {
  if (!Array.isArray(value)) return []
  return value.flatMap(item => isObject(item) &&
    typeof item.clarification_id === 'string' && typeof item.answer === 'string'
    ? [{ clarification_id: item.clarification_id, answer: item.answer }]
    : [])
}

function safeLog(category: string, sessionId: string, details: Record<string, unknown>) {
  const session_hash = createHash('sha256').update(sessionId).digest('hex').slice(0, 12)
  console.info('ai_analysis', { category, session_hash, ...details })
}
