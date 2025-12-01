import { createClient } from '@/lib/supabase/client'
import { QuestionWithLinks } from '@/lib/database.types'

/**
 * Fetch all active questions with their axis links
 */
export async function fetchQuestionsWithLinks(): Promise<QuestionWithLinks[]> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('questions')
    .select(`
      *,
      question_axis_links (
        id,
        question_id,
        axis_id,
        role,
        axis_key,
        weight,
        created_at
      )
    `)
    .eq('active', true)
    .order('display_order', { ascending: true })
  
  if (error) {
    console.error('Error fetching questions:', error)
    throw error
  }
  
  return (data || []) as QuestionWithLinks[]
}

/**
 * Fetch questions filtered by type
 */
export async function fetchQuestionsByType(
  type: 'conceptual' | 'applied'
): Promise<QuestionWithLinks[]> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('questions')
    .select(`
      *,
      question_axis_links (
        id,
        question_id,
        axis_id,
        role,
        axis_key,
        weight
      )
    `)
    .eq('active', true)
    .eq('question_type', type)
    .order('display_order', { ascending: true })
  
  if (error) {
    console.error('Error fetching questions:', error)
    throw error
  }
  
  return (data || []) as QuestionWithLinks[]
}
