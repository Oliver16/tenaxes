import { notFound } from 'next/navigation'
import { loadResultAnalysis } from '@/lib/results/load-result-analysis'
import { computeConsistency } from '@/lib/results/consistency'
import { ConsistencyComparisonRow } from '@/components/results/ConsistencyComparisonRow'
import type { FlavorMatch } from '@/lib/supabase'

function ArchetypeCard({
  title,
  subtitle,
  matches
}: {
  title: string
  subtitle: string
  matches: FlavorMatch[]
}) {
  const top = matches[0]
  const runnersUp = matches.slice(1, 3).filter(m => m.affinity > 0)

  return (
    <div className="p-4 rounded-lg border-2 bg-gray-50">
      <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
        {title}
      </div>
      <div className="text-xs text-gray-500 mb-3">{subtitle}</div>
      {top ? (
        <>
          <div
            className="rounded-lg p-3 border-2 font-semibold"
            style={{ backgroundColor: `${top.color}18`, borderColor: top.color }}
          >
            <div className="text-gray-900">{top.name}</div>
            <div className="text-xs font-normal text-gray-600 mt-1">
              {Math.round(top.affinity * 100)}% match · {top.match_strength}
            </div>
          </div>
          {runnersUp.length > 0 && (
            <div className="mt-2 text-xs text-gray-500">
              then {runnersUp.map(m => `${m.name} (${Math.round(m.affinity * 100)}%)`).join(', ')}
            </div>
          )}
        </>
      ) : (
        <div className="text-sm text-gray-500">Not enough answers to match.</div>
      )}
    </div>
  )
}

export default async function ConsistencyPage({
  params
}: {
  params: { sessionId: string }
}) {
  const analysis = await loadResultAnalysis(params.sessionId)
  if (!analysis) notFound()

  const {
    conceptualScores,
    appliedScores,
    conceptualCoverage,
    appliedCoverage,
    axisComparisons,
    tensionScores
  } = analysis
  const consistency = computeConsistency(conceptualScores, appliedScores, {
    conceptualCoverage,
    appliedCoverage
  })

  if (!consistency) {
    return (
      <section className="bg-white rounded-xl shadow-lg p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Ideals vs. practice</h1>
        <p className="text-gray-500 text-sm">
          This result doesn&apos;t contain enough directional evidence across both registers for a
          reliable overall alignment rating. At least 12 dimensions need adequate conceptual and
          applied coverage; profiles that remain almost entirely neutral are left unrated.
        </p>
      </section>
    )
  }

  const { rating, band, gapCount, conceptualFlavors, appliedFlavors, sameTopArchetype } = consistency
  const contradictions = tensionScores.filter(t => t.ideals.contradicts_ideals).length
  // axisComparisons arrive sorted largest gap first
  const topGaps = axisComparisons.slice(0, 3).filter(c => c.difference >= 0.25)
  const remaining = axisComparisons.filter(c => !topGaps.includes(c))

  return (
    <>
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Ideals vs. practice</h1>
        <p className="text-gray-500 text-sm mt-1 max-w-3xl">
          Your archetype matched two ways: against the principles you endorsed in the conceptual
          questions, and against the choices you made in concrete scenarios with real costs
          attached.
        </p>
      </div>

      <section className="bg-white rounded-xl shadow-lg p-6 space-y-6">
        <div className="grid md:grid-cols-2 gap-4">
          <ArchetypeCard
            title="On principle"
            subtitle="matched from your conceptual answers — your stated ideals"
            matches={conceptualFlavors}
          />
          <ArchetypeCard
            title="Under constraint"
            subtitle="matched from your applied answers — scenarios with costs"
            matches={appliedFlavors}
          />
        </div>

        <p className="text-sm text-gray-600">
          {sameTopArchetype
            ? <>Your top archetype is <span className="font-medium">the same in both registers</span> — the profile you endorse is the one you practice.</>
            : <>Your stated principles match a <span className="font-medium">different archetype</span> than your practical choices do — the comparisons below show where the registers diverge.</>}
        </p>

        {/* Principles/practice alignment rating */}
        <div className="p-4 rounded-lg border bg-gray-50">
          <div className="flex items-baseline justify-between flex-wrap gap-2 mb-2">
            <h2 className="font-semibold text-gray-800">Principles/practice alignment</h2>
            <div className="text-2xl font-bold" style={{ color: band.color }}>
              {rating}<span className="text-sm font-medium text-gray-500">/100 · {band.label}</span>
            </div>
          </div>

          <div className="relative h-3 bg-gray-200 rounded-full overflow-hidden mb-2">
            <div
              className="absolute top-0 left-0 h-full rounded-full"
              style={{ width: `${rating}%`, backgroundColor: band.color }}
            />
          </div>

          <p className="text-sm text-gray-600 mb-3">{band.blurb}</p>

          <ul className="text-xs text-gray-500 space-y-1">
            <li>
              Computed from the root-mean-square gap between your conceptual and applied scores
              across all {gapCount} dimensions. This makes a large divergence count more than
              several small ones. A single 50-point gap rules out &ldquo;Highly aligned,&rdquo; and a
              75-point gap rules out &ldquo;Broadly aligned&rdquo; (100 = identical profiles, 0 = a full
              pole flip on every dimension).
            </li>
            <li>
              Independently of the rating, {contradictions === 0
                ? 'none of your collision choices ran against your stated ideals.'
                : `${contradictions} collision choice${contradictions !== 1 ? 's' : ''} ran against your stated ideals (flagged on the value-conflicts page).`}
            </li>
          </ul>
        </div>
      </section>

      {topGaps.length > 0 && (
        <section className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-1">Largest register gaps</h2>
          <p className="text-sm text-gray-500 mb-4">
            Dimensions where your practical choices sit furthest from your stated principles —
            different under constraint, not necessarily inconsistent.
          </p>
          <div className="space-y-4">
            {topGaps.map(comparison => (
              <ConsistencyComparisonRow
                key={comparison.axis_id}
                sessionId={params.sessionId}
                comparison={comparison}
                highlight
              />
            ))}
          </div>
        </section>
      )}

      <section className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4">
          {topGaps.length > 0 ? 'All other dimensions' : 'All dimensions'}
        </h2>
        {topGaps.length === 0 && (
          <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
            Your responses show close alignment between principles and practical choices across all
            dimensions.
          </p>
        )}
        <div className="space-y-4">
          {remaining.map(comparison => (
            <ConsistencyComparisonRow
              key={comparison.axis_id}
              sessionId={params.sessionId}
              comparison={comparison}
            />
          ))}
        </div>
      </section>
    </>
  )
}
