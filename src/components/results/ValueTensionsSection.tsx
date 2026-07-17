import { TensionScore, QuestionWithLinks, ResponsesMap } from '@/lib/database.types'
import { type CollisionPairSummary } from '@/lib/tension-analyzer'
import { CollisionPairCard } from './CollisionPairCard'

interface ValueTensionsSectionProps {
  tensions: TensionScore[]
  /** Pair-level rollup of the mirrored collision probes. */
  pairs: CollisionPairSummary[]
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

/**
 * Ranks collision pairs for display. Cross-pressured pairs and pairs
 * whose probes clash with stated ideals are the most informative;
 * within a class, richer/stronger probes (analyzer interestingness) win.
 */
function rankPairs(pairs: CollisionPairSummary[], tensions: TensionScore[]): CollisionPairSummary[] {
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

export function ValueTensionsSection({
  tensions,
  pairs,
  questions,
  responses
}: ValueTensionsSectionProps) {

  const ranked = rankPairs(pairs, tensions)
  if (ranked.length === 0) return null

  const HIGHLIGHT_COUNT = 6
  const highlighted = ranked.slice(0, HIGHLIGHT_COUNT)
  const remaining = ranked.slice(HIGHLIGHT_COUNT)

  return (
    <section className="mt-12 space-y-8">
      <div className="space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">
          How You Navigate Value Conflicts
        </h2>
        <p className="text-muted-foreground text-lg">
          Each collision pair below prices one value against another, twice —
          once framed from each side. What matters is whether the value at
          stake survives both framings: a consistent answer reveals a real
          priority, a flip reveals that the framing decided.
        </p>
      </div>

      <div className="space-y-8">
        {highlighted.map((pair, index) => (
          <CollisionPairCard
            key={pair.pair_id}
            pair={pair}
            rank={index + 1}
            tensions={tensions}
            questions={questions}
            responses={responses}
          />
        ))}
      </div>

      {remaining.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer font-semibold text-sm hover:text-foreground/80 list-none">
            <div className="flex items-center gap-2">
              <svg
                className="w-4 h-4 transition-transform group-open:rotate-90"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <span>Show the other {remaining.length} collision pairs</span>
            </div>
          </summary>
          <div className="space-y-8 mt-6">
            {remaining.map((pair, index) => (
              <CollisionPairCard
                key={pair.pair_id}
                pair={pair}
                rank={HIGHLIGHT_COUNT + index + 1}
                tensions={tensions}
                questions={questions}
                responses={responses}
              />
            ))}
          </div>
        </details>
      )}

      <div className="mt-8 p-4 bg-muted/50 rounded-lg border">
        <div className="flex items-start gap-3">
          <InfoIcon />
          <div className="space-y-1 text-sm">
            <p className="font-medium">How we identify these collisions</p>
            <p className="text-muted-foreground">
              These insights come only from scenario questions that explicitly
              price one value against another (&quot;even if&hellip;&quot;, &quot;rather
              than&hellip;&quot;). Every pair is probed with two mirrored scenarios
              that test different pole combinations, so the two answers are never
              averaged into one score. We compare each choice with the ideals you
              expressed in the conceptual questions; each probe is a single
              scenario, so treat any one flag as a prompt for reflection, not a
              verdict.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
