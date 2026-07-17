import { generateRequestSchema } from './schema'
import {
  contextMaxChars,
  DEFAULT_CLARIFICATION_LINEAGE_MAX_ANSWERS,
  DEFAULT_CLARIFICATION_LINEAGE_MAX_CHARS,
  DEFAULT_CLARIFICATION_MAX_CHARS
} from './config'

export type ValidGenerateRequest = ReturnType<typeof validateGenerateRequest>

export function validateGenerateRequest(body: unknown) {
  const parsed = generateRequestSchema.safeParse(body)
  if (!parsed.success) throw new RequestValidationError('Invalid generation request')
  const request = parsed.data
  const generalContext = request.general_context?.trim() || undefined
  if (generalContext && generalContext.length > contextMaxChars()) {
    throw new RequestValidationError(`Context must be ${contextMaxChars()} characters or fewer`)
  }
  if (request.action === 'generate') return { action: 'generate' as const, general_context: generalContext }
  const clarificationAnswers = request.clarification_answers
    .map(item => ({ clarification_id: item.clarification_id, answer: item.answer.trim() }))
    .filter(item => item.answer.length > 0)
  if (clarificationAnswers.some(item => item.answer.length > DEFAULT_CLARIFICATION_MAX_CHARS)) {
    throw new RequestValidationError(`Clarification answers must be ${DEFAULT_CLARIFICATION_MAX_CHARS} characters or fewer`)
  }
  return {
    action: 'refine' as const, parent_analysis_id: request.parent_analysis_id,
    general_context: generalContext, clarification_answers: clarificationAnswers
  }
}

export class RequestValidationError extends Error {}

export function mergeGeneralContext(
  inherited: string | undefined,
  additional: string | undefined
): string | undefined {
  const parts = [inherited?.trim(), additional?.trim()]
    .filter((value): value is string => !!value)
    .filter((value, index, values) => values.indexOf(value) === index)
  const merged = parts.join('\n\n') || undefined
  if (merged && merged.length > contextMaxChars()) {
    throw new RequestValidationError(`Combined context must be ${contextMaxChars()} characters or fewer`)
  }
  return merged
}

export function mergeClarificationAnswers(
  inherited: Array<{ clarification_id: string; answer: string }>,
  additional: Array<{ clarification_id: string; answer: string }>
) {
  const normalized = [...inherited, ...additional].map(item => ({
    clarification_id: item.clarification_id,
    answer: item.answer.trim()
  }))
  const merged = new Map<string, { clarification_id: string; answer: string }>()
  normalized.forEach(answer => merged.set(answer.clarification_id, answer))
  const answers = [...merged.values()]
  if (answers.some(item => item.answer.length > DEFAULT_CLARIFICATION_MAX_CHARS)) {
    throw new RequestValidationError(`Clarification answers must be ${DEFAULT_CLARIFICATION_MAX_CHARS} characters or fewer`)
  }
  if (answers.length > DEFAULT_CLARIFICATION_LINEAGE_MAX_ANSWERS) {
    throw new RequestValidationError(
      `A refinement lineage can retain at most ${DEFAULT_CLARIFICATION_LINEAGE_MAX_ANSWERS} clarification answers`
    )
  }
  const totalCharacters = answers.reduce((total, item) => total + item.answer.length, 0)
  if (totalCharacters > DEFAULT_CLARIFICATION_LINEAGE_MAX_CHARS) {
    throw new RequestValidationError(
      `Retained clarification answers must total ${DEFAULT_CLARIFICATION_LINEAGE_MAX_CHARS} characters or fewer`
    )
  }
  return answers
}
