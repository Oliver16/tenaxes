import { AXES, ITEMS, FLAVOR_ARCHETYPES, AxisId } from './instrument'
import type { AxisScore, FlavorMatch } from './supabase'

export type Responses = Record<number, number>

export type CompassResults = {
  coreAxes: AxisScore[]
  facets: AxisScore[]
  topFlavors: FlavorMatch[]
  allFlavors: FlavorMatch[]
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

export function calculateScores(responses: Responses): CompassResults {
  // Group items by axis
  const itemsByAxis: Record<string, typeof ITEMS> = {}
  ITEMS.forEach(item => {
    if (!itemsByAxis[item.axis]) itemsByAxis[item.axis] = []
    itemsByAxis[item.axis].push(item)
  })

  // Calculate axis scores
  const axisScores: Record<string, AxisScore> = {}
  
  Object.entries(AXES).forEach(([axisId, axisDef]) => {
    const items = itemsByAxis[axisId] || []
    let rawSum = 0
    let count = 0

    items.forEach(item => {
      if (responses[item.id] !== undefined) {
        const adjusted = responses[item.id] * item.key
        rawSum += adjusted
        count++
      }
    })

    const normalized = count > 0 ? rawSum / (2 * count) : 0
    const clamped = Math.max(-1, Math.min(1, normalized))

    axisScores[axisId] = {
      axis_id: axisId,
      name: axisDef.name,
      score: clamped,
      pole_negative: axisDef.pole_negative,
      pole_positive: axisDef.pole_positive,
      pole_label: getPoleLabel(clamped, axisDef.pole_negative, axisDef.pole_positive)
    }
  })

  // Calculate flavor affinities
  const flavorMatches: FlavorMatch[] = FLAVOR_ARCHETYPES.map(flavor => {
    let weightedSum = 0
    let totalWeight = 0

    flavor.components.forEach(comp => {
      const axisScore = axisScores[comp.axis]
      if (axisScore && comp.direction !== 0) {
        const alignment = axisScore.score * comp.direction
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

  // Split into core axes and facets
  const coreAxes = Object.values(axisScores).filter(a => !AXES[a.axis_id as AxisId]?.is_facet)
  const facets = Object.values(axisScores).filter(a => AXES[a.axis_id as AxisId]?.is_facet)

  return {
    coreAxes,
    facets,
    topFlavors: flavorMatches.slice(0, 5),
    allFlavors: flavorMatches
  }
}
