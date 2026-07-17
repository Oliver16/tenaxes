import 'server-only'
import Anthropic from '@anthropic-ai/sdk'
import { analysisTimeoutMs } from '../config'
import { personalizedAnalysisJsonSchema, personalizedAnalysisSchema } from '../schema'
import { AI_ANALYSIS_SYSTEM_PROMPT, buildProvisionalRequest, buildRefinementRequest, buildRepairRequest } from '../prompts/v1'
import type { PersonalizedAnalysisInput } from '../types'
import { AnalysisProviderError, type AnalysisProvider, type ProviderGenerateOptions, withAbortSignal } from './provider'

export class AnthropicAnalysisProvider implements AnalysisProvider {
  readonly provider = 'anthropic' as const
  readonly model: string
  private readonly client: Anthropic
  private readonly timeoutMs: number

  constructor(options?: { apiKey?: string; model?: string; timeoutMs?: number; client?: Anthropic }) {
    const apiKey = options?.apiKey ?? process.env.ANTHROPIC_API_KEY
    this.model = options?.model ?? process.env.ANTHROPIC_ANALYSIS_MODEL ?? ''
    if (!apiKey || !this.model) throw new AnalysisProviderError('configuration', 'Selected AI analysis provider is not configured')
    this.timeoutMs = options?.timeoutMs ?? analysisTimeoutMs()
    this.client = options?.client ?? new Anthropic({ apiKey, timeout: this.timeoutMs })
  }

  async generate(input: PersonalizedAnalysisInput, stage: 'provisional' | 'refined', options: ProviderGenerateOptions = {}) {
    const base = stage === 'refined'
      ? buildRefinementRequest(input, options.priorAnalysis ?? null)
      : buildProvisionalRequest(input)
    const request = options.repair ? buildRepairRequest(base, options.repair.invalidOutput, options.repair.errors) : base
    const started = Date.now()
    try {
      const signal = options.signal ?? AbortSignal.timeout(this.timeoutMs)
      const response = await withAbortSignal(this.client.messages.create({
        model: this.model, max_tokens: 12000, system: AI_ANALYSIS_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: request }],
        tools: [{
          name: 'submit_polyaxis_analysis',
          description: 'Submit the complete structured Polyaxis AI-assisted interpretation.',
          input_schema: personalizedAnalysisJsonSchema as Anthropic.Messages.Tool.InputSchema
        }],
        tool_choice: { type: 'tool', name: 'submit_polyaxis_analysis', disable_parallel_tool_use: true }
      }, { signal }), signal)
      const attempt = {
        inputTokens: response.usage.input_tokens ?? null,
        outputTokens: response.usage.output_tokens ?? null,
        latencyMs: Date.now() - started,
        providerRequestId: response.id ?? null
      }
      const blocks = response.content.filter(block => block.type === 'tool_use' && block.name === 'submit_polyaxis_analysis')
      const block = blocks[0]
      if (blocks.length !== 1 || !block || block.type !== 'tool_use') {
        throw new AnalysisProviderError(
          'malformed_output',
          'Anthropic did not return exactly one required schema tool call',
          response.content,
          attempt
        )
      }
      const raw = block.input
      const parsed = personalizedAnalysisSchema.safeParse(raw)
      if (!parsed.success) {
        throw new AnalysisProviderError(
          'malformed_output',
          `Anthropic tool input failed schema validation: ${formatIssues(parsed.error.issues)}`,
          raw,
          attempt
        )
      }
      return {
        analysis: parsed.data, model: this.model,
        ...attempt
      }
    } catch (error) {
      if (error instanceof AnalysisProviderError) throw error
      const attempt = failedAttempt(Date.now() - started, error)
      if (isAbortError(error)) throw new AnalysisProviderError('timeout', 'Anthropic analysis request timed out', undefined, attempt)
      throw new AnalysisProviderError('provider_failure', 'Anthropic analysis request failed', undefined, attempt)
    }
  }
}

const isAbortError = (error: unknown) => error instanceof Error && (error.name === 'AbortError' || /timed out|timeout/i.test(error.message))
const failedAttempt = (latencyMs: number, error: unknown) => ({
  inputTokens: null,
  outputTokens: null,
  latencyMs,
  providerRequestId: isObject(error) && typeof error.request_id === 'string' ? error.request_id : null
})
const isObject = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object'
const formatIssues = (issues: Array<{ path: PropertyKey[]; message: string }>) => issues
  .slice(0, 12)
  .map(issue => `${issue.path.join('.') || 'root'}: ${issue.message}`)
  .join('; ')
