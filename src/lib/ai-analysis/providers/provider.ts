import type { PersonalizedAnalysis, PersonalizedAnalysisInput } from '../types'

export interface ProviderGenerateOptions {
  priorAnalysis?: PersonalizedAnalysis | null
  repair?: { invalidOutput: unknown; errors: string[] }
  signal?: AbortSignal
}

export interface ProviderAttemptMetadata {
  inputTokens: number | null
  outputTokens: number | null
  latencyMs: number
  providerRequestId: string | null
}

export interface ProviderGeneration extends ProviderAttemptMetadata {
  analysis: PersonalizedAnalysis
  model: string
}

export interface AnalysisProvider {
  provider: 'openai' | 'anthropic'
  model: string
  generate(
    input: PersonalizedAnalysisInput,
    stage: 'provisional' | 'refined',
    options?: ProviderGenerateOptions
  ): Promise<ProviderGeneration>
}

export class AnalysisProviderError extends Error {
  constructor(
    public readonly code: 'configuration' | 'timeout' | 'malformed_output' | 'provider_failure',
    message: string,
    public readonly invalidOutput?: unknown,
    public readonly attempt?: ProviderAttemptMetadata
  ) {
    super(message)
    this.name = 'AnalysisProviderError'
  }
}

export function summarizeProviderAttempts(attempts: ReadonlyArray<ProviderAttemptMetadata>): ProviderAttemptMetadata {
  const inputTokens = attempts.flatMap(attempt => attempt.inputTokens === null ? [] : [attempt.inputTokens])
  const outputTokens = attempts.flatMap(attempt => attempt.outputTokens === null ? [] : [attempt.outputTokens])
  const requestIds = [...new Set(attempts.flatMap(attempt => attempt.providerRequestId ? [attempt.providerRequestId] : []))]
  return {
    inputTokens: inputTokens.length > 0 ? inputTokens.reduce((total, value) => total + value, 0) : null,
    outputTokens: outputTokens.length > 0 ? outputTokens.reduce((total, value) => total + value, 0) : null,
    latencyMs: attempts.reduce((total, attempt) => total + Math.max(0, attempt.latencyMs), 0),
    providerRequestId: requestIds.length > 0 ? requestIds.join(',') : null
  }
}

export function withAbortSignal<T>(promise: PromiseLike<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) return Promise.reject(new DOMException('The operation timed out', 'AbortError'))
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(new DOMException('The operation timed out', 'AbortError'))
    signal.addEventListener('abort', onAbort, { once: true })
    Promise.resolve(promise).then(resolve, reject).finally(() => signal.removeEventListener('abort', onAbort))
  })
}
