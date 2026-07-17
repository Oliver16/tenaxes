import { AXES, type AxisId } from '@/lib/instrument'
import { BANK_ITEMS, BANK_VERSION, type BankItem } from '@/lib/question-bank'
import {
  calculateAxisCoverage,
  calculateScoresFromQuestions
} from '@/lib/scorer'
import {
  buildAxisSummaries,
  computeFlavorMatches,
  scoresById
} from '@/lib/flavor-matcher'
import { analyzeCollisionPairs, analyzeTensions } from '@/lib/tension-analyzer'
import type {
  AxisScore,
  Database,
  QuestionAxisLink,
  QuestionWithLinks,
  ScoredResponse
} from '@/lib/database.types'
import type {
  AxisComparison,
  ConflictCounts,
  ResultAnalysis
} from '@/lib/results/load-result-analysis'

type AxisRow = Database['public']['Tables']['axes']['Row']
type Json = Database['public']['Tables']['survey_results']['Row']['scores']
type SurveyResultRow = Database['public']['Tables']['survey_results']['Row']

export const SAMPLE_SESSION_ID = 'sample'

const SAMPLE_CREATED_AT = '2026-07-17T12:00:00.000Z'

/**
 * The public sample is a fictional respondent, not a database seed or a
 * real person's result. Keeping it in code makes the example deterministic,
 * bank-version-pinned, and safe from analytics or account-linking workflows.
 */
export function isSampleSession(sessionId: string): boolean {
  return sessionId.toLowerCase() === SAMPLE_SESSION_ID
}

const TRADEOFF_LINKS: Readonly<Record<number, readonly [AxisId, -1 | 1]>> = {
  253: ['C3', -1],
  254: ['C3', -1],
  255: ['C1', -1],
  256: ['C1', -1],
  257: ['C7', 1],
  258: ['C7', 1],
  259: ['C2', 1],
  260: ['C6', -1],
  261: ['C5', 1],
  262: ['C2', -1],
  263: ['C3', -1],
  264: ['C9', -1],
  265: ['C4', 1],
  266: ['C4', 1],
  267: ['C8', 1],
  268: ['C5', 1],
  269: ['C6', 1],
  270: ['C7', 1],
  271: ['C8', 1],
  272: ['C8', 1],
  273: ['C10', -1],
  274: ['C8', -1],
  275: ['C9', 1],
  276: ['C11', 1],
  277: ['F1', 1],
  278: ['F2', 1],
  279: ['F3', 1],
  280: ['C4', -1],
  281: ['C7', 1],
  282: ['F1', -1],
  283: ['C3', -1],
  284: ['C4', 1],
  285: ['F7', 1],
  286: ['F1', 1],
  287: ['F5', 1],
  288: ['F4', 1],
  289: ['C11', -1],
  290: ['C10', 1],
  291: ['F1', 1],
  292: ['F2', 1],
  293: ['F3', -1],
  294: ['C3', -1],
  295: ['F4', -1],
  296: ['F5', 1],
  297: ['C3', -1],
  298: ['F7', -1],
  299: ['C1', 1],
  300: ['C1', -1]
}

/**
 * Ideals and applications intentionally do not line up perfectly. The
 * profile is broadly civil-libertarian, universalist, green, optimistic
 * about technology, restorative, and gradualist, while concrete scenarios
 * pull it toward more institutional caution and compromise.
 */
const REGISTER_TARGETS: Readonly<Record<AxisId, {
  conceptual: number
  applied: number
}>> = {
  C1: { conceptual: 0.58, applied: 0.28 },
  C2: { conceptual: -0.52, applied: -0.31 },
  C3: { conceptual: 0.76, applied: 0.34 },
  C4: { conceptual: 0.34, applied: -0.05 },
  C5: { conceptual: 0.61, applied: 0.36 },
  C6: { conceptual: 0.69, applied: 0.32 },
  C7: { conceptual: 0.46, applied: 0.08 },
  C8: { conceptual: 0.71, applied: 0.39 },
  C9: { conceptual: 0.66, applied: 0.27 },
  C10: { conceptual: 0.27, applied: 0.03 },
  C11: { conceptual: 0.65, applied: 0.33 },
  F1: { conceptual: -0.48, applied: -0.10 },
  F2: { conceptual: 0.17, applied: 0.46 },
  F3: { conceptual: 0.70, applied: 0.29 },
  F4: { conceptual: 0.57, applied: 0.21 },
  F5: { conceptual: 0.35, applied: 0.59 },
  F6: { conceptual: 0.49, applied: 0.18 },
  F7: { conceptual: -0.62, applied: -0.23 }
}

// These omissions are distributed across the bank, leaving every axis with
// enough numeric primary answers for a meaningful score and coverage label.
const NOT_SURE_IDS = new Set([
  12, 27, 45, 68, 83, 101, 126, 147, 166,
  181, 201, 219, 236, 245, 312, 329, 344
])

/**
 * Hand-tuned collision answers make every pair-level result state visible
 * somewhere in the sample. The first four pairs are especially deliberate:
 * C1/C3 is cross-pressured, C1/C4 protects the shared value, C1/C7 is
 * inconclusive, and C2/C5 trades the shared value away.
 */
const COLLISION_RESPONSES: Readonly<Record<number, ScoredResponse>> = {
  253: -2,
  254: 2,
  255: -2,
  256: -2,
  257: -2,
  258: 0,
  259: 2,
  260: -2,
  261: 2,
  262: -2,
  263: 1,
  264: -1,
  265: 1,
  266: -2,
  267: 2,
  268: -1,
  269: 1,
  270: 1,
  271: -1,
  272: 2,
  273: -1,
  274: 2,
  275: 2,
  276: -1,
  277: -2,
  278: 1,
  279: 2,
  280: -1,
  281: -2,
  282: 1,
  283: 2,
  284: -2,
  285: 1,
  286: -1,
  287: -2,
  288: 1,
  289: -1,
  290: 2,
  291: 2,
  292: -1,
  293: -2,
  294: 1,
  295: -1,
  296: 2,
  297: -2,
  298: 1,
  299: 2,
  300: -1
}

function sampleAxes(): AxisRow[] {
  return Object.values(AXES).map(axis => ({
    id: axis.id,
    name: axis.name,
    description: null,
    pole_negative: axis.pole_negative,
    pole_positive: axis.pole_positive,
    family: 'is_facet' in axis && axis.is_facet ? 'facet' : 'core',
    created_at: SAMPLE_CREATED_AT
  }))
}

function questionLinks(item: BankItem): QuestionAxisLink[] {
  const primary: QuestionAxisLink = {
    id: item.id * 2 - 1,
    question_id: item.id,
    axis_id: item.axis,
    role: 'primary',
    axis_key: item.key,
    weight: item.weight,
    created_at: SAMPLE_CREATED_AT
  }
  const tradeoff = TRADEOFF_LINKS[item.id]
  if (!tradeoff) return [primary]

  return [
    primary,
    {
      id: item.id * 2,
      question_id: item.id,
      axis_id: tradeoff[0],
      role: 'tradeoff',
      axis_key: tradeoff[1],
      weight: 0.65,
      created_at: SAMPLE_CREATED_AT
    }
  ]
}

function sampleQuestions(): QuestionWithLinks[] {
  return BANK_ITEMS.map(item => ({
    id: item.id,
    axis_id: item.axis,
    key: item.key,
    text: item.text,
    educational_content: item.educational_content ?? null,
    display_order: item.order,
    active: true,
    weight: item.weight,
    question_type: item.question_type,
    bank_version: BANK_VERSION,
    created_at: SAMPLE_CREATED_AT,
    updated_at: SAMPLE_CREATED_AT,
    question_axis_links: questionLinks(item)
  }))
}

function deterministicUnit(seed: number): number {
  let value = Math.imul(seed ^ 0x45d9f3b, 0x45d9f3b)
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b)
  value ^= value >>> 16
  return (value >>> 0) / 0x100000000
}

function generatedResponse(item: BankItem): ScoredResponse {
  const register = item.question_type === 'conceptual' ? 'conceptual' : 'applied'
  const target = REGISTER_TARGETS[item.axis][register]
  const salt = register === 'conceptual' ? 97 : 193
  const noise = (deterministicUnit(item.id * 31 + salt) - 0.5) * 1.2
  const directed = Math.max(-2, Math.min(2, Math.round(target * 2 + noise)))
  return (directed * item.key) as ScoredResponse
}

function sampleResponses(): Record<number, ScoredResponse | null> {
  return Object.fromEntries(BANK_ITEMS.map(item => {
    if (NOT_SURE_IDS.has(item.id)) return [item.id, null]
    const collisionResponse = COLLISION_RESPONSES[item.id]
    return [item.id, collisionResponse ?? generatedResponse(item)]
  }))
}

function axisComparisons(
  conceptualScores: AxisScore[],
  appliedScores: AxisScore[],
  summaries: ReturnType<typeof buildAxisSummaries>
): AxisComparison[] {
  const conceptualByAxis = Object.fromEntries(conceptualScores.map(score => [score.axis_id, score.score]))
  const appliedByAxis = Object.fromEntries(appliedScores.map(score => [score.axis_id, score.score]))

  return [...summaries.core_axes, ...summaries.facets]
    .filter(axis => conceptualByAxis[axis.axis_id] !== undefined && appliedByAxis[axis.axis_id] !== undefined)
    .map(axis => ({
      axis_id: axis.axis_id,
      name: axis.name,
      conceptual_score: conceptualByAxis[axis.axis_id],
      applied_score: appliedByAxis[axis.axis_id],
      difference: Math.abs(conceptualByAxis[axis.axis_id] - appliedByAxis[axis.axis_id]),
      pole_negative: axis.pole_negative,
      pole_positive: axis.pole_positive
    }))
    .sort((a, b) => b.difference - a.difference)
}

function asJson(value: unknown): Json {
  return value as Json
}

export function buildSampleResultAnalysis(): ResultAnalysis {
  const axes = sampleAxes()
  const questions = sampleQuestions()
  const responses = sampleResponses()
  const conceptualQuestions = questions.filter(question => question.question_type === 'conceptual')
  const appliedQuestions = questions.filter(question => question.question_type === 'applied')

  const scores = calculateScoresFromQuestions(responses, questions, axes)
  const conceptualScores = calculateScoresFromQuestions(responses, conceptualQuestions, axes)
  const appliedScores = calculateScoresFromQuestions(responses, appliedQuestions, axes)
  const summaries = buildAxisSummaries(scores, axes)
  const topFlavors = computeFlavorMatches(scoresById(scores))
  const axisCoverage = calculateAxisCoverage(responses, questions)
  const coverageByAxis = Object.fromEntries(axisCoverage.map(coverage => [coverage.axis_id, coverage]))
  const tensionScores = analyzeTensions(responses, appliedQuestions, axes, conceptualScores)
  const collisionPairs = analyzeCollisionPairs(tensionScores)

  const conflictCounts: ConflictCounts = {
    cross_pressured: collisionPairs.filter(pair => pair.classification === 'cross_pressured').length,
    protected: collisionPairs.filter(pair => pair.classification === 'aligned' && pair.direction > 0).length,
    traded_away: collisionPairs.filter(pair => pair.classification === 'aligned' && pair.direction < 0).length,
    inconclusive: collisionPairs.filter(pair => pair.classification === 'inconclusive').length
  }

  const notSureCount = Object.values(responses).filter(response => response === null).length
  const result: SurveyResultRow = {
    id: '00000000-0000-4000-8000-000000000001',
    session_id: SAMPLE_SESSION_ID,
    user_id: null,
    bank_version: BANK_VERSION,
    scores: asJson(scores),
    conceptual_scores: asJson(conceptualScores),
    applied_scores: asJson(appliedScores),
    collision_pairs: asJson(collisionPairs),
    responses: asJson(responses),
    core_axes: asJson(summaries.core_axes),
    facets: asJson(summaries.facets),
    top_flavors: asJson(topFlavors),
    response_coverage: asJson(axisCoverage),
    not_sure_count: notSureCount,
    completed_at: SAMPLE_CREATED_AT,
    created_at: SAMPLE_CREATED_AT
  }

  return {
    sessionId: SAMPLE_SESSION_ID,
    result,
    bankVersion: BANK_VERSION,
    questions,
    axes,
    coreAxes: summaries.core_axes,
    facets: summaries.facets,
    topFlavors,
    responses,
    responseCount: Object.keys(responses).length,
    conceptualCount: conceptualQuestions.filter(question => typeof responses[question.id] === 'number').length,
    appliedCount: appliedQuestions.filter(question => typeof responses[question.id] === 'number').length,
    notSureCount,
    axisCoverage,
    coverageByAxis,
    conceptualScores,
    appliedScores,
    axisComparisons: axisComparisons(conceptualScores, appliedScores, summaries),
    tensionScores,
    collisionPairs,
    conflictCounts
  }
}

const SAMPLE_RESULT_ANALYSIS = buildSampleResultAnalysis()

/** Return the immutable-in-practice process-local sample without any I/O. */
export function loadSampleResultAnalysis(): ResultAnalysis {
  return SAMPLE_RESULT_ANALYSIS
}
