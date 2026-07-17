'use client'

import { useMemo, useState, type FormEvent } from 'react'
import type { PersonalizedAnalysis } from '@/lib/ai-analysis/types'

type Clarification = PersonalizedAnalysis['clarifying_questions'][number]

const MAX_ANSWER_LENGTH = 1000

export function ClarificationForm({
  questions,
  submitting,
  canGenerate,
  remainingGenerations,
  contextMaxLength,
  onRefine
}: {
  questions: Clarification[]
  submitting: boolean
  canGenerate: boolean
  remainingGenerations: number
  contextMaxLength: number
  onRefine: (values: {
    generalContext: string
    clarificationAnswers: Array<{ clarification_id: string; answer: string }>
  }) => Promise<void> | void
}) {
  const visibleQuestions = questions.slice(0, 5)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [generalContext, setGeneralContext] = useState('')
  const [acknowledged, setAcknowledged] = useState(false)

  const answered = useMemo(
    () => visibleQuestions
      .map(question => ({
        clarification_id: question.clarification_id,
        answer: (answers[question.clarification_id] ?? '').trim()
      }))
      .filter(answer => answer.answer.length > 0),
    [answers, visibleQuestions]
  )
  const hasInput = answered.length > 0 || generalContext.trim().length > 0

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!hasInput || !acknowledged || submitting || !canGenerate) return
    void onRefine({
      generalContext: generalContext.trim(),
      clarificationAnswers: answered
    })
  }

  return (
    <form onSubmit={submit} className="rounded-xl border border-violet-200 bg-violet-50/40 p-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Clarify or add context</h2>
        <p className="mt-1 text-sm leading-relaxed text-gray-600">
          {visibleQuestions.length > 0 ? 'Answer any subset, or add other relevant context. ' : 'Add relevant context that the questionnaire could not capture. '}
          Your context can reconcile a finding, strengthen it, or reveal that an exception is selective;
          it is not treated as an automatic excuse.
        </p>
      </div>

      <div className="mt-5 space-y-5">
        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm leading-relaxed text-blue-950">
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={event => setAcknowledged(event.target.checked)}
            disabled={submitting || !canGenerate}
            className="mt-0.5 h-4 w-4 rounded border-blue-300 text-violet-700 focus:ring-violet-500"
          />
          <span>
            I understand that any optional context and clarification answers retained with this saved analysis,
            plus my additions below, will be sent again to the configured AI provider. Retained text is not displayed here.
          </span>
        </label>

        {visibleQuestions.map((question, index) => {
          const value = answers[question.clarification_id] ?? ''
          const inputId = `clarification-${question.clarification_id}`
          return (
            <div key={question.clarification_id} className="rounded-lg border border-violet-100 bg-white p-4">
              <label htmlFor={inputId} className="block text-sm font-semibold leading-relaxed text-gray-900">
                {index + 1}. {question.question}
              </label>
              <p className="mt-1 text-xs leading-relaxed text-gray-500">
                <span className="font-semibold text-gray-600">Why it matters:</span> {question.why_it_matters}
              </p>
              <textarea
                id={inputId}
                value={value}
                onChange={event => setAnswers(current => ({
                  ...current,
                  [question.clarification_id]: event.target.value
                }))}
                maxLength={MAX_ANSWER_LENGTH}
                rows={3}
                disabled={submitting || !canGenerate}
                placeholder="Optional response"
                className="mt-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100 disabled:bg-gray-100"
              />
              <p className="mt-1 text-right text-xs tabular-nums text-gray-500" aria-live="polite">
                {value.length}/{MAX_ANSWER_LENGTH}
              </p>
            </div>
          )
        })}

        <div>
          <label htmlFor="refinement-general-context" className="block text-sm font-semibold text-gray-800">
            Other relevant context <span className="font-normal text-gray-500">(optional)</span>
          </label>
          <textarea
            id="refinement-general-context"
            value={generalContext}
            onChange={event => setGeneralContext(event.target.value)}
            maxLength={contextMaxLength}
            rows={3}
            disabled={submitting || !canGenerate}
            placeholder="Add a factual assumption or general rule that the questionnaire could not capture."
            className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100 disabled:bg-gray-100"
          />
          <div className="mt-1 flex items-start justify-between gap-3 text-xs text-gray-500">
            <span>Avoid names and identifying details. This context may be reflected indirectly in the report.</span>
            <span className="shrink-0 tabular-nums" aria-live="polite">{generalContext.length}/{contextMaxLength}</span>
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={!hasInput || !acknowledged || submitting || !canGenerate}
          className="rounded-lg bg-violet-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-800 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          {submitting ? 'Refining analysis\u2026' : 'Refine the analysis with this context'}
        </button>
        <span className="text-xs text-gray-500">
          {canGenerate
            ? `${remainingGenerations} generation${remainingGenerations === 1 ? '' : 's'} remaining`
            : 'The generation limit has been reached.'}
        </span>
      </div>
    </form>
  )
}
