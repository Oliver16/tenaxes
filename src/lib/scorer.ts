import { QuestionWithLinks, AxisScore, QuestionContribution, ResponsesMap } from './database.types'
import { AXES, FLAVOR_ARCHETYPES } from './instrument'
import type { AxisScore as LegacyAxisScore, FlavorMatch } from './supabase'

/**
 * Calculate axis scores from questions with multi-axis links
 * Uses normalization to prevent overfitting from multi-axis questions
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
    if (r === undefined) continue
    
    // Get links or create default primary link for backward compatibility
    const links = q.question_axis_links && q.question_axis_links.length > 0
      ? q.question_axis_links
      : [{
          question_id: q.id,
          axis_id: q.axis_id,
          role: 'primary' as const,
          axis_key: q.key as -1 | 1,
          weight: q.weight ?? 1,
          id: 0
        }]
    
    // CRITICAL: Normalize total question weight to prevent overfitting
    const questionTotalWeight = links.reduce((sum, link) => sum + link.weight, 0)
    const targetWeight = q.weight ?? 1.25  // Each question should contribute this much total
    const normalizationFactor = targetWeight / questionTotalWeight
    
    const qContrib: QuestionContribution = {
      question_id: q.id,
      response_value: r,
      contributions: []
    }
    
    for (const link of links) {
      const axisId = link.axis_id
      
      // Apply normalization to keep total question influence constant
      const normalizedWeight = link.weight * normalizationFactor
      const contrib = r * link.axis_key * normalizedWeight
      
      sums[axisId] = (sums[axisId] ?? 0) + contrib
      weights[axisId] = (weights[axisId] ?? 0) + normalizedWeight
      
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

function getPoleLabel(score: number, negLabel: string, posLabel: string): string {
  if (score < -0.6) return `Strong ${negLabel}`
  if (score < -0.2) return `Moderate ${negLabel}`
  if (score <= 0.2) return 'Centrist / Mixed'
  if (score <= 0.6) return `Moderate ${posLabel}`
  return `Strong ${posLabel}`
}

function getMatchStrength(affinity: number): string {
  if (affinity >= 0.7) return 'Very Strong'
  if (affinity >= 0.5) return 'Strong'
  if (affinity >= 0.3) return 'Moderate'
  if (affinity >= 0.1) return 'Weak'
  return 'Minimal'
}

export interface CompassResults {
  coreAxes: LegacyAxisScore[]
  facets: LegacyAxisScore[]
  topFlavors: FlavorMatch[]
  allFlavors: FlavorMatch[]
}

/**
 * Build the full profile summary (axis labels, core/facet split, and flavor
 * archetype matches) from normalized axis scores. This is what powers the
 * radar chart, axis scale breakdown, and archetype matching on the results
 * page, so it needs to run for every survey submission.
 */
export function buildCompassResults(
  axisScores: AxisScore[],
  axesById: Record<string, { id: string; name: string; pole_negative?: string | null; pole_positive?: string | null }>
): CompassResults {
  const legacyScores: LegacyAxisScore[] = axisScores.map(s => {
    const meta = axesById[s.axis_id]
    const poleNegative = meta?.pole_negative ?? ''
    const polePositive = meta?.pole_positive ?? ''
    const clamped = Math.max(-1, Math.min(1, s.score))

    return {
      axis_id: s.axis_id,
      name: meta?.name ?? s.name,
      score: clamped,
      pole_negative: poleNegative,
      pole_positive: polePositive,
      pole_label: getPoleLabel(clamped, poleNegative, polePositive)
    }
  })

  const isFacet = (axisId: string) => !!(AXES as Record<string, { is_facet?: boolean }>)[axisId]?.is_facet

  const coreAxes = legacyScores
    .filter(a => !isFacet(a.axis_id))
    .sort((a, b) => a.axis_id.localeCompare(b.axis_id))
  const facets = legacyScores
    .filter(a => isFacet(a.axis_id))
    .sort((a, b) => a.axis_id.localeCompare(b.axis_id))

  const scoreByAxis = Object.fromEntries(legacyScores.map(s => [s.axis_id, s.score]))

  const flavorMatches: FlavorMatch[] = FLAVOR_ARCHETYPES.map(flavor => {
    let weightedSum = 0
    let totalWeight = 0

    flavor.components.forEach(comp => {
      const axisScoreValue = scoreByAxis[comp.axis]
      if (axisScoreValue !== undefined && comp.direction !== 0) {
        const alignment = axisScoreValue * comp.direction
        weightedSum += alignment * comp.weight
        totalWeight += comp.weight
      }
    })

    const affinity = totalWeight > 0 ? weightedSum / totalWeight : 0
    const clampedAffinity = Math.max(-1, Math.min(1, affinity))

    return {
      flavor_id: flavor.id,
      name: flavor.name,
      affinity: clampedAffinity,
      match_strength: getMatchStrength(clampedAffinity),
      description: flavor.description,
      color: flavor.color
    }
  }).sort((a, b) => b.affinity - a.affinity)

  return {
    coreAxes,
    facets,
    topFlavors: flavorMatches.slice(0, 5),
    allFlavors: flavorMatches
  }
}
