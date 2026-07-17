'use client'

import Link from 'next/link'
import type { Ref } from 'react'
import { ClarificationForm } from './ClarificationForm'
import { AI_ASSISTED_INTERPRETATION_LABEL } from './copy'
import { EngagementTopicCard } from './EngagementTopicCard'
import { EvidenceReferences } from './EvidenceReferences'
import { TensionFindingCard } from './TensionFindingCard'
import type {
  AIQuestionDisplayEvidence,
  AnalysisRecordMeta,
  CenterShape,
  GetAIAnalysisResponse,
  PersonalizedAnalysis
} from '@/lib/ai-analysis/types'
import { analysisHeaderForDisplay } from '@/lib/ai-analysis/headline'

type AnalysisVersion = NonNullable<GetAIAnalysisResponse['versions']>[number]

const COHERENCE_LABELS: Record<PersonalizedAnalysis['overall_assessment']['ideological_coherence'], string> = {
  high: 'High coherence',
  mostly_coherent: 'Mostly coherent',
  mixed: 'Mixed coherence',
  significant_unresolved_tensions: 'Significant unresolved tensions',
  insufficient_evidence: 'Insufficient evidence'
}

const ENGAGEMENT_LABELS: Record<PersonalizedAnalysis['overall_assessment']['engagement'], string> = {
  strongly_engaged: 'Strongly engaged',
  selectively_engaged: 'Selectively engaged',
  broadly_moderate: 'Broadly moderate',
  apparent_low_salience: 'Apparent low salience',
  uncertain: 'Uncertain'
}

const CENTER_LABELS: Record<CenterShape, string> = {
  not_center: 'Not a center score',
  low_intensity_center: 'Low-intensity center',
  counterbalanced_center: 'Counterbalanced convictions',
  contextual_center: 'Contextual center',
  uncertain_center: 'Uncertain center',
  insufficient_evidence: 'Insufficient evidence'
}

const EXCEPTION_BADGES: Record<
  PersonalizedAnalysis['domain_specific_exceptions'][number]['status'],
  { label: string; className: string }
> = {
  coherent: { label: 'Coherent exception', className: 'border-blue-300 bg-blue-50 text-blue-900' },
  plausibly_coherent: { label: 'Plausibly coherent', className: 'border-sky-300 bg-sky-50 text-sky-900' },
  self_serving_risk: { label: 'Self-serving risk', className: 'border-orange-300 bg-orange-50 text-orange-950' },
  unresolved: { label: 'Unresolved', className: 'border-amber-300 bg-amber-50 text-amber-950' }
}

function formatGeneratedAt(record: AnalysisRecordMeta) {
  const value = record.completed_at ?? record.created_at
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return `${new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'UTC'
  }).format(date)} UTC`
}

function SectionHeading({ number, title, description }: { number: number; title: string; description?: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-violet-600">{number}</p>
      <h2 className="mt-0.5 text-xl font-bold text-gray-900">{title}</h2>
      {description && <p className="mt-1 text-sm leading-relaxed text-gray-600">{description}</p>}
    </div>
  )
}

export function AIAnalysisReport({
  analysis,
  record,
  sessionId,
  evidence,
  versions,
  selectedRecordId,
  onVersionChange,
  cached,
  canGenerate,
  remainingGenerations,
  contextMaxLength,
  refining,
  allowRefinement,
  headingRef,
  onRefine
}: {
  analysis: PersonalizedAnalysis
  record: AnalysisRecordMeta
  sessionId: string
  evidence: AIQuestionDisplayEvidence[]
  versions: AnalysisVersion[]
  selectedRecordId: string
  onVersionChange: (recordId: string) => void
  cached: boolean
  canGenerate: boolean
  remainingGenerations: number
  contextMaxLength: number
  refining: boolean
  allowRefinement: boolean
  headingRef?: Ref<HTMLHeadingElement>
  onRefine: (values: {
    generalContext: string
    clarificationAnswers: Array<{ clarification_id: string; answer: string }>
  }) => Promise<void> | void
}) {
  const header = analysisHeaderForDisplay(analysis.headline, analysis.executive_summary)

  return (
    <div className="space-y-6">
      <article className="overflow-hidden rounded-xl border border-violet-200 bg-white shadow-sm">
        <div className="bg-gradient-to-br from-violet-50 via-white to-blue-50 p-6 md:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 max-w-3xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-violet-200 bg-white px-2.5 py-1 text-xs font-semibold text-violet-800">
                  {AI_ASSISTED_INTERPRETATION_LABEL}
                </span>
                {analysis.analysis_stage === 'refined' && (
                  <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-800">
                    Refined using your additional context
                  </span>
                )}
                {cached && (
                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800">
                    Saved analysis
                  </span>
                )}
              </div>
              <h2
                ref={headingRef}
                tabIndex={-1}
                className="mt-3 text-2xl font-bold leading-tight text-gray-950 outline-none md:text-3xl"
              >
                {header.headline}
              </h2>
              <p className="mt-4 text-base leading-relaxed text-gray-700">{header.executiveSummary}</p>
            </div>

            {versions.length > 1 && (
              <div className="shrink-0">
                <label htmlFor="ai-analysis-version" className="block text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Analysis version
                </label>
                <select
                  id="ai-analysis-version"
                  value={selectedRecordId}
                  onChange={event => onVersionChange(event.target.value)}
                  className="mt-1 max-w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800"
                >
                  {versions.map((version, index) => (
                    <option key={version.record.id} value={version.record.id}>
                      {version.record.stage === 'refined' ? 'Refined' : 'Provisional'}
                      {index === 0 ? ' (latest)' : ''} &mdash; {formatGeneratedAt(version.record)}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      </article>

      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <SectionHeading number={1} title="Overall assessment" />
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-sm font-semibold text-violet-900">
            {COHERENCE_LABELS[analysis.overall_assessment.ideological_coherence]}
          </span>
          <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-900">
            {ENGAGEMENT_LABELS[analysis.overall_assessment.engagement]}
          </span>
          <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-sm font-medium capitalize text-gray-700">
            {analysis.overall_assessment.confidence} confidence
          </span>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-gray-700">{analysis.overall_assessment.candor_summary}</p>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <SectionHeading number={2} title="Defining commitments" />
        {analysis.defining_commitments.length > 0 ? (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {analysis.defining_commitments.map((commitment, index) => (
              <article key={`${commitment.title}-${index}`} className="rounded-lg border border-gray-200 p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-gray-900">{commitment.title}</h3>
                  <span className="shrink-0 text-xs font-semibold capitalize text-gray-500">{commitment.confidence}</span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-gray-700">{commitment.analysis}</p>
                <details className="mt-3 group">
                  <summary className="cursor-pointer list-none text-xs font-semibold text-blue-700">
                    Review evidence <span className="group-open:hidden" aria-hidden="true">&rsaquo;</span>
                  </summary>
                  <div className="mt-3">
                    <EvidenceReferences
                      sessionId={sessionId}
                      axisIds={commitment.axis_ids}
                      questionIds={commitment.question_ids}
                      evidence={evidence}
                    />
                  </div>
                </details>
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-gray-500">The available responses did not establish defining commitments with adequate confidence.</p>
        )}
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <SectionHeading
          number={3}
          title="What your center scores actually mean"
          description="A score near the midpoint can reflect weak preferences, uncertainty, context, or strong convictions pulling in opposite directions. These are not interchangeable."
        />
        {analysis.center_explanations.length > 0 ? (
          <div className="mt-4 space-y-3">
            {analysis.center_explanations.map(center => (
              <article key={center.axis_id} className="rounded-lg border border-gray-200 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/results/${sessionId}/axes/${encodeURIComponent(center.axis_id)}`}
                    className="font-bold text-blue-700 hover:text-blue-900"
                  >
                    {center.axis_id}
                  </Link>
                  <span className="rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-900">
                    {CENTER_LABELS[center.shape]}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-gray-700">{center.analysis}</p>
                <details className="mt-3 group">
                  <summary className="cursor-pointer list-none text-xs font-semibold text-blue-700">
                    Review evidence <span className="group-open:hidden" aria-hidden="true">&rsaquo;</span>
                  </summary>
                  <div className="mt-3">
                    <EvidenceReferences
                      sessionId={sessionId}
                      axisIds={[center.axis_id]}
                      questionIds={center.question_ids}
                      evidence={evidence}
                    />
                  </div>
                </details>
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-gray-500">No center-score explanation was needed for this result.</p>
        )}
      </section>

      <section className="space-y-4">
        <SectionHeading
          number={4}
          title="Tensions, inconsistencies, and possible hypocrisy"
          description="These labels are evidence-based hypotheses, not character verdicts. Each finding includes both the strongest coherent reading and the critical case against it."
        />
        {analysis.tensions.length > 0 ? (
          analysis.tensions.map(finding => (
            <TensionFindingCard
              key={finding.tension_id}
              finding={finding}
              sessionId={sessionId}
              evidence={evidence}
            />
          ))
        ) : (
          <div className="rounded-xl border border-gray-200 bg-white p-5 text-sm text-gray-600">
            No tension finding met the evidence threshold.
          </div>
        )}
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <SectionHeading
          number={5}
          title="Domain-specific exceptions"
          description="An exception can be principled when it follows a general rule that would apply to analogous cases. A favored outcome by itself is not such a rule."
        />
        {analysis.domain_specific_exceptions.length > 0 ? (
          <div className="mt-4 space-y-4">
            {analysis.domain_specific_exceptions.map((exception, index) => {
              const badge = EXCEPTION_BADGES[exception.status]
              return (
                <article key={`${exception.title}-${index}`} className="rounded-lg border border-gray-200 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h3 className="font-bold text-gray-900">{exception.title}</h3>
                    <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${badge.className}`}>
                      {badge.label}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-gray-700">{exception.analysis}</p>
                  <dl className="mt-3 grid gap-3 md:grid-cols-2">
                    <div className="rounded-lg bg-gray-50 p-3">
                      <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">Generalizable rule</dt>
                      <dd className="mt-1 text-sm text-gray-700">{exception.generalizable_rule ?? 'No generalizable rule was established.'}</dd>
                    </div>
                    <div className="rounded-lg bg-violet-50 p-3">
                      <dt className="text-xs font-semibold uppercase tracking-wide text-violet-700">Analogous-case test</dt>
                      <dd className="mt-1 text-sm text-violet-950">{exception.analogous_case_test}</dd>
                    </div>
                  </dl>
                  <details className="mt-3 group">
                    <summary className="cursor-pointer list-none text-xs font-semibold text-blue-700">
                      Review evidence <span className="group-open:hidden" aria-hidden="true">&rsaquo;</span>
                    </summary>
                    <div className="mt-3">
                      <EvidenceReferences
                        sessionId={sessionId}
                        axisIds={exception.axis_ids}
                        questionIds={exception.question_ids}
                        evidence={evidence}
                      />
                    </div>
                  </details>
                </article>
              )
            })}
          </div>
        ) : (
          <p className="mt-3 text-sm text-gray-500">No domain-specific exception was identified with adequate support.</p>
        )}
      </section>

      <section className="space-y-4">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <SectionHeading
            number={6}
            title="Engagement, apathy, and knowledge gaps"
            description="Numeric neutrality, low intensity, and “Not sure” answers are treated differently. None of these classifications is a claim about intelligence or character."
          />
          <p className="mt-3 text-sm leading-relaxed text-gray-700">{analysis.engagement_and_knowledge.overall_analysis}</p>
        </div>
        {analysis.engagement_and_knowledge.topics.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {analysis.engagement_and_knowledge.topics.map((topic, index) => (
              <EngagementTopicCard
                key={`${topic.topic}-${index}`}
                topic={topic}
                sessionId={sessionId}
                evidence={evidence}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-gray-200 bg-white p-5 text-sm text-gray-500">
            No topic-specific engagement finding met the evidence threshold.
          </div>
        )}
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <SectionHeading number={7} title="Blind spots" />
        {analysis.blind_spots.length > 0 ? (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {analysis.blind_spots.map((blindSpot, index) => (
              <article key={`${blindSpot.title}-${index}`} className="rounded-lg border border-gray-200 p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-gray-900">{blindSpot.title}</h3>
                  <span className="shrink-0 text-xs font-semibold capitalize text-gray-500">{blindSpot.confidence}</span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-gray-700">{blindSpot.analysis}</p>
                <details className="mt-3 group">
                  <summary className="cursor-pointer list-none text-xs font-semibold text-blue-700">
                    Review evidence <span className="group-open:hidden" aria-hidden="true">&rsaquo;</span>
                  </summary>
                  <div className="mt-3">
                    <EvidenceReferences sessionId={sessionId} questionIds={blindSpot.question_ids} evidence={evidence} />
                  </div>
                </details>
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-gray-500">No specific blind spot met the evidence threshold.</p>
        )}
      </section>

      {allowRefinement && (
        <ClarificationForm
          key={record.id}
          questions={analysis.clarifying_questions}
          submitting={refining}
          canGenerate={canGenerate}
          remainingGenerations={remainingGenerations}
          contextMaxLength={contextMaxLength}
          onRefine={onRefine}
        />
      )}

      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <SectionHeading number={8} title="Reflection questions" />
        {analysis.reflection_questions.length > 0 ? (
          <ol className="mt-4 space-y-3">
            {analysis.reflection_questions.map((question, index) => (
              <li key={index} className="flex gap-3 text-sm leading-relaxed text-gray-700">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-800">
                  {index + 1}
                </span>
                <span>{question}</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-3 text-sm text-gray-500">No additional reflection questions were generated.</p>
        )}
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <SectionHeading number={9} title="Method and limitations" />
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-amber-950">
          This is an AI-assisted interpretation, not a clinical profile or definitive judgment of character.
          Polyaxis remains the authority for every score, coverage value, and collision classification. Labels
          such as hypocrisy, apathy, or irrationality are evidence-based hypotheses and can be mistaken.
        </div>
        {analysis.limitations.length > 0 && (
          <ul className="mt-4 space-y-2 text-sm leading-relaxed text-gray-700">
            {analysis.limitations.map((limitation, index) => (
              <li key={index} className="flex gap-2"><span aria-hidden="true">&bull;</span><span>{limitation}</span></li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <SectionHeading number={10} title="Provider provenance" />
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <div><dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">Provider</dt><dd className="mt-1 capitalize text-gray-800">{record.provider}</dd></div>
          <div><dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">Model</dt><dd className="mt-1 break-all text-gray-800">{record.model}</dd></div>
          <div><dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">Generated</dt><dd className="mt-1 text-gray-800">{formatGeneratedAt(record)}</dd></div>
          <div><dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">Stage</dt><dd className="mt-1 capitalize text-gray-800">{record.stage}</dd></div>
          <div><dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">Prompt / schema</dt><dd className="mt-1 text-gray-800">{record.prompt_version} / {record.schema_version}</dd></div>
          <div><dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">Question bank</dt><dd className="mt-1 text-gray-800">{record.bank_version ?? 'Historical / unspecified'}</dd></div>
        </dl>
      </section>
    </div>
  )
}
