import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { calculateAxisScoresFromLinks } from '@/lib/scorer'
import { analyzeTensions } from '@/lib/tension-analyzer'
import { buildAxisSummaries, computeFlavorMatches, scoresById } from '@/lib/flavor-matcher'
import { fetchQuestionsWithLinks } from '@/lib/api/questions'
import type { Database } from '@/lib/database.types'

type Axis = Database['public']['Tables']['axes']['Row']
type SurveyResultInsert = Database['public']['Tables']['survey_results']['Insert']

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { responses, question_order, bank_version } = body

    if (!responses || typeof responses !== 'object') {
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
    
    // Fetch questions with links
    const questions = await fetchQuestionsWithLinks()

    // The bank version these responses belong to. The client sends what it
    // showed; the active bank is the fallback.
    const bankVersion: string | null =
      (typeof bank_version === 'string' && bank_version) ||
      (questions[0] as { bank_version?: string })?.bank_version ||
      null
    
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
