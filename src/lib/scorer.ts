import { AxisCoverage, QuestionWithLinks, AxisScore, QuestionContribution, ResponsesMap } from './database.types'

// Secondary links may add at most this fraction of the question's own
// weight to other axes, so cross-loadings can never outweigh the axis
// the question was written for.
const SECONDARY_WEIGHT_CAP_RATIO = 0.5

/**
 * Calculate axis scores from questions with multi-axis links.
 *
 * Link roles:
 * - primary:   contributes the question's full weight to its axis.
 *              A question's influence on its own axis never depends on
 *              how many cross-links it carries.
 * - secondary: reinforcing cross-loading. Contributes its link weight,
 *              but all secondary links of a question combined are capped
 *              at SECONDARY_WEIGHT_CAP_RATIO x the question's weight.
 * - tradeoff:  excluded from axis scores entirely. A tradeoff answer
 *              reveals a priority between two values, not a position on
 *              the sacrificed axis; it is consumed by the tension
 *              analyzer instead. (Legacy 'collision' links are treated
 *              the same way.)
 */
export function calculateAxisScoresFromLinks(
  responses: ResponsesMap,
  questions: QuestionWithLinks[],
  axesById: Record<string, { id: string; name: string }>
): {
  axisScores: AxisScore[]
  questionContributions: QuestionContribution[]
} {

  const sums: Record<string, number> = {}
  const weights: Record<string, number> = {}
  const responseStrengths: Record<string, number[]> = {}

  const questionContributions: QuestionContribution[] = []

  for (const q of questions) {
    const r = responses[q.id]
    // v2.1 response contract: only numeric responses are scored. `null`
    // means "not sure / need more information" and is excluded from both
    // numerator and denominator; missing means unanswered. A numeric 0 is
    // an answered neutral and stays in the denominator. Never coerce null
    // to zero here.
    if (typeof r !== 'number') continue

    const questionWeight = q.weight ?? 1.0

    // Get links or create default primary link for backward compatibility
    const links = q.question_axis_links && q.question_axis_links.length > 0
      ? q.question_axis_links
      : [{
          question_id: q.id,
          axis_id: q.axis_id,
          role: 'primary' as const,
          axis_key: q.key as -1 | 1,
          weight: questionWeight,
          id: 0
        }]

    const secondaryLinks = links.filter(l => l.role === 'secondary')
    const secondaryTotal = secondaryLinks.reduce((sum, l) => sum + l.weight, 0)
    const secondaryCap = SECONDARY_WEIGHT_CAP_RATIO * questionWeight
    const secondaryScale = secondaryTotal > secondaryCap
      ? secondaryCap / secondaryTotal
      : 1

    const qContrib: QuestionContribution = {
      question_id: q.id,
      response_value: r,
      contributions: []
    }

    for (const link of links) {
      let effectiveWeight: number
      if (link.role === 'primary') {
        effectiveWeight = questionWeight
      } else if (link.role === 'secondary') {
        effectiveWeight = link.weight * secondaryScale
      } else {
        // 'tradeoff' (and legacy 'collision'): no axis-score contribution
        continue
      }

      const axisId = link.axis_id
      const contrib = r * link.axis_key * effectiveWeight

      sums[axisId] = (sums[axisId] ?? 0) + contrib
      weights[axisId] = (weights[axisId] ?? 0) + effectiveWeight

      // Track response strength for confidence calculation
      if (!responseStrengths[axisId]) responseStrengths[axisId] = []
      responseStrengths[axisId].push(Math.abs(r))

      qContrib.contributions.push({
        axis_id: axisId,
        raw_contribution: r * link.axis_key * link.weight,
        normalized_contribution: contrib
      })
    }

    questionContributions.push(qContrib)
  }

  // Calculate final scores with confidence metrics
  const axisScores: AxisScore[] = []

  for (const axisId of Object.keys(weights)) {
    const w = weights[axisId]
    const raw = sums[axisId] ?? 0
    const normalized = w > 0 ? raw / (2 * w) : 0

    // Calculate confidence: average response strength
    const strengths = responseStrengths[axisId] || []
    const avgStrength = strengths.length > 0
      ? strengths.reduce((a, b) => a + b, 0) / strengths.length
      : 0

    // Calculate variance: consistency of responses
    const variance = strengths.length > 1
      ? calculateVariance(strengths)
      : 0

    const meta = axesById[axisId]
    axisScores.push({
      axis_id: axisId,
      name: meta?.name ?? axisId,
      score: normalized,
      raw_sum: raw,
      total_weight: w,
      confidence: avgStrength,
      response_variance: variance
    })
  }

  return { axisScores, questionContributions }
}

function calculateVariance(values: number[]): number {
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  const squareDiffs = values.map(v => Math.pow(v - mean, 2))
  return squareDiffs.reduce((a, b) => a + b, 0) / values.length
}

// Confidence thresholds from the v2.1 application contract.
const COVERAGE_HIGH = 0.8
const COVERAGE_MODERATE = 0.65
const COVERAGE_LOW = 0.5
const MIN_NUMERIC_ITEMS = 8

/**
 * Per-axis answer coverage over primary links: how much of each axis's
 * available primary weight was actually answered numerically. `null`
 * ("not sure") and missing responses count as unanswered; a numeric 0
 * counts as answered. Stored on survey_results.response_coverage.
 */
export function calculateAxisCoverage(
  responses: ResponsesMap,
  questions: QuestionWithLinks[]
): AxisCoverage[] {
  const byAxis: Record<string, {
    answeredItems: number; availableItems: number
    answeredWeight: number; availableWeight: number
  }> = {}

  for (const q of questions) {
    const links = q.question_axis_links && q.question_axis_links.length > 0
      ? q.question_axis_links
      : [{ axis_id: q.axis_id, role: 'primary' as const, weight: q.weight ?? 1.0 }]
    const primary = links.find(l => l.role === 'primary')
    if (!primary) continue

    const bucket = (byAxis[primary.axis_id] ??= {
      answeredItems: 0, availableItems: 0, answeredWeight: 0, availableWeight: 0
    })
    const w = q.weight ?? 1.0
    bucket.availableItems++
    bucket.availableWeight += w
    if (typeof responses[q.id] === 'number') {
      bucket.answeredItems++
      bucket.answeredWeight += w
    }
  }

  return Object.entries(byAxis).map(([axis_id, b]) => {
    const coverage = b.availableWeight > 0 ? b.answeredWeight / b.availableWeight : 0
    const confidence: AxisCoverage['confidence'] =
      coverage < COVERAGE_LOW || b.answeredItems < MIN_NUMERIC_ITEMS ? 'insufficient' :
      coverage >= COVERAGE_HIGH ? 'high' :
      coverage >= COVERAGE_MODERATE ? 'moderate' : 'low'
    return {
      axis_id,
      answered_primary_items: b.answeredItems,
      available_primary_items: b.availableItems,
      answered_weight: b.answeredWeight,
      available_weight: b.availableWeight,
      coverage,
      confidence
    }
  }).sort((a, b) => a.axis_id.localeCompare(b.axis_id, undefined, { numeric: true }))
}

/**
 * Backward-compatible wrapper that returns just axis scores
 */
export function calculateScoresFromQuestions(
  responses: ResponsesMap,
  questions: QuestionWithLinks[],
  axes?: { id: string; name: string }[]
): AxisScore[] {
  const axesById = axes
    ? Object.fromEntries(axes.map(a => [a.id, a]))
    : {}

  const { axisScores } = calculateAxisScoresFromLinks(responses, questions, axesById)
  return axisScores
}
