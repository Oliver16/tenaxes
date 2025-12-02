import { CollisionScore, QuestionWithLinks, ResponsesMap } from './database.types'

/**
 * Detailed information about how a specific question contributed to a collision
 */
export interface QuestionCollisionDetail {
  question: QuestionWithLinks
  response: number
  primary_contribution: number
  collision_contribution: number
  favored_axis: 'primary' | 'collision' | 'balanced'
}

/**
 * Analyze collision tensions between axes
 * Uses RAW granular weights (not normalized) to show true preference strength
 */
export function analyzeCollisions(
  responses: ResponsesMap,
  questions: QuestionWithLinks[],
  axes: { id: string; name: string }[]
): CollisionScore[] {
  
  const collisionQuestions = questions.filter(q => 
    q.question_axis_links && q.question_axis_links.length > 1
  )
  
  // Group by collision pairs
  interface PairData {
    primary: string
    collision: string
    questions: QuestionWithLinks[]
    primaryContribs: number[]
    collisionContribs: number[]
    primaryWeights: number[]
    collisionWeights: number[]
  }
  
  const pairMap = new Map<string, PairData>()
  
  for (const q of collisionQuestions) {
    const response = responses[q.id]
    if (response === undefined) continue
    
    const primaryLinks = q.question_axis_links.filter(l => l.role === 'primary')
    const collisionLinks = q.question_axis_links.filter(l => l.role === 'collision')
    
    for (const p of primaryLinks) {
      for (const c of collisionLinks) {
        const key = `${p.axis_id}|${c.axis_id}`
        
        if (!pairMap.has(key)) {
          pairMap.set(key, {
            primary: p.axis_id,
            collision: c.axis_id,
            questions: [],
            primaryContribs: [],
            collisionContribs: [],
            primaryWeights: [],
            collisionWeights: []
          })
        }
        
        const pair = pairMap.get(key)!
        pair.questions.push(q)
        
        // Use RAW weights (not normalized) for granular strength analysis
        const primaryContrib = response * p.axis_key * p.weight
        const collisionContrib = response * c.axis_key * c.weight
        
        pair.primaryContribs.push(primaryContrib)
        pair.collisionContribs.push(collisionContrib)
        pair.primaryWeights.push(p.weight)
        pair.collisionWeights.push(c.weight)
      }
    }
  }
  
  // Calculate scores for each pair
  const scores: CollisionScore[] = []
  
  for (const [, pair] of pairMap.entries()) {
    if (pair.questions.length < 2) continue // Need at least 2 questions for confidence
    
    const primarySum = pair.primaryContribs.reduce((a, b) => a + b, 0)
    const collisionSum = pair.collisionContribs.reduce((a, b) => a + b, 0)
    const primaryWeightSum = pair.primaryWeights.reduce((a, b) => a + b, 0)
    const collisionWeightSum = pair.collisionWeights.reduce((a, b) => a + b, 0)
    
    const scorePrimary = primaryWeightSum > 0 
      ? primarySum / (2 * primaryWeightSum) 
      : 0
    const scoreCollision = collisionWeightSum > 0 
      ? collisionSum / (2 * collisionWeightSum) 
      : 0
    
    // Preference index: positive = lean toward collision axis
    const preferenceIndex = (scoreCollision - scorePrimary) / 2
    
    // Determine direction and strength
    const absPreference = Math.abs(preferenceIndex)
    const direction: CollisionScore['preference_direction'] = 
      absPreference < 0.15 ? 'balanced' :
      preferenceIndex > 0 ? 'collision' : 'primary'
    
    const strength: CollisionScore['preference_strength'] = 
      absPreference < 0.15 ? 'weak' :
      absPreference < 0.35 ? 'moderate' :
      absPreference < 0.60 ? 'strong' : 'very strong'
    
    // Confidence based on question count
    const confidence: CollisionScore['confidence_level'] = 
      pair.questions.length < 3 ? 'low' :
      pair.questions.length < 5 ? 'medium' : 'high'
    
    // Interestingness: prioritize strong preferences with high confidence
    const interestingness = 
      absPreference * 40 +                                      // Strength (0-40 points)
      (pair.questions.length * 5) +                            // Sample size (up to 30+ points)
      (confidence === 'high' ? 20 : confidence === 'medium' ? 10 : 0) + // Confidence bonus
      (direction === 'balanced' ? -10 : 0)                     // Penalize unclear cases
    
    const primaryAxis = axes.find(a => a.id === pair.primary)
    const collisionAxis = axes.find(a => a.id === pair.collision)
    
    scores.push({
      axis_primary: pair.primary,
      axis_collision: pair.collision,
      primary_name: primaryAxis?.name || pair.primary,
      collision_name: collisionAxis?.name || pair.collision,
      score_primary: scorePrimary,
      score_collision: scoreCollision,
      preference_index: preferenceIndex,
      preference_strength: strength,
      preference_direction: direction,
      question_count: pair.questions.length,
      confidence_level: confidence,
      interestingness_score: interestingness
    })
  }
  
  // Sort by interestingness
  return scores.sort((a, b) => b.interestingness_score - a.interestingness_score)
}

/**
 * Find questions that contributed to a specific collision pair
 */
export function findCollisionQuestions(
  primaryAxis: string,
  collisionAxis: string,
  questions: QuestionWithLinks[]
): QuestionWithLinks[] {
  return questions.filter(q => {
    if (!q.question_axis_links || q.question_axis_links.length < 2) return false

    const hasPrimary = q.question_axis_links.some(
      l => l.role === 'primary' && l.axis_id === primaryAxis
    )
    const hasCollision = q.question_axis_links.some(
      l => l.role === 'collision' && l.axis_id === collisionAxis
    )

    return hasPrimary && hasCollision
  })
}

/**
 * Get detailed information about how each question contributed to a collision pair
 * Shows which axis was favored in each question and by how much
 */
export function getCollisionQuestionDetails(
  primaryAxis: string,
  collisionAxis: string,
  responses: ResponsesMap,
  questions: QuestionWithLinks[]
): QuestionCollisionDetail[] {
  const collisionQuestions = findCollisionQuestions(primaryAxis, collisionAxis, questions)

  return collisionQuestions
    .map(q => {
      const response = responses[q.id]
      if (response === undefined) return null

      const primaryLink = q.question_axis_links.find(
        l => l.role === 'primary' && l.axis_id === primaryAxis
      )
      const collisionLink = q.question_axis_links.find(
        l => l.role === 'collision' && l.axis_id === collisionAxis
      )

      if (!primaryLink || !collisionLink) return null

      const primaryContrib = response * primaryLink.axis_key * primaryLink.weight
      const collisionContrib = response * collisionLink.axis_key * collisionLink.weight

      // Determine which axis this question favored
      const diff = Math.abs(primaryContrib - collisionContrib)
      let favoredAxis: 'primary' | 'collision' | 'balanced'

      if (diff < 0.3) {
        favoredAxis = 'balanced'
      } else if (primaryContrib > collisionContrib) {
        favoredAxis = 'primary'
      } else {
        favoredAxis = 'collision'
      }

      return {
        question: q,
        response,
        primary_contribution: primaryContrib,
        collision_contribution: collisionContrib,
        favored_axis: favoredAxis
      }
    })
    .filter((detail): detail is QuestionCollisionDetail => detail !== null)
    .sort((a, b) => {
      // Sort by strength of preference (most decisive questions first)
      const diffA = Math.abs(a.primary_contribution - a.collision_contribution)
      const diffB = Math.abs(b.primary_contribution - b.collision_contribution)
      return diffB - diffA
    })
}
