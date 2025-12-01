import { supabase } from './supabase'
import { AXES, ITEMS, type AxisId } from './instrument'

const normalizeQuestion = (q: any): Question => ({
  ...q,
  weight: q.weight ?? 1.0,
  question_type: q.question_type ?? 'conceptual'
})

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
}

// Fetch all questions grouped by axis
export async function fetchAllQuestions(): Promise<Record<string, Question[]>> {
  const { data, error } = await supabase
    .from('questions')
    .select('*')
    .order('display_order', { ascending: true })

  if (error) {
    console.error('Error fetching questions:', error)
    return {}
  }

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

  return grouped
}

// Fetch active questions for survey
export async function fetchActiveQuestions(): Promise<Question[]> {
  const { data, error } = await supabase
    .from('questions')
    .select('*')
    .eq('active', true)
    .order('display_order', { ascending: true })

  if (error) {
    console.error('Error fetching active questions:', error)
    // Fallback to hardcoded questions
    return ITEMS.map((item, i) => ({
      id: item.id,
      axis_id: item.axis,
      key: item.key,
      text: item.text,
      educational_content: item.educational_content,
      display_order: item.order,
      active: true,
      weight: 1.0,
      question_type: 'conceptual'
    }))
  }

  // If no questions in DB, return hardcoded ones
  if (!data || data.length === 0) {
    return ITEMS.map((item, i) => ({
      id: item.id,
      axis_id: item.axis,
      key: item.key,
      text: item.text,
      educational_content: item.educational_content,
      display_order: item.order,
      active: true,
      weight: 1.0,
      question_type: 'conceptual'
    }))
  }

  return data.map(normalizeQuestion)
}

// Fetch questions for a specific axis
export async function fetchQuestionsByAxis(axisId: string): Promise<Question[]> {
  const { data, error } = await supabase
    .from('questions')
    .select('*')
    .eq('axis_id', axisId)
    .order('display_order', { ascending: true })

  if (error) {
    console.error('Error fetching questions for axis:', error)
    return []
  }

  return (data || []).map(normalizeQuestion)
}

// Create a new question
export async function createQuestion(input: QuestionInput): Promise<Question | null> {
  // Get max display_order for this axis if not provided
  let displayOrder = input.display_order
  if (displayOrder === undefined) {
    const { data: existing } = await supabase
      .from('questions')
      .select('display_order')
      .eq('axis_id', input.axis_id)
      .order('display_order', { ascending: false })
      .limit(1)

    displayOrder = existing && existing.length > 0 ? (existing as any)[0].display_order + 1 : 1
  }

  const { data, error } = await supabase
    .from('questions')
    .insert({
      axis_id: input.axis_id,
      key: input.key,
      text: input.text,
      educational_content: input.educational_content,
      display_order: displayOrder,
      active: input.active ?? true,
      weight: input.weight ?? 1.0,
      question_type: input.question_type ?? 'conceptual'
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating question:', error)
    return null
  }

  return data ? normalizeQuestion(data) : null
}

// Update an existing question
export async function updateQuestion(id: number, updates: Partial<QuestionInput>): Promise<Question | null> {
  const { data, error } = await (supabase
    .from('questions') as any)
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating question:', error)
    return null
  }

  return data ? normalizeQuestion(data) : null
}

// Delete a question
export async function deleteQuestion(id: number): Promise<boolean> {
  const { error } = await supabase
    .from('questions')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting question:', error)
    return false
  }

  return true
}

// Toggle question active status
export async function toggleQuestionActive(id: number, active: boolean): Promise<boolean> {
  const { error } = await (supabase
    .from('questions') as any)
    .update({ active })
    .eq('id', id)

  if (error) {
    console.error('Error toggling question:', error)
    return false
  }

  return true
}

// Reorder questions within an axis
export async function reorderQuestions(axisId: string, questionIds: number[]): Promise<boolean> {
  // Update each question's display_order
  const updates = questionIds.map((id, index) =>
    (supabase
      .from('questions') as any)
      .update({ display_order: index + 1 })
      .eq('id', id)
  )

  try {
    await Promise.all(updates)
    return true
  } catch (error) {
    console.error('Error reordering questions:', error)
    return false
  }
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

  // Insert all default questions
  const questions = ITEMS.map(item => ({
    axis_id: item.axis,
    key: item.key,
    text: item.text,
    educational_content: item.educational_content,
    display_order: item.order,
    active: true,
    weight: 1.0,
    question_type: 'conceptual'
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
