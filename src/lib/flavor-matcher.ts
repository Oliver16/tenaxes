import { AXES, FLAVOR_ARCHETYPES, type AxisId } from './instrument'
import type { FlavorMatch, AxisScore as AxisScoreSummary } from './supabase'
import type { AxisScore } from './database.types'

/**
 * Archetype ("character sheet") matching.
 *
 * Affinity is the weighted mean alignment between the respondent's axis
 * scores and the archetype's component directions, in [-1, 1]:
 *   affinity = sum(score x direction x weight) / sum(weight)
 * A score the respondent doesn't have (unanswered axis) is skipped and
 * its weight excluded, so partial results still rank sensibly.
 */

export function matchStrengthLabel(affinity: number): string {
  if (affinity >= 0.65) return 'Very Strong'
  if (affinity >= 0.45) return 'Strong'
  if (affinity >= 0.25) return 'Moderate'
  if (affinity >= 0.10) return 'Weak'
  return 'Minimal'
}

export function computeFlavorMatches(scoresById: Record<string, number>): FlavorMatch[] {
  return FLAVOR_ARCHETYPES
    .map(archetype => {
      let sum = 0
      let weightTotal = 0

      for (const comp of archetype.components) {
        if (comp.direction === 0) continue
        const score = scoresById[comp.axis]
        if (score === undefined) continue
        sum += score * comp.direction * comp.weight
        weightTotal += comp.weight
      }

      const affinity = weightTotal > 0 ? sum / weightTotal : 0

      return {
        flavor_id: archetype.id,
        name: archetype.name,
        affinity,
        match_strength: matchStrengthLabel(affinity),
        description: archetype.description,
        color: archetype.color
      }
    })
    .sort((a, b) => b.affinity - a.affinity)
}

function poleLabelFor(axis: { pole_negative: string; pole_positive: string }, score: number): string {
  if (score < -0.6) return `Strong ${axis.pole_negative}`
  if (score < -0.2) return `Moderate ${axis.pole_negative}`
  if (score <= 0.2) return 'Centrist / Mixed'
  if (score <= 0.6) return `Moderate ${axis.pole_positive}`
  return `Strong ${axis.pole_positive}`
}

/**
 * Convert raw axis scores into the display summaries stored on
 * survey_results (core_axes / facets), with pole labels resolved.
 */
export function buildAxisSummaries(
  axisScores: Pick<AxisScore, 'axis_id' | 'score'>[]
): { core_axes: AxisScoreSummary[]; facets: AxisScoreSummary[] } {
  const core_axes: AxisScoreSummary[] = []
  const facets: AxisScoreSummary[] = []

  for (const s of axisScores) {
    const meta = AXES[s.axis_id as AxisId]
    if (!meta) continue

    const summary: AxisScoreSummary = {
      axis_id: s.axis_id,
      name: meta.name,
      score: s.score,
      pole_negative: meta.pole_negative,
      pole_positive: meta.pole_positive,
      pole_label: poleLabelFor(meta, s.score)
    }

    if ((meta as { is_facet?: boolean }).is_facet) {
      facets.push(summary)
    } else {
      core_axes.push(summary)
    }
  }

  const byId = (a: AxisScoreSummary, b: AxisScoreSummary) =>
    a.axis_id.localeCompare(b.axis_id, undefined, { numeric: true })
  core_axes.sort(byId)
  facets.sort(byId)

  return { core_axes, facets }
}

/**
 * Convenience: scores array -> { axisId: score } map.
 */
export function scoresById(axisScores: Pick<AxisScore, 'axis_id' | 'score'>[]): Record<string, number> {
  return Object.fromEntries(axisScores.map(s => [s.axis_id, s.score]))
}
