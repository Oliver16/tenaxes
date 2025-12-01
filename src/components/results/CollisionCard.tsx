import { CollisionScore } from '@/lib/database.types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface CollisionCardProps {
  collision: CollisionScore
  rank: number
  icon?: string
  exampleScenarios?: string[]
}

export function CollisionCard({ 
  collision, 
  rank,
  icon = '🤔',
  exampleScenarios = []
}: CollisionCardProps) {
  
  const { 
    primary_name,
    collision_name,
    preference_strength,
    preference_direction,
    confidence_level,
    question_count,
    preference_index
  } = collision
  
  // Generate headline
  let headline = ''
  let explanation = ''
  
  if (preference_direction === 'balanced') {
    headline = `You balance ${primary_name} and ${collision_name}`
    explanation = "When these values conflict, you don't consistently favor one over the other. Your decisions depend on the specific situation."
  } else {
    const favored = preference_direction === 'primary' ? primary_name : collision_name
    const opposed = preference_direction === 'primary' ? collision_name : primary_name
    
    const strengthWord = 
      preference_strength === 'very strong' ? 'strongly prioritize' :
      preference_strength === 'strong' ? 'tend to prioritize' :
      preference_strength === 'moderate' ? 'lean toward' : 'slightly favor'
    
    headline = `You ${strengthWord} ${favored} over ${opposed}`
    
    explanation = `When real-world situations force a choice between ${primary_name} and ${collision_name}, you ${strengthWord} ${favored}. ${
      preference_strength === 'very strong' || preference_strength === 'strong'
        ? 'This is a clear pattern across multiple scenarios.'
        : 'This tendency is moderate and may vary depending on context.'
    }`
  }
  
  const strengthColor = 
    preference_strength === 'very strong' ? 'bg-red-500' :
    preference_strength === 'strong' ? 'bg-orange-500' :
    preference_strength === 'moderate' ? 'bg-yellow-500' : 'bg-blue-500'
  
  const confidenceBadge = 
    confidence_level === 'high' ? 'High confidence' :
    confidence_level === 'medium' ? 'Medium confidence' : 'Low confidence'
  
  return (
    <Card className="relative overflow-hidden">
      {/* Rank indicator */}
      <div className="absolute top-4 right-4 text-4xl font-bold text-muted-foreground/10">
        #{rank}
      </div>
      
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className="text-3xl">{icon}</div>
          <div className="flex-1 space-y-2">
            <CardTitle className="text-lg leading-tight">
              {headline}
            </CardTitle>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="text-xs">
                {question_count} scenario{question_count > 1 ? 's' : ''}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {confidenceBadge}
              </Badge>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Preference strength indicator */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs text-muted-foreground">
            <span>{primary_name}</span>
            <span>{collision_name}</span>
          </div>
          <div className="relative h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className={`absolute top-0 h-full ${strengthColor} transition-all`}
              style={{
                left: preference_index < 0 ? '0%' : '50%',
                right: preference_index > 0 ? '0%' : '50%',
                width: `${Math.abs(preference_index) * 50}%`
              }}
            />
            <div className="absolute top-0 left-1/2 h-full w-0.5 bg-border" />
          </div>
        </div>
        
        <p className="text-sm text-muted-foreground">
          {explanation}
        </p>
        
        {/* Example scenarios - collapsible */}
        {exampleScenarios.length > 0 && (
          <details className="text-xs space-y-2">
            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
              View example scenarios
            </summary>
            <ul className="mt-2 space-y-1 pl-4 list-disc text-muted-foreground">
              {exampleScenarios.map((scenario, i) => (
                <li key={i}>{scenario.substring(0, 100)}...</li>
              ))}
            </ul>
          </details>
        )}
      </CardContent>
    </Card>
  )
}
