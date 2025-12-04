import { CollisionScore } from '@/lib/database.types'
import { QuestionCollisionDetail } from '@/lib/collision-analyzer'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface CollisionCardProps {
  collision: CollisionScore
  rank: number
  questionDetails: QuestionCollisionDetail[]
  primaryConceptualScore?: number
  primaryAppliedScore?: number
  collisionConceptualScore?: number
  collisionAppliedScore?: number
}

export function CollisionCard({
  collision,
  rank,
  questionDetails,
  primaryConceptualScore,
  primaryAppliedScore,
  collisionConceptualScore,
  collisionAppliedScore
}: CollisionCardProps) {

  const {
    primary_name,
    collision_name,
    preference_strength,
    preference_direction,
    confidence_level,
    question_count,
    preference_index
  } = collision

  // Format score as percentage
  const formatScore = (score?: number) => {
    if (score === undefined || score === null) return '—'
    return `${(score * 100).toFixed(0)}%`
  }

  // Calculate divergence (difference between conceptual and applied)
  const primaryDivergence = primaryConceptualScore !== undefined && primaryAppliedScore !== undefined
    ? Math.abs(primaryConceptualScore - primaryAppliedScore)
    : 0

  const collisionDivergence = collisionConceptualScore !== undefined && collisionAppliedScore !== undefined
    ? Math.abs(collisionConceptualScore - collisionAppliedScore)
    : 0

  // Generate headline
  let headline = ''
  let explanation = ''

  if (preference_direction === 'balanced') {
    headline = `You balance ${primary_name} and ${collision_name}`
    explanation = "When these values conflict, you don't consistently favor one over the other. Your decisions depend on the specific situation."
  } else {
    const favored = preference_direction === 'primary' ? primary_name : collision_name
    const opposed = preference_direction === 'primary' ? collision_name : primary_name

    const strengthWord =
      preference_strength === 'very strong' ? 'strongly prioritize' :
      preference_strength === 'strong' ? 'tend to prioritize' :
      preference_strength === 'moderate' ? 'lean toward' : 'slightly favor'

    headline = `You ${strengthWord} ${favored}`

    explanation = `When real-world situations force a choice between ${primary_name} and ${collision_name}, you ${strengthWord} ${favored}. ${
      preference_strength === 'very strong' || preference_strength === 'strong'
        ? 'This is a clear pattern across multiple scenarios.'
        : 'This tendency is moderate and may vary depending on context.'
    }`
  }

  const strengthColor =
    preference_strength === 'very strong' ? 'bg-red-100 border-red-300 text-red-900' :
    preference_strength === 'strong' ? 'bg-orange-100 border-orange-300 text-orange-900' :
    preference_strength === 'moderate' ? 'bg-yellow-100 border-yellow-300 text-yellow-900' :
    'bg-blue-100 border-blue-300 text-blue-900'

  const confidenceBadge =
    confidence_level === 'high' ? 'High confidence' :
    confidence_level === 'medium' ? 'Medium confidence' : 'Low confidence'

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
                {question_count} scenario{question_count > 1 ? 's' : ''}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {confidenceBadge}
              </Badge>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Explanation */}
        <p className="text-sm text-muted-foreground leading-relaxed">
          {explanation}
        </p>

        {/* Core Scales: Scores per axis */}
        <div className="space-y-4 pt-2">
          <h4 className="font-semibold text-sm">Your scores on these axes:</h4>

          <div className="grid grid-cols-2 gap-4">
            {/* Primary Axis Scores */}
            <div className={`p-3 rounded-lg border-2 ${
              preference_direction === 'primary' ? strengthColor : 'bg-muted/30'
            }`}>
              <div className="font-semibold text-sm mb-2">{primary_name}</div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ideal:</span>
                  <span className="font-mono font-bold">{formatScore(primaryConceptualScore)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Applied:</span>
                  <span className="font-mono font-bold">{formatScore(primaryAppliedScore)}</span>
                </div>
                {primaryDivergence > 0.1 && (
                  <div className="pt-1 text-amber-600 dark:text-amber-400">
                    ⚠ {(primaryDivergence * 100).toFixed(0)}% gap
                  </div>
                )}
              </div>
            </div>

            {/* Collision Axis Scores */}
            <div className={`p-3 rounded-lg border-2 ${
              preference_direction === 'collision' ? strengthColor : 'bg-muted/30'
            }`}>
              <div className="font-semibold text-sm mb-2">{collision_name}</div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ideal:</span>
                  <span className="font-mono font-bold">{formatScore(collisionConceptualScore)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Applied:</span>
                  <span className="font-mono font-bold">{formatScore(collisionAppliedScore)}</span>
                </div>
                {collisionDivergence > 0.1 && (
                  <div className="pt-1 text-amber-600 dark:text-amber-400">
                    ⚠ {(collisionDivergence * 100).toFixed(0)}% gap
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Visual preference indicator */}
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground text-center">
            Preference strength
          </div>
          <div className="relative h-3 bg-muted rounded-full overflow-hidden">
            <div
              className={`absolute top-0 h-full transition-all ${
                preference_strength === 'very strong' ? 'bg-red-500' :
                preference_strength === 'strong' ? 'bg-orange-500' :
                preference_strength === 'moderate' ? 'bg-yellow-500' : 'bg-blue-500'
              }`}
              style={{
                left: preference_index < 0 ? `${50 + preference_index * 50}%` : '50%',
                right: preference_index > 0 ? `${50 - preference_index * 50}%` : '50%',
              }}
            />
            <div className="absolute top-0 left-1/2 h-full w-0.5 bg-border" />
          </div>
          <div className="flex justify-between items-center text-xs text-muted-foreground">
            <span className="text-left max-w-[45%]">{primary_name}</span>
            <span className="text-right max-w-[45%]">{collision_name}</span>
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
                <span>View specific questions that revealed this tension ({questionDetails.length})</span>
              </div>
            </summary>

            <div className="space-y-3 mt-3 pl-6">
              {questionDetails.slice(0, 5).map((detail, i) => {
                const favoredName = detail.favored_axis === 'primary' ? primary_name :
                                    detail.favored_axis === 'collision' ? collision_name : 'Balanced'

                const contributionDiff = Math.abs(detail.primary_contribution - detail.collision_contribution)
                const strength = contributionDiff > 1.5 ? 'Strong' :
                                contributionDiff > 0.8 ? 'Moderate' : 'Weak'

                return (
                  <div key={i} className="p-3 bg-muted/50 rounded-lg border space-y-2">
                    <div className="text-sm leading-relaxed">
                      {detail.question.text}
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {favoredName}
                        </Badge>
                        <span className="text-muted-foreground">
                          {strength} preference
                        </span>
                      </div>
                      <div className="text-muted-foreground">
                        Response: {detail.response > 0 ? 'Agree' : detail.response < 0 ? 'Disagree' : 'Neutral'}
                      </div>
                    </div>
                  </div>
                )
              })}
              {questionDetails.length > 5 && (
                <div className="text-xs text-muted-foreground text-center pt-1">
                  + {questionDetails.length - 5} more question{questionDetails.length - 5 > 1 ? 's' : ''}
                </div>
              )}
            </div>
          </details>
        )}
      </CardContent>
    </Card>
  )
}
