import type { PersonalizedAnalysis, PersonalizedAnalysisInput } from '../types'

export interface ProviderGenerateOptions {
  priorAnalysis?: PersonalizedAnalysis | null
  repair?: { invalidOutput: unknown; errors: string[] }
  signal?: AbortSignal
}

export interface AnalysisProvider {
  provider: 'openai' | 'anthropic'
  model: string
  generate(
    input: PersonalizedAnalysisInput,
    stage: 'provisional' | 'refined',
    options?: ProviderGenerateOptions
  ): Promise<{
    analysis: PersonalizedAnalysis
    model: string
    inputTokens: number | null
    outputTokens: number | null
    latencyMs: number
    providerRequestId: string | null
  }>
}

export class AnalysisProviderError extends Error {
  constructor(
    public readonly code: 'configuration' | 'timeout' | 'malformed_output' | 'provider_failure',
    message: string,
    public readonly invalidOutput?: unknown
  ) {
    super(message)
    this.name = 'AnalysisProviderError'
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
