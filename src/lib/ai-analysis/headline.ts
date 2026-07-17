export const ANALYSIS_HEADLINE_EDITORIAL_MAX_CHARS = 180

const DANGLING_PUNCTUATION = /[-\u2010-\u2015,:;/]$/u
const DANGLING_CONNECTOR = /\b(?:a|an|and|as|at|but|by|for|from|in|into|of|on|or|the|to|under|with|without)$/iu

export function analysisHeadlineProblem(headline: string): string | null {
  const value = headline.trim()
  if (value.length > ANALYSIS_HEADLINE_EDITORIAL_MAX_CHARS) {
    return `must be ${ANALYSIS_HEADLINE_EDITORIAL_MAX_CHARS} characters or fewer`
  }
  if (DANGLING_PUNCTUATION.test(value) || DANGLING_CONNECTOR.test(value)) {
    return 'must be a complete standalone phrase and cannot end with a dangling word or punctuation mark'
  }
  return null
}

export function analysisHeaderForDisplay(headline: string, executiveSummary: string): {
  headline: string
  executiveSummary: string
} {
  const value = headline.trim()
  const summary = executiveSummary.trim()
  if (!analysisHeadlineProblem(value)) return { headline: value, executiveSummary: summary }

  const completeSummarySentence = summary.match(/^([\s\S]{1,180}?[.!?])(?=\s|$)/u)?.[1]?.trim()
  if (completeSummarySentence && !analysisHeadlineProblem(completeSummarySentence)) {
    const remainder = summary.slice(completeSummarySentence.length).trim()
    if (remainder) return { headline: completeSummarySentence, executiveSummary: remainder }
  }
  return { headline: 'Your deeper analysis', executiveSummary: summary }
}
