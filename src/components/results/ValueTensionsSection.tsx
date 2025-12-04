import { CollisionScore, QuestionWithLinks, ResponsesMap, AxisScore } from '@/lib/database.types'
import { getCollisionQuestionDetails } from '@/lib/collision-analyzer'
import { CollisionCard } from './CollisionCard'

interface ValueTensionsSectionProps {
  collisions: CollisionScore[]
  questions: QuestionWithLinks[]
  responses: ResponsesMap
  conceptualScores?: AxisScore[]
  appliedScores?: AxisScore[]
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

export function ValueTensionsSection({
  collisions,
  questions,
  responses,
  conceptualScores,
  appliedScores
}: ValueTensionsSectionProps) {

  if (collisions.length === 0) return null

  // Get top 6 most interesting collisions (cleaner grid with 2 columns)
  const topCollisions = collisions
    .filter(c => c.confidence_level !== 'low')
    .slice(0, 6)

  return (
    <section className="mt-12 space-y-8">
      <div className="space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">
          How You Navigate Value Conflicts
        </h2>
        <p className="text-muted-foreground text-lg">
          Real-world decisions often pit two good things against each other.
          Here's what your responses reveal about which values you prioritize when they collide.
        </p>
      </div>

      {/* Collision cards in a clean 2-column grid */}
      <div className="space-y-8">
        {topCollisions.map((collision, index) => {
          // Get detailed question information
          const questionDetails = getCollisionQuestionDetails(
            collision.axis_primary,
            collision.axis_collision,
            responses,
            questions
          )

          // Get conceptual vs applied scores for both axes
          const primaryConceptual = conceptualScores?.find(s => s.axis_id === collision.axis_primary)
          const primaryApplied = appliedScores?.find(s => s.axis_id === collision.axis_primary)
          const collisionConceptual = conceptualScores?.find(s => s.axis_id === collision.axis_collision)
          const collisionApplied = appliedScores?.find(s => s.axis_id === collision.axis_collision)

          return (
            <CollisionCard
              key={`${collision.axis_primary}-${collision.axis_collision}`}
              collision={collision}
              rank={index + 1}
              questionDetails={questionDetails}
              primaryConceptualScore={primaryConceptual?.score}
              primaryAppliedScore={primaryApplied?.score}
              collisionConceptualScore={collisionConceptual?.score}
              collisionAppliedScore={collisionApplied?.score}
            />
          )
        })}
      </div>

      <div className="mt-8 p-4 bg-muted/50 rounded-lg border">
        <div className="flex items-start gap-3">
          <InfoIcon />
          <div className="space-y-1 text-sm">
            <p className="font-medium">How we identify these tensions</p>
            <p className="text-muted-foreground">
              These insights come from questions that explicitly ask you to choose between
              two competing values in realistic scenarios. The specific questions that revealed
              each tension are shown below, along with how your ideals (conceptual) compared
              to your real-world choices (applied).
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
