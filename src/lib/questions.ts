import { supabase } from './supabase'
import { AXES, type AxisId } from './instrument'
import { BANK_ITEMS, BANK_VERSION } from './question-bank'

const normalizeQuestion = (q: any): Question => ({
  ...q,
  weight: q.weight ?? 1.0,
  question_type: q.question_type ?? 'conceptual',
  question_axis_links: q.question_axis_links || [],
  question_metadata: Array.isArray(q.question_metadata)
    ? q.question_metadata[0] || null
    : q.question_metadata || null
})

export type QuestionAxisLinkInput = {
  axis_id: string
  role: 'secondary' | 'tradeoff'
  axis_key: 1 | -1
  weight: number
}

export type QuestionMetadataInput = {
  policy_domain: string
  latent_conflict?: string
  actor_level?: string
  policy_instrument?: string
  scenario_conditions?: string
  item_family: 'base' | 'collision' | 'controversy_stress'
  collision_pair?: string
}

export type QuestionAxisLink = Omit<QuestionAxisLinkInput, 'role'> & {
  role: 'primary' | 'secondary' | 'tradeoff'
  id: number
  question_id: number
}

export type QuestionMetadata = QuestionMetadataInput & {
  question_id: number
  bank_version: string
}

export type Question = {
  id: number
  axis_id: string
  key: 1 | -1
  text: string
  educational_content?: string
  display_order: number
  active: boolean
  weight: number
  question_type: 'conceptual' | 'applied'
  bank_version?: string
  question_axis_links: QuestionAxisLink[]
  question_metadata: QuestionMetadata | null
  created_at?: string
  updated_at?: string
}

export type QuestionInput = {
  axis_id: string
  key: 1 | -1
  text: string
  educational_content?: string
  display_order?: number
  active?: boolean
  weight?: number
  question_type?: 'conceptual' | 'applied'
  bank_version?: string
  axis_links?: QuestionAxisLinkInput[]
  metadata?: QuestionMetadataInput
}

export type QuestionBankVersion = {
  id: string
  name: string
  question_count: number
  status: 'draft' | 'published' | 'archived'
  created_at: string
}

export type AdminQuestionBank = {
  grouped: Record<string, Question[]>
  questions: Question[]
  bankVersion: string
  versions: QuestionBankVersion[]
}

export type CreateQuestionBankVersionInput = {
  sourceVersion: string
  version: string
  name: string
  notes?: string
}

export async function createQuestionBankVersion(input: CreateQuestionBankVersionInput): Promise<{ bankVersion: string; questionCount: number }> {
  const response = await fetch('/api/admin/question-banks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.error || 'Failed to create question bank version')
  return body
}

export async function publishQuestionBankVersion(version: string): Promise<void> {
  const response = await fetch('/api/admin/question-banks', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ version, action: 'publish' })
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.error || 'Failed to publish question bank version')
}

// Fetch all questions grouped by axis
export async function fetchAllQuestions(bankVersion?: string): Promise<AdminQuestionBank> {
  const query = bankVersion ? `?bankVersion=${encodeURIComponent(bankVersion)}` : ''
  const response = await fetch(`/api/admin/questions${query}`, { cache: 'no-store' })
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.error || 'Failed to fetch questions')
  }
  const payload = await response.json()
  const data = payload.questions || []

  // Group by axis
  const grouped: Record<string, Question[]> = {}
  for (const axisId of Object.keys(AXES)) {
    grouped[axisId] = []
  }

  (data as any)?.forEach((q: any) => {
    if (grouped[q.axis_id]) {
      grouped[q.axis_id].push(normalizeQuestion(q))
    }
  })

  const questions = data.map(normalizeQuestion)
  return {
    grouped,
    questions,
    bankVersion: payload.bankVersion,
    versions: payload.versions || []
  }
}

// Fetch active questions for survey
export async function fetchActiveQuestions(): Promise<Question[]> {
  const { data: publishedVersion, error: versionError } = await supabase
    .from('question_bank_versions')
    .select('id')
    .eq('status', 'published')
    .maybeSingle()
  const liveBankVersion = (publishedVersion as { id: string } | null)?.id || BANK_VERSION
  if (versionError) console.warn('Could not resolve published question bank; using the bundled version', versionError)

  const { data, error } = await supabase
    .from('questions')
    .select('*')
    .eq('active', true)
    .eq('bank_version', liveBankVersion)
    .order('display_order', { ascending: true })

  if (error) {
    console.error('Error fetching active questions:', error)
    throw new Error(`Failed to fetch active questions: ${error.message}`)
  }

  // If no questions in DB, that's a real problem
  if (!data || data.length === 0) {
    console.warn('No active questions found in database')
    return []
  }

  console.log(`Loaded ${data.length} active questions from database`)
  console.log('Question types:', data.reduce((acc: any, q: any) => {
    acc[q.question_type] = (acc[q.question_type] || 0) + 1
    return acc
  }, {}))

  return data.map(normalizeQuestion)
}

// Fetch questions for a specific axis
export async function fetchQuestionsByAxis(axisId: string): Promise<Question[]> {
  const { data: publishedVersion } = await supabase
    .from('question_bank_versions')
    .select('id')
    .eq('status', 'published')
    .maybeSingle()
  const { data, error } = await supabase
    .from('questions')
    .select('*')
    .eq('axis_id', axisId)
    .eq('bank_version', (publishedVersion as { id: string } | null)?.id || BANK_VERSION)
    .order('display_order', { ascending: true })

  if (error) {
    console.error('Error fetching questions for axis:', error)
    return []
  }

  return (data || []).map(normalizeQuestion)
}

// Create a new question
export async function createQuestion(input: QuestionInput): Promise<Question | null> {
  const response = await fetch('/api/admin/questions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  })
  if (!response.ok) {
    console.error('Error creating question:', await response.text())
    return null
  }
  return normalizeQuestion(await response.json())
}

// Update an existing question
export async function updateQuestion(id: number, updates: Partial<QuestionInput>): Promise<Question | null> {
  const response = await fetch('/api/admin/questions', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, updates })
  })
  if (!response.ok) {
    console.error('Error updating question:', await response.text())
    return null
  }
  return normalizeQuestion(await response.json())
}

// Delete a question
export async function deleteQuestion(id: number): Promise<boolean> {
  const response = await fetch('/api/admin/questions', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id })
  })
  if (!response.ok) console.error('Error deleting question:', await response.text())
  return response.ok
}

// Toggle question active status
export async function toggleQuestionActive(id: number, active: boolean): Promise<boolean> {
  return !!(await updateQuestion(id, { active }))
}

// Reorder questions within an axis
export async function reorderQuestions(axisId: string, questionIds: number[]): Promise<boolean> {
  const response = await fetch('/api/admin/questions', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ questionIds })
  })
  if (!response.ok) console.error('Error reordering questions:', await response.text())
  return response.ok
}

// Get axis metadata
export function getAxisInfo(axisId: string) {
  return AXES[axisId as AxisId] || null
}

// Get all axes
export function getAllAxes() {
  return Object.entries(AXES).map(([id, axis]) => ({
    ...axis,
    isCore: !(axis as any).is_facet,
    isFacet: !!(axis as any).is_facet
  }))
}

// Seed database with default questions (utility function)
export async function seedQuestions(): Promise<boolean> {
  // Check if questions already exist
  const { count } = await supabase
    .from('questions')
    .select('*', { count: 'exact', head: true })

  if (count && count > 0) {
    console.log('Questions already seeded')
    return true
  }

  // Insert all default questions. Note: this seeds the questions table
  // only; the collision scenarios' tradeoff links live in
  // question_axis_links and come from supabase/fresh_install.sql.
  const questions = BANK_ITEMS.map(item => ({
    axis_id: item.axis,
    key: item.key,
    text: item.text,
    educational_content: item.educational_content,
    display_order: item.order,
    active: true,
    weight: item.weight,
    question_type: item.question_type
  }))

  const { error } = await supabase
    .from('questions')
    .insert(questions as any)

  if (error) {
    console.error('Error seeding questions:', error)
    return false
  }

  return true
}
