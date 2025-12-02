import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { calculateAxisScoresFromLinks } from '@/lib/scorer'
import { analyzeCollisions } from '@/lib/collision-analyzer'
import { fetchQuestionsWithLinks } from '@/lib/api/questions'
import type { Database } from '@/lib/database.types'

type Axis = Database['public']['Tables']['axes']['Row']
type SurveyResultInsert = Database['public']['Tables']['survey_results']['Insert']

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { responses } = body

    if (!responses || typeof responses !== 'object') {
      return NextResponse.json(
        { error: 'Invalid responses format' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    
    // Fetch questions with links
    const questions = await fetchQuestionsWithLinks()
    
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
    
    // Calculate collision scores (only from applied questions)
    const collisionScores = analyzeCollisions(
      responses,
      appliedQuestions,
      axes || []
    )
    
    // Create session ID
    const sessionId = crypto.randomUUID()

    // First, insert into survey_responses (required for foreign key constraint)
    const { error: responseError } = await (supabase
      .from('survey_responses') as any)
      .insert({
        session_id: sessionId,
        responses: responses as any
      })

    if (responseError) throw responseError

    // Then, store results in survey_results
    const insertData: SurveyResultInsert = {
      session_id: sessionId,
      scores: allScores as any,
      conceptual_scores: conceptualScores as any,
      applied_scores: appliedScores as any,
      collision_pairs: collisionScores as any,  // NEW: store collision analysis
      responses: responses as any,
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
      collisionScores: collisionScores
    })
    
  } catch (error) {
    console.error('Survey submission error:', error)
    return NextResponse.json(
      { error: 'Failed to submit survey' },
      { status: 500 }
    )
  }
}
