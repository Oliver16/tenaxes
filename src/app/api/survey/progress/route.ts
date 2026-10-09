import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

// Progress beacons from the survey page. Only question ids are recorded
// (which were seen, answered, marked "not sure", or passed over), never
// answer values, so admins can see skips and drop-off without partial
// answers ever leaving the device.
const idList = z.array(z.number().int().positive()).max(1000)

const progressSchema = z.object({
  client_session_id: z.string().regex(/^[A-Za-z0-9_-]{8,64}$/),
  bank_version: z.string().trim().min(1).max(50),
  // Accepted for compatibility but ignored; the server knows the bank size
  question_count: z.number().int().min(0).max(1000).optional(),
  answered_ids: idList,
  not_sure_ids: idList,
  skipped_ids: idList,
  viewed_ids: idList,
  last_question_id: z.number().int().positive().nullable()
})

// Beacons are only accepted for the live bank and its real question ids,
// so arbitrary callers can't plant junk banks, ids, or counts. Cached
// briefly to avoid a database round trip per beacon.
const LIVE_BANK_TTL_MS = 5 * 60_000
let liveBankCache: { bank: string; ids: Set<number>; expires: number } | null = null

async function liveBank(): Promise<{ bank: string; ids: Set<number> } | null> {
  if (liveBankCache && liveBankCache.expires > Date.now()) return liveBankCache
  const { data: version, error: versionError } = await supabaseAdmin
    .from('question_bank_versions')
    .select('id')
    .eq('status', 'published')
    .maybeSingle()
  if (versionError || !version) return null
  const { data: rows, error } = await supabaseAdmin
    .from('questions')
    .select('id')
    .eq('bank_version', version.id)
    .eq('active', true)
  if (error) return null
  liveBankCache = {
    bank: version.id,
    ids: new Set((rows || []).map(r => r.id as number)),
    expires: Date.now() + LIVE_BANK_TTL_MS
  }
  return liveBankCache
}

export async function POST(request: NextRequest) {
  const parsed = progressSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid progress payload' }, { status: 400 })
  }

  const p = parsed.data
  const live = await liveBank()
  const known = (ids: number[]) => !!live && ids.every(id => live.ids.has(id))
  if (
    !live ||
    p.bank_version !== live.bank ||
    !known(p.answered_ids) || !known(p.not_sure_ids) ||
    !known(p.skipped_ids) || !known(p.viewed_ids) ||
    (p.last_question_id !== null && !live.ids.has(p.last_question_id))
  ) {
    return NextResponse.json({ error: 'Progress does not match the live question bank' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('survey_sessions')
    .upsert({
      client_session_id: p.client_session_id,
      bank_version: p.bank_version,
      question_count: live.ids.size,
      answered_ids: p.answered_ids,
      not_sure_ids: p.not_sure_ids,
      skipped_ids: p.skipped_ids,
      viewed_ids: p.viewed_ids,
      last_question_id: p.last_question_id,
      last_activity_at: new Date().toISOString()
    }, { onConflict: 'client_session_id' })

  if (error) {
    // Tracking is best-effort; the survey itself never depends on it.
    console.error('Failed to record survey progress:', error.message)
    return NextResponse.json({ error: 'Failed to record progress' }, { status: 500 })
  }

  return new NextResponse(null, { status: 204 })
}
