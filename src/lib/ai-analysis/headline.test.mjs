import assert from 'node:assert/strict'
import test from 'node:test'

import {
  ANALYSIS_HEADLINE_EDITORIAL_MAX_CHARS,
  analysisHeaderForDisplay,
  analysisHeadlineProblem
} from './headline.ts'

const truncatedProductionHeadline = 'A market- and property-oriented, culturally traditional, sovereignist profile with constitutional constraints and strong willingness to make bounded exceptions for infrastructure, security, and high-'

test('complete concise headlines pass without being rewritten', () => {
  const headline = 'Market-oriented, culturally traditional, and institutionally constrained'
  assert.equal(analysisHeadlineProblem(headline), null)
  assert.deepEqual(analysisHeaderForDisplay(headline, 'The full summary remains.'), {
    headline,
    executiveSummary: 'The full summary remains.'
  })
})

test('the production cutoff falls back to a complete executive-summary sentence', () => {
  const summary = 'The strongest pattern is not blanket anti-state politics. A second sentence adds detail.'
  assert.equal(truncatedProductionHeadline.length, 199)
  assert.match(analysisHeadlineProblem(truncatedProductionHeadline), /180 characters or fewer/)
  assert.deepEqual(analysisHeaderForDisplay(truncatedProductionHeadline, summary), {
    headline: 'The strongest pattern is not blanket anti-state politics.',
    executiveSummary: 'A second sentence adds detail.'
  })
})

test('generation quality rejects dangling endings and overlong headlines', () => {
  for (const headline of ['A preference for high-', 'A preference for', 'A preference for security,', 'A preference —']) {
    assert.match(analysisHeadlineProblem(headline), /complete standalone phrase/)
  }
  assert.match(
    analysisHeadlineProblem('x'.repeat(ANALYSIS_HEADLINE_EDITORIAL_MAX_CHARS + 1)),
    /180 characters or fewer/
  )
})

test('a neutral display fallback is used when the summary has no suitable complete sentence', () => {
  assert.deepEqual(analysisHeaderForDisplay('An incomplete headline with', 'A summary without terminal punctuation'), {
    headline: 'Your deeper analysis',
    executiveSummary: 'A summary without terminal punctuation'
  })
})

test('a one-sentence summary is not duplicated when the stored headline is incomplete', () => {
  const summary = 'A complete summary that should remain in the paragraph.'
  assert.deepEqual(analysisHeaderForDisplay('An incomplete headline with', summary), {
    headline: 'Your deeper analysis',
    executiveSummary: summary
  })
})
