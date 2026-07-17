import {
  AxisMeta,
  AxisScore,
  QuestionWithLinks,
  ResponsesMap,
  TensionScore,
  TensionSide
} from './database.types'

/**
 * Value-tension analysis.
 *
 * Every axis link stores `axis_key` = the direction agreement pushes that
 * axis. A tradeoff question therefore relates two axes with a fixed pole
 * structure captured by its signature s = key_a x key_b:
 *
 *   s = -1  ->  A's + pole is allied with B's - pole, so the opposed
 *               values are (A+) vs (B+)   e.g. Civil Liberties vs Tech-Solutionist
 *   s = +1  ->  A's + pole is allied with B's + pole, so the opposed
 *               values are (A+) vs (B-)   e.g. Radical vs Security/Order
 *
 * For each answered tradeoff question, the side containing A's + pole
 * "won" iff response x key_a > 0. A single Likert answer to a tradeoff
 * scenario carries exactly one directed choice; counting those wins per
 * pair is the whole analysis. (The previous implementation differenced
 * two rescalings of the same weighted sum, which structurally cancelled
 * to zero for same-signature pairs.)
 *
 * Tradeoff questions are grouped by unordered axis pair AND signature,
 * so "ecology vs prosperity" and "ecology vs redistribution" stay
 * separate tensions even though both involve C9 and C2.
 */

const MIN_ANSWERED = 2
const DECISIVE_LEAN = 0.30
const IDEALS_SUPPORT_THRESHOLD = 0.20
const CONTRADICTION_LEAN = 0.20

/**
 * Which mirror of a tension to display (both are mathematically
 * equivalent; which one names the values the scenarios actually engage
 * is content knowledge). Keyed by pair_key; the anchor becomes side_a.
 * Pairs not listed fall back to the majority-primary-pole heuristic.
 */
const DISPLAY_ANCHORS: Record<string, { axis: string; pole: -1 | 1 }> = {
  // green space (eco) vs affordable housing (redistribution)
  'C2|C9|1': { axis: 'C9', pole: 1 },
  // tech benefits vs distrust of the companies handling the data
  'C8|F2|-1': { axis: 'C8', pole: 1 },
  // protection of tradition vs personal liberty
  'C3|C5|1': { axis: 'C5', pole: -1 }
}

interface TensionEntry {
  question: QuestionWithLinks
  /** Push direction of the pair's first (sorted) axis for this question. */
  key_a: -1 | 1
  /** The question's primary axis and its push direction (for orienting labels). */
  primary_axis: string
  primary_key: -1 | 1
}

interface TensionGroup {
  axis_a: string
  axis_b: string
  signature: -1 | 1
  entries: TensionEntry[]
}

export interface TensionQuestionDetail {
  question: QuestionWithLinks
  response: number
  winner: 'side_a' | 'side_b' | 'neutral'
  /** 0..1 strength of the choice (|response| / 2). */
  intensity: number
}

function isTradeoffLink(role: string): boolean {
  // 'collision' is the pre-migration role name
  return role === 'tradeoff' || role === 'collision'
}

function collectTensionGroups(questions: QuestionWithLinks[]): Map<string, TensionGroup> {
  const groups = new Map<string, TensionGroup>()

  for (const q of questions) {
    const links = q.question_axis_links
    if (!links || links.length < 2) continue

    const primary = links.find(l => l.role === 'primary')
    const tradeoffs = links.filter(l => isTradeoffLink(l.role))
    if (!primary || tradeoffs.length === 0) continue

    for (const t of tradeoffs) {
      if (t.axis_id === primary.axis_id) continue

      const [axisA, axisB] = [primary.axis_id, t.axis_id].sort()
      const keyA = axisA === primary.axis_id ? primary.axis_key : t.axis_key
      const keyB = axisA === primary.axis_id ? t.axis_key : primary.axis_key
      const signature = (keyA * keyB) as -1 | 1
      const groupKey = `${axisA}|${axisB}|${signature}`

      if (!groups.has(groupKey)) {
        groups.set(groupKey, { axis_a: axisA, axis_b: axisB, signature, entries: [] })
      }
      groups.get(groupKey)!.entries.push({
        question: q,
        key_a: keyA,
        primary_axis: primary.axis_id,
        primary_key: primary.axis_key
      })
    }
  }

  return groups
}

function poleLabel(axis: AxisMeta | undefined, axisId: string, pole: -1 | 1): string {
  if (!axis) return `${axisId}${pole > 0 ? '+' : '-'}`
  const label = pole > 0 ? axis.pole_positive : axis.pole_negative
  return label || axis.name || axisId
}

/**
 * Every tension has two mathematically equivalent framings (e.g.
 * "Radical vs Security/Order" is the mirror of "Civil Liberties vs
 * Gradualist"). We display the one anchored to the poles the scenarios
 * actually engage: the anchor axis is the one that serves as primary in
 * most of the group's questions, and the anchor pole is the direction
 * agreement pushes it in most of them. side_a is the anchor.
 */
function buildSides(
  group: TensionGroup,
  axesById: Record<string, AxisMeta>
): { side_a: TensionSide; side_b: TensionSide; anchorIsAxisA: boolean; anchorPole: -1 | 1 } {
  const pairKey = `${group.axis_a}|${group.axis_b}|${group.signature}`
  const override = DISPLAY_ANCHORS[pairKey]

  let anchorIsAxisA: boolean
  let anchorPole: -1 | 1

  if (override && (override.axis === group.axis_a || override.axis === group.axis_b)) {
    anchorIsAxisA = override.axis === group.axis_a
    anchorPole = override.pole
  } else {
    const primaryACount = group.entries.filter(e => e.primary_axis === group.axis_a).length
    anchorIsAxisA = primaryACount * 2 >= group.entries.length

    // Push direction of the anchor axis per question: key_a for the sorted
    // first axis, key_a x signature for the second (since k_b = s x k_a).
    const anchorKeySum = group.entries.reduce(
      (sum, e) => sum + (anchorIsAxisA ? e.key_a : e.key_a * group.signature),
      0
    )
    anchorPole = anchorKeySum >= 0 ? 1 : -1
  }

  const anchorAxis = anchorIsAxisA ? group.axis_a : group.axis_b
  const otherAxis = anchorIsAxisA ? group.axis_b : group.axis_a

  // The opposing pole on the other axis is the one NOT allied with the
  // anchor pole. Allied pole = anchorPole x signature, so opposed is its
  // negation.
  const otherPole = (-anchorPole * group.signature) as -1 | 1

  const anchorMeta = axesById[anchorAxis]
  const otherMeta = axesById[otherAxis]

  return {
    side_a: {
      axis_id: anchorAxis,
      axis_name: anchorMeta?.name ?? anchorAxis,
      pole: anchorPole,
      label: poleLabel(anchorMeta, anchorAxis, anchorPole)
    },
    side_b: {
      axis_id: otherAxis,
      axis_name: otherMeta?.name ?? otherAxis,
      pole: otherPole,
      label: poleLabel(otherMeta, otherAxis, otherPole)
    },
    anchorIsAxisA,
    anchorPole
  }
}

export function analyzeTensions(
  responses: ResponsesMap,
  questions: QuestionWithLinks[],
  axes: AxisMeta[],
  conceptualScores?: AxisScore[]
): TensionScore[] {
  const axesById: Record<string, AxisMeta> = Object.fromEntries(axes.map(a => [a.id, a]))
  const conceptualByAxis: Record<string, number> = Object.fromEntries(
    (conceptualScores ?? []).map(s => [s.axis_id, s.score])
  )

  const scores: TensionScore[] = []

  for (const [pairKey, group] of collectTensionGroups(questions).entries()) {
    const { side_a, side_b, anchorIsAxisA, anchorPole } = buildSides(group, axesById)

    // Orientation factor mapping key_a (push of the sorted-first axis)
    // onto side_a's pole: positive term => side_a's value won.
    const orient = (anchorIsAxisA ? 1 : group.signature) * anchorPole

    let winsA = 0
    let winsB = 0
    let neutral = 0
    let leanSum = 0

    for (const entry of group.entries) {
      const r = responses[entry.question.id]
      if (r === undefined) continue

      const term = r * entry.key_a * orient
      if (term > 0) winsA++
      else if (term < 0) winsB++
      else neutral++
      leanSum += term
    }

    const answered = winsA + winsB + neutral
    if (answered < MIN_ANSWERED) continue

    // Each term is in [-2, 2], so this normalizes lean to [-1, 1].
    const lean = leanSum / (2 * answered)
    const absLean = Math.abs(lean)

    // Conceptual support for each side's pole (sign-adjusted so positive
    // always means "endorses this side's value").
    const rawA = conceptualByAxis[side_a.axis_id]
    const rawB = conceptualByAxis[side_b.axis_id]
    const sideASupport = rawA !== undefined ? rawA * side_a.pole : null
    const sideBSupport = rawB !== undefined ? rawB * side_b.pole : null

    const genuineDilemma =
      sideASupport !== null && sideBSupport !== null &&
      sideASupport >= IDEALS_SUPPORT_THRESHOLD &&
      sideBSupport >= IDEALS_SUPPORT_THRESHOLD

    // A side "contradicts ideals" when it lost in scenarios despite
    // stronger (and meaningful) stated support than the winner.
    let contradicts: 'side_a' | 'side_b' | null = null
    if (sideASupport !== null && sideBSupport !== null) {
      if (
        lean >= CONTRADICTION_LEAN &&
        sideBSupport >= IDEALS_SUPPORT_THRESHOLD &&
        sideBSupport > sideASupport
      ) {
        contradicts = 'side_b'
      } else if (
        lean <= -CONTRADICTION_LEAN &&
        sideASupport >= IDEALS_SUPPORT_THRESHOLD &&
        sideASupport > sideBSupport
      ) {
        contradicts = 'side_a'
      }
    }

    const classification: TensionScore['classification'] =
      absLean >= DECISIVE_LEAN ? 'consistent_priority' :
      winsA > 0 && winsB > 0 ? 'context_dependent' :
      'balanced'

    const strength: TensionScore['preference_strength'] =
      absLean < 0.15 ? 'weak' :
      absLean < 0.35 ? 'moderate' :
      absLean < 0.60 ? 'strong' : 'very strong'

    const confidence: TensionScore['confidence_level'] =
      answered < 3 ? 'low' :
      answered < 5 ? 'medium' : 'high'

    const interestingness =
      absLean * 40 +
      answered * 6 +
      (contradicts ? 30 : 0) +
      (genuineDilemma ? 15 : 0) +
      (classification === 'context_dependent' && answered >= 3 ? 12 : 0) +
      (confidence === 'high' ? 10 : confidence === 'medium' ? 5 : 0) +
      (classification === 'balanced' ? -8 : 0)

    scores.push({
      pair_key: pairKey,
      axis_a: group.axis_a,
      axis_b: group.axis_b,
      signature: group.signature,
      side_a,
      side_b,
      lean,
      wins_a: winsA,
      wins_b: winsB,
      neutral_count: neutral,
      answered_count: answered,
      question_count: group.entries.length,
      preference_strength: strength,
      classification,
      confidence_level: confidence,
      ideals: {
        side_a_support: sideASupport,
        side_b_support: sideBSupport,
        genuine_dilemma: genuineDilemma,
        contradicts_ideals: contradicts
      },
      interestingness_score: interestingness
    })
  }

  return scores.sort((a, b) => b.interestingness_score - a.interestingness_score)
}

/**
 * Per-question breakdown for a tension: which side each answer favored
 * and how strongly. Sorted most-decisive first.
 */
export function getTensionQuestionDetails(
  tension: Pick<TensionScore, 'axis_a' | 'axis_b' | 'signature' | 'side_a'>,
  responses: ResponsesMap,
  questions: QuestionWithLinks[]
): TensionQuestionDetail[] {
  const groupKey = `${tension.axis_a}|${tension.axis_b}|${tension.signature}`
  const group = collectTensionGroups(questions).get(groupKey)
  if (!group) return []

  // Same orientation as analyzeTensions: positive term => side_a won.
  const anchorIsAxisA = tension.side_a.axis_id === tension.axis_a
  const orient = (anchorIsAxisA ? 1 : tension.signature) * tension.side_a.pole

  return group.entries
    .map(entry => {
      const r = responses[entry.question.id]
      if (r === undefined) return null

      const term = r * entry.key_a * orient
      const winner: TensionQuestionDetail['winner'] =
        term > 0 ? 'side_a' : term < 0 ? 'side_b' : 'neutral'

      return {
        question: entry.question,
        response: r,
        winner,
        intensity: Math.abs(r) / 2
      }
    })
    .filter((d): d is TensionQuestionDetail => d !== null)
    .sort((a, b) => b.intensity - a.intensity)
}
