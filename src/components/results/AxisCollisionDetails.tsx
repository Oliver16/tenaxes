import { TensionScore } from '@/lib/database.types'
import { type CollisionPairSummary } from '@/lib/tension-analyzer'

interface AxisCollisionDetailsProps {
  axisId: string
  axisName: string
  pairs: CollisionPairSummary[]
  tensions: TensionScore[]
}

const CLASSIFICATION_STYLE: Record<CollisionPairSummary['classification'], string> = {
  aligned: 'bg-green-100 text-green-900 border border-green-300',
  cross_pressured: 'bg-amber-100 text-amber-900 border border-amber-300',
  inconclusive: 'bg-gray-100 text-gray-700 border border-gray-300'
}

/**
 * Compact per-axis view of the collision pairs this axis participates in.
 * Pair-level (never per-probe): each pair carries two mirrored scenarios
 * that test different pole combinations, so the honest per-axis summary
 * is whether the value at stake survived both framings.
 */
export function AxisCollisionDetails({
  axisId,
  axisName,
  pairs,
  tensions
}: AxisCollisionDetailsProps) {

  const byKey = new Map(tensions.map(t => [t.pair_key, t]))

  const relevant = pairs
    .filter(p => (p.axis_a === axisId || p.axis_b === axisId) && p.probes_answered > 0)
    .slice(0, 3)

  if (relevant.length === 0) return null

  return (
    <div className="mt-6 pt-6 border-t space-y-4">
      <h4 className="font-semibold text-sm">
        When {axisName} collides with other values:
      </h4>

      <div className="space-y-3">
        {relevant.map(pair => {
          const probes = pair.probe_keys
            .map(k => byKey.get(k))
            .filter((t): t is TensionScore => !!t)
          // Per-probe: the value the shared pole was priced against, and
          // whether the shared pole won that probe.
          const outcomes = probes.map(t => {
            const shared = pair.shared_pole
            const sharedIsA = t.side_a.axis_id === shared.axis_id && t.side_a.pole === shared.pole
            const opposing = sharedIsA ? t.side_b : t.side_a
            const term = sharedIsA ? t.lean : -t.lean
            return { opposing: opposing.label, won: term > 0, decisive: term !== 0 && t.answered_count > 0 }
          })
          const others = outcomes.map(o => o.opposing)
          const anyContradiction = probes.some(t => t.ideals.contradicts_ideals)

          const badgeText =
            pair.classification === 'aligned'
              ? (pair.direction > 0 ? 'consistently protected' : 'consistently traded away')
              : pair.classification === 'cross_pressured'
              ? 'cross-pressured'
              : 'inconclusive'

          const wonAgainst = outcomes.filter(o => o.decisive && o.won).map(o => o.opposing)
          const lostTo = outcomes.filter(o => o.decisive && !o.won).map(o => o.opposing)

          const summary =
            pair.classification === 'aligned'
              ? pair.direction > 0
                ? `${pair.shared_pole.label} survived both framings (vs ${others.join(' and ')}).`
                : `${pair.shared_pole.label} lost under both framings (vs ${others.join(' and ')}).`
              : pair.classification === 'cross_pressured'
              ? `${pair.shared_pole.label} won against ${wonAgainst.join(' and ')} but lost to ${lostTo.join(' and ')} — the framing decided.`
              : `Not enough decisive answers to read a pattern (priced against ${others.join(' and ')}).`

          return (
            <div key={pair.pair_id} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
              <div className="flex-1">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-sm font-medium">
                    At stake: {pair.shared_pole.label}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    ({pair.probes_answered} of {pair.probe_keys.length} probes answered)
                  </span>
                  {anyContradiction && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
                      a choice ran against stated ideals
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {summary}
                </p>
              </div>

              <div className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${CLASSIFICATION_STYLE[pair.classification]}`}>
                {badgeText}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
