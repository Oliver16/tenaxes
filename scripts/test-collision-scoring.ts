import { createClient } from '@supabase/supabase-js'
import { calculateAxisScoresFromLinks } from '../src/lib/scorer'
import { analyzeCollisions } from '../src/lib/collision-analyzer'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

async function testCollisionScoring() {
  console.log('Testing collision scoring system...\n')
  
  // Fetch questions with links
  const { data: questions } = await supabase
    .from('questions')
    .select(`
      *,
      question_axis_links (*)
    `)
    .eq('active', true)
  
  // Fetch axes
  const { data: axes } = await supabase
    .from('axes')
    .select('*')
  
  if (!questions || !axes) {
    console.error('Failed to fetch data')
    return
  }
  
  const axesById = Object.fromEntries(axes.map(a => [a.id, a]))
  
  // Create test responses (all strongly agree = 1)
  const responses: Record<number, number> = {}
  questions.forEach(q => {
    responses[q.id] = 1
  })
  
  console.log(`Loaded ${questions.length} questions`)
  console.log(`Loaded ${axes.length} axes\n`)
  
  // Test 1: Verify normalization
  console.log('TEST 1: Normalization Check')
  console.log('='.repeat(50))
  
  const { axisScores, questionContributions } = calculateAxisScoresFromLinks(
    responses,
    questions as any,
    axesById
  )
  
  // Check that multi-axis questions don't over-contribute
  const multiAxisQuestions = questions.filter(q => 
    q.question_axis_links && q.question_axis_links.length > 1
  )
  
  console.log(`Found ${multiAxisQuestions.length} multi-axis questions`)
  
  for (const q of multiAxisQuestions.slice(0, 3)) {
    const contrib = questionContributions.find(c => c.question_id === q.id)
    if (!contrib) continue
    
    const totalNormalized = contrib.contributions.reduce(
      (sum, c) => sum + Math.abs(c.normalized_contribution), 
      0
    )
    
    console.log(`\nQuestion ${q.id}:`)
    console.log(`  Links: ${q.question_axis_links.length}`)
    console.log(`  Total normalized contribution: ${totalNormalized.toFixed(3)}`)
    console.log(`  Expected: ~${q.weight?.toFixed(3) || '1.000'}`)
    console.log(`  ✓ ${Math.abs(totalNormalized - (q.weight || 1)) < 0.01 ? 'PASS' : 'FAIL'}`)
  }
  
  // Test 2: Collision analysis
  console.log('\n\nTEST 2: Collision Analysis')
  console.log('='.repeat(50))
  
  const appliedQuestions = questions.filter(q => q.question_type === 'applied')
  const collisions = analyzeCollisions(responses, appliedQuestions as any, axes)
  
  console.log(`\nFound ${collisions.length} collision pairs`)
  console.log('\nTop 5 collision pairs by interestingness:')
  
  collisions.slice(0, 5).forEach((c, i) => {
    console.log(`\n${i + 1}. ${c.primary_name} vs ${c.collision_name}`)
    console.log(`   Questions: ${c.question_count}`)
    console.log(`   Confidence: ${c.confidence_level}`)
    console.log(`   Preference: ${c.preference_direction} (${c.preference_strength})`)
    console.log(`   Interestingness: ${c.interestingness_score.toFixed(1)}`)
  })
  
  // Test 3: Weight audit
  console.log('\n\nTEST 3: Weight Balance Audit')
  console.log('='.repeat(50))
  
  const { data: weightAudit } = await supabase
    .from('axis_weight_audit')
    .select('*')
  
  if (weightAudit) {
    console.log('\nPer-axis weight distribution:')
    console.log('Axis | Primary Qs | Primary Wt | Collision Qs | Collision Wt | Total')
    console.log('-'.repeat(80))
    
    weightAudit.forEach((row: any) => {
      console.log(
        `${row.axis_id.padEnd(4)} | ` +
        `${String(row.primary_count).padStart(10)} | ` +
        `${String(row.primary_weight_sum?.toFixed(1) || '0').padStart(10)} | ` +
        `${String(row.collision_count || 0).padStart(12)} | ` +
        `${String(row.collision_weight_sum?.toFixed(1) || '0').padStart(12)} | ` +
        `${row.total_weight?.toFixed(1) || '0'}`
      )
    })
  }
  
  console.log('\n\n✓ All tests complete')
}

testCollisionScoring().catch(console.error)
