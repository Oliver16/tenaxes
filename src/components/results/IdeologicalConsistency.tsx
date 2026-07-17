import { AxisScore, TensionScore } from '@/lib/database.types'
import { computeFlavorMatches, scoresById } from '@/lib/flavor-matcher'
import type { FlavorMatch } from '@/lib/supabase'

/**
 * "Who you sound like vs. how you choose."
 *
 * Archetypes are matched twice — once against the conceptual axis scores
 * (stated principles) and once against the applied axis scores (concrete
 * scenario choices) — and the two profiles are compared. The consistency
 * rating is computed from the per-axis gap between the two registers:
 *
 *   consistency = 100 x (1 - mean(|conceptual - applied|) / 2)
 *
 * (scores live in [-1, 1], so a full pole flip on every axis scores 0 and
 * identical profiles score 100). The count of collision probes whose
 * choice ran against stated ideals is reported alongside as independent,
 * scenario-level evidence — it does not enter the rating.
 */

interface IdeologicalConsistencyProps {
  conceptualScores: Pick<AxisScore, 'axis_id' | 'name' | 'score'>[]
  appliedScores: Pick<AxisScore, 'axis_id' | 'name' | 'score'>[]
  tensions: TensionScore[]
}

function ratingBand(rating: number): { label: string; color: string; blurb: string } {
  if (rating >= 90) return {
    label: 'Highly consistent',
    color: '#16a34a',
    blurb: 'Your concrete choices track your stated principles closely across the board.'
  }
  if (rating >= 78) return {
    label: 'Broadly consistent',
    color: '#65a30d',
    blurb: 'Your choices mostly follow your principles, with a few dimensions where practice bends.'
  }
  if (rating >= 64) return {
    label: 'Mixed',
    color: '#d97706',
    blurb: 'On several dimensions the ideology you endorse and the one you practice pull apart.'
  }
  return {
    label: 'Talk and walk diverge',
    color: '#dc2626',
    blurb: 'What you endorse in principle and what you choose under constraint are substantially different ideologies.'
  }
}

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

export function IdeologicalConsistency({
  conceptualScores,
  appliedScores,
  tensions
}: IdeologicalConsistencyProps) {
  if (conceptualScores.length === 0 || appliedScores.length === 0) return null

  const conceptualFlavors = computeFlavorMatches(scoresById(conceptualScores))
  const appliedFlavors = computeFlavorMatches(scoresById(appliedScores))

  // Per-axis gaps over the axes present in both registers
  const appliedByAxis = Object.fromEntries(appliedScores.map(s => [s.axis_id, s.score]))
  const gaps = conceptualScores
    .filter(s => appliedByAxis[s.axis_id] !== undefined)
    .map(s => ({
      axis_id: s.axis_id,
      name: s.name,
      gap: Math.abs(s.score - appliedByAxis[s.axis_id])
    }))
  if (gaps.length === 0) return null

  const meanGap = gaps.reduce((sum, g) => sum + g.gap, 0) / gaps.length
  const rating = Math.round(100 * (1 - meanGap / 2))
  const band = ratingBand(rating)
  const biggestGaps = [...gaps].sort((a, b) => b.gap - a.gap).slice(0, 2).filter(g => g.gap >= 0.25)

  const sameTopArchetype =
    conceptualFlavors[0] && appliedFlavors[0] &&
    conceptualFlavors[0].flavor_id === appliedFlavors[0].flavor_id

  const contradictions = tensions.filter(t => t.ideals.contradicts_ideals).length

  return (
    <section className="bg-white rounded-xl shadow-lg p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-2 pb-2 border-b">
        Who You Sound Like vs. How You Choose
      </h2>
      <p className="text-gray-500 text-sm mb-6">
        Your archetype matched two ways: against the principles you endorsed in the
        conceptual questions, and against the choices you made in concrete scenarios
        with real costs attached.
      </p>

      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <ArchetypeCard
          title="On principle, you sound like"
          subtitle="matched from your conceptual answers — your stated ideals"
          matches={conceptualFlavors}
        />
        <ArchetypeCard
          title="Under constraint, you choose like"
          subtitle="matched from your applied answers — scenarios with costs"
          matches={appliedFlavors}
        />
      </div>

      <p className="text-sm text-gray-600 mb-6">
        {sameTopArchetype
          ? <>Your top archetype is <span className="font-medium">the same in both registers</span> — the ideology you endorse is the one you practice.</>
          : <>Your stated ideals match a <span className="font-medium">different archetype</span> than your concrete choices do — the gap below shows where.</>}
      </p>

      {/* Consistency rating */}
      <div className="p-4 rounded-lg border bg-gray-50">
        <div className="flex items-baseline justify-between flex-wrap gap-2 mb-2">
          <h3 className="font-semibold text-gray-800">Ideological consistency</h3>
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
            Computed from the average gap between your conceptual and applied scores
            across all {gaps.length} dimensions (100 = identical profiles, 0 = a full
            pole flip on every dimension).
          </li>
          {biggestGaps.length > 0 && (
            <li>
              Largest gaps: {biggestGaps.map(g => `${g.name} (${Math.round(g.gap * 100)}%)`).join(', ')}
              {' '}— detailed in &ldquo;Talk the Talk vs. Walk the Walk&rdquo; below.
            </li>
          )}
          <li>
            Independently of the rating, {contradictions === 0
              ? 'none of your collision choices ran against your stated ideals.'
              : `${contradictions} collision choice${contradictions !== 1 ? 's' : ''} ran against your stated ideals (flagged in the value-conflict section).`}
          </li>
        </ul>
      </div>
    </section>
  )
}
