import { EvidenceReferences } from './EvidenceReferences'
import type { AIQuestionDisplayEvidence, PersonalizedAnalysis, TensionClassification } from '@/lib/ai-analysis/types'

type TensionFinding = PersonalizedAnalysis['tensions'][number]

const BADGES: Record<TensionClassification, { label: string; className: string }> = {
  principled_domain_exception: {
    label: 'Principled domain exception',
    className: 'border-blue-300 bg-blue-50 text-blue-900'
  },
  coherent_tradeoff: {
    label: 'Coherent tradeoff',
    className: 'border-green-300 bg-green-50 text-green-900'
  },
  context_dependent_preference: {
    label: 'Context-dependent preference',
    className: 'border-blue-300 bg-blue-50 text-blue-900'
  },
  unresolved_inconsistency: {
    label: 'Unresolved inconsistency',
    className: 'border-amber-300 bg-amber-50 text-amber-950'
  },
  selective_application: {
    label: 'Selective application',
    className: 'border-orange-300 bg-orange-50 text-orange-950'
  },
  possible_hypocrisy: {
    label: 'Possible hypocrisy',
    className: 'border-orange-400 bg-orange-50 text-red-950'
  },
  likely_hypocrisy: {
    label: 'Likely hypocrisy',
    className: 'border-red-400 bg-red-50 text-red-950'
  },
  irrational_tension: {
    label: 'Irrational tension',
    className: 'border-purple-400 bg-purple-50 text-purple-950'
  },
  insufficient_evidence: {
    label: 'Insufficient evidence',
    className: 'border-gray-300 bg-gray-100 text-gray-700'
  }
}

export function TensionFindingCard({
  finding,
  sessionId,
  evidence
}: {
  finding: TensionFinding
  sessionId: string
  evidence: AIQuestionDisplayEvidence[]
}) {
  const badge = BADGES[finding.classification]

  return (
    <article className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${badge.className}`}>
            {badge.label}
          </span>
          <h3 className="mt-2 text-lg font-bold text-gray-900">{finding.title}</h3>
        </div>
        <div className="text-right text-xs text-gray-500">
          <p className="font-semibold capitalize text-gray-700">{finding.confidence} confidence</p>
          <p>Significance {finding.severity}/5</p>
        </div>
      </div>

      <p className="mt-3 text-sm font-medium leading-relaxed text-gray-800">{finding.verdict}</p>

      <dl className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
          <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">Principle or commitment</dt>
          <dd className="mt-1 text-sm leading-relaxed text-gray-800">{finding.principle_or_commitment}</dd>
        </div>
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
          <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">Conflicting pattern</dt>
          <dd className="mt-1 text-sm leading-relaxed text-gray-800">{finding.conflicting_pattern}</dd>
        </div>
      </dl>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <h4 className="text-sm font-semibold text-green-900">How it could still be coherent</h4>
          {finding.why_it_may_be_coherent.length > 0 ? (
            <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-gray-700">
              {finding.why_it_may_be_coherent.map((reason, index) => (
                <li key={index} className="flex gap-2"><span aria-hidden="true">&bull;</span><span>{reason}</span></li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-gray-500">No strong reconciling distinction was identified.</p>
          )}
        </div>
        <div>
          <h4 className="text-sm font-semibold text-red-900">Why it may be incoherent</h4>
          {finding.why_it_may_be_incoherent.length > 0 ? (
            <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-gray-700">
              {finding.why_it_may_be_incoherent.map((reason, index) => (
                <li key={index} className="flex gap-2"><span aria-hidden="true">&bull;</span><span>{reason}</span></li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-gray-500">The available evidence does not establish incoherence.</p>
          )}
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-violet-200 bg-violet-50 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">Generalization test</p>
        <p className="mt-1 text-sm leading-relaxed text-violet-950">{finding.generalization_test}</p>
      </div>

      <details className="mt-4 group">
        <summary className="cursor-pointer list-none text-sm font-semibold text-blue-700 hover:text-blue-900">
          Review cited evidence <span className="group-open:hidden" aria-hidden="true">&rsaquo;</span>
          <span className="hidden group-open:inline" aria-hidden="true">&#8963;</span>
        </summary>
        <div className="mt-3">
          <EvidenceReferences
            sessionId={sessionId}
            axisIds={finding.axis_ids}
            questionIds={finding.question_ids}
            pairIds={finding.pair_ids}
            evidence={evidence}
          />
        </div>
      </details>
    </article>
  )
}
