import { EvidenceReferences } from './EvidenceReferences'
import type { AIQuestionDisplayEvidence, EngagementClassification, PersonalizedAnalysis } from '@/lib/ai-analysis/types'

type TopicFinding = PersonalizedAnalysis['engagement_and_knowledge']['topics'][number]

const BADGES: Record<EngagementClassification, { label: string; className: string }> = {
  strongly_engaged: { label: 'Strongly engaged', className: 'border-green-300 bg-green-50 text-green-900' },
  selectively_engaged: { label: 'Selectively engaged', className: 'border-blue-300 bg-blue-50 text-blue-900' },
  genuinely_moderate: { label: 'Genuinely moderate', className: 'border-teal-300 bg-teal-50 text-teal-900' },
  counterbalanced_convictions: { label: 'Counterbalanced convictions', className: 'border-violet-300 bg-violet-50 text-violet-900' },
  context_dependent: { label: 'Context-dependent', className: 'border-blue-300 bg-blue-50 text-blue-900' },
  apparent_low_salience: { label: 'Apparent low salience', className: 'border-gray-300 bg-gray-100 text-gray-800' },
  possible_knowledge_gap: { label: 'Possible knowledge gap', className: 'border-sky-300 bg-sky-50 text-sky-900' },
  possible_avoidance_or_ambivalence: { label: 'Possible avoidance or ambivalence', className: 'border-amber-300 bg-amber-50 text-amber-950' },
  insufficient_evidence: { label: 'Insufficient evidence', className: 'border-gray-300 bg-gray-100 text-gray-700' }
}

export function EngagementTopicCard({
  topic,
  sessionId,
  evidence
}: {
  topic: TopicFinding
  sessionId: string
  evidence: AIQuestionDisplayEvidence[]
}) {
  const badge = BADGES[topic.classification]

  return (
    <article className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="font-bold text-gray-900">{topic.topic}</h3>
        <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${badge.className}`}>
          {badge.label}
        </span>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-gray-700">{topic.analysis}</p>
      <p className="mt-2 text-xs font-semibold capitalize text-gray-500">{topic.confidence} confidence</p>

      {topic.alternative_explanations.length > 0 && (
        <div className="mt-3 rounded-lg bg-gray-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Other plausible readings</p>
          <ul className="mt-1.5 space-y-1 text-sm text-gray-700">
            {topic.alternative_explanations.map((explanation, index) => (
              <li key={index} className="flex gap-2"><span aria-hidden="true">&bull;</span><span>{explanation}</span></li>
            ))}
          </ul>
        </div>
      )}

      <details className="mt-3 group">
        <summary className="cursor-pointer list-none text-xs font-semibold text-blue-700 hover:text-blue-900">
          Review topic evidence <span className="group-open:hidden" aria-hidden="true">&rsaquo;</span>
          <span className="hidden group-open:inline" aria-hidden="true">&#8963;</span>
        </summary>
        <div className="mt-3">
          <EvidenceReferences
            sessionId={sessionId}
            questionIds={topic.question_ids}
            evidence={evidence}
          />
        </div>
      </details>
    </article>
  )
}
