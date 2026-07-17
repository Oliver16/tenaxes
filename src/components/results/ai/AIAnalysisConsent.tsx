'use client'

import { useState, type FormEvent } from 'react'
import { DEEPER_ANALYSIS_LABEL } from './copy'

export function AIAnalysisConsent({
  onGenerate,
  submitting,
  canGenerate,
  remainingGenerations,
  contextMaxLength,
  purpose = 'initial'
}: {
  onGenerate: (generalContext: string) => Promise<void> | void
  submitting: boolean
  canGenerate: boolean
  remainingGenerations: number
  contextMaxLength: number
  purpose?: 'initial' | 'refresh'
}) {
  const [consented, setConsented] = useState(false)
  const [context, setContext] = useState('')

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!consented || submitting || !canGenerate) return
    void onGenerate(context.trim())
  }

  return (
    <section className="overflow-hidden rounded-xl border border-violet-200 bg-white shadow-sm">
      <div className="border-b border-violet-100 bg-gradient-to-br from-violet-50 to-blue-50 p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">Optional analysis</p>
        <h2 className="mt-1 text-2xl font-bold text-gray-900">
          {purpose === 'refresh' ? 'Generate a current analysis' : DEEPER_ANALYSIS_LABEL}
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-gray-700">
          {purpose === 'refresh'
            ? 'The saved report remains available, but its method or verified input is out of date. Review the disclosure and explicitly consent before generating a current version.'
            : 'Generate a candid AI-assisted interpretation of your verified Polyaxis results. The model may identify possible hypocrisy, irrational tensions, apparent apathy, or knowledge gaps when the response pattern supports those conclusions.'}
        </p>
      </div>

      <form onSubmit={submit} className="space-y-5 p-6">
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm leading-relaxed text-blue-950">
          <p className="font-semibold">Provider and scoring disclosure</p>
          <p className="mt-1">
            Your anonymous result data and any optional context you provide will be sent to the configured
            AI provider. The provider does not calculate or change your Polyaxis scores. AI interpretations
            can be wrong.
          </p>
        </div>

        {purpose === 'refresh' && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-amber-950">
            <p className="font-semibold">Enter context again if it still applies</p>
            <p className="mt-1">
              Context supplied to an earlier analysis is not displayed here or automatically reused. Add only the context you want sent with this new request.
            </p>
          </div>
        )}

        <div>
          <label htmlFor="ai-general-context" className="block text-sm font-semibold text-gray-800">
            Context that may explain apparent exceptions <span className="font-normal text-gray-500">(optional)</span>
          </label>
          <textarea
            id="ai-general-context"
            value={context}
            onChange={event => setContext(event.target.value)}
            maxLength={contextMaxLength}
            rows={5}
            disabled={submitting || !canGenerate}
            placeholder="Example: I generally support private markets but view electric utilities as natural monopolies because of my professional experience in infrastructure."
            className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-100 disabled:bg-gray-100"
          />
          <div className="mt-1 flex items-start justify-between gap-4 text-xs text-gray-500">
            <p className="max-w-2xl">
              Do not include information you would not want reflected indirectly in the generated report.
              Identifying details will not be intentionally repeated.
            </p>
            <span aria-live="polite" className="shrink-0 tabular-nums">
              {context.length}/{contextMaxLength}
            </span>
          </div>
        </div>

        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 p-4 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={consented}
            onChange={event => setConsented(event.target.checked)}
            disabled={submitting || !canGenerate}
            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-violet-700 focus:ring-violet-500"
          />
          <span>I understand this is an AI interpretation and may contain blunt or mistaken judgments.</span>
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={!consented || submitting || !canGenerate}
            className="inline-flex items-center justify-center rounded-lg bg-violet-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-800 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            {submitting
              ? 'Generating candid analysis\u2026'
              : purpose === 'refresh' ? 'Generate current analysis' : 'Generate candid analysis'}
          </button>
          <span className="text-xs text-gray-500">
            {canGenerate
              ? `${remainingGenerations} generation${remainingGenerations === 1 ? '' : 's'} remaining in this 24-hour window`
              : 'The generation limit has been reached for this result.'}
          </span>
        </div>
      </form>
    </section>
  )
}
