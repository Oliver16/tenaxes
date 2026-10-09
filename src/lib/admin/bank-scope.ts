import { supabaseAdmin } from '@/lib/supabase-admin'
import { BANK_VERSION } from '@/lib/question-bank'
import type { QuestionWithLinks, ResponsesMap } from '@/lib/database.types'

export interface BankOption {
  id: string
  name: string
  status: string
}

// Keeps the per-request computation bounded as responses grow.
export const MAX_RESPONSE_SAMPLE = 5000

/**
 * Resolve which question bank an admin report covers: the requested one if
 * it exists, otherwise the published bank. Question ids are bank-specific,
 * so every item statistic must be computed within a single bank.
 */
export async function resolveBank(requested: string | null): Promise<{ bank: string; banks: BankOption[] }> {
  const { data, error } = await supabaseAdmin
    .from('question_bank_versions')
    .select('id, name, status')
    .order('id', { ascending: false })
  if (error) throw error

  const banks = (data || []) as BankOption[]
  const bank =
    banks.find(b => b.id === requested)?.id ??
    banks.find(b => b.status === 'published')?.id ??
    banks[0]?.id ??
    BANK_VERSION
  return { bank, banks }
}

/** Every question in the bank, including ones deactivated after launch. */
export async function loadBankQuestions(bank: string): Promise<QuestionWithLinks[]> {
  const { data, error } = await supabaseAdmin
    .from('questions')
    .select('*, question_axis_links (*)')
    .eq('bank_version', bank)
    .order('display_order', { ascending: true })
  if (error) throw error
  return (data || []) as unknown as QuestionWithLinks[]
}

/** Most recent completed response sets for the bank. */
export async function loadBankResponses(bank: string): Promise<ResponsesMap[]> {
  const { data, error } = await supabaseAdmin
    .from('survey_responses')
    .select('responses')
    .eq('bank_version', bank)
    .order('created_at', { ascending: false })
    .limit(MAX_RESPONSE_SAMPLE)
  if (error) throw error
  return (data || [])
    .map(row => row.responses as ResponsesMap)
    .filter(r => r && typeof r === 'object')
}
