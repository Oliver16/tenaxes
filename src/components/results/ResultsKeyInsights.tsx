import Link from 'next/link'
import type { AxisScore as AxisScoreSummary } from '@/lib/supabase'
import type { AxisComparison } from '@/lib/results/load-result-analysis'
import type { CollisionPairViewModel } from '@/lib/results/collision-view'
import { poleSideLabel } from './ResultsProfileHero'

const MIXED_THRESHOLD = 0.2
const GAP_THRESHOLD = 0.25

function InsightCard({
  title,
  href,
  linkLabel,
  children
}: {
  title: string
  href: string
  linkLabel: string
  children: React.ReactNode
}) {
  return (
    <div className="p-4 rounded-lg border border-gray-200 bg-gray-50 flex flex-col">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">{title}</h3>
      <div className="text-sm text-gray-700 leading-relaxed flex-1">{children}</div>
      <Link href={href} className="text-xs font-medium text-blue-600 hover:text-blue-800 mt-3">
        {linkLabel} →
      </Link>
    </div>
  )
}

/**
 * "What stands out": at most four insight cards — strongest core
 * conviction, strongest style facet, largest conceptual/applied gap, and
 * the highest-ranked decisive value conflict.
 */
export function ResultsKeyInsights({
  sessionId,
  strongestCore,
  strongestFacet,
  largestGap,
  topConflict
}: {
  sessionId: string
  strongestCore: AxisScoreSummary | null
  strongestFacet: AxisScoreSummary | null
  /** Largest conceptual/applied comparison, or null if none exist. */
  largestGap: AxisComparison | null
  /** Highest-ranked decisive (non-inconclusive) pair, or null. */
  topConflict: CollisionPairViewModel | null
}) {
  const base = `/results/${sessionId}`
  const cards: React.ReactNode[] = []

  if (strongestCore && Math.abs(strongestCore.score) >= MIXED_THRESHOLD) {
    cards.push(
      <InsightCard
        key="conviction"
        title="Strongest conviction"
        href={`${base}/axes/${strongestCore.axis_id}`}
        linkLabel="See the evidence"
      >
        <strong>{poleSideLabel(strongestCore)}</strong> on {strongestCore.name}{' '}
        ({strongestCore.score > 0 ? '+' : ''}{Math.round(strongestCore.score * 100)}%).
      </InsightCard>
    )
  }

  if (strongestFacet && Math.abs(strongestFacet.score) >= MIXED_THRESHOLD) {
    cards.push(
      <InsightCard
        key="style"
        title="Strongest style facet"
        href={`${base}/axes/${strongestFacet.axis_id}`}
        linkLabel="See the evidence"
      >
        <strong>{poleSideLabel(strongestFacet)}</strong> on {strongestFacet.name}{' '}
        ({strongestFacet.score > 0 ? '+' : ''}{Math.round(strongestFacet.score * 100)}%).
      </InsightCard>
    )
  }

  if (largestGap) {
    cards.push(
      <InsightCard
        key="gap"
        title="Principles vs. practical choices"
        href={`${base}/consistency`}
        linkLabel="Compare the registers"
      >
        {largestGap.difference < GAP_THRESHOLD ? (
          <>Your principles and your practical choices are <strong>closely aligned</strong> across
          every dimension.</>
        ) : (
          <>Your largest register gap is on <strong>{largestGap.name}</strong> — your practical
          choices sit {Math.round(largestGap.difference * 100)}% away from your stated principles.</>
        )}
      </InsightCard>
    )
  }

  if (topConflict) {
    cards.push(
      <InsightCard
        key="conflict"
        title="Sharpest value conflict"
        href={`${base}/conflicts`}
        linkLabel="All value conflicts"
      >
        <span className="block text-xs text-gray-500 mb-1">
          {topConflict.sharedLabel} vs. {topConflict.otherAxisName}
        </span>
        {topConflict.narrative}
      </InsightCard>
    )
  }

  if (cards.length === 0) return null

  return (
    <section className="bg-white rounded-xl shadow-lg p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-4">What stands out</h2>
      <div className="grid gap-4 sm:grid-cols-2">{cards}</div>
    </section>
  )
}
