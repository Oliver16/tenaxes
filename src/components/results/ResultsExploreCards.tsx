import Link from 'next/link'
import type { ConflictCounts } from '@/lib/results/load-result-analysis'

/** "Explore deeper": linked cards into the four drill-down areas. */
export function ResultsExploreCards({
  sessionId,
  axisCount,
  conflictCounts
}: {
  sessionId: string
  axisCount: number
  conflictCounts: ConflictCounts
}) {
  const base = `/results/${sessionId}`
  const decisiveConflicts =
    conflictCounts.cross_pressured + conflictCounts.protected + conflictCounts.traded_away

  const cards = [
    {
      href: `${base}/axes`,
      title: 'All dimensions',
      description: `Every one of your ${axisCount} axes with scores, confidence, and question-level evidence.`
    },
    {
      href: `${base}/conflicts`,
      title: 'Value conflicts',
      description: decisiveConflicts > 0
        ? `${decisiveConflicts} decisive collision pair${decisiveConflicts !== 1 ? 's' : ''} — which value wins when two of yours collide.`
        : 'Which value wins when two of yours collide.'
    },
    {
      href: `${base}/consistency`,
      title: 'Ideals vs. practice',
      description: 'Your stated principles compared with your practical choices, dimension by dimension.'
    },
    {
      href: `${base}/types`,
      title: 'Political types',
      description: 'The full archetype distribution and why each one matched.'
    }
  ]

  return (
    <section className="bg-white rounded-xl shadow-lg p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-4">Explore deeper</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(card => (
          <Link
            key={card.href}
            href={card.href}
            className="group p-4 rounded-lg border border-gray-200 hover:border-blue-400 hover:shadow-md transition-all flex flex-col"
          >
            <h3 className="font-semibold text-gray-800 group-hover:text-blue-700 mb-1">
              {card.title}
            </h3>
            <p className="text-sm text-gray-500 flex-1">{card.description}</p>
            <span className="text-xs font-medium text-blue-600 mt-3">Open →</span>
          </Link>
        ))}
      </div>
    </section>
  )
}
