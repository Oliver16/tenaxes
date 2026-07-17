import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

const optionalMetadataText = z.string().trim().max(300).nullish()
const metadataSchema = z.object({
  policy_domain: z.string().trim().min(1).max(200),
  latent_conflict: optionalMetadataText,
  actor_level: optionalMetadataText,
  policy_instrument: optionalMetadataText,
  scenario_conditions: z.string().trim().max(1000).nullish(),
  item_family: z.enum(['base', 'collision', 'controversy_stress']),
  collision_pair: z.string().trim().max(100).nullish()
})
const axisLinkSchema = z.object({
  axis_id: z.string().regex(/^[CF]\d+$/),
  role: z.enum(['secondary', 'tradeoff']),
  axis_key: z.union([z.literal(-1), z.literal(1)]),
  weight: z.number().min(0.01).max(10)
})
const questionInputObject = z.object({
  axis_id: z.string().regex(/^[CF]\d+$/),
  key: z.union([z.literal(-1), z.literal(1)]),
  text: z.string().trim().min(1).max(2000),
  educational_content: z.string().trim().max(5000).nullish(),
  display_order: z.number().int().positive().optional(),
  active: z.boolean().optional(),
  weight: z.number().min(0.01).max(10).optional(),
  question_type: z.enum(['conceptual', 'applied']).optional(),
  bank_version: z.string().trim().min(1).max(50).optional(),
  metadata: metadataSchema.optional(),
  axis_links: z.array(axisLinkSchema).max(34).optional()
})

function validateConfiguration(value: z.infer<typeof questionInputObject>, context: z.RefinementCtx) {
  const links = value.axis_links || []
  const identities = new Set<string>()
  for (const [index, link] of links.entries()) {
    const identity = `${link.axis_id}:${link.role}`
    if (identities.has(identity)) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ['axis_links', index], message: 'Duplicate axis and role' })
    }
    identities.add(identity)
    if (link.axis_id === value.axis_id) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ['axis_links', index, 'axis_id'], message: 'Cross-axis links must use another axis' })
    }
  }
  const tradeoffCount = links.filter(link => link.role === 'tradeoff').length
  if (tradeoffCount > 0 && value.metadata?.item_family !== 'collision') {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['metadata', 'item_family'], message: 'Tradeoff links require collision metadata' })
  }
  if (value.metadata?.item_family === 'collision') {
    if (tradeoffCount !== 1) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ['axis_links'], message: 'Collision questions require exactly one tradeoff link' })
    }
    if (!value.metadata.collision_pair) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ['metadata', 'collision_pair'], message: 'Collision pair ID is required' })
    }
  } else if (value.metadata?.collision_pair) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['metadata', 'collision_pair'], message: 'Collision pair IDs are only valid for collision items' })
  }
}

const questionInputSchema = questionInputObject.superRefine(validateConfiguration)

const updateSchema = z.object({
  id: z.number().int().positive(),
  updates: questionInputObject.partial().refine(value => Object.keys(value).length > 0)
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

async function isDraftBank(bankVersion: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('question_bank_versions')
    .select('status')
    .eq('id', bankVersion)
    .maybeSingle()
  return data?.status === 'draft'
}

const questionSelect = '*, question_axis_links (*), question_metadata (*)'

async function saveConfiguredQuestion(
  input: z.infer<typeof questionInputObject>,
  questionId: number | null,
  bankVersion: string
) {
  const metadata = input.metadata || { policy_domain: 'uncategorized', item_family: 'base' as const }
  const { data: savedId, error } = await supabaseAdmin.rpc('save_question_configuration', {
    p_question_id: questionId,
    p_axis_id: input.axis_id,
    p_key: input.key,
    p_text: input.text,
    p_educational_content: input.educational_content || '',
    p_display_order: input.display_order ?? null,
    p_active: input.active ?? true,
    p_weight: input.weight ?? 1,
    p_question_type: input.question_type ?? 'conceptual',
    p_bank_version: bankVersion,
    p_metadata: metadata,
    p_axis_links: input.axis_links || []
  })
  if (error) throw error

  const { data, error: fetchError } = await supabaseAdmin
    .from('questions')
    .select(questionSelect)
    .eq('id', Number(savedId))
    .single()
  if (fetchError) throw fetchError
  return data
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
      .select(questionSelect)
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

  try {
    const input = parsed.data
    const bankVersion = input.bank_version || 'v2.2'
    if (!await isDraftBank(bankVersion)) {
      return NextResponse.json({ error: 'Published and archived banks are read-only; create a draft revision first' }, { status: 409 })
    }
    const data = await saveConfiguredQuestion(input, null, bankVersion)
    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Failed to create question configuration:', error)
    return NextResponse.json({ error: 'Failed to create question configuration' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  const auth = await authorize()
  if (auth.response) return auth.response

  const parsed = updateSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid question update', details: parsed.error.flatten() }, { status: 400 })
  }

  const { id, updates } = parsed.data
  const { data: existing, error: existingError } = await supabaseAdmin
    .from('questions')
    .select('bank_version')
    .eq('id', id)
    .maybeSingle()
  if (existingError) return NextResponse.json({ error: 'Failed to load question' }, { status: 500 })
  if (!existing) return NextResponse.json({ error: 'Question not found' }, { status: 404 })
  if (!await isDraftBank(existing.bank_version)) {
    return NextResponse.json({ error: 'Published and archived banks are read-only; create a draft revision first' }, { status: 409 })
  }

  const isConfigurationSave = updates.metadata !== undefined || updates.axis_links !== undefined

  if (isConfigurationSave) {
    const fullInput = questionInputSchema.safeParse({ ...updates, bank_version: existing.bank_version })
    if (!fullInput.success || !fullInput.data.metadata || !fullInput.data.axis_links) {
      return NextResponse.json({ error: 'Complete metadata and scoring links are required', details: fullInput.success ? undefined : fullInput.error.flatten() }, { status: 400 })
    }
    try {
      const data = await saveConfiguredQuestion(fullInput.data, id, existing.bank_version)
      return NextResponse.json(data)
    } catch (error) {
      console.error('Failed to update question configuration:', error)
      return NextResponse.json({ error: 'Failed to update question configuration' }, { status: 500 })
    }
  }

  const { metadata: _metadata, axis_links: _axisLinks, ...baseUpdates } = updates
  const { data, error } = await supabaseAdmin
    .from('questions')
    .update({ ...baseUpdates, updated_at: new Date().toISOString() })
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

  const { data: existing } = await supabaseAdmin
    .from('questions')
    .select('bank_version')
    .eq('id', parsed.data.id)
    .maybeSingle()
  if (!existing) return NextResponse.json({ error: 'Question not found' }, { status: 404 })
  if (!await isDraftBank(existing.bank_version)) {
    return NextResponse.json({ error: 'Published and archived banks are read-only; create a draft revision first' }, { status: 409 })
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
  const bankVersion = questions[0].bank_version
  if (!await isDraftBank(bankVersion)) {
    return NextResponse.json({ error: 'Published and archived banks are read-only; create a draft revision first' }, { status: 409 })
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
