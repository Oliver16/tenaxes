import { createClient } from '@/lib/supabase/server'
import { fetchQuestionsWithLinks } from '@/lib/api/questions'
import { ValueTensionsSection } from '@/components/results/ValueTensionsSection'
import { AxisCollisionDetails } from '@/components/results/AxisCollisionDetails'
import { CollisionScore, AxisScore as AxisScoreType, Database } from '@/lib/database.types'

type SurveyResult = Database['public']['Tables']['survey_results']['Row']
type Axis = Database['public']['Tables']['axes']['Row']

function AxisCard({
  axis,
  conceptualScore,
  appliedScore
}: {
  axis: { id: string; name: string; pole_negative: string | null; pole_positive: string | null }
  conceptualScore?: number
  appliedScore?: number
}) {
  return (
    <div className="p-4 rounded-lg border bg-white shadow-sm space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-lg">{axis.name}</h3>
          <p className="text-xs text-muted-foreground">
            {axis.pole_negative} ↔ {axis.pole_positive}
          </p>
        </div>
        <div className="text-sm text-muted-foreground">Conceptual vs Applied</div>
      </div>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-muted-foreground">Conceptual</p>
          <p className="font-mono font-bold">{formatScore(conceptualScore)}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Applied</p>
          <p className="font-mono font-bold">{formatScore(appliedScore)}</p>
        </div>
      </div>
    </div>
  )
}

function formatScore(score?: number) {
  if (score === undefined || score === null) return '—'
  return `${(score * 100).toFixed(0)}%`
}

export default async function ResultsPage({ 
  params 
}: { 
  params: { sessionId: string } 
}) {
  const supabase = createClient()

  // Fetch survey results
  const { data, error } = await (supabase
    .from('survey_results')
    .select('*')
    .eq('session_id', params.sessionId)
    .single() as any)

  const surveyResult = data as SurveyResult | null

  if (error || !surveyResult) {
    return <div>Results not found</div>
  }

  // Fetch questions with links
  const questions = await fetchQuestionsWithLinks()

  // Fetch axes
  const { data: axesData } = await (supabase
    .from('axes')
    .select('*')
    .order('id') as any)

  const axes = (axesData || []) as Axis[]
  
  // Get collision scores from stored results
  const collisionScores = (surveyResult.collision_pairs || []) as unknown as CollisionScore[]
  
  return (
    <div className="container mx-auto py-12 space-y-16">
      {/* Existing: Overall summary */}
      <section>
        <h1 className="text-4xl font-bold mb-8">Your Political Compass Results</h1>
        {/* Existing summary content */}
      </section>
      
      {/* NEW: Value Tensions Section - prominent placement */}
      <ValueTensionsSection 
        collisions={collisionScores}
        questions={questions}
      />
      
      {/* Existing: Per-axis breakdown */}
      <section className="space-y-12">
        <h2 className="text-3xl font-bold">Your Position on Each Axis</h2>
        
        {(axes || []).map(axis => {
          const conceptualScore = (surveyResult.conceptual_scores as unknown as AxisScoreType[] | undefined)?.find(
            (s: any) => s.axis_id === axis.id
          )
          const appliedScore = (surveyResult.applied_scores as unknown as AxisScoreType[] | undefined)?.find(
            (s: any) => s.axis_id === axis.id
          )
          
          return (
            <div key={axis.id} className="space-y-4">
              <AxisCard 
                axis={axis}
                conceptualScore={conceptualScore?.score}
                appliedScore={appliedScore?.score}
              />
              
              {/* NEW: Add collision details to each axis */}
              <AxisCollisionDetails 
                axisId={axis.id}
                axisName={axis.name}
                collisions={collisionScores}
              />
            </div>
          )
        })}
      </section>
    </div>
  )
}
