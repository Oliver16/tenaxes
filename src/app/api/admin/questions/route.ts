import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

const questionInputSchema = z.object({
  axis_id: z.string().regex(/^[CF]\d+$/),
  key: z.union([z.literal(-1), z.literal(1)]),
  text: z.string().trim().min(1).max(2000),
  educational_content: z.string().trim().max(5000).nullish(),
  display_order: z.number().int().positive().optional(),
  active: z.boolean().optional(),
  weight: z.number().min(0.01).max(10).optional(),
  question_type: z.enum(['conceptual', 'applied']).optional(),
  bank_version: z.string().trim().min(1).max(50).optional()
})

const updateSchema = z.object({
  id: z.number().int().positive(),
  updates: questionInputSchema.partial().refine(value => Object.keys(value).length > 0)
})

const deleteSchema = z.object({ id: z.number().int().positive() })
const reorderSchema = z.object({
  questionIds: z.array(z.number().int().positive()).min(1).max(500)
}).refine(value => new Set(value.questionIds).size === value.questionIds.length, {
  message: 'Question ids must be unique'
})

async function authorize() {
  return requireAdmin()
}

export async function GET(request: Request) {
  const auth = await authorize()
  if (auth.response) return auth.response

  const requestedVersion = new URL(request.url).searchParams.get('bankVersion')?.trim()
  const { data: versions, error: versionsError } = await supabaseAdmin
    .from('question_bank_versions')
    .select('id, name, question_count, status, created_at')
    .order('created_at', { ascending: false })

  if (versionsError) {
    console.error('Failed to fetch question bank versions:', versionsError)
    return NextResponse.json({ error: 'Failed to fetch question bank versions' }, { status: 500 })
  }

  const bankVersion = requestedVersion || versions?.[0]?.id || 'v2.2'
  const knownVersion = (versions || []).some(version => version.id === bankVersion)
  if (requestedVersion && !knownVersion) {
    return NextResponse.json({ error: 'Question bank version not found' }, { status: 404 })
  }

  // Supabase projects commonly cap a single response at 1,000 rows. Fetch in
  // bounded pages so historical databases never return a silently truncated
  // bank, while filtering prevents different versions from being mixed.
  const questions: any[] = []
  const pageSize = 500
  for (let from = 0; from < 5000; from += pageSize) {
    const { data, error } = await supabaseAdmin
      .from('questions')
      .select('*')
      .eq('bank_version', bankVersion)
      .order('display_order', { ascending: true })
      .range(from, from + pageSize - 1)

    if (error) {
      console.error('Failed to fetch admin question bank:', error)
      return NextResponse.json({ error: 'Failed to fetch questions' }, { status: 500 })
    }
    questions.push(...(data || []))
    if (!data || data.length < pageSize) break
  }

  const selectedVersion = (versions || []).find(version => version.id === bankVersion)
  if (selectedVersion && questions.length !== selectedVersion.question_count) {
    console.warn('Question bank count mismatch', {
      bankVersion,
      expected: selectedVersion.question_count,
      loaded: questions.length
    })
  }

  if (questions.length >= 5000) {
    return NextResponse.json({ error: 'Failed to fetch questions' }, { status: 500 })
  }

  return NextResponse.json({
    questions,
    bankVersion,
    versions: versions || []
  }, {
    headers: { 'Cache-Control': 'no-store' }
  })
}

export async function POST(request: Request) {
  const auth = await authorize()
  if (auth.response) return auth.response

  const parsed = questionInputSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid question', details: parsed.error.flatten() }, { status: 400 })
  }

  const input = parsed.data
  const bankVersion = input.bank_version || 'v2.2'
  let displayOrder = input.display_order

  if (displayOrder === undefined) {
    // display_order is unique across a bank version, not merely within an axis.
    const { data: last, error: orderError } = await supabaseAdmin
      .from('questions')
      .select('display_order')
      .eq('bank_version', bankVersion)
      .order('display_order', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (orderError) {
      return NextResponse.json({ error: 'Failed to allocate question order' }, { status: 500 })
    }
    displayOrder = (last?.display_order || 0) + 1
  }

  const { data, error } = await supabaseAdmin
    .from('questions')
    .insert({
      ...input,
      bank_version: bankVersion,
      display_order: displayOrder,
      educational_content: input.educational_content || null,
      active: input.active ?? true,
      weight: input.weight ?? 1,
      question_type: input.question_type ?? 'conceptual'
    })
    .select()
    .single()

  if (error) {
    console.error('Failed to create question:', error)
    return NextResponse.json({ error: 'Failed to create question' }, { status: 500 })
  }

  const { error: metadataError } = await supabaseAdmin
    .from('question_metadata')
    .insert({
      question_id: data.id,
      bank_version: bankVersion,
      policy_domain: 'uncategorized',
      item_family: 'base'
    })

  if (metadataError) {
    console.error('Failed to create question metadata:', metadataError)
    await supabaseAdmin.from('questions').delete().eq('id', data.id)
    return NextResponse.json({ error: 'Failed to create question metadata' }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}

export async function PATCH(request: Request) {
  const auth = await authorize()
  if (auth.response) return auth.response

  const parsed = updateSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid question update', details: parsed.error.flatten() }, { status: 400 })
  }

  const { id, updates } = parsed.data
  const { data, error } = await supabaseAdmin
    .from('questions')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .maybeSingle()

  if (error) {
    console.error('Failed to update question:', error)
    return NextResponse.json({ error: 'Failed to update question' }, { status: 500 })
  }
  if (!data) return NextResponse.json({ error: 'Question not found' }, { status: 404 })

  return NextResponse.json(data)
}

export async function DELETE(request: Request) {
  const auth = await authorize()
  if (auth.response) return auth.response

  const parsed = deleteSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid question id' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('questions')
    .delete()
    .eq('id', parsed.data.id)
    .select('id')
    .maybeSingle()

  if (error) {
    console.error('Failed to delete question:', error)
    return NextResponse.json({ error: 'Failed to delete question' }, { status: 500 })
  }
  if (!data) return NextResponse.json({ error: 'Question not found' }, { status: 404 })

  return NextResponse.json({ success: true })
}

export async function PUT(request: Request) {
  const auth = await authorize()
  if (auth.response) return auth.response

  const parsed = reorderSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid question order' }, { status: 400 })
  }

  const { questionIds } = parsed.data
  const { data: questions, error: fetchError } = await supabaseAdmin
    .from('questions')
    .select('id, axis_id, bank_version, display_order')
    .in('id', questionIds)

  if (fetchError || !questions || questions.length !== questionIds.length) {
    return NextResponse.json({ error: 'One or more questions were not found' }, { status: 404 })
  }

  const bankVersions = new Set(questions.map(question => question.bank_version))
  if (bankVersions.size !== 1) {
    return NextResponse.json({ error: 'Questions from different bank versions cannot be reordered together' }, { status: 400 })
  }
  const axes = new Set(questions.map(question => question.axis_id))
  if (axes.size !== 1) {
    return NextResponse.json({ error: 'Only questions from one axis can be reordered together' }, { status: 400 })
  }

  const targetOrders = questions
    .map(question => question.display_order)
    .sort((a, b) => a - b)

  // Move selected rows out of the positive display-order range before assigning
  // their final positions, avoiding the bank/order uniqueness constraint while
  // two rows exchange positions.
  for (let index = 0; index < questionIds.length; index++) {
    const { error } = await supabaseAdmin
      .from('questions')
      .update({ display_order: -(index + 1) })
      .eq('id', questionIds[index])
    if (error) return NextResponse.json({ error: 'Failed to reorder questions' }, { status: 500 })
  }

  // Reuse exactly the display-order slots this axis already occupied, preserving
  // the relative placement of every other axis in the survey.
  for (let index = 0; index < questionIds.length; index++) {
    const { error } = await supabaseAdmin
      .from('questions')
      .update({ display_order: targetOrders[index], updated_at: new Date().toISOString() })
      .eq('id', questionIds[index])
    if (error) return NextResponse.json({ error: 'Failed to reorder questions' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
