'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AIAnalysisConsent } from './AIAnalysisConsent'
import { DEEPER_ANALYSIS_LABEL } from './copy'
import { AIAnalysisReport } from './AIAnalysisReport'
import { AIAnalysisStatus } from './AIAnalysisStatus'
import { aiAnalysisStatusMessage, analysisVersions, shouldRefreshGenerationStatus } from './status'
import type { AIQuestionDisplayEvidence, GetAIAnalysisResponse } from '@/lib/ai-analysis/types'

type GenerateRequest = {
  action: 'generate'
  general_context?: string
}

type RefineRequest = {
  action: 'refine'
  parent_analysis_id: string
  general_context?: string
  clarification_answers: Array<{ clarification_id: string; answer: string }>
}

type AnalysisRequest = GenerateRequest | RefineRequest
type PublicResponse = GetAIAnalysisResponse & { cached?: boolean }
type LoadMode = 'loading' | 'ready' | 'unavailable' | 'error'

export function AIAnalysisClient({
  sessionId,
  enabled,
  evidence,
  contextMaxLength
}: {
  sessionId: string
  enabled: boolean
  evidence: AIQuestionDisplayEvidence[]
  contextMaxLength: number
}) {
  const [payload, setPayload] = useState<GetAIAnalysisResponse | null>(null)
  const [mode, setMode] = useState<LoadMode>(enabled ? 'loading' : 'ready')
  const [operation, setOperation] = useState<'generate' | 'refine' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [lastRequest, setLastRequest] = useState<AnalysisRequest | null>(null)
  const [selectedRecordId, setSelectedRecordId] = useState('')
  const [cached, setCached] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const reportHeadingRef = useRef<HTMLHeadingElement>(null)

  const endpoint = `/api/results/${encodeURIComponent(sessionId)}/ai-analysis`

  const load = useCallback(async (signal?: AbortSignal) => {
    setMode('loading')
    setError(null)
    try {
      const response = await fetch(endpoint, { cache: 'no-store', signal })
      if (!response.ok) {
        if (response.status === 503) setMode('unavailable')
        throw new Error(aiAnalysisStatusMessage(response.status))
      }
      const next = await response.json() as PublicResponse
      if (!next.enabled) {
        setPayload(next)
        setMode('unavailable')
        return
      }
      setPayload(next)
      setSelectedRecordId(current => current || next.record?.id || '')
      setCached(Boolean(next.analysis))
      setMode('ready')
    } catch (caught) {
      if ((caught as Error).name === 'AbortError') return
      setError((caught as Error).message)
      setMode(current => current === 'unavailable' ? current : 'error')
    }
  }, [endpoint])

  useEffect(() => {
    if (!enabled) return
    const controller = new AbortController()
    void load(controller.signal)
    return () => controller.abort()
  }, [enabled, load])

  const generationPending = !!payload && !payload.can_generate && payload.remaining_generations > 0

  useEffect(() => {
    if (!generationPending || mode === 'unavailable') return
    const timer = window.setTimeout(() => void load(), 4000)
    return () => window.clearTimeout(timer)
  }, [generationPending, load, mode])

  const submit = useCallback(async (request: AnalysisRequest) => {
    setLastRequest(request)
    setOperation(request.action)
    setError(null)
    setSuccessMessage(null)
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      })
      if (!response.ok) {
        const message = aiAnalysisStatusMessage(response.status)
        if (shouldRefreshGenerationStatus(response.status)) {
          await load()
        }
        if (response.status === 409 || response.status === 429) {
          setLastRequest(null)
        }
        throw new Error(message)
      }

      const next = await response.json() as PublicResponse
      if (!next.enabled || !next.analysis || !next.record) {
        throw new Error(`${DEEPER_ANALYSIS_LABEL} is temporarily unavailable. Your verified Polyaxis results are unaffected.`)
      }
      setPayload(next)
      setSelectedRecordId(next.record.id)
      setCached(next.cached === true || response.status === 200)
      setMode('ready')
      setLastRequest(null)
      setSuccessMessage(request.action === 'refine'
        ? 'Your refined analysis is ready.'
        : 'Your updated analysis is ready.')
    } catch (caught) {
      setError((caught as Error).message)
    } finally {
      setOperation(null)
    }
  }, [endpoint, load])

  useEffect(() => {
    if (!successMessage) return
    reportHeadingRef.current?.focus()
  }, [successMessage])

  const versions = useMemo(() => analysisVersions(payload), [payload])
  const activeVersion = versions.find(version => version.record.id === selectedRecordId)
    ?? versions[0]

  if (!enabled) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{DEEPER_ANALYSIS_LABEL}</h2>
          <p className="mt-1 text-sm text-gray-500">Optional, candid analysis grounded in your verified result.</p>
        </div>
        <AIAnalysisStatus kind="disabled" title={`${DEEPER_ANALYSIS_LABEL} is not enabled`}>
          The rest of your result remains available. No result data has been sent to an AI provider.
        </AIAnalysisStatus>
      </div>
    )
  }

  if (mode === 'loading' && !payload) {
    return (
      <AIAnalysisStatus kind="loading" title={`Loading ${DEEPER_ANALYSIS_LABEL}`}>
        Checking for a matching saved version. Reloading never starts a new provider request.
      </AIAnalysisStatus>
    )
  }

  if (mode === 'unavailable' && !payload?.analysis) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{DEEPER_ANALYSIS_LABEL}</h2>
          <p className="mt-1 text-sm text-gray-500">Optional, candid analysis grounded in your verified result.</p>
        </div>
        <AIAnalysisStatus
          kind="unavailable"
          title={`${DEEPER_ANALYSIS_LABEL} is temporarily unavailable`}
          action={(
            <button
              type="button"
              onClick={() => void load()}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Check again
            </button>
          )}
        >
          The provider is unavailable or not configured. Your deterministic scores and existing result pages are unaffected.
        </AIAnalysisStatus>
      </div>
    )
  }

  if (mode === 'error' && !payload?.analysis) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{DEEPER_ANALYSIS_LABEL}</h2>
          <p className="mt-1 text-sm text-gray-500">Optional, candid analysis grounded in your verified result.</p>
        </div>
        <AIAnalysisStatus
          kind="error"
          title="The analysis could not be loaded"
          action={(
            <button
              type="button"
              onClick={() => void load()}
              className="rounded-lg border border-red-300 bg-white px-3 py-2 text-sm font-semibold text-red-900 hover:bg-red-50"
            >
              Retry
            </button>
          )}
        >
          {error}
        </AIAnalysisStatus>
      </div>
    )
  }

  if (operation === 'generate' && !payload?.analysis) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{DEEPER_ANALYSIS_LABEL}</h2>
          <p className="mt-1 text-sm text-gray-500">Your Polyaxis scores remain fixed while the provider interprets the evidence.</p>
        </div>
        <AIAnalysisStatus kind="generating" title="Generating your candid analysis">
          The response will be schema-checked and every cited axis, question, and collision pair will be validated before it is shown.
        </AIAnalysisStatus>
      </div>
    )
  }

  if (!payload?.analysis || !payload.record) {
    const canGenerate = payload?.can_generate ?? false
    const remaining = payload?.remaining_generations ?? 0
    return (
      <div className="space-y-4">
        {payload?.stale && (
          <AIAnalysisStatus kind="stale" title="A previous analysis is stale">
            Its prompt, schema, model, or source evidence no longer matches the configured analysis method. Generate a current version to review it safely.
          </AIAnalysisStatus>
        )}
        {error && (
          <AIAnalysisStatus
            kind="error"
            title="Generation failed"
            action={lastRequest ? (
              <button
                type="button"
                onClick={() => void submit(lastRequest)}
                className="rounded-lg border border-red-300 bg-white px-3 py-2 text-sm font-semibold text-red-900 hover:bg-red-50"
              >
                Retry generation
              </button>
            ) : undefined}
          >
            {error}
          </AIAnalysisStatus>
        )}
        {!canGenerate && remaining > 0 && (
          <AIAnalysisStatus kind="generating" title="Analysis generation is already pending">
            Another request is being validated for this result. This page will check again automatically; no duplicate provider request will be started.
          </AIAnalysisStatus>
        )}
        {!canGenerate && remaining === 0 && (
          <AIAnalysisStatus kind="limit" title="Generation limit reached">
            No new analysis can be generated in the current rolling window. Reloading or reading a saved analysis is never charged.
          </AIAnalysisStatus>
        )}
        {canGenerate && (
          <AIAnalysisConsent
            purpose={payload?.stale ? 'refresh' : 'initial'}
            submitting={operation === 'generate'}
            canGenerate={canGenerate}
            remainingGenerations={remaining}
            contextMaxLength={contextMaxLength}
            onGenerate={generalContext => submit({
              action: 'generate',
              ...(generalContext ? { general_context: generalContext } : {})
            })}
          />
        )}
      </div>
    )
  }

  if (!activeVersion) return null

  const { analysis, record } = activeVersion
  const canGenerate = payload.can_generate

  return (
    <div className="space-y-4">
      {payload.stale && (
        <AIAnalysisStatus kind="stale" title="This analysis is stale">
          The prompt, schema, model, or verified input has changed since this version was generated. You can still inspect it, but a new version is recommended.
        </AIAnalysisStatus>
      )}

      {payload.stale && canGenerate && (
        <AIAnalysisConsent
          key={`refresh-${record.id}`}
          purpose="refresh"
          submitting={operation === 'generate'}
          canGenerate={canGenerate}
          remainingGenerations={payload.remaining_generations}
          contextMaxLength={contextMaxLength}
          onGenerate={generalContext => submit({
            action: 'generate',
            ...(generalContext ? { general_context: generalContext } : {})
          })}
        />
      )}

      {cached && !payload.stale && (
        <AIAnalysisStatus kind="cached" title="Loaded from a saved analysis" compact>
          Opening or reloading this page does not create a provider charge.
        </AIAnalysisStatus>
      )}

      {operation === 'refine' && (
        <AIAnalysisStatus kind="generating" title="Refining with your additional context" compact>
          The existing version remains available while the new evidence-linked version is validated.
        </AIAnalysisStatus>
      )}

      {operation === 'generate' && (
        <AIAnalysisStatus kind="generating" title="Generating an updated analysis" compact>
          The current saved version remains visible until validation finishes.
        </AIAnalysisStatus>
      )}

      {error && (
        <AIAnalysisStatus
          kind="error"
          title={lastRequest?.action === 'refine' ? 'Refinement failed' : 'Generation failed'}
          action={lastRequest && canGenerate ? (
            <button
              type="button"
              disabled={operation !== null}
              onClick={() => void submit(lastRequest)}
              className="rounded-lg border border-red-300 bg-white px-3 py-2 text-sm font-semibold text-red-900 hover:bg-red-50 disabled:opacity-50"
            >
              Retry
            </button>
          ) : undefined}
        >
          {error} The saved version below is unchanged.
        </AIAnalysisStatus>
      )}

      {!canGenerate && payload.remaining_generations > 0 && (
        <AIAnalysisStatus kind="generating" title="A new analysis version is already pending" compact>
          The saved version below remains available while another request completes. This page will not start a duplicate provider request.
        </AIAnalysisStatus>
      )}

      {!canGenerate && payload.remaining_generations === 0 && (
        <AIAnalysisStatus kind="limit" title="No more refinements are currently available" compact>
          You can continue to review every saved version. The rolling generation allowance will recover automatically.
        </AIAnalysisStatus>
      )}

      <AIAnalysisReport
        analysis={analysis}
        record={record}
        sessionId={sessionId}
        evidence={evidence}
        versions={versions}
        selectedRecordId={record.id}
        onVersionChange={setSelectedRecordId}
        cached={cached}
        canGenerate={canGenerate}
        remainingGenerations={payload.remaining_generations}
        contextMaxLength={contextMaxLength}
        refining={operation === 'refine'}
        allowRefinement={!payload.stale}
        headingRef={reportHeadingRef}
        onRefine={({ generalContext, clarificationAnswers }) => submit({
          action: 'refine',
          parent_analysis_id: record.id,
          clarification_answers: clarificationAnswers,
          ...(generalContext ? { general_context: generalContext } : {})
        })}
      />
      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {successMessage}
      </p>
    </div>
  )
}
