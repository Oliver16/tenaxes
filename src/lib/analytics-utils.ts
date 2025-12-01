import type { DailyCount, AxisAggregate, FlavorPopularity } from './analytics'

export function aggregateByDay(data: { created_at: string }[]): DailyCount[] {
  const counts: Record<string, number> = {}

  data.forEach(item => {
    const date = item.created_at.split('T')[0]
    counts[date] = (counts[date] || 0) + 1
  })

  // Fill in missing days with 0
  const result: DailyCount[] = []
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  for (let d = new Date(thirtyDaysAgo); d <= new Date(); d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0]
    result.push({ date: dateStr, count: counts[dateStr] || 0 })
  }

  return result
}

export function computeAxisAggregates(data: { core_axes: any[]; facets: any[] }[]): AxisAggregate[] {
  const axisScores: Record<string, { name: string; scores: number[] }> = {}

  data.forEach(result => {
    const allAxes = [...(result.core_axes || []), ...(result.facets || [])]
    allAxes.forEach((axis: any) => {
      if (!axisScores[axis.axis_id]) {
        axisScores[axis.axis_id] = { name: axis.name, scores: [] }
      }
      axisScores[axis.axis_id].scores.push(axis.score)
    })
  })

  return Object.entries(axisScores)
    .map(([axis_id, { name, scores }]) => {
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length
      const variance = scores.reduce((sum, s) => sum + Math.pow(s - avg, 2), 0) / scores.length
      const std = Math.sqrt(variance)

      return {
        axis_id,
        axis_name: name,
        avg_score: avg,
        std_dev: std,
        sample_size: scores.length
      }
    })
    .sort((a, b) => a.axis_id.localeCompare(b.axis_id))
}

export function computeFlavorPopularity(data: { top_flavors: any[] }[]): FlavorPopularity[] {
  const flavorStats: Record<string, { count: number; affinities: number[] }> = {}

  data.forEach(result => {
    (result.top_flavors || []).forEach((flavor: any, index: number) => {
      // Weight by rank (top match = 5 points, second = 4, etc.)
      const weight = 5 - index
      if (weight <= 0) return
      if (!flavorStats[flavor.name]) {
        flavorStats[flavor.name] = { count: 0, affinities: [] }
      }
      flavorStats[flavor.name].count += weight
      flavorStats[flavor.name].affinities.push(flavor.affinity)
    })
  })

  return Object.entries(flavorStats)
    .map(([name, { count, affinities }]) => ({
      flavor_name: name,
      count,
      avg_affinity: affinities.reduce((a, b) => a + b, 0) / affinities.length
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15)
}
