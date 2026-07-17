'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import {
  createQuestion,
  deleteQuestion,
  fetchAllQuestions,
  getAllAxes,
  publishQuestionBankVersion,
  reorderQuestions,
  toggleQuestionActive,
  updateQuestion,
  type Question,
  type QuestionBankVersion,
  type QuestionInput
} from '@/lib/questions'
import { QuestionEditor } from '@/components/admin/QuestionEditor'
import { QuestionList } from '@/components/admin/QuestionList'
import { QuestionBankVersionDialog } from '@/components/admin/QuestionBankVersionDialog'

type TypeFilter = 'all' | 'conceptual' | 'applied'
type StatusFilter = 'all' | 'active' | 'inactive'

export default function QuestionsAdminPage() {
  const { user, isAdmin, loading: authLoading } = useAuth()
  const router = useRouter()
  const axes = useMemo(() => getAllAxes(), [])
  const axisNames = useMemo(() => Object.fromEntries(axes.map(axis => [axis.id, axis.name])), [axes])

  const [questions, setQuestions] = useState<Question[]>([])
  const [versions, setVersions] = useState<QuestionBankVersion[]>([])
  const [bankVersion, setBankVersion] = useState('')
  const [selectedAxis, setSelectedAxis] = useState('all')
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [isCreatingVersion, setIsCreatingVersion] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) router.replace('/')
  }, [user, isAdmin, authLoading, router])

  const loadQuestions = useCallback(async (requestedVersion?: string) => {
    if (!user || !isAdmin) return
    setLoading(true)
    setError(null)
    try {
      const bank = await fetchAllQuestions(requestedVersion)
      setQuestions(bank.questions)
      setVersions(bank.versions)
      setBankVersion(bank.bankVersion)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Failed to load question bank')
    } finally {
      setLoading(false)
    }
  }, [user, isAdmin])

  useEffect(() => {
    if (user && isAdmin) void loadQuestions()
  }, [user, isAdmin, loadQuestions])

  const flash = (text: string) => {
    setMessage(text)
    window.setTimeout(() => setMessage(null), 3500)
  }

  const filteredQuestions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return questions.filter(question => {
      if (selectedAxis !== 'all' && question.axis_id !== selectedAxis) return false
      if (typeFilter !== 'all' && question.question_type !== typeFilter) return false
      if (statusFilter === 'active' && !question.active) return false
      if (statusFilter === 'inactive' && question.active) return false
      if (!normalizedQuery) return true
      return String(question.id) === normalizedQuery
        || question.text.toLowerCase().includes(normalizedQuery)
        || (question.educational_content || '').toLowerCase().includes(normalizedQuery)
    })
  }, [questions, query, selectedAxis, statusFilter, typeFilter])

  const selectedAxisInfo = axes.find(axis => axis.id === selectedAxis)
  const selectedVersion = versions.find(version => version.id === bankVersion)
  const isDraftBank = selectedVersion?.status === 'draft'
  const axisQuestions = selectedAxis === 'all' ? [] : questions.filter(question => question.axis_id === selectedAxis)
  const activeAxisQuestions = axisQuestions.filter(question => question.active)
  const canReorder = isDraftBank && selectedAxis !== 'all' && !query && typeFilter === 'all' && statusFilter === 'active'
  const activeCount = questions.filter(question => question.active).length
  const inactiveCount = questions.length - activeCount
  const conceptualCount = questions.filter(question => question.question_type === 'conceptual').length
  const appliedCount = questions.length - conceptualCount

  const closeEditor = () => {
    setEditingQuestion(null)
    setIsAdding(false)
  }

  const handleSave = async (input: QuestionInput) => {
    if (editingQuestion) {
      const updated = await updateQuestion(editingQuestion.id, input)
      if (!updated) throw new Error('The question could not be updated')
      flash(`Question #${editingQuestion.id} updated`)
    } else {
      const created = await createQuestion({ ...input, bank_version: bankVersion })
      if (!created) throw new Error('The question could not be created')
      flash(`Question #${created.id} added`)
      setSelectedAxis(created.axis_id)
    }
    closeEditor()
    await loadQuestions(bankVersion)
  }

  const handleDelete = async (id: number) => {
    if (await deleteQuestion(id)) {
      flash(`Question #${id} deleted`)
      await loadQuestions(bankVersion)
    } else setError(`Question #${id} could not be deleted`)
  }

  const handleToggleActive = async (id: number, active: boolean) => {
    if (await toggleQuestionActive(id, active)) {
      flash(`Question #${id} ${active ? 'activated' : 'deactivated'}`)
      await loadQuestions(bankVersion)
    } else setError(`Question #${id} could not be updated`)
  }

  const handlePublish = async () => {
    if (!selectedVersion || selectedVersion.status === 'published') return
    if (!window.confirm(`Publish ${selectedVersion.id} as the live survey bank? The current live bank will be archived, while its existing results remain pinned to it.`)) return
    setPublishing(true)
    setError(null)
    try {
      await publishQuestionBankVersion(selectedVersion.id)
      await loadQuestions(selectedVersion.id)
      flash(`${selectedVersion.id} is now the live survey bank`)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Failed to publish question bank')
    } finally {
      setPublishing(false)
    }
  }

  const moveQuestion = async (id: number, direction: -1 | 1) => {
    if (selectedAxis === 'all') return
    const index = activeAxisQuestions.findIndex(question => question.id === id)
    const target = index + direction
    if (index < 0 || target < 0 || target >= activeAxisQuestions.length) return
    const reordered = activeAxisQuestions.map(question => question.id)
    ;[reordered[index], reordered[target]] = [reordered[target], reordered[index]]
    if (await reorderQuestions(selectedAxis, reordered)) await loadQuestions(bankVersion)
    else setError('Question order could not be saved')
  }

  if (authLoading || !user || !isAdmin) return null

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8">
      <div className="mx-auto max-w-[1500px]">
        <header className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-gray-900">Question bank</h1>
              {bankVersion && <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-700">{bankVersion}</span>}
            </div>
            <p className="mt-1 text-gray-500">Search, review, and edit the complete versioned survey instrument.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/admin" className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-white">← Analytics</Link>
            {selectedVersion && selectedVersion.status !== 'published' && (
              <button type="button" onClick={() => void handlePublish()} disabled={publishing || loading || activeCount === 0} className="rounded-lg border border-emerald-300 bg-white px-4 py-2.5 text-sm font-semibold text-emerald-700 shadow-sm hover:bg-emerald-50 disabled:opacity-50">
                {publishing ? 'Publishing…' : 'Publish version'}
              </button>
            )}
            <button type="button" onClick={() => setIsCreatingVersion(true)} disabled={!bankVersion || loading} className="rounded-lg border border-violet-300 bg-white px-4 py-2.5 text-sm font-semibold text-violet-700 shadow-sm hover:bg-violet-50 disabled:opacity-50">New bank version</button>
            <button type="button" onClick={() => setIsAdding(true)} disabled={!isDraftBank} title={isDraftBank ? 'Add a question' : 'Create or select a draft revision to edit'} className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40">+ Add question</button>
          </div>
        </header>

        {(message || error) && (
          <div className={`mb-5 flex items-center justify-between rounded-xl border px-4 py-3 text-sm ${error ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
            <span>{error || message}</span>
            <button type="button" onClick={() => { setError(null); setMessage(null) }} aria-label="Dismiss message" className="text-lg">×</button>
          </div>
        )}

        {selectedVersion && !isDraftBank && (
          <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <strong>{selectedVersion.id} is {selectedVersion.status === 'published' ? 'the live bank' : 'archived'} and is read-only.</strong> Create a new bank version from it to make a tracked revision.
          </div>
        )}

        <section className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <Stat label="Loaded" value={questions.length} detail={selectedVersion ? `Expected ${selectedVersion.question_count}` : 'Current bank'} warning={!!selectedVersion && questions.length !== selectedVersion.question_count} />
          <Stat label="Active" value={activeCount} detail={`${inactiveCount} inactive`} />
          <Stat label="Conceptual" value={conceptualCount} detail={`${appliedCount} applied`} />
          <Stat label="Axes" value={axes.length} detail="11 core · 7 facets" />
          <label className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <span className="block text-xs font-semibold uppercase tracking-wide text-gray-400">Bank version</span>
            <select
              value={bankVersion}
              onChange={event => void loadQuestions(event.target.value)}
              disabled={loading}
              className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-800"
            >
              {versions.map(version => <option key={version.id} value={version.id}>{version.id} · {version.status === 'published' ? 'Live' : version.status === 'draft' ? 'Draft' : 'Archived'} · {version.question_count} questions</option>)}
            </select>
            {selectedVersion && <span className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${selectedVersion.status === 'published' ? 'bg-emerald-100 text-emerald-700' : selectedVersion.status === 'draft' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>{selectedVersion.status === 'published' ? 'Live survey' : selectedVersion.status}</span>}
          </label>
        </section>

        <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="self-start rounded-xl border border-gray-200 bg-white p-3 shadow-sm lg:sticky lg:top-4">
            <button type="button" onClick={() => setSelectedAxis('all')} className={`mb-2 flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm font-semibold ${selectedAxis === 'all' ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-100'}`}>
              <span>All questions</span><span>{questions.length}</span>
            </button>
            <div className="max-h-[70vh] space-y-1 overflow-y-auto pr-1">
              {axes.map(axis => {
                const items = questions.filter(question => question.axis_id === axis.id)
                const active = items.filter(question => question.active).length
                return (
                  <button key={axis.id} type="button" onClick={() => setSelectedAxis(axis.id)} className={`w-full rounded-lg px-3 py-2 text-left ${selectedAxis === axis.id ? 'bg-blue-50 ring-1 ring-blue-200' : 'hover:bg-gray-50'}`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium text-gray-800"><span className="mr-1 font-mono text-xs text-gray-400">{axis.id}</span>{axis.name}</span>
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">{active}/{items.length}</span>
                    </div>
                  </button>
                )
              })}
            </div>
          </aside>

          <section className="min-w-0 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="mb-5 space-y-4 border-b border-gray-200 pb-5">
              <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{selectedAxisInfo ? `${selectedAxisInfo.id} · ${selectedAxisInfo.name}` : 'All questions'}</h2>
                  <p className="mt-1 text-sm text-gray-500">{filteredQuestions.length} matching {filteredQuestions.length === 1 ? 'question' : 'questions'}{canReorder ? ' · arrows change order within this axis' : ''}</p>
                </div>
                {selectedAxisInfo && (
                  <div className="text-sm text-gray-500">
                    <span className="font-medium text-red-600">{selectedAxisInfo.pole_negative}</span>
                    <span className="mx-2">↔</span>
                    <span className="font-medium text-green-600">{selectedAxisInfo.pole_positive}</span>
                  </div>
                )}
              </div>

              <div className="grid gap-3 xl:grid-cols-[minmax(260px,1fr)_180px_150px]">
                <label className="relative block">
                  <span className="sr-only">Search questions</span>
                  <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search text, context, or exact question ID…" className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200" />
                  <span className="pointer-events-none absolute left-3 top-2.5 text-gray-400">⌕</span>
                </label>
                <select value={typeFilter} onChange={event => setTypeFilter(event.target.value as TypeFilter)} className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-700">
                  <option value="all">All question types</option><option value="conceptual">Conceptual</option><option value="applied">Applied</option>
                </select>
                <select value={statusFilter} onChange={event => setStatusFilter(event.target.value as StatusFilter)} className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-700">
                  <option value="all">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            {loading ? (
              <div className="py-20 text-center text-gray-500"><div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />Loading complete bank…</div>
            ) : (
              <QuestionList
                questions={filteredQuestions}
                axisNames={axisNames}
                canReorder={canReorder}
                readOnly={!isDraftBank}
                onEdit={question => setEditingQuestion(question)}
                onDelete={id => void handleDelete(id)}
                onToggleActive={(id, active) => void handleToggleActive(id, active)}
                onMoveUp={id => void moveQuestion(id, -1)}
                onMoveDown={id => void moveQuestion(id, 1)}
              />
            )}

            {selectedAxisInfo && axisQuestions.length > 0 && (
              <div className="mt-6 flex flex-wrap gap-4 rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-600">
                <span><strong>{activeAxisQuestions.filter(question => question.key === -1).length}</strong> toward {selectedAxisInfo.pole_negative}</span>
                <span><strong>{activeAxisQuestions.filter(question => question.key === 1).length}</strong> toward {selectedAxisInfo.pole_positive}</span>
                <span><strong>{axisQuestions.filter(question => !question.active).length}</strong> inactive</span>
              </div>
            )}
          </section>
        </div>
      </div>

      {(editingQuestion || isAdding) && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-950/60 p-4 backdrop-blur-sm sm:p-8">
          <div className="mx-auto max-w-5xl rounded-2xl bg-white p-5 shadow-2xl sm:p-7">
            <QuestionEditor
              key={editingQuestion?.id ?? `new-${selectedAxis}`}
              question={editingQuestion}
              initialAxisId={selectedAxis === 'all' ? axes[0].id : selectedAxis}
              axes={axes}
              onSave={handleSave}
              onCancel={closeEditor}
            />
          </div>
        </div>
      )}

      {isCreatingVersion && bankVersion && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-950/60 p-4 backdrop-blur-sm sm:p-8">
          <div className="mx-auto max-w-2xl rounded-2xl bg-white p-5 shadow-2xl sm:p-7">
            <QuestionBankVersionDialog
              sourceVersion={bankVersion}
              sourceQuestionCount={questions.length}
              onCancel={() => setIsCreatingVersion(false)}
              onCreated={async (version, questionCount) => {
                setIsCreatingVersion(false)
                await loadQuestions(version)
                flash(`${version} created with ${questionCount} cloned questions`)
              }}
            />
          </div>
        </div>
      )}
    </main>
  )
}

function Stat({ label, value, detail, warning = false }: { label: string; value: number; detail: string; warning?: boolean }) {
  return (
    <div className={`rounded-xl border bg-white p-4 shadow-sm ${warning ? 'border-amber-300' : 'border-gray-200'}`}>
      <span className="block text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</span>
      <span className="mt-1 block text-2xl font-bold text-gray-900">{value}</span>
      <span className={`mt-1 block text-xs ${warning ? 'font-semibold text-amber-700' : 'text-gray-500'}`}>{detail}</span>
    </div>
  )
}
