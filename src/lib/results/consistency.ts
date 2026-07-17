import { AxisScore } from '@/lib/database.types'
import { computeFlavorMatches, scoresById } from '@/lib/flavor-matcher'
import type { FlavorMatch } from '@/lib/supabase'

/**
 * Principles-vs-practical-choices consistency.
 *
 * Archetypes are matched twice — once against the conceptual axis scores
 * (stated principles) and once against the applied axis scores (concrete
 * scenario choices) — and the two profiles are compared. The consistency
 * rating is computed from the per-axis gap between the two registers:
 *
 *   consistency = 100 x (1 - mean(|conceptual - applied|) / 2)
 *
 * (scores live in [-1, 1], so a full pole flip on every axis scores 0 and
 * identical profiles score 100).
 */

export interface ConsistencyBand {
  label: string
  color: string
  blurb: string
}

export function ratingBand(rating: number): ConsistencyBand {
  if (rating >= 90) return {
    label: 'Highly consistent',
    color: '#16a34a',
    blurb: 'Your practical choices track your stated principles closely across the board.'
  }
  if (rating >= 78) return {
    label: 'Broadly consistent',
    color: '#65a30d',
    blurb: 'Your choices mostly follow your principles, with a few dimensions that shift under constraint.'
  }
  if (rating >= 64) return {
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
  gapCount: number
  gaps: { axis_id: string; name: string; gap: number }[]
  conceptualFlavors: FlavorMatch[]
  appliedFlavors: FlavorMatch[]
  sameTopArchetype: boolean
}

type RegisterScore = Pick<AxisScore, 'axis_id' | 'name' | 'score'>

export function computeConsistency(
  conceptualScores: RegisterScore[],
  appliedScores: RegisterScore[]
): ConsistencySummary | null {
  if (conceptualScores.length === 0 || appliedScores.length === 0) return null

  const appliedByAxis = Object.fromEntries(appliedScores.map(s => [s.axis_id, s.score]))
  const gaps = conceptualScores
    .filter(s => appliedByAxis[s.axis_id] !== undefined)
    .map(s => ({
      axis_id: s.axis_id,
      name: s.name,
      gap: Math.abs(s.score - appliedByAxis[s.axis_id])
    }))
  if (gaps.length === 0) return null

  const meanGap = gaps.reduce((sum, g) => sum + g.gap, 0) / gaps.length
  const rating = Math.round(100 * (1 - meanGap / 2))

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
    gapCount: gaps.length,
    gaps: [...gaps].sort((a, b) => b.gap - a.gap),
    conceptualFlavors,
    appliedFlavors,
    sameTopArchetype
  }
}
