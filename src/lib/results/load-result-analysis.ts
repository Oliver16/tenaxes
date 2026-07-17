import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { fetchQuestionsWithLinks } from '@/lib/api/questions'
import { analyzeTensions, analyzeCollisionPairs, type CollisionPairSummary } from '@/lib/tension-analyzer'
import { calculateAxisCoverage } from '@/lib/scorer'
import { buildAxisSummaries, computeFlavorMatches, scoresById } from '@/lib/flavor-matcher'
import { isSampleSession, loadSampleResultAnalysis } from '@/lib/results/sample-result'
import { AxisScore as AxisScoreType, AxisCoverage, Database, QuestionWithLinks, TensionScore } from '@/lib/database.types'
import type { AxisScore as AxisScoreSummary, FlavorMatch } from '@/lib/supabase'

type SurveyResult = Database['public']['Tables']['survey_results']['Row']
type Axis = Database['public']['Tables']['axes']['Row']

export type AxisComparison = {
  axis_id: string
  name: string
  conceptual_score: number
  applied_score: number
  difference: number
  pole_negative: string
  pole_positive: string
}

export type ConflictCounts = {
  cross_pressured: number
  protected: number
  traded_away: number
  inconclusive: number
}

export interface ResultAnalysis {
  sessionId: string
  result: SurveyResult
  bankVersion: string | null
  /** Bank-version-pinned questions (includes since-deactivated items). */
  questions: QuestionWithLinks[]
  axes: Axis[]
  coreAxes: AxisScoreSummary[]
  facets: AxisScoreSummary[]
  topFlavors: FlavorMatch[]
  responses: Record<number, number | null>
  responseCount: number
  conceptualCount: number
  appliedCount: number
  notSureCount: number
  axisCoverage: AxisCoverage[]
  coverageByAxis: Record<string, AxisCoverage>
  conceptualCoverage: AxisCoverage[]
  appliedCoverage: AxisCoverage[]
  conceptualScores: AxisScoreType[]
  appliedScores: AxisScoreType[]
  /** Sorted largest gap first; covers every axis present in both registers. */
  axisComparisons: AxisComparison[]
  tensionScores: TensionScore[]
  collisionPairs: CollisionPairSummary[]
  conflictCounts: ConflictCounts
}

/**
 * Load a stored survey result and derive everything the results pages
 * need. Shared by the overview, the drill-down subpages, and the results
 * layout; wrapped in React cache() so one request computes it once.
 *
 * Invariants preserved from the original inline implementation:
 * - questions are pinned to the result's stored bank_version, so later
 *   bank changes never reinterpret old answers (v2.0/v2.1/v2.2 all work)
 * - `null` responses mean "not sure": recorded, never scored
 * - numeric 0 is an answered neutral and stays in coverage denominators
 * - nothing hard-codes a questionnaire total
 */
export const loadResultAnalysis = cache(
  async (sessionId: string): Promise<ResultAnalysis | null> => {
    if (isSampleSession(sessionId)) return loadSampleResultAnalysis()

    const supabase = await createClient()

    const { data, error } = await (supabase
      .from('survey_results')
      .select('*')
      .eq('session_id', sessionId)
      .single() as any)

    const result = data as SurveyResult | null
    if (error || !result) return null

    const bankVersion = (result as { bank_version?: string }).bank_version ?? null
    const responses = (result.responses || {}) as Record<number, number | null>
    const storedQuestionIds = Object.keys(responses).map(Number).filter(Number.isFinite)
    const questions = await fetchQuestionsWithLinks({ bankVersion, questionIds: storedQuestionIds })

    const { data: axesData } = await (supabase
      .from('axes')
      .select('*')
      .order('id') as any)
    const axes = (axesData || []) as Axis[]

    // Older sessions may predate stored summaries; rebuild them from raw
    // scores so every session gets the current archetypes and labels.
    const rawScores = (result.scores || []) as unknown as { axis_id: string; score: number }[]
    const summaries = result.core_axes
      ? {
          core_axes: result.core_axes as unknown as AxisScoreSummary[],
          facets: (result.facets || []) as unknown as AxisScoreSummary[]
        }
      : buildAxisSummaries(rawScores, axes)
    const coreAxes = summaries.core_axes
    const facets = summaries.facets
    const topFlavors = result.top_flavors
      ? (result.top_flavors as unknown as FlavorMatch[])
      : computeFlavorMatches(scoresById(rawScores))

    const responseCount = Object.keys(responses).length
    const conceptualCount = questions.filter(
      q => q.question_type === 'conceptual' && typeof responses[q.id] === 'number'
    ).length
    const appliedCount = questions.filter(
      q => q.question_type === 'applied' && typeof responses[q.id] === 'number'
    ).length
    const notSureCount = Object.values(responses).filter(v => v === null).length

    const conceptualQuestions = questions.filter(q => q.question_type === 'conceptual')
    const appliedQuestions = questions.filter(q => q.question_type === 'applied')

    // Recomputed so historical rows without the stored column still get
    // confidence labels. Register-specific coverage keeps the ideals/practice
    // comparison from rating axes supported by too few usable answers.
    const axisCoverage = calculateAxisCoverage(responses, questions)
    const coverageByAxis = Object.fromEntries(axisCoverage.map(c => [c.axis_id, c]))
    const conceptualCoverage = calculateAxisCoverage(responses, conceptualQuestions)
    const appliedCoverage = calculateAxisCoverage(responses, appliedQuestions)

    const conceptualScores = (result.conceptual_scores || []) as unknown as AxisScoreType[]
    const appliedScores = (result.applied_scores || []) as unknown as AxisScoreType[]

    // Recompute tensions from the stored responses rather than reading the
    // stored snapshot, so past sessions benefit from link fixes and
    // analyzer improvements automatically
    const tensionScores = analyzeTensions(responses, appliedQuestions, axes, conceptualScores)
    const collisionPairs = analyzeCollisionPairs(tensionScores)

    const conflictCounts: ConflictCounts = {
      cross_pressured: collisionPairs.filter(p => p.classification === 'cross_pressured').length,
      protected: collisionPairs.filter(p => p.classification === 'aligned' && p.direction > 0).length,
      traded_away: collisionPairs.filter(p => p.classification === 'aligned' && p.direction < 0).length,
      inconclusive: collisionPairs.filter(p => p.classification === 'inconclusive').length
    }

    const conceptualByAxis = Object.fromEntries(conceptualScores.map(s => [s.axis_id, s.score]))
    const appliedByAxis = Object.fromEntries(appliedScores.map(s => [s.axis_id, s.score]))

    const axisComparisons: AxisComparison[] = [...coreAxes, ...facets]
      .filter(a => conceptualByAxis[a.axis_id] !== undefined && appliedByAxis[a.axis_id] !== undefined)
      .map(axis => {
        const conceptual = conceptualByAxis[axis.axis_id]
        const applied = appliedByAxis[axis.axis_id]
        // Scores are in [-1, 1] and render on a 1.0 = 100% basis, so the
        // gap is expressed on that same scale: e.g. 0.80 vs 0.60 => 0.20
        // => "20%". A full opposite-pole flip can exceed 100%.
        return {
          axis_id: axis.axis_id,
          name: axis.name,
          conceptual_score: conceptual,
          applied_score: applied,
          difference: Math.abs(conceptual - applied),
          pole_negative: axis.pole_negative,
          pole_positive: axis.pole_positive
        }
      })
      .sort((a, b) => b.difference - a.difference)

    return {
      sessionId,
      result,
      bankVersion,
      questions,
      axes,
      coreAxes,
      facets,
      topFlavors,
      responses,
      responseCount,
      conceptualCount,
      appliedCount,
      notSureCount,
      axisCoverage,
      coverageByAxis,
      conceptualCoverage,
      appliedCoverage,
      conceptualScores,
      appliedScores,
      axisComparisons,
      tensionScores,
      collisionPairs,
      conflictCounts
    }
  }
)
