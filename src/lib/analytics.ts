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
    const response = await fetch('/api/admin/analytics')
    if (!response.ok) {
      console.error('Failed to fetch analytics:', await response.text())
      return null
    }

    const data: AnalyticsData = await response.json()
    return data
  } catch (error) {
    console.error('Error fetching analytics:', error)
    return null
  }
}
