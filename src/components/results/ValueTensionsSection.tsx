import { TensionScore, QuestionWithLinks, ResponsesMap } from '@/lib/database.types'
import { getTensionQuestionDetails, type CollisionPairSummary } from '@/lib/tension-analyzer'
import { TensionCard } from './TensionCard'

interface ValueTensionsSectionProps {
  tensions: TensionScore[]
  /** Pair-level rollup of the mirrored collision probes, if available. */
  pairs?: CollisionPairSummary[]
  questions: QuestionWithLinks[]
  responses: ResponsesMap
}

const InfoIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-5 w-5 mt-0.5 text-muted-foreground"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12" y2="8" />
  </svg>
)

const PAIR_CLASS_STYLES: Record<
  CollisionPairSummary['classification'],
  { label: string; badge: string }
> = {
  aligned: { label: 'Consistent', badge: 'bg-green-100 text-green-800' },
  cross_pressured: { label: 'Cross-pressured', badge: 'bg-amber-100 text-amber-800' },
  inconclusive: { label: 'Inconclusive', badge: 'bg-gray-100 text-gray-600' }
}

function pairSummaryText(pair: CollisionPairSummary): string {
  const value = pair.shared_pole.label
  if (pair.classification === 'cross_pressured') {
    return `You protected ${value} under one framing but traded it away under the other — the framing, not the value, decided.`
  }
  if (pair.classification === 'aligned') {
    return pair.direction > 0
      ? `You protected ${value} in both framings of this collision.`
      : `You traded ${value} away in both framings of this collision.`
  }
  return `Not enough decisive answers to read a pattern for ${value} here.`
}

function CollisionPairsRollup({ pairs }: { pairs: CollisionPairSummary[] }) {
  const shown = pairs.filter(p => p.probes_answered > 0 && p.classification !== 'inconclusive')
  if (shown.length === 0) return null

  return (
    <div className="space-y-3">
      <h3 className="text-xl font-semibold tracking-tight">
        Mirrored collision probes
      </h3>
      <p className="text-muted-foreground text-sm">
        Each collision pair is probed twice, with the scenario framed from each
        side. The two framings test different pole combinations, so they are
        never averaged — instead we ask whether the value at stake survives
        both framings.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {shown.map(pair => {
          const style = PAIR_CLASS_STYLES[pair.classification]
          return (
            <div key={pair.pair_id} className="rounded-lg border bg-white p-4">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="font-medium text-sm">{pair.shared_pole.label}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${style.badge}`}>
                  {style.label}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">{pairSummaryText(pair)}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function ValueTensionsSection({
  tensions,
  pairs,
  questions,
  responses
}: ValueTensionsSectionProps) {

  if (tensions.length === 0) return null

  // Top 6 most interesting tensions (the analyzer ranks contradictions
  // and genuine dilemmas highest; single-scenario tensions surface with
  // low confidence rather than being hidden)
  const topTensions = tensions.slice(0, 6)

  return (
    <section className="mt-12 space-y-8">
      <div className="space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">
          How You Navigate Value Conflicts
        </h2>
        <p className="text-muted-foreground text-lg">
          Real-world decisions often pit two good things against each other.
          Here&apos;s what your responses reveal: where you hold clear priorities,
          where you weigh things case-by-case, and where your choices diverge
          from your stated ideals.
        </p>
      </div>

      {pairs && <CollisionPairsRollup pairs={pairs} />}

      <div className="space-y-8">
        {topTensions.map((tension, index) => (
          <TensionCard
            key={tension.pair_key}
            tension={tension}
            rank={index + 1}
            questionDetails={getTensionQuestionDetails(tension, responses, questions)}
          />
        ))}
      </div>

      <div className="mt-8 p-4 bg-muted/50 rounded-lg border">
        <div className="flex items-start gap-3">
          <InfoIcon />
          <div className="space-y-1 text-sm">
            <p className="font-medium">How we identify these tensions</p>
            <p className="text-muted-foreground">
              These insights come only from scenario questions that explicitly
              price one value against another (&quot;even if&hellip;&quot;, &quot;rather
              than&hellip;&quot;). Each answer reveals which value won that
              collision; we count those wins and compare them with the ideals
              you expressed in the conceptual questions. A gap between the two
              can be telling &mdash; or a place to revisit for consistency.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
