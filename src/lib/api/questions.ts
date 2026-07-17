import { createClient } from '@/lib/supabase/client'
import { QuestionWithLinks } from '@/lib/database.types'
import { BANK_VERSION } from '@/lib/question-bank'

/**
 * Fetch all active questions with their axis links.
 *
 * Pass `bankVersion` when interpreting a stored result: historical
 * responses must be scored against the bank they were answered on, even
 * if some of its questions have since been deactivated (inactive
 * questions are included in that mode).
 */
export async function fetchQuestionsWithLinks(
  options?: { bankVersion?: string | null; questionIds?: number[] }
): Promise<QuestionWithLinks[]> {
  // An explicitly empty stored-response key set is itself the historical
  // pin. Never reinterpret that legacy result through today's active bank.
  if (options && Object.prototype.hasOwnProperty.call(options, 'questionIds') && options.questionIds?.length === 0) {
    return []
  }
  const supabase = createClient()
  let liveBankVersion = BANK_VERSION
  if (!options?.bankVersion && !options?.questionIds) {
    const { data } = await supabase
      .from('question_bank_versions')
      .select('id')
      .eq('status', 'published')
      .maybeSingle()
    liveBankVersion = (data as { id: string } | null)?.id || BANK_VERSION
  }

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
  } else if (options?.questionIds && options.questionIds.length > 0) {
    // Legacy results may predate bank_version. Their stored response keys
    // are the pin: include those exact (possibly inactive) question rows.
    query = query.in('id', options.questionIds)
  } else {
    query = query.eq('active', true).eq('bank_version', liveBankVersion)
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
  const { data: publishedVersion } = await supabase
    .from('question_bank_versions')
    .select('id')
    .eq('status', 'published')
    .maybeSingle()
  
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
    .eq('bank_version', (publishedVersion as { id: string } | null)?.id || BANK_VERSION)
    .eq('question_type', type)
    .order('display_order', { ascending: true })
  
  if (error) {
    console.error('Error fetching questions:', error)
    throw error
  }
  
  return (data || []) as QuestionWithLinks[]
}
