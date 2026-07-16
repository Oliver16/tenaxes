import { TensionScore } from '@/lib/database.types'

interface AxisCollisionDetailsProps {
  axisId: string
  axisName: string
  tensions: TensionScore[]
}

export function AxisCollisionDetails({
  axisId,
  axisName,
  tensions
}: AxisCollisionDetailsProps) {

  // Tensions involving this axis, best-evidenced first
  const relevant = tensions
    .filter(t => t.axis_a === axisId || t.axis_b === axisId)
    .slice(0, 3)

  if (relevant.length === 0) return null

  return (
    <div className="mt-6 pt-6 border-t space-y-4">
      <h4 className="font-semibold text-sm">
        When {axisName} collides with other values:
      </h4>

      <div className="space-y-3">
        {relevant.map((tension) => {
          const thisSideIsA = tension.side_a.axis_id === axisId
          const thisSide = thisSideIsA ? tension.side_a : tension.side_b
          const otherSide = thisSideIsA ? tension.side_b : tension.side_a
          const thisWins = thisSideIsA ? tension.wins_a : tension.wins_b
          const otherWins = thisSideIsA ? tension.wins_b : tension.wins_a

          const summary =
            tension.classification === 'context_dependent'
              ? `You weigh these case-by-case (${thisWins}–${otherWins} across scenarios)`
              : tension.classification === 'balanced'
              ? 'No clear pattern in your answers'
              : thisWins >= otherWins
              ? `You chose ${thisSide.label} in ${thisWins} of ${tension.answered_count} scenarios`
              : `You chose ${otherSide.label} in ${otherWins} of ${tension.answered_count} scenarios`

          const strengthColors: Record<TensionScore['preference_strength'], string> = {
            'very strong': 'bg-red-500 text-white',
            'strong': 'bg-orange-500 text-white',
            'moderate': 'bg-yellow-500 text-black',
            'weak': 'bg-blue-500 text-white'
          }

          return (
            <div key={tension.pair_key} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
              <div className="flex-1">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-sm font-medium">
                    {thisSide.label} vs {otherSide.label}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    ({tension.answered_count} scenario{tension.answered_count !== 1 ? 's' : ''})
                  </span>
                  {tension.ideals.contradicts_ideals && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
                      clashes with ideals
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {summary}
                </p>
              </div>

              <div className={`px-2 py-1 rounded text-xs font-medium ${strengthColors[tension.preference_strength]}`}>
                {tension.preference_strength}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
