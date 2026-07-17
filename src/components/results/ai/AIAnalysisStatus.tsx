import type { ReactNode } from 'react'

export type AIAnalysisStatusKind =
  | 'loading'
  | 'generating'
  | 'disabled'
  | 'unavailable'
  | 'error'
  | 'stale'
  | 'limit'
  | 'cached'

const STYLES: Record<AIAnalysisStatusKind, string> = {
  loading: 'border-blue-200 bg-blue-50 text-blue-950',
  generating: 'border-violet-200 bg-violet-50 text-violet-950',
  disabled: 'border-gray-200 bg-gray-50 text-gray-800',
  unavailable: 'border-gray-200 bg-gray-50 text-gray-800',
  error: 'border-red-200 bg-red-50 text-red-950',
  stale: 'border-amber-200 bg-amber-50 text-amber-950',
  limit: 'border-amber-200 bg-amber-50 text-amber-950',
  cached: 'border-emerald-200 bg-emerald-50 text-emerald-950'
}

export function AIAnalysisStatus({
  kind,
  title,
  children,
  action,
  compact = false
}: {
  kind: AIAnalysisStatusKind
  title: string
  children?: ReactNode
  action?: ReactNode
  compact?: boolean
}) {
  const busy = kind === 'loading' || kind === 'generating'

  return (
    <section
      className={`rounded-xl border ${STYLES[kind]} ${compact ? 'px-4 py-3' : 'p-6'}`}
      role={kind === 'error' ? 'alert' : 'status'}
      aria-live="polite"
      aria-busy={busy}
    >
      <div className="flex items-start gap-3">
        {busy && (
          <span
            className="mt-0.5 h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-current border-r-transparent"
            aria-hidden="true"
          />
        )}
        <div className="min-w-0 flex-1">
          <h2 className={`${compact ? 'text-sm' : 'text-base'} font-semibold`}>{title}</h2>
          {children && <div className="mt-1 text-sm leading-relaxed opacity-80">{children}</div>}
          {action && <div className="mt-3">{action}</div>}
        </div>
      </div>
    </section>
  )
}
