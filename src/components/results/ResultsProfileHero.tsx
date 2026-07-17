import type { AxisScore as AxisScoreSummary, FlavorMatch } from '@/lib/supabase'
import type { AxisCoverage } from '@/lib/database.types'
import type { ConsistencySummary } from '@/lib/results/consistency'

const MIXED_THRESHOLD = 0.2

/**
 * Strongest position in a group, preferring axes with enough coverage to
 * be reliable. Returns null for an empty group.
 */
export function strongestAxis(
  axes: AxisScoreSummary[],
  coverageByAxis: Record<string, AxisCoverage>
): AxisScoreSummary | null {
  if (axes.length === 0) return null
  const byStrength = [...axes].sort((a, b) => Math.abs(b.score) - Math.abs(a.score))
  const confident = byStrength.filter(
    a => coverageByAxis[a.axis_id]?.confidence !== 'insufficient'
  )
  return (confident.length > 0 ? confident : byStrength)[0]
}

export function poleSideLabel(axis: AxisScoreSummary): string {
  return axis.score < 0 ? axis.pole_negative : axis.pole_positive
}

interface ResultsProfileHeroProps {
  topFlavors: FlavorMatch[]
  coreAxes: AxisScoreSummary[]
  facets: AxisScoreSummary[]
  coverageByAxis: Record<string, AxisCoverage>
  consistency: ConsistencySummary | null
  answeredCount: number
  totalQuestions: number
  notSureCount: number
}

export function ResultsProfileHero({
  topFlavors,
  coreAxes,
  facets,
  coverageByAxis,
  consistency,
  answeredCount,
  totalQuestions,
  notSureCount
}: ResultsProfileHeroProps) {
  const top = topFlavors[0] ?? null
  const runnersUp = topFlavors.slice(1, 3).filter(f => f.affinity > 0)
  const strongestCore = strongestAxis(coreAxes, coverageByAxis)
  const strongestFacet = strongestAxis(facets, coverageByAxis)

  // Deterministic narrative — assembled from scores, never generated prose.
  const coreSentence = strongestCore
    ? Math.abs(strongestCore.score) < MIXED_THRESHOLD
      ? <>Your core positions are <strong>broadly mixed</strong> — no single dimension stands out strongly.</>
      : <>Your clearest position is <strong>{poleSideLabel(strongestCore)}</strong> on <strong>{strongestCore.name}</strong>.</>
    : null
  const facetSentence = strongestFacet
    ? Math.abs(strongestFacet.score) < MIXED_THRESHOLD
      ? <>Your political style is <strong>broadly mixed</strong> across the facets.</>
      : <>Your political style most strongly leans <strong>{poleSideLabel(strongestFacet)}</strong>.</>
    : null
  const consistencySentence = consistency
    ? <>Your principles and practical choices are <strong>{consistency.band.label.toLowerCase()}</strong>.</>
    : null

  const chips: { label: string; value: string }[] = []
  if (top) chips.push({ label: 'Top type', value: top.name })
  if (strongestCore && Math.abs(strongestCore.score) >= MIXED_THRESHOLD) {
    chips.push({ label: 'Strongest axis', value: strongestCore.name })
  }
  if (consistency) chips.push({ label: 'Consistency', value: `${consistency.rating}/100 · ${consistency.band.label}` })
  chips.push({ label: 'Coverage', value: `${answeredCount} of ${totalQuestions} answered` })

  return (
    <section className="bg-white rounded-xl shadow-lg p-6">
      {top ? (
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
            Top type
          </p>
          <div className="flex items-baseline gap-3 flex-wrap">
            <h2 className="text-3xl font-bold" style={{ color: top.color }}>{top.name}</h2>
            <span className="text-lg font-mono font-semibold text-gray-600">
              {Math.round(top.affinity * 100)}% match
            </span>
          </div>
          <p className="text-gray-600 mt-1">{top.description}</p>
          {runnersUp.length > 0 && (
            <p className="text-sm text-gray-500 mt-1">
              then {runnersUp.map(f => `${f.name} (${Math.round(f.affinity * 100)}%)`).join(', ')}
            </p>
          )}
        </div>
      ) : (
        <p className="text-gray-600 mb-4">Not enough answers to match a political type.</p>
      )}

      {(coreSentence || facetSentence || consistencySentence) && (
        <p className="text-gray-700 leading-relaxed mb-4">
          {coreSentence} {facetSentence} {consistencySentence}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {chips.map(chip => (
          <span
            key={chip.label}
            className="inline-flex items-baseline gap-1.5 px-3 py-1 rounded-full bg-gray-100 border border-gray-200 text-sm"
          >
            <span className="text-gray-500">{chip.label}:</span>
            <span className="font-medium text-gray-800">{chip.value}</span>
          </span>
        ))}
      </div>

      {notSureCount > 0 && (
        <p className="text-xs text-gray-400 mt-3">
          {notSureCount} &ldquo;not sure&rdquo; answer{notSureCount !== 1 ? 's' : ''} — recorded but
          never scored; they reduce coverage instead of faking a position.
        </p>
      )}
    </section>
  )
}
