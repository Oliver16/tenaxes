import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireAdmin } from '@/lib/admin-auth'
import { loadBankQuestions, loadBankResponses, resolveBank } from '@/lib/admin/bank-scope'
import { computeEngagement, type SessionProgress } from '@/lib/admin/question-stats'

export const dynamic = 'force-dynamic'

const MAX_SESSIONS = 10000

export async function GET(request: Request) {
  const auth = await requireAdmin()
  if (auth.response) return auth.response

  try {
    const { bank, banks } = await resolveBank(new URL(request.url).searchParams.get('bank'))

    const [questions, responseSets, sessionsResult] = await Promise.all([
      loadBankQuestions(bank),
      loadBankResponses(bank),
      supabaseAdmin
        .from('survey_sessions')
        .select('answered_ids, not_sure_ids, skipped_ids, viewed_ids, last_question_id, question_count, started_at, last_activity_at, completed_at')
        .eq('bank_version', bank)
        .order('last_activity_at', { ascending: false })
        .limit(MAX_SESSIONS)
    ])

    // Before the tracking migration is applied, still report "not sure"
    // rates from completed responses rather than failing the whole page.
    const trackingAvailable = !sessionsResult.error
    if (sessionsResult.error) {
      console.error('Survey session tracking unavailable:', sessionsResult.error.message)
    }
    const sessions = (sessionsResult.data || []) as SessionProgress[]

    return NextResponse.json({
      bank,
      banks,
      generated_at: new Date().toISOString(),
      tracking_available: trackingAvailable,
      ...computeEngagement(questions, sessions, responseSets)
    })
  } catch (error) {
    console.error('Error computing engagement stats:', error)
    return NextResponse.json({ error: 'Failed to compute engagement stats' }, { status: 500 })
  }
}
