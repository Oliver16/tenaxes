/** @typedef {import('./supabase').FlavorMatch} FlavorMatch */

/**
 * @param {FlavorMatch[]} flavors
 * @param {boolean} showAll
 */
export function getDisplayFlavors(flavors, showAll) {
  const positiveFlavors = flavors.filter(f => f.affinity > 0)
  return showAll ? positiveFlavors : flavors.slice(0, 5)
}

/**
 * @param {FlavorMatch[]} flavors
 * @param {boolean} [showAll=false]
 */
export function buildFlavorChartData(flavors, showAll = false) {
  const displayFlavors = getDisplayFlavors(flavors, showAll)

  return displayFlavors.map(f => ({
    name: f.name.length > 20 ? f.name.substring(0, 18).trimEnd() + '...' : f.name,
    fullName: f.name,
    affinity: Math.round(f.affinity * 100),
    color: f.color,
    description: f.description,
    matchStrength: f.match_strength
  }))
}
