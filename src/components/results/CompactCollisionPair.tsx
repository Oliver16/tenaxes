'use client'

import type { CollisionPairViewModel, ProbeViewModel } from '@/lib/results/collision-view'

/**
 * One collision pair, collapsed by default: the value at stake, the
 * classification, and the one-sentence narrative. Expanding reveals the
 * two mirrored probe questions and how each was resolved.
 */

const CLASSIFICATION_BADGE: Record<string, { label: (d: number) => string; className: string }> = {
  aligned: {
    label: d => d > 0 ? 'Consistently protected' : 'Consistently traded away',
    className: 'bg-green-100 text-green-900 border-green-300'
  },
  cross_pressured: {
    label: () => 'Cross-pressured',
    className: 'bg-amber-100 text-amber-900 border-amber-300'
  },
  inconclusive: {
    label: () => 'Inconclusive',
    className: 'bg-gray-100 text-gray-700 border-gray-300'
  }
}

function formatSupport(score: number) {
  return `${score >= 0 ? '+' : ''}${(score * 100).toFixed(0)}%`
}

function ProbeBlock({ probe, sharedLabel }: { probe: ProbeViewModel; sharedLabel: string }) {
  const outcomeText =
    probe.outcome === 'protected' ? `You chose ${sharedLabel}` :
    probe.outcome === 'traded' ? `You chose ${probe.opposingLabel}` :
    probe.outcome === 'neutral' ? 'You stayed neutral' : 'Not answered'

  return (
    <div className="p-3 bg-gray-50 rounded-lg border space-y-2">
      <div className="flex items-center justify-between gap-2 text-xs text-gray-500">
        <span className="font-medium uppercase tracking-wide">
          Framed against {probe.opposingLabel}
        </span>
        <span>{probe.opposingAxisName}</span>
      </div>

      {probe.questionText && (
        <p className="text-sm leading-relaxed text-gray-700">{probe.questionText}</p>
      )}

      <div className="flex items-center gap-2 flex-wrap text-xs">
        <span
          className={`px-2 py-0.5 rounded border font-medium ${
            probe.outcome === 'protected' ? 'bg-green-50 text-green-900 border-green-300' :
            probe.outcome === 'traded' ? 'bg-red-50 text-red-900 border-red-300' :
            'bg-gray-100 text-gray-700 border-gray-300'
          }`}
        >
          {outcomeText}{probe.intensityWord ? ` (${probe.intensityWord})` : ''}
        </span>
        {probe.genuineDilemma && (
          <span className="text-gray-500">
            — a genuine dilemma: you endorse both values in principle
          </span>
        )}
      </div>

      {probe.contradictedLabel && probe.contradictedSupport !== null && (
        <p className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded px-2 py-1.5 leading-relaxed">
          This single choice ran against your stated ideals — in principle you express
          stronger support for {probe.contradictedLabel} ({formatSupport(probe.contradictedSupport)}).
          One scenario isn&apos;t a pattern, but it&apos;s worth noticing.
        </p>
      )}
    </div>
  )
}

export function CompactCollisionPair({ pair }: { pair: CollisionPairViewModel }) {
  const badge = CLASSIFICATION_BADGE[pair.classification]

  return (
    <details
      id={`pair-${pair.pairId}`}
      className="group scroll-mt-6 bg-white rounded-xl border-2 border-gray-200 target:border-amber-400 target:ring-2 target:ring-amber-100"
    >
      <summary className="cursor-pointer list-none p-4 space-y-2">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <span className="font-semibold text-gray-800">
              At stake: {pair.sharedLabel}
            </span>
            <span className="block text-xs text-gray-500 mt-0.5">
              {pair.sharedAxisName} — in collision with {pair.otherAxisName} ·{' '}
              {pair.probesAnswered} of {pair.probeCount} probes answered
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {pair.anyContradiction && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
                ran against stated ideals
              </span>
            )}
            <span className={`text-xs px-2 py-1 rounded border font-medium ${badge.className}`}>
              {badge.label(pair.direction)}
            </span>
          </div>
        </div>
        <p className="text-sm text-gray-600 leading-relaxed">{pair.narrative}</p>
        <span className="inline-block text-xs font-medium text-blue-600 group-open:hidden">
          Show the two probe scenarios ›
        </span>
        <span className="hidden group-open:inline-block text-xs font-medium text-blue-600">
          Hide the probe scenarios ⌄
        </span>
      </summary>
      <div className="px-4 pb-4 grid gap-3 md:grid-cols-2">
        {pair.probes.map(probe => (
          <ProbeBlock key={probe.pairKey} probe={probe} sharedLabel={pair.sharedLabel} />
        ))}
      </div>
    </details>
  )
}
