import { supabase } from './supabase'

export type DailyCount = {
  date: string
  count: number
}

export type AxisAggregate = {
  axis_id: string
  axis_name: string
  avg_score: number
  std_dev: number
  sample_size: number
}

export type FlavorPopularity = {
  flavor_name: string
  count: number
  avg_affinity: number
}

export type AnalyticsData = {
  totalResponses: number
  responsesLast7Days: number
  responsesLast30Days: number
  dailyCounts: DailyCount[]
  axisAggregates: AxisAggregate[]
  flavorPopularity: FlavorPopularity[]
  recentSessions: string[]
}

export async function fetchAnalytics(): Promise<AnalyticsData | null> {
  try {
    // Total response count
    const { count: totalResponses } = await supabase
      .from('survey_responses')
      .select('*', { count: 'exact', head: true })

    // Responses last 7 days
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const { count: responsesLast7Days } = await supabase
      .from('survey_responses')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', sevenDaysAgo.toISOString())

    // Responses last 30 days
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const { count: responsesLast30Days } = await supabase
      .from('survey_responses')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', thirtyDaysAgo.toISOString())

    // Daily counts (last 30 days)
    const { data: responseData } = await supabase
      .from('survey_responses')
      .select('created_at')
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: true })

    const dailyCounts = aggregateByDay(responseData || [])

    // Axis aggregates - fetch all results and compute
    const { data: resultsData } = await supabase
      .from('survey_results')
      .select('core_axes, facets')

    const axisAggregates = computeAxisAggregates(resultsData || [])

    // Flavor popularity
    const { data: flavorData } = await supabase
      .from('survey_results')
      .select('top_flavors')

    const flavorPopularity = computeFlavorPopularity(flavorData || [])

    // Recent sessions
    const { data: recentData } = await supabase
      .from('survey_responses')
      .select('session_id')
      .order('created_at', { ascending: false })
      .limit(10)

    const recentSessions = (recentData || []).map(r => r.session_id)

    return {
      totalResponses: totalResponses || 0,
      responsesLast7Days: responsesLast7Days || 0,
      responsesLast30Days: responsesLast30Days || 0,
      dailyCounts,
      axisAggregates,
      flavorPopularity,
      recentSessions
    }
  } catch (error) {
    console.error('Error fetching analytics:', error)
    return null
  }
}

function aggregateByDay(data: { created_at: string }[]): DailyCount[] {
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

function computeAxisAggregates(data: { core_axes: any[], facets: any[] }[]): AxisAggregate[] {
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

  return Object.entries(axisScores).map(([axis_id, { name, scores }]) => {
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
  }).sort((a, b) => a.axis_id.localeCompare(b.axis_id))
}

function computeFlavorPopularity(data: { top_flavors: any[] }[]): FlavorPopularity[] {
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
