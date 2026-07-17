import type { GetAIAnalysisResponse } from '@/lib/ai-analysis/types'

export function aiAnalysisStatusMessage(status: number): string {
  switch (status) {
    case 400: return 'The analysis request was not accepted. Check the context length and try again.'
    case 404: return 'This result could not be found.'
    case 409: return 'An analysis is already being generated for this result. Wait a moment, then check again.'
    case 429: return 'This result has reached its analysis-generation limit. Saved versions remain available.'
    case 502: return 'The provider returned an analysis that could not be safely validated. You can retry without affecting your scores.'
    case 503: return 'AI analysis is temporarily unavailable. Your verified Polyaxis results are unaffected.'
    default: return 'The analysis could not be loaded or generated. Please try again.'
  }
}

export function analysisVersions(payload: GetAIAnalysisResponse | null) {
  if (!payload?.analysis || !payload.record) return []
  const versions = payload.versions ? [...payload.versions] : []
  if (!versions.some(version => version.record.id === payload.record?.id)) {
    versions.unshift({ analysis: payload.analysis, record: payload.record })
  }
  return versions
}
