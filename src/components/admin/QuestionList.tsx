'use client'

import { useEffect, useMemo, useState } from 'react'
import type { Question } from '@/lib/questions'

type Props = {
  questions: Question[]
  axisNames: Record<string, string>
  canReorder: boolean
  onEdit: (question: Question) => void
  onDelete: (id: number) => void
  onToggleActive: (id: number, active: boolean) => void
  onMoveUp: (id: number) => void
  onMoveDown: (id: number) => void
}

const PAGE_SIZE = 40

export function QuestionList({
  questions,
  axisNames,
  canReorder,
  onEdit,
  onDelete,
  onToggleActive,
  onMoveUp,
  onMoveDown
}: Props) {
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)
  const [page, setPage] = useState(1)
  const pageCount = Math.max(1, Math.ceil(questions.length / PAGE_SIZE))

  useEffect(() => setPage(1), [questions])

  const visibleQuestions = useMemo(
    () => questions.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [page, questions]
  )

  if (questions.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-6 py-12 text-center">
        <p className="font-medium text-gray-700">No questions match these filters.</p>
        <p className="mt-1 text-sm text-gray-500">Clear a filter or add a new question.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>
          Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, questions.length)} of {questions.length}
        </span>
        {pageCount > 1 && <span>Page {page} of {pageCount}</span>}
      </div>

      {visibleQuestions.map(question => {
        const position = questions.findIndex(item => item.id === question.id)
        const deleting = confirmDelete === question.id

        return (
          <article
            key={question.id}
            className={`rounded-xl border p-4 transition ${
              question.active ? 'border-gray-200 bg-white hover:border-blue-300' : 'border-gray-200 bg-gray-50'
            }`}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
              <button
                type="button"
                onClick={() => onEdit(question)}
                className="min-w-0 flex-1 text-left"
                aria-label={`Edit question ${question.id}`}
              >
                <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded bg-gray-900 px-2 py-1 font-mono font-semibold text-white">#{question.id}</span>
                  <span className="rounded bg-gray-100 px-2 py-1 font-medium text-gray-700">
                    {question.axis_id} · {axisNames[question.axis_id] || question.axis_id}
                  </span>
                  <span className={`rounded px-2 py-1 font-medium ${question.question_type === 'applied' ? 'bg-violet-100 text-violet-700' : 'bg-sky-100 text-sky-700'}`}>
                    {question.question_type === 'applied' ? 'Applied' : 'Conceptual'}
                  </span>
                  <span className={`rounded px-2 py-1 font-medium ${question.active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-600'}`}>
                    {question.active ? 'Active' : 'Inactive'}
                  </span>
                  <span className="text-gray-400">Order {question.display_order} · Weight {question.weight}</span>
                </div>
                <p className={`leading-relaxed text-gray-900 ${question.active ? '' : 'text-gray-500'}`}>{question.text}</p>
                {question.educational_content && (
                  <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-gray-500">{question.educational_content}</p>
                )}
              </button>

              <div className="flex shrink-0 items-center gap-1 self-end sm:self-start">
                {canReorder && question.active && (
                  <>
                    <button type="button" onClick={() => onMoveUp(question.id)} disabled={position === 0} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-25" title="Move up" aria-label="Move up">↑</button>
                    <button type="button" onClick={() => onMoveDown(question.id)} disabled={position === questions.length - 1} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-25" title="Move down" aria-label="Move down">↓</button>
                  </>
                )}
                <button type="button" onClick={() => onEdit(question)} className="rounded-lg px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50">Edit</button>
                <button type="button" onClick={() => onToggleActive(question.id, !question.active)} className="rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100">
                  {question.active ? 'Deactivate' : 'Activate'}
                </button>
                {deleting ? (
                  <>
                    <button type="button" onClick={() => { onDelete(question.id); setConfirmDelete(null) }} className="rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700">Confirm</button>
                    <button type="button" onClick={() => setConfirmDelete(null)} className="rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-100">Cancel</button>
                  </>
                ) : (
                  <button type="button" onClick={() => setConfirmDelete(question.id)} className="rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50">Delete</button>
                )}
              </div>
            </div>
          </article>
        )
      })}

      {pageCount > 1 && (
        <div className="flex items-center justify-between border-t border-gray-200 pt-4">
          <button type="button" onClick={() => setPage(current => Math.max(1, current - 1))} disabled={page === 1} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 disabled:opacity-40">Previous</button>
          <span className="text-sm text-gray-500">Page {page} of {pageCount}</span>
          <button type="button" onClick={() => setPage(current => Math.min(pageCount, current + 1))} disabled={page === pageCount} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 disabled:opacity-40">Next</button>
        </div>
      )}
    </div>
  )
}
