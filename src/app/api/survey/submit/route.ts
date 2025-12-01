import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { calculateAxisScoresFromLinks } from '@/lib/scorer'
import { analyzeCollisions } from '@/lib/collision-analyzer'
import { fetchQuestionsWithLinks } from '@/lib/api/questions'
import { Database } from '@/lib/database.types'

type AxisRow = Database['public']['Tables']['axes']['Row']

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
    
    const supabase = createClient()
    
    // Fetch questions with links
    const questions = await fetchQuestionsWithLinks()
    
    // Fetch axes metadata
    const { data: axes, error: axesError } = await supabase
      .from('axes')
      .select('*')
      .order('id')
    
    if (axesError) throw axesError
    
    const axesList: AxisRow[] = axes ?? []
    const axesById = Object.fromEntries(axesList.map(axis => [axis.id, axis]))
    
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
      axesList
    )
    
    // Create session ID
    const sessionId = crypto.randomUUID()
    
    // Store results
    const { data: result, error: insertError } = await supabase
      .from('survey_results')
      .insert({
        session_id: sessionId,
        scores: allScores,
        conceptual_scores: conceptualScores,
        applied_scores: appliedScores,
        collision_pairs: collisionScores,  // NEW: store collision analysis
        responses: responses,
        completed_at: new Date().toISOString()
      })
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
