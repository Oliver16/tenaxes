import 'server-only'
import { AnthropicAnalysisProvider } from './anthropic'
import { OpenAIAnalysisProvider } from './openai'
import { AnalysisProviderError, type AnalysisProvider } from './provider'

export function isAIAnalysisEnabled(): boolean {
  return process.env.AI_ANALYSIS_ENABLED === 'true'
}

export function configuredProviderName(): 'openai' | 'anthropic' {
  const provider = process.env.AI_ANALYSIS_PROVIDER
  if (provider !== 'openai' && provider !== 'anthropic') {
    throw new AnalysisProviderError('configuration', 'AI analysis provider is unavailable')
  }
  return provider
}

export function configuredModel(): string {
  const provider = configuredProviderName()
  const model = provider === 'openai' ? process.env.OPENAI_ANALYSIS_MODEL : process.env.ANTHROPIC_ANALYSIS_MODEL
  const apiKey = provider === 'openai' ? process.env.OPENAI_API_KEY : process.env.ANTHROPIC_API_KEY
  if (!model || !apiKey) throw new AnalysisProviderError('configuration', 'AI analysis provider is unavailable')
  return model
}

export function createAnalysisProvider(): AnalysisProvider {
  const provider = configuredProviderName()
  return provider === 'openai' ? new OpenAIAnalysisProvider() : new AnthropicAnalysisProvider()
}

export * from './provider'
