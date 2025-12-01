import { CollisionScore } from '@/lib/database.types'

interface AxisCollisionDetailsProps {
  axisId: string
  axisName: string
  collisions: CollisionScore[]
}

export function AxisCollisionDetails({ 
  axisId, 
  axisName, 
  collisions 
}: AxisCollisionDetailsProps) {
  
  // Filter to collisions involving this axis
  const relevantCollisions = collisions.filter(c => 
    (c.axis_primary === axisId || c.axis_collision === axisId) &&
    c.confidence_level !== 'low'
  ).slice(0, 3)
  
  if (relevantCollisions.length === 0) return null
  
  return (
    <div className="mt-6 pt-6 border-t space-y-4">
      <h4 className="font-semibold text-sm">
        When {axisName} conflicts with other values:
      </h4>
      
      <div className="space-y-3">
        {relevantCollisions.map((collision, i) => {
          const otherAxis = collision.axis_primary === axisId 
            ? collision.collision_name 
            : collision.primary_name
          
          const thisAxisIsPrimary = collision.axis_primary === axisId
          const favorsThisAxis = thisAxisIsPrimary 
            ? collision.preference_direction === 'primary'
            : collision.preference_direction === 'collision'
          
          const strengthColors = {
            'very strong': 'bg-red-500 text-white',
            'strong': 'bg-orange-500 text-white',
            'moderate': 'bg-yellow-500 text-black',
            'weak': 'bg-blue-500 text-white'
          }
          
          return (
            <div key={i} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
              <div className="flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-medium">vs {otherAxis}</span>
                  <span className="text-xs text-muted-foreground">
                    ({collision.question_count} scenario{collision.question_count > 1 ? 's' : ''})
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {favorsThisAxis 
                    ? `You tend to prioritize ${axisName}`
                    : collision.preference_direction === 'balanced'
                    ? 'You balance these case-by-case'
                    : `You tend to prioritize ${otherAxis}`
                  }
                </p>
              </div>
              
              <div className={`px-2 py-1 rounded text-xs font-medium ${strengthColors[collision.preference_strength]}`}>
                {collision.preference_strength}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
