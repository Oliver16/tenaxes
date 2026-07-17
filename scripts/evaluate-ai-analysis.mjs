#!/usr/bin/env node

import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

export async function buildFixtureProviderInput(fixture, runtime) {
  runtime ??= await loadRuntimeModules()
  const topicSignals = runtime.buildTopicSignals(fixture.evidence)
  const centers = fixture.axes.map(axis => runtime.classifyCenterShape({
    axisId: axis.axis_id,
    score: axis.score,
    coverage: fixtureCoverage(fixture, axis),
    evidence: fixture.evidence,
    conceptualScore: axis.conceptual_score,
    appliedScore: axis.applied_score
  }))
  const deterministicCandidates = runtime.buildCandidateTensions({
    evidence: fixture.evidence,
    topicSignals,
    centers,
    axisComparisons: fixture.axes
      .filter(axis => axis.conceptual_score !== null && axis.applied_score !== null)
      .map(axis => ({
        axis_id: axis.axis_id,
        conceptual_score: axis.conceptual_score,
        applied_score: axis.applied_score,
        difference: Math.abs(axis.conceptual_score - axis.applied_score)
      })),
    collisionPairs: []
  })
  const candidates = new Map(deterministicCandidates.map(candidate => [candidate.candidate_id, candidate]))
  for (const candidate of fixture.candidate_tensions) candidates.set(candidate.candidate_id, candidate)
  const centerByAxis = new Map(centers.map(center => [center.axis_id, center]))
  const numeric = fixture.evidence.filter(question => typeof question.response === 'number')

  return {
    schema_version: '1',
    prompt_version: 'v1',
    bank_version: runtime.SYNTHETIC_BANK_VERSION,
    profile: {
      core_axes: fixture.axes.map(axis => ({
        axis_id: axis.axis_id,
        name: axis.name,
        score: axis.score,
        pole_negative: axis.pole_negative,
        pole_positive: axis.pole_positive,
        favored_pole: Math.abs(axis.score) < 0.2
          ? 'Near center'
          : axis.score > 0
            ? axis.pole_positive
            : axis.pole_negative,
        coverage: fixtureCoverage(fixture, axis).coverage,
        confidence: axis.coverage_confidence,
        conceptual_score: axis.conceptual_score,
        applied_score: axis.applied_score,
        center_shape: centerByAxis.get(axis.axis_id)?.shape ?? 'insufficient_evidence'
      })),
      facets: [],
      archetypes: []
    },
    response_summary: {
      total_questions: fixture.evidence.length,
      recorded: fixture.evidence.length,
      numeric: numeric.length,
      neutral: numeric.filter(question => question.response === 0).length,
      not_sure: fixture.evidence.filter(question => question.response === null).length
    },
    topic_signals: topicSignals,
    candidate_tensions: [...candidates.values()],
    collision_pairs: [],
    questions: fixture.evidence,
    user_context: fixture.user_context
      ? { general_context: fixture.user_context, clarification_answers: [] }
      : null
  }
}

export function compareDeterministicExpectations(fixture, input) {
  const mismatches = []
  const topics = new Map(input.topic_signals.map(signal => [signal.topic, signal.classification]))
  for (const [topic, expected] of Object.entries(fixture.expected.deterministic_topics ?? {})) {
    const actual = topics.get(topic)
    if (actual !== expected) mismatches.push(`topic ${topic}: expected ${expected}, received ${actual ?? 'missing'}`)
  }
  const centers = new Map(input.profile.core_axes.map(axis => [axis.axis_id, axis.center_shape]))
  for (const [axisId, expected] of Object.entries(fixture.expected.center_shapes ?? {})) {
    const actual = centers.get(axisId)
    if (actual !== expected) mismatches.push(`axis ${axisId}: expected ${expected}, received ${actual ?? 'missing'}`)
  }
  return mismatches
}

export function compareLiveExpectations(fixture, analysis) {
  const mismatches = []
  const classifications = new Set(analysis.tensions.map(tension => tension.classification))
  const requiredTensions = fixture.expected.tension_any_of ?? []
  if (requiredTensions.length > 0 && !requiredTensions.some(classification => classifications.has(classification))) {
    mismatches.push(`expected a tension classified as one of: ${requiredTensions.join(', ')}`)
  }
  for (const forbidden of fixture.expected.tension_none_of ?? []) {
    if (classifications.has(forbidden)) mismatches.push(`forbidden tension classification present: ${forbidden}`)
  }
  if (fixture.expected.exception_status_any_of?.length) {
    const statuses = new Set(analysis.domain_specific_exceptions.map(exception => exception.status))
    if (!fixture.expected.exception_status_any_of.some(status => statuses.has(status))) {
      mismatches.push(`expected an exception status of: ${fixture.expected.exception_status_any_of.join(', ')}`)
    }
  }
  const engagement = new Map(analysis.engagement_and_knowledge.topics.map(topic => [topic.topic, topic.classification]))
  for (const [topic, expected] of Object.entries(fixture.expected.engagement_topics ?? {})) {
    const actual = engagement.get(topic)
    if (!expected.includes(actual)) mismatches.push(`engagement ${topic}: expected one of ${expected.join(', ')}, received ${actual ?? 'missing'}`)
  }
  const centers = new Map(analysis.center_explanations.map(center => [center.axis_id, center.shape]))
  for (const [axisId, expected] of Object.entries(fixture.expected.center_shapes ?? {})) {
    const actual = centers.get(axisId)
    if (actual !== expected) mismatches.push(`center explanation ${axisId}: expected ${expected}, received ${actual ?? 'missing'}`)
  }
  const clarificationText = analysis.clarifying_questions.map(item => item.question).join(' ').toLowerCase()
  if (
    fixture.expected.clarification_keywords.length > 0 &&
    !fixture.expected.clarification_keywords.some(keyword => clarificationText.includes(keyword.toLowerCase()))
  ) {
    mismatches.push(`no clarification contained any expected keyword: ${fixture.expected.clarification_keywords.join(', ')}`)
  }
  return mismatches
}

export async function runEvaluation(options = {}) {
  const runtime = await loadRuntimeModules()
  const runLive = options.runLive ?? process.env.RUN_LIVE_AI_EVALS === 'true'
  const selectedIds = parseFixtureIds(options.fixtureIds ?? process.env.AI_EVAL_FIXTURE_IDS)
  const fixtures = runtime.syntheticFixtures.filter(fixture => selectedIds.size === 0 || selectedIds.has(fixture.id))
  if (fixtures.length === 0) throw new Error('No synthetic fixtures matched AI_EVAL_FIXTURE_IDS')

  const runId = new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-')
  const outputDirectory = options.outputDirectory ?? path.join(repoRoot, '.next', 'ai-analysis-evals', runId)
  await mkdir(outputDirectory, { recursive: true })
  const results = []

  for (const fixture of fixtures) {
    const input = await buildFixtureProviderInput(fixture, runtime)
    const deterministicMismatches = compareDeterministicExpectations(fixture, input)
    let live = null
    let liveMismatches = []
    let error = null

    if (runLive) {
      try {
        live = await callConfiguredProvider(input, runtime)
        const evidenceValidation = runtime.validateAnalysisEvidence(live.analysis, input)
        if (!evidenceValidation.valid) {
          liveMismatches.push(...evidenceValidation.errors.map(message => `evidence validation: ${message}`))
        }
        liveMismatches.push(...compareLiveExpectations(fixture, live.analysis))
      } catch (caught) {
        error = caught instanceof Error ? caught.message : String(caught)
      }
    }

    const result = {
      fixture_id: fixture.id,
      fixture: fixture.slug,
      live_provider_call: runLive,
      deterministic_mismatches: deterministicMismatches,
      live_mismatches: liveMismatches,
      error,
      input,
      provider_result: live
    }
    results.push(result)
    await writeFile(path.join(outputDirectory, `fixture-${fixture.id.toLowerCase()}.json`), JSON.stringify(result, null, 2), 'utf8')
  }

  const summary = {
    generated_at: new Date().toISOString(),
    live_provider_calls: runLive,
    provider: runLive ? process.env.AI_ANALYSIS_PROVIDER ?? null : null,
    fixture_count: results.length,
    mismatch_count: results.reduce((sum, result) => sum + result.deterministic_mismatches.length + result.live_mismatches.length, 0),
    error_count: results.filter(result => result.error).length,
    results: results.map(result => ({
      fixture_id: result.fixture_id,
      deterministic_mismatches: result.deterministic_mismatches,
      live_mismatches: result.live_mismatches,
      error: result.error
    }))
  }
  await writeFile(path.join(outputDirectory, 'summary.json'), JSON.stringify(summary, null, 2), 'utf8')
  printSummary(summary, outputDirectory)
  return { summary, outputDirectory, results }
}

function fixtureCoverage(fixture, axis) {
  const primary = fixture.evidence.filter(question => question.primary_axis_id === axis.axis_id)
  const numeric = primary.filter(question => typeof question.response === 'number')
  const answeredWeight = numeric.reduce((sum, question) => sum + question.primary_weight, 0)
  const availableWeight = primary.reduce((sum, question) => sum + question.primary_weight, 0)
  return {
    axis_id: axis.axis_id,
    answered_primary_items: numeric.length,
    available_primary_items: primary.length,
    answered_weight: answeredWeight,
    available_weight: availableWeight,
    coverage: availableWeight === 0 ? 0 : answeredWeight / availableWeight,
    confidence: axis.coverage_confidence
  }
}

async function loadRuntimeModules() {
  const [fixtures, signals, schema, validator, prompt] = await Promise.all([
    import(pathToFileURL(path.join(repoRoot, 'src/lib/ai-analysis/fixtures/index.ts')).href),
    import(pathToFileURL(path.join(repoRoot, 'src/lib/ai-analysis/signals.ts')).href),
    import(pathToFileURL(path.join(repoRoot, 'src/lib/ai-analysis/schema.ts')).href),
    import(pathToFileURL(path.join(repoRoot, 'src/lib/ai-analysis/evidence-validator.ts')).href),
    import(pathToFileURL(path.join(repoRoot, 'src/lib/ai-analysis/prompts/v1.ts')).href)
  ])
  return { ...fixtures, ...signals, ...schema, ...validator, ...prompt }
}

async function callConfiguredProvider(input, runtime) {
  const provider = process.env.AI_ANALYSIS_PROVIDER
  if (provider === 'openai') return callOpenAI(input, runtime)
  if (provider === 'anthropic') return callAnthropic(input, runtime)
  throw new Error('Set AI_ANALYSIS_PROVIDER to openai or anthropic for live evaluations')
}

async function callOpenAI(input, runtime) {
  const apiKey = process.env.OPENAI_API_KEY
  const model = process.env.OPENAI_ANALYSIS_MODEL
  if (!apiKey || !model) throw new Error('OpenAI live evaluation is not configured')
  const { default: OpenAI } = await import('openai')
  const client = new OpenAI({ apiKey, timeout: timeoutMs() })
  const started = Date.now()
  const response = await client.responses.create({
    model,
    instructions: runtime.AI_ANALYSIS_SYSTEM_PROMPT,
    input: runtime.buildProvisionalRequest(input),
    text: {
      format: {
        type: 'json_schema',
        name: 'polyaxis_personalized_analysis_eval',
        description: 'A candid, evidence-linked interpretation of a synthetic Polyaxis fixture.',
        schema: runtime.personalizedAnalysisJsonSchema,
        strict: true
      }
    },
    store: false
  }, { signal: AbortSignal.timeout(timeoutMs()) })
  let raw
  try {
    raw = JSON.parse(response.output_text)
  } catch {
    throw new Error('OpenAI returned malformed JSON during live evaluation')
  }
  const parsed = runtime.personalizedAnalysisSchema.safeParse(raw)
  if (!parsed.success) throw new Error(`OpenAI output failed schema validation: ${parsed.error.message}`)
  return {
    analysis: parsed.data,
    provider: 'openai',
    model,
    latency_ms: Date.now() - started,
    input_tokens: response.usage?.input_tokens ?? null,
    output_tokens: response.usage?.output_tokens ?? null,
    provider_request_id: response.id ?? null
  }
}

async function callAnthropic(input, runtime) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  const model = process.env.ANTHROPIC_ANALYSIS_MODEL
  if (!apiKey || !model) throw new Error('Anthropic live evaluation is not configured')
  const { default: Anthropic } = await import('@anthropic-ai/sdk')
  const client = new Anthropic({ apiKey, timeout: timeoutMs() })
  const started = Date.now()
  const response = await client.messages.create({
    model,
    max_tokens: 12000,
    system: runtime.AI_ANALYSIS_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: runtime.buildProvisionalRequest(input) }],
    tools: [{
      name: 'submit_polyaxis_analysis',
      description: 'Submit the complete structured Polyaxis analysis of a synthetic evaluation fixture.',
      input_schema: runtime.personalizedAnalysisJsonSchema
    }],
    tool_choice: { type: 'tool', name: 'submit_polyaxis_analysis', disable_parallel_tool_use: true }
  }, { signal: AbortSignal.timeout(timeoutMs()) })
  const blocks = response.content.filter(block => block.type === 'tool_use' && block.name === 'submit_polyaxis_analysis')
  if (blocks.length !== 1) throw new Error('Anthropic did not return exactly one forced schema tool call')
  const parsed = runtime.personalizedAnalysisSchema.safeParse(blocks[0].input)
  if (!parsed.success) throw new Error(`Anthropic output failed schema validation: ${parsed.error.message}`)
  return {
    analysis: parsed.data,
    provider: 'anthropic',
    model,
    latency_ms: Date.now() - started,
    input_tokens: response.usage.input_tokens ?? null,
    output_tokens: response.usage.output_tokens ?? null,
    provider_request_id: response.id ?? null
  }
}

function timeoutMs() {
  const parsed = Number(process.env.AI_ANALYSIS_TIMEOUT_MS ?? 240000)
  return Math.min(Number.isFinite(parsed) && parsed > 0 ? parsed : 240000, 240000)
}

function parseFixtureIds(raw) {
  if (!raw) return new Set()
  return new Set(raw.split(',').map(value => value.trim().toUpperCase()).filter(Boolean))
}

function printSummary(summary, outputDirectory) {
  console.log(`AI analysis evaluation: ${summary.live_provider_calls ? 'LIVE' : 'offline'} (${summary.fixture_count} fixtures)`)
  for (const result of summary.results) {
    const count = result.deterministic_mismatches.length + result.live_mismatches.length
    console.log(`  ${result.fixture_id}: ${result.error ? `ERROR - ${result.error}` : count > 0 ? `${count} mismatch(es)` : 'ok'}`)
    for (const mismatch of [...result.deterministic_mismatches, ...result.live_mismatches]) console.log(`    - ${mismatch}`)
  }
  console.log(`Results written to ${outputDirectory}`)
}

const invokedAsScript = process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url
if (invokedAsScript) {
  try {
    const { summary } = await runEvaluation()
    if (summary.mismatch_count > 0 || summary.error_count > 0) process.exitCode = 1
  } catch (error) {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  }
}
