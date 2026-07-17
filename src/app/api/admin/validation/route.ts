import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { calculateAxisScoresFromLinks } from '@/lib/scorer'
import type { QuestionWithLinks, ResponsesMap } from '@/lib/database.types'

export const dynamic = 'force-dynamic'

// Cap the sample so the computation stays bounded as responses grow.
const MAX_SAMPLE = 2000

export interface ItemValidation {
  question_id: number
  axis_id: string
  question_type: string
  text: string
  answered: number
  skip_rate: number
  mean: number
  sd: number
  /** Correlation between this item (keyed) and the rest of its axis's primary items. */
  item_rest_r: number | null
}

export interface AxisValidation {
  axis_id: string
  name: string
  item_count: number
  cronbach_alpha: number | null
  complete_cases: number
}

export interface AxisCorrelation {
  axis_a: string
  axis_b: string
  r: number
  n: number
}

function pearson(xs: number[], ys: number[]): number | null {
  const n = xs.length
  if (n < 3) return null
  const mx = xs.reduce((a, b) => a + b, 0) / n
  const my = ys.reduce((a, b) => a + b, 0) / n
  let num = 0, dx = 0, dy = 0
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (ys[i] - my)
    dx += (xs[i] - mx) ** 2
    dy += (ys[i] - my) ** 2
  }
  if (dx === 0 || dy === 0) return null
  return num / Math.sqrt(dx * dy)
}

function variance(values: number[]): number {
  const n = values.length
  if (n < 2) return 0
  const mean = values.reduce((a, b) => a + b, 0) / n
  return values.reduce((s, v) => s + (v - mean) ** 2, 0) / (n - 1)
}

export async function GET() {
  try {
    const { data: questionData, error: qError } = await supabaseAdmin
      .from('questions')
      .select('*, question_axis_links (*)')
      .eq('active', true)

    if (qError) throw qError

    const { data: axesData, error: aError } = await supabaseAdmin
      .from('axes')
      .select('*')
      .order('id')

    if (aError) throw aError

    const { data: responseRows, error: rError } = await supabaseAdmin
      .from('survey_responses')
      .select('responses')
      .order('created_at', { ascending: false })
      .limit(MAX_SAMPLE)

    if (rError) throw rError

    const questions = (questionData || []) as unknown as QuestionWithLinks[]
    const axes = (axesData || []) as { id: string; name: string }[]
    const axesById = Object.fromEntries(axes.map(a => [a.id, a]))
    const responseSets: ResponsesMap[] = (responseRows || [])
      .map(row => row.responses as ResponsesMap)
      .filter(r => r && typeof r === 'object')

    const sampleSize = responseSets.length

    // ---- Per-item stats + keyed value matrix (item value = response x key,
    // so positive always points at the axis's + pole) ----
    const primaryByAxis: Record<string, QuestionWithLinks[]> = {}
    for (const q of questions) {
      (primaryByAxis[q.axis_id] = primaryByAxis[q.axis_id] || []).push(q)
    }

    const keyedValues: Record<number, (number | null)[]> = {}
    for (const q of questions) {
      keyedValues[q.id] = responseSets.map(rs => {
        const r = rs[q.id]
        // v2.1: null means "not sure" and is excluded like unanswered
        return typeof r !== 'number' ? null : r * q.key
      })
    }

    const items: ItemValidation[] = questions.map(q => {
      const raw = responseSets
        .map(rs => rs[q.id])
        .filter((r): r is number => typeof r === 'number')
      const answered = raw.length
      const mean = answered > 0 ? raw.reduce((a, b) => a + b, 0) / answered : 0
      const sd = Math.sqrt(variance(raw))

      // Item-rest: keyed item vs mean of the axis's OTHER primary items
      let itemRest: number | null = null
      const siblings = (primaryByAxis[q.axis_id] || []).filter(s => s.id !== q.id)
      if (siblings.length >= 2 && answered >= 3) {
        const xs: number[] = []
        const ys: number[] = []
        responseSets.forEach((rs, i) => {
          const own = keyedValues[q.id][i]
          if (own === null) return
          const rest = siblings
            .map(s => keyedValues[s.id][i])
            .filter((v): v is number => v !== null)
          if (rest.length < siblings.length / 2) return
          xs.push(own)
          ys.push(rest.reduce((a, b) => a + b, 0) / rest.length)
        })
        itemRest = pearson(xs, ys)
      }

      return {
        question_id: q.id,
        axis_id: q.axis_id,
        question_type: q.question_type,
        text: q.text,
        answered,
        skip_rate: sampleSize > 0 ? 1 - answered / sampleSize : 0,
        mean,
        sd,
        item_rest_r: itemRest
      }
    })

    // ---- Cronbach's alpha per axis (complete cases over primary items) ----
    const axisValidations: AxisValidation[] = axes.map(axis => {
      const axisItems = primaryByAxis[axis.id] || []
      const k = axisItems.length

      const completeRows: number[][] = []
      responseSets.forEach((rs, i) => {
        const vals = axisItems.map(q => keyedValues[q.id][i])
        if (vals.every(v => v !== null)) completeRows.push(vals as number[])
      })

      let alpha: number | null = null
      if (k >= 2 && completeRows.length >= 20) {
        const itemVariances = axisItems.map((_, col) =>
          variance(completeRows.map(row => row[col]))
        )
        const totals = completeRows.map(row => row.reduce((a, b) => a + b, 0))
        const totalVar = variance(totals)
        if (totalVar > 0) {
          alpha = (k / (k - 1)) * (1 - itemVariances.reduce((a, b) => a + b, 0) / totalVar)
        }
      }

      return {
        axis_id: axis.id,
        name: axis.name,
        item_count: k,
        cronbach_alpha: alpha,
        complete_cases: completeRows.length
      }
    })

    // ---- Inter-axis correlation matrix (per-respondent axis scores) ----
    const perRespondentScores = responseSets.map(rs => {
      const { axisScores } = calculateAxisScoresFromLinks(rs, questions, axesById)
      return Object.fromEntries(axisScores.map(s => [s.axis_id, s.score]))
    })

    const correlations: AxisCorrelation[] = []
    for (let i = 0; i < axes.length; i++) {
      for (let j = i + 1; j < axes.length; j++) {
        const xs: number[] = []
        const ys: number[] = []
        for (const scores of perRespondentScores) {
          const x = scores[axes[i].id]
          const y = scores[axes[j].id]
          if (x === undefined || y === undefined) continue
          xs.push(x)
          ys.push(y)
        }
        const r = pearson(xs, ys)
        if (r !== null) {
          correlations.push({ axis_a: axes[i].id, axis_b: axes[j].id, r, n: xs.length })
        }
      }
    }

    return NextResponse.json({
      sample_size: sampleSize,
      generated_at: new Date().toISOString(),
      items,
      axes: axisValidations,
      correlations
    })
  } catch (error) {
    console.error('Error computing validation stats:', error)
    return NextResponse.json({ error: 'Failed to compute validation stats' }, { status: 500 })
  }
}
