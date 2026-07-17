import { AI_ANALYSIS_PROMPT_VERSION } from './prompts/v1'
import { AnalysisProviderError } from './providers/provider'

export const AI_ANALYSIS_SCHEMA_VERSION = '1'
export const DEFAULT_CONTEXT_MAX_CHARS = 2000
export const DEFAULT_CLARIFICATION_MAX_CHARS = 1000
export const DEFAULT_CLARIFICATION_LINEAGE_MAX_ANSWERS = 10
export const DEFAULT_CLARIFICATION_LINEAGE_MAX_CHARS = 8000
export const DEFAULT_GENERATION_LIMIT = 3
export const DEFAULT_GENERATION_ATTEMPT_LIMIT = 6
export const DEFAULT_ANALYSIS_TIMEOUT_MS = 240000
export const MAX_ANALYSIS_TIMEOUT_MS = 240000
export const ANALYSIS_ROUTE_MAX_DURATION_MS = 300000
export const ANALYSIS_FINALIZATION_RESERVE_MS = 30000

export function analysisPromptVersion(): string {
  const configured = process.env.AI_ANALYSIS_PROMPT_VERSION || AI_ANALYSIS_PROMPT_VERSION
  if (configured !== AI_ANALYSIS_PROMPT_VERSION) {
    throw new AnalysisProviderError('configuration', 'Configured AI analysis prompt version is not deployed')
  }
  return configured
}

export function contextMaxChars(): number {
  return positiveInteger(process.env.AI_ANALYSIS_CONTEXT_MAX_CHARS, DEFAULT_CONTEXT_MAX_CHARS)
}

export function generationLimit(): number {
  return positiveInteger(process.env.AI_ANALYSIS_MAX_REGENERATIONS, DEFAULT_GENERATION_LIMIT)
}

export function generationAttemptLimit(): number {
  return Math.max(
    generationLimit(),
    positiveInteger(process.env.AI_ANALYSIS_MAX_ATTEMPTS, DEFAULT_GENERATION_ATTEMPT_LIMIT)
  )
}

export function analysisTimeoutMs(): number {
  return Math.min(
    positiveInteger(process.env.AI_ANALYSIS_TIMEOUT_MS, DEFAULT_ANALYSIS_TIMEOUT_MS),
    MAX_ANALYSIS_TIMEOUT_MS
  )
}

export function analysisAttemptTimeoutMs(elapsedRouteMs: number): number {
  const available = ANALYSIS_ROUTE_MAX_DURATION_MS
    - ANALYSIS_FINALIZATION_RESERVE_MS
    - Math.max(0, elapsedRouteMs)
  if (available <= 0) {
    throw new AnalysisProviderError('timeout', 'Insufficient route time remains for an AI analysis attempt')
  }
  return Math.min(analysisTimeoutMs(), available)
}

function positiveInteger(raw: string | undefined, fallback: number): number {
  const parsed = Number(raw)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}
