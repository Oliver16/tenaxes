import { QuestionWithLinks, ResponsesMap, TensionScore } from '@/lib/database.types'
import {
  getTensionQuestionDetails,
  type CollisionPairSummary
} from '@/lib/tension-analyzer'

/**
 * Shared collision-pair presentation logic. The overview's "what stands
 * out" insight and the conflicts page rank and narrate pairs through
 * these helpers, so the two surfaces can never disagree.
 */

const sideKey = (s: { axis_id: string; pole: number }) => `${s.axis_id}:${s.pole}`

/**
 * Ranks collision pairs for display. Cross-pressured pairs and pairs
 * whose probes clash with stated ideals are the most informative;
 * within a class, richer/stronger probes (analyzer interestingness) win.
 */
export function rankCollisionPairs(
  pairs: CollisionPairSummary[],
  tensions: TensionScore[]
): CollisionPairSummary[] {
  const byKey = new Map(tensions.map(t => [t.pair_key, t]))
  const score = (pair: CollisionPairSummary): number => {
    const probes = pair.probe_keys
      .map(k => byKey.get(k))
      .filter((t): t is TensionScore => !!t)
    const contradictions = probes.filter(t => t.ideals.contradicts_ideals).length
    const interestingness = probes.reduce((s, t) => s + t.interestingness_score, 0)
    return (
      (pair.classification === 'cross_pressured' ? 200 : 0) +
      (pair.classification === 'inconclusive' ? -200 : 0) +
      contradictions * 100 +
      interestingness
    )
  }
  return [...pairs]
    .filter(p => p.probes_answered > 0)
    .sort((a, b) => score(b) - score(a))
}

/** One mirrored probe of a pair, flattened for client rendering. */
export interface ProbeViewModel {
  pairKey: string
  opposingLabel: string
  opposingAxisName: string
  questionText: string | null
  outcome: 'protected' | 'traded' | 'neutral' | 'unanswered'
  /** 'strongly' | 'mildly' | '' from the single answer's intensity. */
  intensityWord: string
  genuineDilemma: boolean
  /** Set when this single choice ran against the stated ideals. */
  contradictedLabel: string | null
  contradictedSupport: number | null
}

/** One collision pair, flattened and serializable for client components. */
export interface CollisionPairViewModel {
  pairId: string
  axisA: string
  axisB: string
  sharedLabel: string
  sharedAxisId: string
  sharedAxisName: string
  otherAxisName: string
  classification: CollisionPairSummary['classification']
  direction: -1 | 0 | 1
  probesAnswered: number
  probeCount: number
  narrative: string
  anyContradiction: boolean
  probes: ProbeViewModel[]
}

function buildProbeViewModels(
  pair: CollisionPairSummary,
  tensions: TensionScore[],
  questions: QuestionWithLinks[],
  responses: ResponsesMap
): ProbeViewModel[] {
  const byKey = new Map(tensions.map(t => [t.pair_key, t]))
  return pair.probe_keys
    .map(key => byKey.get(key))
    .filter((t): t is TensionScore => !!t)
    .map(tension => {
      const sharedIsA = sideKey(tension.side_a) === sideKey(pair.shared_pole)
      const opposing = sharedIsA ? tension.side_b : tension.side_a
      const term = sharedIsA ? tension.lean : -tension.lean
      const outcome: ProbeViewModel['outcome'] =
        tension.answered_count === 0 ? 'unanswered' :
        term > 0 ? 'protected' :
        term < 0 ? 'traded' : 'neutral'
      const detail = getTensionQuestionDetails(tension, responses, questions)[0] ?? null

      // Stated support for the value that lost this probe, when the
      // single answer ran against the respondent's stronger stated ideal.
      const contradicted =
        tension.ideals.contradicts_ideals === 'side_a' ? tension.side_a :
        tension.ideals.contradicts_ideals === 'side_b' ? tension.side_b : null
      const contradictedSupport = contradicted
        ? (contradicted === tension.side_a ? tension.ideals.side_a_support : tension.ideals.side_b_support)
        : null

      return {
        pairKey: tension.pair_key,
        opposingLabel: opposing.label,
        opposingAxisName: opposing.axis_name,
        questionText: detail?.question.text ?? null,
        outcome,
        intensityWord:
          detail && detail.intensity >= 1 ? 'strongly' :
          detail && detail.intensity > 0 ? 'mildly' : '',
        genuineDilemma: tension.ideals.genuine_dilemma,
        contradictedLabel: contradicted?.label ?? null,
        contradictedSupport
      }
    })
}

/**
 * One-sentence pair narrative built from the actual probe outcomes.
 * Opposing values are qualified with their axis, because several axes
 * share similar pole vocabulary and an unqualified sentence can read as
 * an axis colliding with itself.
 */
function pairNarrative(pair: CollisionPairSummary, probes: ProbeViewModel[]): string {
  const value = pair.shared_pole.label
  const qualify = (p: ProbeViewModel) => `${p.opposingLabel} (${p.opposingAxisName})`
  const protectedAgainst = probes.filter(p => p.outcome === 'protected').map(qualify)
  const tradedFor = probes.filter(p => p.outcome === 'traded').map(qualify)

  if (pair.classification === 'cross_pressured') {
    return `You protected ${value} when it collided with ${protectedAgainst.join(' and ')}, ` +
      `but gave it up for ${tradedFor.join(' and ')}. The framing, not the value, decided.`
  }
  if (pair.classification === 'aligned' && pair.direction > 0) {
    return `Whether ${value} was priced against ${probes.map(qualify).join(' or ')}, you protected it.`
  }
  if (pair.classification === 'aligned' && pair.direction < 0) {
    return `Under both framings you traded ${value} away — to ${probes.map(qualify).join(' and to ')}.`
  }
  return `Not enough decisive answers to read a pattern for ${value} in this collision.`
}

export function buildCollisionPairViewModel(
  pair: CollisionPairSummary,
  tensions: TensionScore[],
  questions: QuestionWithLinks[],
  responses: ResponsesMap
): CollisionPairViewModel {
  const probes = buildProbeViewModels(pair, tensions, questions, responses)
  // Every opposing side sits on the pair's other axis.
  const otherAxisName = probes[0]?.opposingAxisName
    ?? (pair.axis_a === pair.shared_pole.axis_id ? pair.axis_b : pair.axis_a)

  return {
    pairId: pair.pair_id,
    axisA: pair.axis_a,
    axisB: pair.axis_b,
    sharedLabel: pair.shared_pole.label,
    sharedAxisId: pair.shared_pole.axis_id,
    sharedAxisName: pair.shared_pole.axis_name,
    otherAxisName,
    classification: pair.classification,
    direction: pair.direction,
    probesAnswered: pair.probes_answered,
    probeCount: pair.probe_keys.length,
    narrative: pairNarrative(pair, probes),
    anyContradiction: probes.some(p => p.contradictedLabel !== null),
    probes
  }
}
