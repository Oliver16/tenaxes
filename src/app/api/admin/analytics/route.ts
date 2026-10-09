import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import type { AnalyticsData } from '@/lib/analytics'
import { aggregateByDay, computeAxisAggregates, computeFlavorPopularity } from '@/lib/analytics-utils'
import { requireAdmin } from '@/lib/admin-auth'
import { resolveBank } from '@/lib/admin/bank-scope'

export const dynamic = 'force-dynamic'

export async function GET() {
  const auth = await requireAdmin()
  if (auth.response) return auth.response

  try {
    // Total response count
    const { count: totalResponses, error: totalError } = await supabaseAdmin
      .from('survey_responses')
      .select('*', { count: 'exact', head: true })

    if (totalError) throw totalError

    // Responses last 7 days
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const { count: responsesLast7Days, error: sevenDayError } = await supabaseAdmin
      .from('survey_responses')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', sevenDaysAgo.toISOString())

    if (sevenDayError) throw sevenDayError

    // Responses last 30 days
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const { count: responsesLast30Days, error: thirtyDayError } = await supabaseAdmin
      .from('survey_responses')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', thirtyDaysAgo.toISOString())

    if (thirtyDayError) throw thirtyDayError

    // Daily counts (last 30 days)
    const { data: responseData, error: responseError } = await supabaseAdmin
      .from('survey_responses')
      .select('created_at')
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: true })

    if (responseError) throw responseError

    const dailyCounts = aggregateByDay(responseData || [])

    // Score aggregates are only comparable within one bank (axis ids have
    // changed meaning between versions, e.g. F5), so they cover the live bank.
    const { bank } = await resolveBank(null)

    const { data: resultsData, error: resultsError } = await supabaseAdmin
      .from('survey_results')
      .select('core_axes, facets, top_flavors')
      .eq('bank_version', bank)

    if (resultsError) throw resultsError

    const axisAggregates = computeAxisAggregates(resultsData || [])

    const flavorPopularity = computeFlavorPopularity(resultsData || [])

    // Recent sessions
    const { data: recentData, error: recentError } = await supabaseAdmin
      .from('survey_responses')
      .select('session_id')
      .order('created_at', { ascending: false })
      .limit(10)

    if (recentError) throw recentError

    const recentSessions = (recentData || []).map(r => r.session_id)

    const payload: AnalyticsData = {
      bank,
      totalResponses: totalResponses || 0,
      responsesLast7Days: responsesLast7Days || 0,
      responsesLast30Days: responsesLast30Days || 0,
      dailyCounts,
      axisAggregates,
      flavorPopularity,
      recentSessions
    }

    return NextResponse.json(payload)
  } catch (error) {
    console.error('Error fetching analytics:', error)
    return NextResponse.json({ error: 'Failed to fetch analytics data' }, { status: 500 })
  }
}
