'use client'

import { useState } from 'react'
import type { Question } from '@/lib/questions'

type Props = {
  questions: Question[]
  poleNegative: string
  polePositive: string
  onEdit: (question: Question) => void
  onDelete: (id: number) => void
  onToggleActive: (id: number, active: boolean) => void
  onMoveUp: (id: number) => void
  onMoveDown: (id: number) => void
}

export function QuestionList({
  questions,
  poleNegative,
  polePositive,
  onEdit,
  onDelete,
  onToggleActive,
  onMoveUp,
  onMoveDown
}: Props) {
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)

  if (questions.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No questions for this axis yet. Add one above.
      </div>
    )
  }

  // Separate active and inactive
  const activeQuestions = questions.filter(q => q.active)
  const inactiveQuestions = questions.filter(q => !q.active)

  return (
    <div className="space-y-2">
      {/* Active Questions */}
      {activeQuestions.map((question, index) => (
        <QuestionRow
          key={question.id}
          question={question}
          poleNegative={poleNegative}
          polePositive={polePositive}
          isFirst={index === 0}
          isLast={index === activeQuestions.length - 1}
          confirmDelete={confirmDelete === question.id}
          onEdit={() => onEdit(question)}
          onDelete={() => {
            if (confirmDelete === question.id) {
              onDelete(question.id)
              setConfirmDelete(null)
            } else {
              setConfirmDelete(question.id)
            }
          }}
          onCancelDelete={() => setConfirmDelete(null)}
          onToggleActive={() => onToggleActive(question.id, false)}
          onMoveUp={() => onMoveUp(question.id)}
          onMoveDown={() => onMoveDown(question.id)}
        />
      ))}

      {/* Inactive Questions */}
      {inactiveQuestions.length > 0 && (
        <div className="mt-6">
          <h4 className="text-sm font-medium text-gray-500 mb-2 flex items-center gap-2">
            <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
            Inactive Questions ({inactiveQuestions.length})
          </h4>
          {inactiveQuestions.map((question) => (
            <QuestionRow
              key={question.id}
              question={question}
              poleNegative={poleNegative}
              polePositive={polePositive}
              isFirst={false}
              isLast={false}
              isInactive
              confirmDelete={confirmDelete === question.id}
              onEdit={() => onEdit(question)}
              onDelete={() => {
                if (confirmDelete === question.id) {
                  onDelete(question.id)
                  setConfirmDelete(null)
                } else {
                  setConfirmDelete(question.id)
                }
              }}
              onCancelDelete={() => setConfirmDelete(null)}
              onToggleActive={() => onToggleActive(question.id, true)}
              onMoveUp={() => {}}
              onMoveDown={() => {}}
            />
          ))}
        </div>
      )}
    </div>
  )
}

type QuestionRowProps = {
  question: Question
  poleNegative: string
  polePositive: string
  isFirst: boolean
  isLast: boolean
  isInactive?: boolean
  confirmDelete: boolean
  onEdit: () => void
  onDelete: () => void
  onCancelDelete: () => void
  onToggleActive: () => void
  onMoveUp: () => void
  onMoveDown: () => void
}

function QuestionRow({
  question,
  poleNegative,
  polePositive,
  isFirst,
  isLast,
  isInactive,
  confirmDelete,
  onEdit,
  onDelete,
  onCancelDelete,
  onToggleActive,
  onMoveUp,
  onMoveDown
}: QuestionRowProps) {
  return (
    <div className={`p-3 rounded-lg border ${
      isInactive 
        ? 'bg-gray-50 border-gray-200 opacity-60' 
        : 'bg-white border-gray-200 hover:border-gray-300'
    } transition-all`}>
      <div className="flex gap-3">
        {/* Order & Key indicator */}
        <div className="flex flex-col items-center gap-1 pt-1">
          {!isInactive && (
            <>
              <button
                onClick={onMoveUp}
                disabled={isFirst}
                className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                title="Move up"
              >
                ▲
              </button>
              <span className="text-xs text-gray-400 font-mono">
                #{question.display_order}
              </span>
              <button
                onClick={onMoveDown}
                disabled={isLast}
                className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                title="Move down"
              >
                ▼
              </button>
            </>
          )}
        </div>

        {/* Key indicator */}
        <div className="flex-shrink-0 pt-1">
          <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
            question.key === -1 
              ? 'bg-red-100 text-red-700' 
              : 'bg-green-100 text-green-700'
          }`}>
            {question.key === -1 ? '←' : '→'}
          </span>
        </div>

        {/* Question text */}
        <div className="flex-1 min-w-0">
          <p className={`text-gray-800 ${isInactive ? 'line-through' : ''}`}>
            {question.text}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Agreement → {question.key === -1 ? poleNegative : polePositive}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-start gap-1">
          {confirmDelete ? (
            <>
              <button
                onClick={onDelete}
                className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
              >
                Confirm
              </button>
              <button
                onClick={onCancelDelete}
                className="px-2 py-1 text-xs text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onEdit}
                className="p-1.5 text-gray-400 hover:text-blue-600 rounded"
                title="Edit"
              >
                <EditIcon />
              </button>
              <button
                onClick={onToggleActive}
                className={`p-1.5 rounded ${
                  isInactive 
                    ? 'text-gray-400 hover:text-green-600' 
                    : 'text-gray-400 hover:text-orange-600'
                }`}
                title={isInactive ? 'Activate' : 'Deactivate'}
              >
                {isInactive ? <CheckIcon /> : <PauseIcon />}
              </button>
              <button
                onClick={onDelete}
                className="p-1.5 text-gray-400 hover:text-red-600 rounded"
                title="Delete"
              >
                <TrashIcon />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// Icons
function EditIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  )
}

function PauseIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}
