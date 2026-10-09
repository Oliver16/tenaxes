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
  question_count: z.number().int().min(0).max(1000),
  answered_ids: idList,
  not_sure_ids: idList,
  skipped_ids: idList,
  viewed_ids: idList,
  last_question_id: z.number().int().positive().nullable()
})

export async function POST(request: NextRequest) {
  const parsed = progressSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid progress payload' }, { status: 400 })
  }

  const p = parsed.data
  const { error } = await supabaseAdmin
    .from('survey_sessions')
    .upsert({
      client_session_id: p.client_session_id,
      bank_version: p.bank_version,
      question_count: p.question_count,
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
