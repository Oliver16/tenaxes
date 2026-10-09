import { calculateAxisScoresFromLinks } from '@/lib/scorer'
import type { QuestionWithLinks, ResponsesMap } from '@/lib/database.types'

/**
 * Pure item-level statistics for the admin engagement and validation
 * screens. Everything here is scoped to ONE question bank by the caller:
 * question ids are bank-specific (a cloned revision gets new ids), so
 * mixing banks makes every other bank's items look 100% unanswered and
 * leaves no respondent with a complete set for any axis.
 */

/** Below this many answers a statistic is reported but never flagged. */
export const MIN_ITEM_N = 30
/** Respondents still active within this window are "in progress", not abandoned. */
export const ABANDON_AFTER_HOURS = 24

export type ItemKind = 'conceptual' | 'applied' | 'collision'

export interface ItemIdentity {
  question_id: number
  axis_id: string
  kind: ItemKind
  active: boolean
  text: string
}

/** Primary scoring axis/key, falling back to the question row for legacy data. */
export function primaryLink(q: QuestionWithLinks): { axis_id: string; key: number } {
  const link = q.question_axis_links?.find(l => l.role === 'primary')
  return link
    ? { axis_id: link.axis_id, key: link.axis_key }
    : { axis_id: q.axis_id, key: q.key }
}

export function itemKind(q: QuestionWithLinks): ItemKind {
  const isCollision = q.question_axis_links?.some(l => l.role === 'tradeoff' || l.role === 'collision')
  if (isCollision) return 'collision'
  return q.question_type === 'applied' ? 'applied' : 'conceptual'
}

function identity(q: QuestionWithLinks): ItemIdentity {
  return {
    question_id: q.id,
    axis_id: primaryLink(q).axis_id,
    kind: itemKind(q),
    active: q.active,
    text: q.text
  }
}

// ---------------------------------------------------------------------------
// Basic statistics
// ---------------------------------------------------------------------------

function mean(values: number[]): number {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0
}

/** Sample variance (n - 1). */
function variance(values: number[]): number {
  const n = values.length
  if (n < 2) return 0
  const m = mean(values)
  return values.reduce((s, v) => s + (v - m) ** 2, 0) / (n - 1)
}

export function pearson(xs: number[], ys: number[]): number | null {
  const n = xs.length
  if (n < 3) return null
  const mx = mean(xs)
  const my = mean(ys)
  let num = 0, dx = 0, dy = 0
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (ys[i] - my)
    dx += (xs[i] - mx) ** 2
    dy += (ys[i] - my) ** 2
  }
  if (dx === 0 || dy === 0) return null
  return num / Math.sqrt(dx * dy)
}

/** Pairwise-complete sample covariance; null when fewer than 3 shared answers. */
function pairwiseCov(a: (number | null)[], b: (number | null)[]): { cov: number; n: number } | null {
  const xs: number[] = []
  const ys: number[] = []
  for (let i = 0; i < a.length; i++) {
    const x = a[i]
    const y = b[i]
    if (x === null || y === null) continue
    xs.push(x)
    ys.push(y)
  }
  if (xs.length < 3) return null
  const mx = mean(xs)
  const my = mean(ys)
  let s = 0
  for (let i = 0; i < xs.length; i++) s += (xs[i] - mx) * (ys[i] - my)
  return { cov: s / (xs.length - 1), n: xs.length }
}

/**
 * Cronbach's alpha from a (pairwise-complete) covariance matrix:
 * k/(k-1) * (1 - sum(var_i) / (sum(var_i) + 2 * sum(cov_ij))).
 */
function alphaFromCov(variances: number[], covs: number[][], include: boolean[]): number | null {
  const idx = include.flatMap((on, i) => (on ? [i] : []))
  const k = idx.length
  if (k < 2) return null
  let sumVar = 0
  let sumCov = 0
  for (const i of idx) sumVar += variances[i]
  for (let a = 0; a < k; a++) {
    for (let b = a + 1; b < k; b++) sumCov += covs[idx[a]][idx[b]]
  }
  const total = sumVar + 2 * sumCov
  if (total <= 0) return null
  return (k / (k - 1)) * (1 - sumVar / total)
}

// ---------------------------------------------------------------------------
// Engagement: skips, "not sure", and where people quit
// ---------------------------------------------------------------------------

/** One survey_sessions row (progress beacons from the survey page). */
export interface SessionProgress {
  answered_ids: number[] | null
  not_sure_ids: number[] | null
  skipped_ids: number[] | null
  viewed_ids: number[] | null
  last_question_id: number | null
  question_count: number | null
  started_at: string
  last_activity_at: string
  completed_at: string | null
}

export interface ItemEngagement extends ItemIdentity {
  /** Tracked sessions in which this question was shown. */
  viewed: number
  /** Sessions where the respondent moved past it without answering at least once. */
  skipped: number
  /** skipped / viewed */
  skip_rate: number
  /** Skipped and never answered (in sessions that stopped or are still open). */
  left_blank: number
  /** Abandoned sessions whose last on-screen question was this one. */
  quit_here: number
  /** Completed responses for this bank that include this question. */
  responses: number
  not_sure: number
  /** not_sure / responses */
  not_sure_rate: number
  /** Answer counts for -2, -1, 0, 1, 2 among completed responses. */
  distribution: [number, number, number, number, number]
}

export interface EngagementFunnel {
  tracked_sessions: number
  started: number
  reached_25: number
  reached_50: number
  reached_75: number
  answered_all: number
  completed: number
  in_progress: number
  abandoned: number
  /** Median share of the bank answered by abandoned sessions. */
  median_abandon_progress: number | null
  /** Median minutes from first to last activity for completed sessions. */
  median_completion_minutes: number | null
  tracking_since: string | null
}

export interface EngagementReport {
  funnel: EngagementFunnel
  items: ItemEngagement[]
  /** Completed responses (survey_responses rows) for this bank. */
  completed_responses: number
}

function median(values: number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

export function computeEngagement(
  questions: QuestionWithLinks[],
  sessions: SessionProgress[],
  responseSets: ResponsesMap[],
  now: Date = new Date()
): EngagementReport {
  const bankSize = questions.length
  const abandonCutoff = now.getTime() - ABANDON_AFTER_HOURS * 3600_000

  const counters = new Map<number, { viewed: number; skipped: number; left_blank: number; quit_here: number }>()
  for (const q of questions) counters.set(q.id, { viewed: 0, skipped: 0, left_blank: 0, quit_here: 0 })

  const funnel: EngagementFunnel = {
    tracked_sessions: sessions.length,
    started: 0,
    reached_25: 0,
    reached_50: 0,
    reached_75: 0,
    answered_all: 0,
    completed: 0,
    in_progress: 0,
    abandoned: 0,
    median_abandon_progress: null,
    median_completion_minutes: null,
    tracking_since: null
  }
  const abandonProgress: number[] = []
  const completionMinutes: number[] = []

  for (const s of sessions) {
    const answered = new Set(s.answered_ids ?? [])
    const total = s.question_count || bankSize
    const progress = total > 0 ? Math.min(answered.size / total, 1) : 0
    const completed = !!s.completed_at
    const abandoned = !completed && new Date(s.last_activity_at).getTime() < abandonCutoff

    if (!funnel.tracking_since || s.started_at < funnel.tracking_since) funnel.tracking_since = s.started_at
    if (answered.size > 0) funnel.started++
    if (progress >= 0.25) funnel.reached_25++
    if (progress >= 0.5) funnel.reached_50++
    if (progress >= 0.75) funnel.reached_75++
    if (progress >= 1) funnel.answered_all++
    if (completed) {
      funnel.completed++
      const minutes = (new Date(s.last_activity_at).getTime() - new Date(s.started_at).getTime()) / 60_000
      if (minutes >= 0) completionMinutes.push(minutes)
    } else if (abandoned) {
      funnel.abandoned++
      abandonProgress.push(progress)
    } else {
      funnel.in_progress++
    }

    for (const id of new Set(s.viewed_ids ?? [])) {
      const c = counters.get(id)
      if (c) c.viewed++
    }
    for (const id of new Set(s.skipped_ids ?? [])) {
      const c = counters.get(id)
      if (!c) continue
      c.skipped++
      if (!completed && !answered.has(id)) c.left_blank++
    }
    if (abandoned && s.last_question_id !== null && !answered.has(s.last_question_id)) {
      const c = counters.get(s.last_question_id)
      if (c) c.quit_here++
    }
  }

  funnel.median_abandon_progress = median(abandonProgress)
  funnel.median_completion_minutes = median(completionMinutes)

  const items: ItemEngagement[] = questions.map(q => {
    const c = counters.get(q.id)!
    const distribution: [number, number, number, number, number] = [0, 0, 0, 0, 0]
    let responses = 0
    let notSure = 0
    for (const rs of responseSets) {
      if (!(q.id in rs)) continue
      const r = rs[q.id]
      responses++
      if (r === null) notSure++
      else if (typeof r === 'number' && r >= -2 && r <= 2) distribution[r + 2]++
    }
    return {
      ...identity(q),
      viewed: c.viewed,
      skipped: c.skipped,
      skip_rate: c.viewed > 0 ? c.skipped / c.viewed : 0,
      left_blank: c.left_blank,
      quit_here: c.quit_here,
      responses,
      not_sure: notSure,
      not_sure_rate: responses > 0 ? notSure / responses : 0,
      distribution
    }
  })

  return { funnel, items, completed_responses: responseSets.length }
}

// ---------------------------------------------------------------------------
// Validation: does each item measure what its axis measures?
// ---------------------------------------------------------------------------

export interface ItemValidation extends ItemIdentity {
  /** Numeric answers (excludes "not sure"). */
  n: number
  not_sure_rate: number
  /** Raw mean on the -2..2 scale (positive = agree). */
  mean: number
  sd: number
  /** Share of numeric answers on the single most common option. */
  modal_share: number
  /** Keyed item vs mean of the axis's other items. Negative suggests a keying error. */
  item_rest_r: number | null
  /** Axis alpha with this item removed; higher than the axis alpha means the item hurts. */
  alpha_if_deleted: number | null
  flags: string[]
}

export interface AxisValidation {
  axis_id: string
  name: string
  item_count: number
  /** Cronbach's alpha over pairwise-complete covariances. */
  alpha: number | null
  mean_inter_item_r: number | null
  /** Respondents with at least half the axis answered. */
  n: number
  /** Conceptual-only vs applied-only axis score across respondents. */
  conceptual_applied_r: number | null
  conceptual_applied_n: number
}

export interface AxisCorrelation {
  axis_a: string
  axis_b: string
  r: number
  n: number
}

export interface ValidationReport {
  sample_size: number
  items: ItemValidation[]
  axes: AxisValidation[]
  correlations: AxisCorrelation[]
}

export const VALIDATION_THRESHOLDS = {
  reversed: -0.1,
  weak: 0.2,
  lowSd: 0.6,
  oneSided: 0.8,
  notSure: 0.15,
  alphaGain: 0.01,
  lowAlpha: 0.65,
  conceptualApplied: 0.3,
  highAxisR: 0.6
} as const

export function computeValidation(
  questions: QuestionWithLinks[],
  axes: { id: string; name: string }[],
  responseSets: ResponsesMap[]
): ValidationReport {
  const T = VALIDATION_THRESHOLDS
  const axesById = Object.fromEntries(axes.map(a => [a.id, a]))
  const sampleSize = responseSets.length

  // Keyed values: positive always points at the axis's + pole.
  const keyed = new Map<number, (number | null)[]>()
  for (const q of questions) {
    const { key } = primaryLink(q)
    keyed.set(q.id, responseSets.map(rs => {
      const r = rs[q.id]
      return typeof r === 'number' ? r * key : null
    }))
  }

  const byAxis = new Map<string, QuestionWithLinks[]>()
  for (const q of questions) {
    const axisId = primaryLink(q).axis_id
    if (!byAxis.has(axisId)) byAxis.set(axisId, [])
    byAxis.get(axisId)!.push(q)
  }

  // ---- Axis reliability (pairwise covariance alpha, alpha-if-deleted) ----
  const alphaIfDeleted = new Map<number, number | null>()
  const axisResults = new Map<string, Omit<AxisValidation, 'conceptual_applied_r' | 'conceptual_applied_n'>>()

  for (const [axisId, items] of byAxis) {
    const cols = items.map(q => keyed.get(q.id)!)
    const k = cols.length
    const variances = cols.map(col => variance(col.filter((v): v is number => v !== null)))
    const covs: number[][] = Array.from({ length: k }, () => new Array(k).fill(0))
    const rs: number[] = []
    let covOk = true
    for (let a = 0; a < k; a++) {
      for (let b = a + 1; b < k; b++) {
        const c = pairwiseCov(cols[a], cols[b])
        if (!c) { covOk = false; continue }
        covs[a][b] = covs[b][a] = c.cov
        const denom = Math.sqrt(variances[a] * variances[b])
        if (denom > 0) rs.push(c.cov / denom)
      }
    }

    const respondents = responseSets.filter((_, i) =>
      cols.filter(col => col[i] !== null).length >= k / 2
    ).length
    const enough = covOk && respondents >= MIN_ITEM_N
    const alpha = enough ? alphaFromCov(variances, covs, cols.map(() => true)) : null

    items.forEach((q, i) => {
      const include = cols.map((_, j) => j !== i)
      alphaIfDeleted.set(q.id, enough && k > 2 ? alphaFromCov(variances, covs, include) : null)
    })

    axisResults.set(axisId, {
      axis_id: axisId,
      name: axesById[axisId]?.name ?? axisId,
      item_count: k,
      alpha,
      mean_inter_item_r: enough && rs.length ? mean(rs) : null,
      n: respondents
    })
  }

  // ---- Items ----
  const items: ItemValidation[] = questions.map(q => {
    const { axis_id } = primaryLink(q)
    const raw = responseSets.map(rs => rs[q.id]).filter((r): r is number => typeof r === 'number')
    const shown = responseSets.filter(rs => q.id in rs).length
    const notSure = responseSets.filter(rs => q.id in rs && rs[q.id] === null).length
    const n = raw.length
    const counts = [0, 0, 0, 0, 0]
    for (const r of raw) if (r >= -2 && r <= 2) counts[r + 2]++

    let itemRest: number | null = null
    const siblings = (byAxis.get(axis_id) || []).filter(s => s.id !== q.id)
    if (siblings.length >= 2) {
      const own = keyed.get(q.id)!
      const xs: number[] = []
      const ys: number[] = []
      for (let i = 0; i < sampleSize; i++) {
        if (own[i] === null) continue
        const rest = siblings.map(s => keyed.get(s.id)![i]).filter((v): v is number => v !== null)
        if (rest.length < siblings.length / 2) continue
        xs.push(own[i]!)
        ys.push(mean(rest))
      }
      itemRest = pearson(xs, ys)
    }

    const sd = Math.sqrt(variance(raw))
    const itemMean = mean(raw)
    const modalShare = n > 0 ? Math.max(...counts) / n : 0
    const notSureRate = shown > 0 ? notSure / shown : 0
    const axisAlpha = axisResults.get(axis_id)?.alpha ?? null
    const aid = alphaIfDeleted.get(q.id) ?? null

    const flags: string[] = []
    if (n >= MIN_ITEM_N) {
      if (itemRest !== null && itemRest < T.reversed) flags.push('runs against its axis')
      else if (itemRest !== null && itemRest < T.weak) flags.push('weakly tied to axis')
      if (sd < T.lowSd) flags.push('little disagreement')
      if (modalShare >= T.oneSided) flags.push('one answer dominates')
      if (axisAlpha !== null && aid !== null && aid > axisAlpha + T.alphaGain) flags.push('removing it raises α')
    }
    if (shown >= MIN_ITEM_N && notSureRate > T.notSure) flags.push('often "not sure"')

    return {
      ...identity(q),
      n,
      not_sure_rate: notSureRate,
      mean: itemMean,
      sd,
      modal_share: modalShare,
      item_rest_r: itemRest,
      alpha_if_deleted: aid,
      flags
    }
  })

  // ---- Per-respondent scores: full, conceptual-only, applied-only ----
  const conceptualQs = questions.filter(q => q.question_type === 'conceptual')
  const appliedQs = questions.filter(q => q.question_type === 'applied')
  const toMap = (scores: { axis_id: string; score: number }[]) =>
    Object.fromEntries(scores.map(s => [s.axis_id, s.score]))
  const full = responseSets.map(rs => toMap(calculateAxisScoresFromLinks(rs, questions, axesById).axisScores))
  const conceptual = responseSets.map(rs => toMap(calculateAxisScoresFromLinks(rs, conceptualQs, axesById).axisScores))
  const applied = responseSets.map(rs => toMap(calculateAxisScoresFromLinks(rs, appliedQs, axesById).axisScores))

  const pairOver = (a: Record<string, number>[], b: Record<string, number>[], axisA: string, axisB: string) => {
    const xs: number[] = []
    const ys: number[] = []
    for (let i = 0; i < a.length; i++) {
      const x = a[i][axisA]
      const y = b[i][axisB]
      if (x === undefined || y === undefined) continue
      xs.push(x)
      ys.push(y)
    }
    return { r: pearson(xs, ys), n: xs.length }
  }

  const axisValidations: AxisValidation[] = axes
    .filter(a => byAxis.has(a.id))
    .map(a => {
      const base = axisResults.get(a.id)!
      const ca = pairOver(conceptual, applied, a.id, a.id)
      return {
        ...base,
        conceptual_applied_r: ca.n >= MIN_ITEM_N ? ca.r : null,
        conceptual_applied_n: ca.n
      }
    })

  const correlations: AxisCorrelation[] = []
  const axisIds = axisValidations.map(a => a.axis_id)
  for (let i = 0; i < axisIds.length; i++) {
    for (let j = i + 1; j < axisIds.length; j++) {
      const { r, n } = pairOver(full, full, axisIds[i], axisIds[j])
      if (r !== null) correlations.push({ axis_a: axisIds[i], axis_b: axisIds[j], r, n })
    }
  }

  return { sample_size: sampleSize, items, axes: axisValidations, correlations }
}
