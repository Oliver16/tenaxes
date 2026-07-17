'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { DEEPER_ANALYSIS_LABEL } from './ai/copy'

const TABS = [
  { slug: '', label: 'Overview' },
  { slug: 'axes', label: 'Axes' },
  { slug: 'conflicts', label: 'Value conflicts' },
  { slug: 'consistency', label: 'Ideals vs. practice' },
  { slug: 'types', label: 'Political types' }
] as const

const AI_TAB = { slug: 'analysis', label: DEEPER_ANALYSIS_LABEL } as const

export function ResultsSubnav({
  sessionId,
  showAIAnalysis = false
}: {
  sessionId: string
  showAIAnalysis?: boolean
}) {
  const pathname = usePathname()
  const base = `/results/${sessionId}`
  const tabs = showAIAnalysis ? [...TABS, AI_TAB] : TABS

  const isActive = (slug: string) => {
    if (slug === '') return pathname === base
    return pathname === `${base}/${slug}` || pathname.startsWith(`${base}/${slug}/`)
  }

  return (
    <nav aria-label="Result sections" className="-mx-4 px-4 overflow-x-auto">
      <ul className="flex gap-1 border-b border-gray-200 min-w-max">
        {tabs.map(tab => {
          const active = isActive(tab.slug)
          return (
            <li key={tab.slug}>
              <Link
                href={tab.slug ? `${base}/${tab.slug}` : base}
                aria-current={active ? 'page' : undefined}
                className={`inline-block px-3 py-2 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors ${
                  active
                    ? 'border-blue-600 text-blue-700'
                    : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
