import { CollisionScore, QuestionWithLinks } from '@/lib/database.types'
import { findCollisionQuestions } from '@/lib/collision-analyzer'
import { CollisionCard } from './CollisionCard'

interface ValueTensionsSectionProps {
  collisions: CollisionScore[]
  questions: QuestionWithLinks[]
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
  questions 
}: ValueTensionsSectionProps) {
  
  if (collisions.length === 0) return null
  
  // Get top 5 most interesting collisions
  const topCollisions = collisions
    .filter(c => c.confidence_level !== 'low')
    .slice(0, 5)
  
  // Icon mapping for common collision pairs
  const getIcon = (primary: string, collision: string, direction: string): string => {
    const iconMap: Record<string, string> = {
      'C1|C9': direction === 'primary' ? '💼' : '🌱',
      'C1|C2': direction === 'primary' ? '📈' : '⚖️',
      'C3|F1': direction === 'primary' ? '🛡️' : '✊',
      'C5|C10': direction === 'primary' ? '📜' : '🌍',
      'C8|C3': direction === 'primary' ? '🤖' : '🔒',
      'C9|C1': direction === 'collision' ? '💼' : '🌱',
      'C2|C1': direction === 'collision' ? '📈' : '⚖️',
      'F1|C3': direction === 'collision' ? '🛡️' : '✊',
      'C10|C5': direction === 'collision' ? '📜' : '🌍',
    }
    
    const key = `${primary}|${collision}`
    return iconMap[key] || '🤔'
  }
  
  return (
    <section className="bg-white rounded-lg shadow-md p-8">
      <div className="mb-6">
        <h2 className="text-3xl font-bold mb-2">
          How You Navigate Value Conflicts
        </h2>
        <p className="text-gray-600">
          Real-world decisions often pit two good things against each other.
          Here's what your responses reveal about which values you prioritize when they collide.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {topCollisions.map((collision, index) => {
          const icon = getIcon(
            collision.axis_primary,
            collision.axis_collision,
            collision.preference_direction
          )

          const examples = findCollisionQuestions(
            collision.axis_primary,
            collision.axis_collision,
            questions
          )
            .slice(0, 2)
            .map(q => q.text)

          return (
            <CollisionCard
              key={`${collision.axis_primary}-${collision.axis_collision}`}
              collision={collision}
              rank={index + 1}
              icon={icon}
              exampleScenarios={examples}
            />
          )
        })}
      </div>

      <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-start gap-3">
          <InfoIcon />
          <div className="space-y-1 text-sm">
            <p className="font-semibold text-blue-900">How we identify these tensions</p>
            <p className="text-blue-800">
              These insights come from questions that explicitly ask you to choose between
              two competing values in realistic scenarios. They reveal your actual priorities,
              not just your ideals.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
