import type {
  AxisMeta,
  AxisScore,
  QuestionWithLinks,
  ResponsesMap
} from '@/lib/database.types'
import { calculateAxisScoresFromLinks } from '@/lib/scorer'

/**
 * Preserve a valid stored register profile, or reconstruct a missing legacy
 * profile from the result's bank-pinned questions and raw responses.
 */
export function resolveRegisterScores(
  storedScores: unknown,
  responses: ResponsesMap,
  questions: QuestionWithLinks[],
  axesById: Record<string, AxisMeta>
): AxisScore[] {
  if (Array.isArray(storedScores) && storedScores.length > 0) {
    return storedScores as AxisScore[]
  }

  return calculateAxisScoresFromLinks(responses, questions, axesById).axisScores
}
