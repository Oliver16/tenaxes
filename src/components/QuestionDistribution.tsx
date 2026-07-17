import { AXES } from '@/lib/instrument'
import { supabase } from '@/lib/supabase'

/**
 * Live question-bank composition, computed from the database so the
 * published distribution can never drift from the bank itself.
 *
 * Palette (validated for CVD safety and surface contrast, light and
 * dark): conceptual = blue-500 (#3b82f6) on both surfaces; applied =
 * amber-500 (#f59e0b) on light, amber-600 (#d97706) on dark. Counts
 * are always direct-labeled, so no reading depends on color alone.
 */

export type AxisDistribution = {
  id: string
  name: string
  pole_negative: string
  pole_positive: string
  isFacet: boolean
  conceptual: number
  applied: number
  total: number
}

export type BankDistribution = {
  axes: AxisDistribution[]
  totals: {
    total: number
    conceptual: number
    applied: number
    tradeoffScenarios: number
    tensionGroups: number
  }
}

export async function getBankDistribution(): Promise<BankDistribution | null> {
  try {
    const [questionsRes, linksRes, axesRes] = await Promise.all([
      supabase.from('questions').select('id, axis_id, question_type').eq('active', true),
      supabase.from('question_axis_links').select('question_id, axis_id, role, axis_key'),
      supabase.from('axes').select('id, name, pole_negative, pole_positive, family').order('id')
    ])

    if (questionsRes.error || !questionsRes.data || questionsRes.data.length === 0) return null

    const questions = questionsRes.data as { id: number; axis_id: string; question_type: string }[]
    const links = (linksRes.data ?? []) as {
      question_id: number; axis_id: string; role: string; axis_key: number
    }[]

    const byAxis: Record<string, { conceptual: number; applied: number }> = {}
    for (const q of questions) {
      const bucket = (byAxis[q.axis_id] ??= { conceptual: 0, applied: 0 })
      if (q.question_type === 'applied') bucket.applied++
      else bucket.conceptual++
    }

    // The database's axes table is authoritative (names, poles, and the
    // core/facet split), so the chart always shows the bank the questions
    // actually belong to; the static registry is only a fallback for
    // databases predating the axes.family column.
    const dbAxes = (axesRes.data ?? []) as {
      id: string; name: string; pole_negative: string | null
      pole_positive: string | null; family: string | null
    }[]
    const axisRows = dbAxes.length > 0
      ? dbAxes.map(a => ({
          id: a.id,
          name: a.name,
          pole_negative: a.pole_negative ?? '',
          pole_positive: a.pole_positive ?? '',
          isFacet: a.family === 'facet'
        }))
      : Object.values(AXES).map(axis => ({
          id: axis.id,
          name: axis.name,
          pole_negative: axis.pole_negative,
          pole_positive: axis.pole_positive,
          isFacet: !!(axis as { is_facet?: boolean }).is_facet
        }))

    const axes: AxisDistribution[] = axisRows
      .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }))
      .map(axis => {
        const bucket = byAxis[axis.id] ?? { conceptual: 0, applied: 0 }
        return {
          ...axis,
          conceptual: bucket.conceptual,
          applied: bucket.applied,
          total: bucket.conceptual + bucket.applied
        }
      })

    // Tension coverage: tradeoff-tagged questions, grouped the way the
    // analyzer groups them (unordered axis pair x pole signature).
    const activeIds = new Set(questions.map(q => q.id))
    const primaryByQ: Record<number, { axis_id: string; axis_key: number }> = {}
    for (const l of links) {
      if (l.role === 'primary' && activeIds.has(l.question_id)) primaryByQ[l.question_id] = l
    }
    const tradeoffQs = new Set<number>()
    const groups = new Set<string>()
    for (const l of links) {
      if (l.role !== 'tradeoff' || !activeIds.has(l.question_id)) continue
      const primary = primaryByQ[l.question_id]
      if (!primary || primary.axis_id === l.axis_id) continue
      tradeoffQs.add(l.question_id)
      const [a, b] = [primary.axis_id, l.axis_id].sort()
      const keyA = a === primary.axis_id ? primary.axis_key : l.axis_key
      const keyB = a === primary.axis_id ? l.axis_key : primary.axis_key
      groups.add(`${a}|${b}|${keyA * keyB}`)
    }

    return {
      axes,
      totals: {
        total: questions.length,
        conceptual: questions.filter(q => q.question_type !== 'applied').length,
        applied: questions.filter(q => q.question_type === 'applied').length,
        tradeoffScenarios: tradeoffQs.size,
        tensionGroups: groups.size
      }
    }
  } catch {
    return null
  }
}

const PALETTE = {
  light: {
    conceptual: '#3b82f6',
    applied: '#f59e0b',
    track: '#e5e7eb',
    heading: 'text-gray-900',
    label: 'text-gray-700',
    muted: 'text-gray-500',
    tileBg: 'bg-white border border-gray-200',
    groupHeading: 'text-gray-500'
  },
  dark: {
    conceptual: '#3b82f6',
    applied: '#d97706',
    track: '#334155',
    heading: 'text-white',
    label: 'text-slate-200',
    muted: 'text-slate-400',
    tileBg: 'bg-slate-800/50 border border-slate-700',
    groupHeading: 'text-slate-400'
  }
} as const

function StatTile({ value, label, variant }: { value: string; label: string; variant: keyof typeof PALETTE }) {
  const p = PALETTE[variant]
  return (
    <div className={`rounded-lg px-4 py-3 text-center ${p.tileBg}`}>
      <div className={`text-2xl font-bold ${p.heading}`}>{value}</div>
      <div className={`text-xs mt-0.5 ${p.muted}`}>{label}</div>
    </div>
  )
}

function AxisRow({ axis, max, variant }: { axis: AxisDistribution; max: number; variant: keyof typeof PALETTE }) {
  const p = PALETTE[variant]
  const widthPct = (n: number) => `${(n / max) * 100}%`
  return (
    <div className="grid grid-cols-[minmax(7.5rem,10rem)_1fr_auto] items-center gap-3 py-1">
      <div className={`text-sm truncate ${p.label}`} title={`${axis.name}: ${axis.pole_negative} ↔ ${axis.pole_positive}`}>
        {axis.name}
      </div>
      <div className="flex items-center gap-[2px]" role="img"
        aria-label={`${axis.name}: ${axis.conceptual} conceptual and ${axis.applied} applied questions`}>
        <div className="h-3" style={{ width: widthPct(axis.conceptual), backgroundColor: PALETTE[variant].conceptual, borderRadius: '1px' }} />
        <div className="h-3 rounded-r" style={{ width: widthPct(axis.applied), backgroundColor: PALETTE[variant].applied }} />
      </div>
      <div className={`text-xs tabular-nums whitespace-nowrap ${p.muted}`}>
        <span className={`font-semibold text-sm ${p.label}`}>{axis.total}</span>
        {' '}({axis.conceptual}+{axis.applied})
      </div>
    </div>
  )
}

export default function QuestionDistribution({
  data,
  variant
}: {
  data: BankDistribution
  variant: 'light' | 'dark'
}) {
  const p = PALETTE[variant]
  const core = data.axes.filter(a => !a.isFacet)
  const facets = data.axes.filter(a => a.isFacet)
  const max = Math.max(...data.axes.map(a => a.total))

  return (
    <div>
      {/* Headline stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatTile value={String(data.totals.total)} label="questions" variant={variant} />
        <StatTile value={`${data.totals.conceptual} / ${data.totals.applied}`} label="conceptual / applied" variant={variant} />
        <StatTile value={String(data.totals.tradeoffScenarios)} label="tradeoff scenarios" variant={variant} />
        <StatTile value={String(data.totals.tensionGroups)} label="value tensions measured" variant={variant} />
      </div>

      {/* Legend */}
      <div className={`flex items-center gap-5 mb-3 text-xs ${p.muted}`}>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: p.conceptual }} />
          Conceptual — your ideals
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: p.applied }} />
          Applied — your choices
        </span>
      </div>

      <div className={`text-xs font-semibold uppercase tracking-wide mb-1 ${p.groupHeading}`}>
        Core axes
      </div>
      {core.map(axis => (
        <AxisRow key={axis.id} axis={axis} max={max} variant={variant} />
      ))}

      <div className={`text-xs font-semibold uppercase tracking-wide mb-1 mt-4 ${p.groupHeading}`}>
        Style facets
      </div>
      {facets.map(axis => (
        <AxisRow key={axis.id} axis={axis} max={max} variant={variant} />
      ))}

      <p className={`text-xs mt-4 ${p.muted}`}>
        Every axis carries an equal number of questions keyed toward each of its
        poles, so a tendency to agree cannot masquerade as an ideology. Counts are
        read live from the question bank.
      </p>
    </div>
  )
}
