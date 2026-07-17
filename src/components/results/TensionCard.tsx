import { TensionScore } from '@/lib/database.types'
import { TensionQuestionDetail } from '@/lib/tension-analyzer'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface TensionCardProps {
  tension: TensionScore
  rank: number
  questionDetails: TensionQuestionDetail[]
}

function formatSupport(score: number | null) {
  if (score === null) return '—'
  return `${score >= 0 ? '+' : ''}${(score * 100).toFixed(0)}%`
}

export function TensionCard({ tension, rank, questionDetails }: TensionCardProps) {
  const {
    side_a,
    side_b,
    lean,
    wins_a,
    wins_b,
    neutral_count,
    answered_count,
    preference_strength,
    classification,
    confidence_level,
    ideals
  } = tension

  const winner = lean > 0 ? side_a : side_b
  const loser = lean > 0 ? side_b : side_a
  const winnerWins = lean > 0 ? wins_a : wins_b
  const loserWins = lean > 0 ? wins_b : wins_a

  // Headline + explanation per classification
  let headline: string
  let explanation: string

  if (classification === 'consistent_priority') {
    const strengthWord =
      preference_strength === 'very strong' ? 'consistently chose' :
      preference_strength === 'strong' ? 'chose' : 'leaned toward'
    headline = `${winner.label} over ${loser.label}`
    explanation = `When scenarios forced a choice, you ${strengthWord} ${winner.label} ` +
      `(${winnerWins} of ${answered_count} scenario${answered_count > 1 ? 's' : ''}` +
      `${loserWins > 0 ? `, ${loserWins} for ${loser.label}` : ''}` +
      `${neutral_count > 0 ? `, ${neutral_count} neutral` : ''}).`
  } else if (classification === 'context_dependent') {
    headline = `${side_a.label} vs ${side_b.label}: it depends`
    explanation = `You didn't pick a single winner - ${side_a.label} won ${wins_a} scenario${wins_a !== 1 ? 's' : ''} ` +
      `and ${side_b.label} won ${wins_b}${neutral_count > 0 ? `, with ${neutral_count} neutral` : ''}. ` +
      `Your choice depends on the specifics of the situation.`
  } else {
    headline = `${side_a.label} vs ${side_b.label}: no clear pattern`
    explanation = `Your answers didn't reveal a consistent priority between these values.`
  }

  const strengthColor =
    preference_strength === 'very strong' ? 'bg-red-100 border-red-300 text-red-900' :
    preference_strength === 'strong' ? 'bg-orange-100 border-orange-300 text-orange-900' :
    preference_strength === 'moderate' ? 'bg-yellow-100 border-yellow-300 text-yellow-900' :
    'bg-blue-100 border-blue-300 text-blue-900'

  const confidenceBadge =
    confidence_level === 'high' ? 'High confidence' :
    confidence_level === 'medium' ? 'Medium confidence' : 'Limited data'

  const contradictedSide =
    ideals.contradicts_ideals === 'side_a' ? side_a :
    ideals.contradicts_ideals === 'side_b' ? side_b : null

  return (
    <Card className="border-2">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="text-lg px-3 py-1">
                #{rank}
              </Badge>
              <CardTitle className="text-xl leading-tight">
                {headline}
              </CardTitle>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="text-xs">
                {answered_count} scenario{answered_count !== 1 ? 's' : ''}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {confidenceBadge}
              </Badge>
              {ideals.genuine_dilemma && (
                <Badge className="text-xs bg-purple-100 text-purple-900 border-purple-300" variant="outline">
                  Genuine dilemma
                </Badge>
              )}
              {contradictedSide && (
                <Badge className="text-xs bg-amber-100 text-amber-900 border-amber-300" variant="outline">
                  Clashes with stated ideals
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <p className="text-sm text-muted-foreground leading-relaxed">
          {explanation}
        </p>

        {/* Ideals vs revealed choices */}
        {(ideals.side_a_support !== null || ideals.side_b_support !== null) && (
          <div className="space-y-3">
            {ideals.genuine_dilemma && (
              <p className="text-sm leading-relaxed">
                Your conceptual answers endorse <span className="font-medium">both</span> of
                these values - these scenarios forced a real ranking.
              </p>
            )}
            {contradictedSide && (
              <div className="p-3 rounded-lg border border-amber-300 bg-amber-50 text-sm text-amber-900 leading-relaxed">
                In principle you express stronger support for{' '}
                <span className="font-semibold">{contradictedSide.label}</span>{' '}
                ({formatSupport(contradictedSide === side_a ? ideals.side_a_support : ideals.side_b_support)}),
                but when it collided with {winner.label}, you chose {winner.label} in{' '}
                {winnerWins} of {answered_count} scenario{answered_count !== 1 ? 's' : ''}.
                That gap can be telling - or a spot to revisit for consistency.
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              {[
                { side: side_a, support: ideals.side_a_support, wins: wins_a, highlighted: lean > 0 },
                { side: side_b, support: ideals.side_b_support, wins: wins_b, highlighted: lean < 0 }
              ].map(({ side, support, wins, highlighted }) => (
                <div
                  key={side.axis_id + side.pole}
                  className={`p-3 rounded-lg border-2 ${highlighted && classification === 'consistent_priority' ? strengthColor : 'bg-muted/30'}`}
                >
                  <div className="font-semibold text-sm mb-1">{side.label}</div>
                  <div className="text-xs text-muted-foreground mb-2">{side.axis_name}</div>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Stated support:</span>
                      <span className="font-mono font-bold">{formatSupport(support)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Scenarios won:</span>
                      <span className="font-mono font-bold">{wins} / {answered_count}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Lean indicator */}
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground text-center">
            Revealed priority
          </div>
          <div className="relative h-3 bg-muted rounded-full overflow-hidden">
            <div
              className={`absolute top-0 h-full transition-all ${
                preference_strength === 'very strong' ? 'bg-red-500' :
                preference_strength === 'strong' ? 'bg-orange-500' :
                preference_strength === 'moderate' ? 'bg-yellow-500' : 'bg-blue-500'
              }`}
              style={{
                left: lean > 0 ? `${50 - lean * 50}%` : '50%',
                right: lean < 0 ? `${50 + lean * 50}%` : '50%',
              }}
            />
            <div className="absolute top-0 left-1/2 h-full w-0.5 bg-border" />
          </div>
          <div className="flex justify-between items-center text-xs text-muted-foreground">
            <span className="text-left max-w-[45%]">{side_a.label}</span>
            <span className="text-right max-w-[45%]">{side_b.label}</span>
          </div>
        </div>

        {/* Questions that revealed this tension */}
        {questionDetails.length > 0 && (
          <details className="group space-y-3 pt-2">
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
                <span>View the scenarios behind this ({questionDetails.length})</span>
              </div>
            </summary>

            <div className="space-y-3 mt-3 pl-6">
              {questionDetails.slice(0, 8).map((detail, i) => {
                const winnerLabel =
                  detail.winner === 'side_a' ? side_a.label :
                  detail.winner === 'side_b' ? side_b.label : 'Neutral'
                const intensityWord =
                  detail.intensity >= 1 ? 'Strong choice' :
                  detail.intensity > 0 ? 'Mild choice' : 'No preference'

                return (
                  <div key={i} className="p-3 bg-muted/50 rounded-lg border space-y-2">
                    <div className="text-sm leading-relaxed">
                      {detail.question.text}
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {winnerLabel}
                        </Badge>
                        <span className="text-muted-foreground">
                          {intensityWord}
                        </span>
                      </div>
                      <div className="text-muted-foreground">
                        Response: {detail.response > 0 ? 'Agree' : detail.response < 0 ? 'Disagree' : 'Neutral'}
                      </div>
                    </div>
                  </div>
                )
              })}
              {questionDetails.length > 8 && (
                <div className="text-xs text-muted-foreground text-center pt-1">
                  + {questionDetails.length - 8} more
                </div>
              )}
            </div>
          </details>
        )}
      </CardContent>
    </Card>
  )
}
