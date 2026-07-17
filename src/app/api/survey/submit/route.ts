import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { calculateAxisScoresFromLinks, calculateAxisCoverage } from '@/lib/scorer'
import { analyzeTensions } from '@/lib/tension-analyzer'
import { buildAxisSummaries, computeFlavorMatches, scoresById } from '@/lib/flavor-matcher'
import { fetchQuestionsWithLinks } from '@/lib/api/questions'
import type { Database, ResponsesMap } from '@/lib/database.types'

type Axis = Database['public']['Tables']['axes']['Row']
type SurveyResultInsert = Database['public']['Tables']['survey_results']['Insert']

const VALID_RESPONSES = new Set([-2, -1, 0, 1, 2])

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { responses: rawResponses, question_order, bank_version } = body

    if (!rawResponses || typeof rawResponses !== 'object' || Array.isArray(rawResponses)) {
      return NextResponse.json(
        { error: 'Invalid responses format' },
        { status: 400 }
      )
    }

    const questionOrder: number[] | null =
      Array.isArray(question_order) && question_order.every((id: unknown) => typeof id === 'number')
        ? question_order
        : null

    const supabase = await createClient()

    // The bank version these responses belong to: score exactly the bank
    // the client showed, never "whatever is active now".
    const clientBankVersion = typeof bank_version === 'string' && bank_version ? bank_version : null
    const questions = clientBankVersion
      ? await fetchQuestionsWithLinks({ bankVersion: clientBankVersion })
      : await fetchQuestionsWithLinks()

    if (questions.length === 0) {
      return NextResponse.json({ error: 'Unknown bank version' }, { status: 400 })
    }

    const bankVersion: string | null =
      clientBankVersion ??
      (questions[0] as { bank_version?: string })?.bank_version ??
      null

    // Validate every response: known question id from this bank, and a
    // value in -2..2 or null ("not sure"). Reject anything else.
    const knownIds = new Set(questions.map(q => q.id))
    const responses: ResponsesMap = {}
    for (const [key, value] of Object.entries(rawResponses as Record<string, unknown>)) {
      const id = Number(key)
      if (!Number.isInteger(id) || !knownIds.has(id)) {
        return NextResponse.json(
          { error: `Unknown question id ${key} for bank ${bankVersion}` },
          { status: 400 }
        )
      }
      if (value === null) {
        responses[id] = null
      } else if (typeof value === 'number' && VALID_RESPONSES.has(value)) {
        responses[id] = value as ResponsesMap[number]
      } else {
        return NextResponse.json(
          { error: `Invalid response value for question ${key}` },
          { status: 400 }
        )
      }
    }

    const notSureCount = Object.values(responses).filter(v => v === null).length
    
    // Fetch axes metadata
    const { data, error: axesError } = await supabase
      .from('axes')
      .select('*')
      .order('id')

    if (axesError) throw axesError

    const axes = (data || []) as Axis[]
    const axesById = Object.fromEntries(axes.map(a => [a.id, a]))
    
    // Separate questions by type
    const conceptualQuestions = questions.filter(q => q.question_type === 'conceptual')
    const appliedQuestions = questions.filter(q => q.question_type === 'applied')
    
    // Calculate scores using normalized scoring
    const { axisScores: conceptualScores } = calculateAxisScoresFromLinks(
      responses,
      conceptualQuestions,
      axesById
    )
    
    const { axisScores: appliedScores } = calculateAxisScoresFromLinks(
      responses,
      appliedQuestions,
      axesById
    )
    
    const { axisScores: allScores } = calculateAxisScoresFromLinks(
      responses,
      questions,
      axesById
    )
    
    // Analyze value tensions (from applied tradeoff questions), using
    // conceptual scores to detect dilemmas and ideals-vs-choices gaps
    const tensionScores = analyzeTensions(
      responses,
      appliedQuestions,
      axes || [],
      conceptualScores
    )
    
    // Archetype matching and axis summaries (character sheets); the
    // database's axes.family column decides the core/facet split
    const { core_axes, facets } = buildAxisSummaries(allScores, axes)
    const topFlavors = computeFlavorMatches(scoresById(allScores))

    // Per-axis answer coverage (null/missing excluded, numeric 0 counted)
    const responseCoverage = calculateAxisCoverage(responses, questions)

    // Create session ID
    const sessionId = crypto.randomUUID()

    // First, insert into survey_responses (required for foreign key constraint)
    const { error: responseError } = await (supabase
      .from('survey_responses') as any)
      .insert({
        session_id: sessionId,
        responses: responses as any,
        ...(questionOrder ? { question_order: questionOrder } : {}),
        ...(bankVersion ? { bank_version: bankVersion } : {})
      })

    if (responseError) throw responseError

    // Then, store results in survey_results
    const insertData: SurveyResultInsert = {
      session_id: sessionId,
      ...(bankVersion ? { bank_version: bankVersion } : {}),
      scores: allScores as any,
      conceptual_scores: conceptualScores as any,
      applied_scores: appliedScores as any,
      collision_pairs: tensionScores as any,  // tension analysis (kept column name)
      responses: responses as any,
      core_axes: core_axes as any,
      facets: facets as any,
      top_flavors: topFlavors as any,
      response_coverage: responseCoverage as any,
      not_sure_count: notSureCount,
      completed_at: new Date().toISOString()
    }

    const { data: result, error: insertError } = await (supabase
      .from('survey_results') as any)
      .insert(insertData)
      .select()
      .single()

    if (insertError) throw insertError
    
    return NextResponse.json({
      success: true,
      sessionId: sessionId,
      scores: allScores,
      tensionScores: tensionScores
    })
    
  } catch (error) {
    console.error('Survey submission error:', error)
    return NextResponse.json(
      { error: 'Failed to submit survey' },
      { status: 500 }
    )
  }
}
