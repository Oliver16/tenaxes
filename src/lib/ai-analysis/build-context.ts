import type { ResultAnalysis } from '@/lib/results/load-result-analysis'
import { buildCandidateTensions, buildTopicSignals, classifyCenterShape } from './signals'
import type { AIQuestionEvidence, AnalysisAxisInput, PersonalizedAnalysisInput } from './types'

export function buildPersonalizedAnalysisInput(args: {
  resultAnalysis: ResultAnalysis
  evidence: AIQuestionEvidence[]
  promptVersion: string
  generalContext?: string | null
  clarificationAnswers?: Array<{ clarification_id: string; answer: string }>
}): PersonalizedAnalysisInput {
  const { resultAnalysis: r, evidence } = args
  const conceptual = new Map(r.conceptualScores.map(s => [s.axis_id, s.score]))
  const applied = new Map(r.appliedScores.map(s => [s.axis_id, s.score]))
  const allAxes = [...r.coreAxes, ...r.facets]
  const centers = allAxes.map(axis => classifyCenterShape({
    axisId: axis.axis_id, score: axis.score, coverage: r.coverageByAxis[axis.axis_id], evidence,
    conceptualScore: conceptual.get(axis.axis_id) ?? null, appliedScore: applied.get(axis.axis_id) ?? null
  }))
  const centerByAxis = new Map(centers.map(c => [c.axis_id, c]))
  const makeAxis = (axis: typeof allAxes[number]): AnalysisAxisInput => ({
    axis_id: axis.axis_id, name: axis.name, score: axis.score,
    pole_negative: axis.pole_negative, pole_positive: axis.pole_positive, favored_pole: axis.pole_label,
    coverage: r.coverageByAxis[axis.axis_id]?.coverage ?? 0,
    confidence: r.coverageByAxis[axis.axis_id]?.confidence ?? 'insufficient',
    conceptual_score: conceptual.get(axis.axis_id) ?? null,
    applied_score: applied.get(axis.axis_id) ?? null,
    center_shape: centerByAxis.get(axis.axis_id)?.shape ?? 'insufficient_evidence'
  })
  const topicSignals = buildTopicSignals(evidence)
  const candidateTensions = buildCandidateTensions({
    evidence, topicSignals, centers, axisComparisons: r.axisComparisons,
    collisionPairs: r.collisionPairs.map(pair => ({
      ...pair,
      contradicts_ideals: r.tensionScores.some(tension =>
        `${tension.axis_a}|${tension.axis_b}` === pair.pair_id && tension.ideals.contradicts_ideals !== null
      )
    })),
    axisScores: Object.fromEntries(allAxes.map(axis => [axis.axis_id, axis.score])),
    conceptualScores: Object.fromEntries(r.conceptualScores.map(score => [score.axis_id, score.score]))
  })
  const collisionPairs = r.collisionPairs.map(pair => {
    const relatedTensions = r.tensionScores.filter(t => `${t.axis_a}|${t.axis_b}` === pair.pair_id)
    const [pairA, pairB] = pair.pair_id.split('|')
    const evidenceQuestionIds = evidence.filter(e => {
      const linkedAxes = new Set([e.primary_axis_id, ...e.tradeoff_links.map(link => link.axis_id)])
      return linkedAxes.has(pairA) && linkedAxes.has(pairB)
    }).map(e => e.question_id)
    return {
      pair_id: pair.pair_id, classification: pair.classification, direction: pair.direction,
      shared_value: pair.shared_pole.label, shared_axis_id: pair.shared_pole.axis_id,
      opposing_axis_ids: [pair.axis_a, pair.axis_b].filter(id => id !== pair.shared_pole.axis_id),
      narrative: pair.classification === 'cross_pressured'
        ? `${pair.shared_pole.label} prevailed in one mirrored scenario and was traded away in another.`
        : `${pair.shared_pole.label} was ${pair.direction > 0 ? 'protected' : pair.direction < 0 ? 'traded away' : 'not decisively ranked'} across the mirrored scenarios.`,
      probes_answered: pair.probes_answered,
      contradicts_ideals: relatedTensions.some(t => t.ideals.contradicts_ideals !== null),
      evidence_question_ids: evidenceQuestionIds
    }
  })
  const numeric = evidence.filter(e => typeof e.response === 'number')
  const context = args.generalContext?.trim() || null
  const clarifications = (args.clarificationAnswers ?? []).map(a => ({ ...a, answer: a.answer.trim() })).filter(a => a.answer)
  return {
    schema_version: '1', prompt_version: args.promptVersion, bank_version: r.bankVersion,
    profile: {
      core_axes: r.coreAxes.map(makeAxis), facets: r.facets.map(makeAxis),
      archetypes: r.topFlavors.map(f => ({ id: f.flavor_id, name: f.name, affinity: f.affinity, description: f.description }))
    },
    response_summary: {
      total_questions: r.questions.length, recorded: r.responseCount, numeric: numeric.length,
      neutral: numeric.filter(e => e.response === 0).length, not_sure: evidence.filter(e => e.response === null).length
    },
    topic_signals: topicSignals, candidate_tensions: candidateTensions,
    collision_pairs: collisionPairs, questions: evidence,
    user_context: context || clarifications.length ? { general_context: context, clarification_answers: clarifications } : null
  }
}
