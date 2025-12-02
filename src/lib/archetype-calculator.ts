import { FLAVOR_ARCHETYPES, AxisId } from './instrument'
import type { AxisScore } from './database.types'

export interface FlavorMatch {
  flavor_id: string
  name: string
  description: string
  color: string
  affinity: number
  match_strength: 'Strong' | 'Moderate' | 'Weak' | 'Mismatch'
}

/**
 * Calculate how well a user's axis scores match each flavor archetype
 */
export function calculateFlavorMatches(axisScores: AxisScore[]): FlavorMatch[] {
  const scoreMap = Object.fromEntries(
    axisScores.map(s => [s.axis_id, s.score])
  )

  const matches: FlavorMatch[] = []

  for (const flavor of FLAVOR_ARCHETYPES) {
    let totalAlignment = 0
    let totalWeight = 0

    // Calculate weighted alignment for each component axis
    for (const component of flavor.components) {
      const userScore = scoreMap[component.axis] ?? 0
      const weight = component.weight

      // Component direction: 1 = positive pole, -1 = negative pole, 0 = neutral
      // User score: -1 to 1 where -1 is negative pole, 1 is positive pole
      const alignment = component.direction === 0
        ? 1  // neutral component always aligned
        : userScore * component.direction  // ranges from -1 to 1

      totalAlignment += alignment * weight
      totalWeight += weight
    }

    // Normalize to -1 to 1 range
    const affinity = totalWeight > 0 ? totalAlignment / totalWeight : 0

    // Determine match strength
    let matchStrength: FlavorMatch['match_strength']
    const absAffinity = Math.abs(affinity)
    if (absAffinity >= 0.7) matchStrength = 'Strong'
    else if (absAffinity >= 0.4) matchStrength = 'Moderate'
    else if (absAffinity >= 0.2) matchStrength = 'Weak'
    else matchStrength = 'Mismatch'

    matches.push({
      flavor_id: flavor.id,
      name: flavor.name,
      description: flavor.description,
      color: flavor.color,
      affinity,
      match_strength: matchStrength
    })
  }

  // Sort by affinity (highest to lowest)
  matches.sort((a, b) => b.affinity - a.affinity)

  return matches
}

/**
 * Separate core axes from facets
 */
export function separateCoreAndFacets(axisScores: AxisScore[]): {
  coreAxes: AxisScore[]
  facets: AxisScore[]
} {
  const coreAxes = axisScores.filter(s => s.axis_id.startsWith('C'))
  const facets = axisScores.filter(s => s.axis_id.startsWith('F'))

  return { coreAxes, facets }
}
