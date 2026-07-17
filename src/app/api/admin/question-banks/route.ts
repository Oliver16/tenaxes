import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

const createVersionSchema = z.object({
  sourceVersion: z.string().trim().min(1).max(50),
  version: z.string().trim().regex(/^v[0-9]+(?:\.[0-9]+){1,2}(?:-[a-z0-9.-]+)?$/i, 'Use a version such as v2.3'),
  name: z.string().trim().min(1).max(150),
  notes: z.string().trim().max(2000).optional()
})
const publishVersionSchema = z.object({
  version: z.string().trim().min(1).max(50),
  action: z.literal('publish')
})

export async function POST(request: Request) {
  const auth = await requireAdmin()
  if (auth.response) return auth.response

  const parsed = createVersionSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid bank version', details: parsed.error.flatten() }, { status: 400 })
  }

  const { sourceVersion, version, name, notes } = parsed.data
  const { data, error } = await supabaseAdmin.rpc('clone_question_bank_version', {
    p_source_version: sourceVersion,
    p_new_version: version,
    p_name: name,
    p_notes: notes || null
  })

  if (error) {
    console.error('Failed to clone question bank version:', error)
    const conflict = /already exists/i.test(error.message)
    return NextResponse.json(
      { error: conflict ? 'That bank version already exists' : 'Failed to create bank version' },
      { status: conflict ? 409 : 500 }
    )
  }

  return NextResponse.json({
    success: true,
    bankVersion: version,
    questionCount: Number(data || 0)
  }, { status: 201 })
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin()
  if (auth.response) return auth.response

  const parsed = publishVersionSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid publish request' }, { status: 400 })
  }

  const { error } = await supabaseAdmin.rpc('publish_question_bank_version', {
    p_bank_version: parsed.data.version
  })
  if (error) {
    console.error('Failed to publish question bank version:', error)
    return NextResponse.json({ error: error.message || 'Failed to publish bank version' }, { status: 500 })
  }

  return NextResponse.json({ success: true, bankVersion: parsed.data.version })
}
