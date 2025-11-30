import { supabase } from './supabase'
import { AXES, ITEMS, type AxisId } from './instrument'

export type Question = {
  id: number
  axis_id: string
  key: 1 | -1
  text: string
  display_order: number
  active: boolean
  created_at?: string
  updated_at?: string
}

export type QuestionInput = {
  axis_id: string
  key: 1 | -1
  text: string
  display_order?: number
  active?: boolean
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
  Object.keys(AXES).forEach(axisId => {
    grouped[axisId] = []
  })

  data?.forEach(q => {
    if (grouped[q.axis_id]) {
      grouped[q.axis_id].push(q)
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
      display_order: item.order,
      active: true
    }))
  }

  // If no questions in DB, return hardcoded ones
  if (!data || data.length === 0) {
    return ITEMS.map((item, i) => ({
      id: item.id,
      axis_id: item.axis,
      key: item.key,
      text: item.text,
      display_order: item.order,
      active: true
    }))
  }

  return data
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

  return data || []
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

    displayOrder = existing && existing.length > 0 ? existing[0].display_order + 1 : 1
  }

  const { data, error } = await supabase
    .from('questions')
    .insert({
      axis_id: input.axis_id,
      key: input.key,
      text: input.text,
      display_order: displayOrder,
      active: input.active ?? true
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating question:', error)
    return null
  }

  return data
}

// Update an existing question
export async function updateQuestion(id: number, updates: Partial<QuestionInput>): Promise<Question | null> {
  const { data, error } = await supabase
    .from('questions')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating question:', error)
    return null
  }

  return data
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
  const { error } = await supabase
    .from('questions')
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
    supabase
      .from('questions')
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
    id,
    ...axis,
    isCore: !axis.is_facet,
    isFacet: !!axis.is_facet
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
    display_order: item.order,
    active: true
  }))

  const { error } = await supabase
    .from('questions')
    .insert(questions)

  if (error) {
    console.error('Error seeding questions:', error)
    return false
  }

  return true
}
