import { AI_ANALYSIS_PROMPT_VERSION } from './prompts/v1'
import { AnalysisProviderError } from './providers/provider'

export const AI_ANALYSIS_SCHEMA_VERSION = '1'
export const DEFAULT_CONTEXT_MAX_CHARS = 2000
export const DEFAULT_CLARIFICATION_MAX_CHARS = 1000
export const DEFAULT_CLARIFICATION_LINEAGE_MAX_ANSWERS = 10
export const DEFAULT_CLARIFICATION_LINEAGE_MAX_CHARS = 8000
export const DEFAULT_GENERATION_LIMIT = 3
export const DEFAULT_GENERATION_ATTEMPT_LIMIT = 6

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
  return positiveInteger(process.env.AI_ANALYSIS_TIMEOUT_MS, 60000)
}

function positiveInteger(raw: string | undefined, fallback: number): number {
  const parsed = Number(raw)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}
