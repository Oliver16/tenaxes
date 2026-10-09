import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireAdmin } from '@/lib/admin-auth'
import { loadBankQuestions, loadBankResponses, resolveBank } from '@/lib/admin/bank-scope'
import { computeValidation } from '@/lib/admin/question-stats'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const auth = await requireAdmin()
  if (auth.response) return auth.response

  try {
    const { bank, banks } = await resolveBank(new URL(request.url).searchParams.get('bank'))

    const [questions, responseSets, axesResult] = await Promise.all([
      loadBankQuestions(bank),
      loadBankResponses(bank),
      supabaseAdmin.from('axes').select('id, name').order('id')
    ])
    if (axesResult.error) throw axesResult.error

    const axes = ((axesResult.data || []) as { id: string; name: string }[])
      .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }))

    return NextResponse.json({
      bank,
      banks,
      generated_at: new Date().toISOString(),
      ...computeValidation(questions, axes, responseSets)
    })
  } catch (error) {
    console.error('Error computing validation stats:', error)
    return NextResponse.json({ error: 'Failed to compute validation stats' }, { status: 500 })
  }
}
