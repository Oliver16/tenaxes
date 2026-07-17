import Link from 'next/link'
import type { AIQuestionDisplayEvidence } from '@/lib/ai-analysis/types'

const ANSWER_LABELS: Record<AIQuestionDisplayEvidence['response_label'], string> = {
  strongly_disagree: 'Strongly disagree',
  disagree: 'Disagree',
  neutral_balanced: 'Neither / balanced',
  agree: 'Agree',
  strongly_agree: 'Strongly agree',
  not_sure: 'Not sure / need more information'
}

const CONTRIBUTION_LABELS: Record<AIQuestionDisplayEvidence['contribution_direction'], string> = {
  negative_pole: 'Toward the negative pole',
  positive_pole: 'Toward the positive pole',
  neutral: 'Neutral contribution',
  unscored: 'Not scored'
}

function unique<T>(values: T[]) {
  return Array.from(new Set(values))
}

function QuestionEvidence({
  item,
  sessionId
}: {
  item: AIQuestionDisplayEvidence
  sessionId: string
}) {
  return (
    <details className="group rounded-lg border border-gray-200 bg-white">
      <summary className="cursor-pointer list-none px-3 py-2 text-xs font-semibold text-blue-700 hover:text-blue-900">
        Question {item.display_order}
        <span className="ml-1 font-normal text-gray-500">(ID {item.question_id})</span>
        <span className="ml-1 group-open:hidden" aria-hidden="true">&rsaquo;</span>
        <span className="ml-1 hidden group-open:inline" aria-hidden="true">&#8963;</span>
      </summary>
      <div className="space-y-2 border-t border-gray-100 px-3 py-3 text-sm">
        <p className="leading-relaxed text-gray-800">{item.text}</p>
        <dl className="grid gap-x-4 gap-y-1 text-xs text-gray-600 sm:grid-cols-2">
          <div>
            <dt className="inline font-semibold text-gray-700">Your answer: </dt>
            <dd className="inline">{ANSWER_LABELS[item.response_label]}</dd>
          </div>
          <div>
            <dt className="inline font-semibold text-gray-700">Primary axis: </dt>
            <dd className="inline">
              <Link
                href={`/results/${sessionId}/axes/${encodeURIComponent(item.primary_axis_id)}`}
                className="font-medium text-blue-700 hover:text-blue-900 hover:underline"
              >
                {item.primary_axis_name}
              </Link>
            </dd>
          </div>
          <div>
            <dt className="inline font-semibold text-gray-700">Contribution: </dt>
            <dd className="inline">{CONTRIBUTION_LABELS[item.contribution_direction]}</dd>
          </div>
          <div>
            <dt className="inline font-semibold text-gray-700">Policy domain: </dt>
            <dd className="inline">{item.policy_domain ?? 'Not categorized in this bank version'}</dd>
          </div>
        </dl>
      </div>
    </details>
  )
}

export function EvidenceReferences({
  sessionId,
  axisIds = [],
  questionIds = [],
  pairIds = [],
  evidence
}: {
  sessionId: string
  axisIds?: string[]
  questionIds?: number[]
  pairIds?: string[]
  evidence: AIQuestionDisplayEvidence[]
}) {
  const evidenceById = new Map(evidence.map(item => [item.question_id, item]))
  const axes = unique(axisIds)
  const questions = unique(questionIds)
  const pairs = unique(pairIds)

  if (axes.length === 0 && questions.length === 0 && pairs.length === 0) {
    return <p className="text-xs text-gray-500">No individual evidence references were supplied for this observation.</p>
  }

  return (
    <div className="space-y-3">
      {(axes.length > 0 || pairs.length > 0) && (
        <div className="flex flex-wrap gap-2 text-xs">
          {axes.map(axisId => {
            const name = evidence.find(item => item.primary_axis_id === axisId)?.primary_axis_name ?? axisId
            return (
              <Link
                key={axisId}
                href={`/results/${sessionId}/axes/${encodeURIComponent(axisId)}`}
                className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 font-medium text-blue-800 hover:border-blue-400"
              >
                Axis: {name}
              </Link>
            )
          })}
          {pairs.map(pairId => (
            <Link
              key={pairId}
              href={`/results/${sessionId}/conflicts#pair-${encodeURIComponent(pairId)}`}
              className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 font-medium text-amber-900 hover:border-amber-400"
            >
              Collision pair: {pairId}
            </Link>
          ))}
        </div>
      )}

      {questions.length > 0 && (
        <div className="grid gap-2">
          {questions.map(questionId => {
            const item = evidenceById.get(questionId)
            return item ? (
              <QuestionEvidence key={questionId} item={item} sessionId={sessionId} />
            ) : (
              <div key={questionId} className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600">
                Question ID {questionId}: details are unavailable for this historical bank version.
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
