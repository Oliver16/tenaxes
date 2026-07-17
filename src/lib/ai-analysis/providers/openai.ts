import 'server-only'
import OpenAI from 'openai'
import { personalizedAnalysisJsonSchema, personalizedAnalysisSchema } from '../schema'
import { AI_ANALYSIS_SYSTEM_PROMPT, buildProvisionalRequest, buildRefinementRequest, buildRepairRequest } from '../prompts/v1'
import type { PersonalizedAnalysisInput } from '../types'
import { AnalysisProviderError, type AnalysisProvider, type ProviderGenerateOptions, withAbortSignal } from './provider'

export class OpenAIAnalysisProvider implements AnalysisProvider {
  readonly provider = 'openai' as const
  readonly model: string
  private readonly client: OpenAI
  private readonly timeoutMs: number

  constructor(options?: { apiKey?: string; model?: string; timeoutMs?: number; client?: OpenAI }) {
    const apiKey = options?.apiKey ?? process.env.OPENAI_API_KEY
    this.model = options?.model ?? process.env.OPENAI_ANALYSIS_MODEL ?? ''
    if (!apiKey || !this.model) throw new AnalysisProviderError('configuration', 'Selected AI analysis provider is not configured')
    this.timeoutMs = options?.timeoutMs ?? providerTimeoutMs()
    this.client = options?.client ?? new OpenAI({ apiKey, timeout: this.timeoutMs })
  }

  async generate(input: PersonalizedAnalysisInput, stage: 'provisional' | 'refined', options: ProviderGenerateOptions = {}) {
    const base = stage === 'refined'
      ? buildRefinementRequest(input, options.priorAnalysis ?? null)
      : buildProvisionalRequest(input)
    const request = options.repair ? buildRepairRequest(base, options.repair.invalidOutput, options.repair.errors) : base
    const started = Date.now()
    try {
      const signal = options.signal ?? AbortSignal.timeout(this.timeoutMs)
      const response = await withAbortSignal(this.client.responses.create({
        model: this.model,
        instructions: AI_ANALYSIS_SYSTEM_PROMPT,
        input: request,
        text: {
          format: {
            type: 'json_schema', name: 'polyaxis_personalized_analysis',
            description: 'A candid, evidence-linked interpretation of verified Polyaxis results.',
            schema: personalizedAnalysisJsonSchema, strict: true
          }
        },
        store: false
      }, { signal }), signal)
      let raw: unknown
      try { raw = JSON.parse(response.output_text) } catch {
        throw new AnalysisProviderError('malformed_output', 'OpenAI returned invalid JSON', response.output_text)
      }
      const parsed = personalizedAnalysisSchema.safeParse(raw)
      if (!parsed.success) {
        throw new AnalysisProviderError(
          'malformed_output',
          `OpenAI output failed schema validation: ${formatIssues(parsed.error.issues)}`,
          raw
        )
      }
      return {
        analysis: parsed.data, model: this.model,
        inputTokens: response.usage?.input_tokens ?? null,
        outputTokens: response.usage?.output_tokens ?? null,
        latencyMs: Date.now() - started, providerRequestId: response.id ?? null
      }
    } catch (error) {
      if (error instanceof AnalysisProviderError) throw error
      if (isAbortError(error)) throw new AnalysisProviderError('timeout', 'OpenAI analysis request timed out')
      throw new AnalysisProviderError('provider_failure', 'OpenAI analysis request failed')
    }
  }
}

const providerTimeoutMs = () => Number(process.env.AI_ANALYSIS_TIMEOUT_MS || 60000)
const isAbortError = (error: unknown) => error instanceof Error && (error.name === 'AbortError' || /timed out|timeout/i.test(error.message))
const formatIssues = (issues: Array<{ path: PropertyKey[]; message: string }>) => issues
  .slice(0, 12)
  .map(issue => `${issue.path.join('.') || 'root'}: ${issue.message}`)
  .join('; ')
