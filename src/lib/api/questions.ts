import { createClient } from '@/lib/supabase/client'
import { QuestionWithLinks } from '@/lib/database.types'

/**
 * Fetch all active questions with their axis links.
 *
 * Pass `bankVersion` when interpreting a stored result: historical
 * responses must be scored against the bank they were answered on, even
 * if some of its questions have since been deactivated (inactive
 * questions are included in that mode).
 */
export async function fetchQuestionsWithLinks(
  options?: { bankVersion?: string | null }
): Promise<QuestionWithLinks[]> {
  const supabase = createClient()

  let query = supabase
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

  if (options?.bankVersion) {
    query = query.eq('bank_version', options.bankVersion)
  } else {
    query = query.eq('active', true)
  }

  const { data, error } = await query.order('display_order', { ascending: true })

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
