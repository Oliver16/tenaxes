import { TensionScore, QuestionWithLinks, ResponsesMap } from '@/lib/database.types'
import {
  getTensionQuestionDetails,
  type CollisionPairSummary,
  type TensionQuestionDetail
} from '@/lib/tension-analyzer'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

/**
 * One collision pair rendered as the primary unit: the value at stake in
 * the pair's header, and the two mirrored probes nested inside it. Each
 * probe is a single deliberately designed scenario, so all claims are
 * phrased for one answer ("in this scenario you chose...") — never as a
 * pattern across scenarios.
 */

export interface ProbeView {
  tension: TensionScore
  /** The side of this probe that is NOT the pair's shared pole. */
  opposing: TensionScore['side_a']
  /** Outcome for the shared pole in this probe. */
  outcome: 'protected' | 'traded' | 'neutral' | 'unanswered'
  detail: TensionQuestionDetail | null
}

const sideKey = (s: { axis_id: string; pole: number }) => `${s.axis_id}:${s.pole}`

export function buildProbeViews(
  pair: CollisionPairSummary,
  tensions: TensionScore[],
  questions: QuestionWithLinks[],
  responses: ResponsesMap
): ProbeView[] {
  const byKey = new Map(tensions.map(t => [t.pair_key, t]))
  return pair.probe_keys
    .map(key => byKey.get(key))
    .filter((t): t is TensionScore => !!t)
    .map(tension => {
      const sharedIsA = sideKey(tension.side_a) === sideKey(pair.shared_pole)
      const opposing = sharedIsA ? tension.side_b : tension.side_a
      const term = sharedIsA ? tension.lean : -tension.lean
      const outcome: ProbeView['outcome'] =
        tension.answered_count === 0 ? 'unanswered' :
        term > 0 ? 'protected' :
        term < 0 ? 'traded' : 'neutral'
      const detail = getTensionQuestionDetails(tension, responses, questions)[0] ?? null
      return { tension, opposing, outcome, detail }
    })
}

/** One-sentence pair narrative built from the actual probe outcomes. */
export function pairNarrative(pair: CollisionPairSummary, probes: ProbeView[]): string {
  const value = pair.shared_pole.label
  const protectedAgainst = probes.filter(p => p.outcome === 'protected').map(p => p.opposing.label)
  const tradedFor = probes.filter(p => p.outcome === 'traded').map(p => p.opposing.label)

  if (pair.classification === 'cross_pressured') {
    return `You protected ${value} when it collided with ${protectedAgainst.join(' and ')}, ` +
      `but gave it up for ${tradedFor.join(' and ')}. The framing, not the value, decided.`
  }
  if (pair.classification === 'aligned' && pair.direction > 0) {
    return `Whether ${value} was priced against ${probes.map(p => p.opposing.label).join(' or ')}, you protected it.`
  }
  if (pair.classification === 'aligned' && pair.direction < 0) {
    return `Under both framings you traded ${value} away — to ${probes.map(p => p.opposing.label).join(' and to ')}.`
  }
  return `Not enough decisive answers to read a pattern for ${value} in this collision.`
}

const CLASSIFICATION_BADGE: Record<
  CollisionPairSummary['classification'],
  { label: (direction: number) => string; className: string }
> = {
  aligned: {
    label: d => d > 0 ? 'Consistently protected' : 'Consistently traded away',
    className: 'bg-green-100 text-green-900 border-green-300'
  },
  cross_pressured: {
    label: () => 'Cross-pressured',
    className: 'bg-amber-100 text-amber-900 border-amber-300'
  },
  inconclusive: {
    label: () => 'Inconclusive',
    className: 'bg-gray-100 text-gray-700 border-gray-300'
  }
}

function formatSupport(score: number | null) {
  if (score === null) return null
  return `${score >= 0 ? '+' : ''}${(score * 100).toFixed(0)}%`
}

function ProbeBlock({ probe, sharedLabel }: { probe: ProbeView; sharedLabel: string }) {
  const { tension, opposing, outcome, detail } = probe

  const outcomeText =
    outcome === 'protected' ? `You chose ${sharedLabel}` :
    outcome === 'traded' ? `You chose ${opposing.label}` :
    outcome === 'neutral' ? 'You stayed neutral' : 'Not answered'

  const intensityWord =
    detail && detail.intensity >= 1 ? 'strongly' :
    detail && detail.intensity > 0 ? 'mildly' : ''

  // Stated support for the value that lost this probe, when the single
  // answer ran against the respondent's stronger stated ideal.
  const contradicted =
    tension.ideals.contradicts_ideals === 'side_a' ? tension.side_a :
    tension.ideals.contradicts_ideals === 'side_b' ? tension.side_b : null
  const contradictedSupport = contradicted
    ? (contradicted === tension.side_a ? tension.ideals.side_a_support : tension.ideals.side_b_support)
    : null

  return (
    <div className="p-3 bg-muted/40 rounded-lg border space-y-2">
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="font-medium uppercase tracking-wide">
          Framed against {opposing.label}
        </span>
        <span>{opposing.axis_name}</span>
      </div>

      {detail && (
        <p className="text-sm leading-relaxed">{detail.question.text}</p>
      )}

      <div className="flex items-center gap-2 flex-wrap text-xs">
        <Badge
          variant="outline"
          className={
            outcome === 'protected' ? 'bg-green-50 text-green-900 border-green-300' :
            outcome === 'traded' ? 'bg-red-50 text-red-900 border-red-300' :
            'bg-gray-50 text-gray-700'
          }
        >
          {outcomeText}{intensityWord ? ` (${intensityWord})` : ''}
        </Badge>
        {tension.ideals.genuine_dilemma && (
          <span className="text-muted-foreground">
            — a genuine dilemma: you endorse both values in principle
          </span>
        )}
      </div>

      {contradicted && contradictedSupport !== null && (
        <p className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded px-2 py-1.5 leading-relaxed">
          This single choice ran against your stated ideals — in principle you express
          stronger support for {contradicted.label} ({formatSupport(contradictedSupport)}).
          One scenario isn&apos;t a pattern, but it&apos;s worth noticing.
        </p>
      )}
    </div>
  )
}

export function CollisionPairCard({
  pair,
  rank,
  tensions,
  questions,
  responses
}: {
  pair: CollisionPairSummary
  rank: number
  tensions: TensionScore[]
  questions: QuestionWithLinks[]
  responses: ResponsesMap
}) {
  const probes = buildProbeViews(pair, tensions, questions, responses)
  const badge = CLASSIFICATION_BADGE[pair.classification]

  return (
    <Card className="border-2">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-lg px-3 py-1">#{rank}</Badge>
            <div>
              <CardTitle className="text-xl leading-tight">
                At stake: {pair.shared_pole.label}
              </CardTitle>
              <div className="text-xs text-muted-foreground mt-0.5">
                {pair.shared_pole.axis_name} · probed from both directions
              </div>
            </div>
          </div>
          <Badge variant="outline" className={`text-xs ${badge.className}`}>
            {badge.label(pair.direction)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground leading-relaxed">
          {pairNarrative(pair, probes)}
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          {probes.map(probe => (
            <ProbeBlock
              key={probe.tension.pair_key}
              probe={probe}
              sharedLabel={pair.shared_pole.label}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
