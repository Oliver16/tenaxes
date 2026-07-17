import { createClient } from '@supabase/supabase-js'
import { calculateAxisScoresFromLinks } from '../src/lib/scorer'
import { analyzeTensions, getTensionQuestionDetails } from '../src/lib/tension-analyzer'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

async function testTensionScoring() {
  console.log('Testing tension scoring system...\n')

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

  // Create test responses (all agree = 1)
  const responses: Record<number, number> = {}
  questions.forEach(q => {
    responses[q.id] = 1
  })

  console.log(`Loaded ${questions.length} questions`)
  console.log(`Loaded ${axes.length} axes\n`)

  // Test 1: Primary weight invariance
  console.log('TEST 1: Primary Weight Invariance')
  console.log('='.repeat(50))

  const { axisScores, questionContributions } = calculateAxisScoresFromLinks(
    responses,
    questions as any,
    axesById
  )

  let pass = true
  for (const q of questions) {
    const contrib = questionContributions.find(c => c.question_id === q.id)
    if (!contrib) continue

    const links = (q.question_axis_links || []) as any[]
    const primary = links.find(l => l.role === 'primary')
    if (!primary) continue

    const primaryContrib = contrib.contributions.find(c => c.axis_id === primary.axis_id)
    const expected = Math.abs((responses[q.id] ?? 0) * (q.weight ?? 1))
    if (primaryContrib && Math.abs(Math.abs(primaryContrib.normalized_contribution) - expected) > 0.001) {
      console.log(`  FAIL Q${q.id}: primary contribution ${primaryContrib.normalized_contribution} != +/-${expected}`)
      pass = false
    }
  }
  console.log(pass
    ? '  PASS: every question contributes exactly its weight to its primary axis'
    : '  Some questions have inconsistent primary contributions')

  console.log('\nAxis scores (all-agree responder):')
  axisScores
    .sort((a, b) => a.axis_id.localeCompare(b.axis_id))
    .forEach(s => console.log(`  ${s.axis_id.padEnd(4)} score=${s.score.toFixed(3)} weight=${s.total_weight.toFixed(2)}`))

  // Test 2: Tension analysis
  console.log('\n\nTEST 2: Tension Analysis')
  console.log('='.repeat(50))

  const appliedQuestions = questions.filter(q => q.question_type === 'applied')
  const tensions = analyzeTensions(responses, appliedQuestions as any, axes)

  console.log(`\nFound ${tensions.length} tension groups (pair x pole signature)`)
  console.log('\nTensions by interestingness:')

  tensions.forEach((t, i) => {
    console.log(`\n${i + 1}. ${t.side_a.label} vs ${t.side_b.label}  [${t.pair_key}]`)
    console.log(`   Scenarios: ${t.answered_count} (${t.wins_a}-${t.wins_b}-${t.neutral_count})`)
    console.log(`   Lean: ${t.lean.toFixed(3)} (${t.preference_strength}, ${t.classification})`)
    console.log(`   Confidence: ${t.confidence_level} | Interestingness: ${t.interestingness_score.toFixed(1)}`)

    const details = getTensionQuestionDetails(t, responses, appliedQuestions as any)
    details.slice(0, 2).forEach(d => {
      console.log(`     - [${d.winner}] ${d.question.text.slice(0, 70)}...`)
    })
  })

  // Test 3: Weight audit
  console.log('\n\nTEST 3: Weight Balance Audit')
  console.log('='.repeat(50))

  const { data: weightAudit } = await supabase
    .from('axis_weight_audit')
    .select('*')

  if (weightAudit) {
    console.log('\nPer-axis weight distribution:')
    console.log('Axis | Primary Qs | Primary Wt | Secondary Qs | Secondary Wt | Tradeoff Qs')
    console.log('-'.repeat(80))

    weightAudit.forEach((row: any) => {
      console.log(
        `${row.axis_id.padEnd(4)} | ` +
        `${String(row.primary_count).padStart(10)} | ` +
        `${String(row.primary_weight_sum?.toFixed(1) || '0').padStart(10)} | ` +
        `${String(row.secondary_count || 0).padStart(12)} | ` +
        `${String(row.secondary_weight_sum?.toFixed(1) || '0').padStart(12)} | ` +
        `${String(row.tradeoff_count || 0).padStart(11)}`
      )
    })
  }

  console.log('\n\nAll tests complete')
}

testTensionScoring().catch(console.error)
