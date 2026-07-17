import { AxisCoverage, AxisScore } from '@/lib/database.types'
import { computeFlavorMatches, scoresById } from '@/lib/flavor-matcher'
import type { FlavorMatch } from '@/lib/supabase'

/**
 * Principles-vs-practical-choices alignment.
 *
 * Archetypes are matched twice — once against the conceptual axis scores
 * (stated principles) and once against the applied axis scores (concrete
 * scenario choices) — and the two profiles are compared. The alignment
 * rating is computed from the root-mean-square (RMS) per-axis gap between
 * the two registers:
 *
 *   alignment = 100 x (1 - RMS(|conceptual - applied|) / 2)
 *
 * Scores live in [-1, 1], so a full pole flip on every axis scores 0 and
 * identical profiles score 100. RMS gives large local divergences more
 * influence than a simple mean, preventing a serious break on a few axes
 * from disappearing among many small gaps.
 */

export interface ConsistencyBand {
  label: string
  color: string
  blurb: string
}

export function ratingBand(rating: number): ConsistencyBand {
  if (rating >= 90) return {
    label: 'Highly aligned',
    color: '#16a34a',
    blurb: 'Your practical choices track your stated principles closely overall.'
  }
  if (rating >= 82) return {
    label: 'Broadly aligned',
    color: '#65a30d',
    blurb: 'Most dimensions stay close, though some shift under constraint.'
  }
  if (rating >= 65) return {
    label: 'Mixed',
    color: '#d97706',
    blurb: 'On several dimensions your principles and your practical choices pull apart.'
  }
  return {
    label: 'Different under constraint',
    color: '#dc2626',
    blurb: 'The positions you endorse in principle and the ones you choose under constraint differ substantially.'
  }
}

export interface ConsistencySummary {
  rating: number
  band: ConsistencyBand
  meanGap: number
  rootMeanSquareGap: number
  directionalSignal: number
  gapCount: number
  gaps: { axis_id: string; name: string; gap: number }[]
  conceptualFlavors: FlavorMatch[]
  appliedFlavors: FlavorMatch[]
  sameTopArchetype: boolean
}

type RegisterScore = Pick<AxisScore, 'axis_id' | 'name' | 'score'>
type RegisterCoverage = Pick<AxisCoverage, 'axis_id' | 'coverage'>

export interface ConsistencyEvidence {
  conceptualCoverage?: RegisterCoverage[]
  appliedCoverage?: RegisterCoverage[]
}

const MIN_SHARED_DIMENSIONS = 12
const MIN_REGISTER_COVERAGE = 0.5
const MIN_DIRECTIONAL_SIGNAL = 0.3
const LARGE_GAP_SIGNAL_OVERRIDE = 0.75

export function computeConsistency(
  conceptualScores: RegisterScore[],
  appliedScores: RegisterScore[],
  evidence: ConsistencyEvidence
): ConsistencySummary | null {
  if (conceptualScores.length === 0 || appliedScores.length === 0) return null
  if (!evidence.conceptualCoverage?.length || !evidence.appliedCoverage?.length) return null

  const appliedByAxis = Object.fromEntries(appliedScores.map(s => [s.axis_id, s.score]))
  const conceptualCoverageByAxis = Object.fromEntries(
    evidence.conceptualCoverage.map(item => [item.axis_id, item.coverage])
  )
  const appliedCoverageByAxis = Object.fromEntries(
    evidence.appliedCoverage.map(item => [item.axis_id, item.coverage])
  )
  const gaps = conceptualScores
    .filter(s => appliedByAxis[s.axis_id] !== undefined)
    .filter(s => (
      (conceptualCoverageByAxis[s.axis_id] ?? 0) >= MIN_REGISTER_COVERAGE &&
      (appliedCoverageByAxis[s.axis_id] ?? 0) >= MIN_REGISTER_COVERAGE
    ))
    .map(s => ({
      axis_id: s.axis_id,
      name: s.name,
      conceptualScore: s.score,
      appliedScore: appliedByAxis[s.axis_id],
      gap: Math.abs(s.score - appliedByAxis[s.axis_id])
    }))
  if (gaps.length < MIN_SHARED_DIMENSIONS) return null

  const directionalSignal = Math.sqrt(
    gaps.reduce(
      (sum, gap) => sum + (gap.conceptualScore ** 2 + gap.appliedScore ** 2) / 2,
      0
    ) / gaps.length
  )
  const largestGap = Math.max(...gaps.map(gap => gap.gap))
  if (directionalSignal < MIN_DIRECTIONAL_SIGNAL && largestGap < LARGE_GAP_SIGNAL_OVERRIDE) {
    return null
  }

  const meanGap = gaps.reduce((sum, g) => sum + g.gap, 0) / gaps.length
  const rootMeanSquareGap = Math.sqrt(
    gaps.reduce((sum, g) => sum + g.gap ** 2, 0) / gaps.length
  )
  const rmsRating = Math.round(Math.max(0, Math.min(100, 100 * (1 - rootMeanSquareGap / 2))))
  // A conspicuous local break should also constrain the overall claim:
  // >= 0.50 cannot be "Highly aligned"; >= 0.75 cannot be "Broadly aligned".
  const localizedGapCeiling = largestGap >= 0.75 ? 81 : largestGap >= 0.5 ? 89 : 100
  const rating = Math.min(rmsRating, localizedGapCeiling)

  const conceptualFlavors = computeFlavorMatches(scoresById(conceptualScores))
  const appliedFlavors = computeFlavorMatches(scoresById(appliedScores))
  const sameTopArchetype = !!(
    conceptualFlavors[0] && appliedFlavors[0] &&
    conceptualFlavors[0].flavor_id === appliedFlavors[0].flavor_id
  )

  return {
    rating,
    band: ratingBand(rating),
    meanGap,
    rootMeanSquareGap,
    directionalSignal,
    gapCount: gaps.length,
    gaps: gaps
      .map(({ axis_id, name, gap }) => ({ axis_id, name, gap }))
      .sort((a, b) => b.gap - a.gap),
    conceptualFlavors,
    appliedFlavors,
    sameTopArchetype
  }
}
