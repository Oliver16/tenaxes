'use client'

import { useState } from 'react'
import type { Question, QuestionInput } from '@/lib/questions'

type AxisOption = {
  id: string
  name: string
  pole_negative: string
  pole_positive: string
}

type Props = {
  question?: Question | null
  initialAxisId: string
  axes: AxisOption[]
  onSave: (input: QuestionInput) => Promise<void>
  onCancel: () => void
}

export function QuestionEditor({ question, initialAxisId, axes, onSave, onCancel }: Props) {
  const [axisId, setAxisId] = useState(question?.axis_id || initialAxisId)
  const [text, setText] = useState(question?.text || '')
  const [educationalContent, setEducationalContent] = useState(question?.educational_content || '')
  const [key, setKey] = useState<1 | -1>(question?.key || 1)
  const [questionType, setQuestionType] = useState<'conceptual' | 'applied'>(question?.question_type || 'conceptual')
  const [weight, setWeight] = useState(question?.weight ?? 1)
  const [active, setActive] = useState(question?.active ?? true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const axis = axes.find(option => option.id === axisId) || axes[0]
  const isEdit = !!question

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)

    if (!axisId) return setError('Choose an axis')
    if (!text.trim()) return setError('Question text is required')
    if (!Number.isFinite(weight) || weight < 0.01 || weight > 10) {
      return setError('Weight must be between 0.01 and 10')
    }

    setSaving(true)
    try {
      await onSave({
        axis_id: axisId,
        key,
        text: text.trim(),
        educational_content: educationalContent.trim() || undefined,
        display_order: question?.display_order,
        question_type: questionType,
        weight,
        active
      })
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Failed to save question')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-start justify-between gap-4 border-b border-gray-200 pb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
            {isEdit ? `Question #${question.id}` : 'New question'}
          </p>
          <h2 className="mt-1 text-2xl font-bold text-gray-900">
            {isEdit ? 'Edit question' : 'Add to question bank'}
          </h2>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          aria-label="Close editor"
        >
          <span aria-hidden="true" className="text-2xl leading-none">&times;</span>
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium text-gray-700">
          Axis
          <select
            value={axisId}
            onChange={event => setAxisId(event.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          >
            {axes.map(option => (
              <option key={option.id} value={option.id}>{option.id} — {option.name}</option>
            ))}
          </select>
        </label>

        <label className="block text-sm font-medium text-gray-700">
          Question type
          <select
            value={questionType}
            onChange={event => setQuestionType(event.target.value as 'conceptual' | 'applied')}
            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          >
            <option value="conceptual">Conceptual principle</option>
            <option value="applied">Applied scenario</option>
          </select>
        </label>
      </div>

      <label className="block text-sm font-medium text-gray-700">
        Question text
        <textarea
          value={text}
          onChange={event => setText(event.target.value)}
          rows={5}
          maxLength={2000}
          autoFocus
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-3 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          placeholder="Write one clear statement for respondents to rate…"
        />
        <span className="mt-1 block text-right text-xs text-gray-400">{text.length}/2000</span>
      </label>

      <label className="block text-sm font-medium text-gray-700">
        Clarifying context <span className="font-normal text-gray-400">(optional)</span>
        <textarea
          value={educationalContent}
          onChange={event => setEducationalContent(event.target.value)}
          rows={4}
          maxLength={5000}
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-3 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          placeholder="State assumptions or define technical terms without arguing for an answer."
        />
      </label>

      {axis && (
        <fieldset>
          <legend className="text-sm font-medium text-gray-700">Agreement points toward</legend>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            {([
              { value: -1 as const, label: axis.pole_negative, color: 'red' },
              { value: 1 as const, label: axis.pole_positive, color: 'green' }
            ]).map(option => (
              <label
                key={option.value}
                className={`cursor-pointer rounded-xl border-2 p-4 transition ${
                  key === option.value
                    ? option.color === 'red' ? 'border-red-500 bg-red-50' : 'border-green-500 bg-green-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="key"
                  value={option.value}
                  checked={key === option.value}
                  onChange={() => setKey(option.value)}
                  className="sr-only"
                />
                <span className="block text-sm font-semibold text-gray-900">{option.label}</span>
                <span className="mt-1 block text-xs text-gray-500">Scoring key {option.value > 0 ? '+1' : '-1'}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <div className="grid items-end gap-4 rounded-xl bg-gray-50 p-4 sm:grid-cols-2">
        <label className="block text-sm font-medium text-gray-700">
          Scoring weight
          <input
            type="number"
            min="0.01"
            max="10"
            step="0.05"
            value={weight}
            onChange={event => setWeight(Number(event.target.value))}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900"
          />
        </label>
        <label className="flex cursor-pointer items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3">
          <span>
            <span className="block text-sm font-medium text-gray-800">Active in survey</span>
            <span className="block text-xs text-gray-500">Inactive questions remain in historical results.</span>
          </span>
          <input
            type="checkbox"
            checked={active}
            onChange={event => setActive(event.target.checked)}
            className="h-5 w-5 rounded border-gray-300 text-blue-600"
          />
        </label>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      <div className="flex justify-end gap-3 border-t border-gray-200 pt-4">
        <button type="button" onClick={onCancel} disabled={saving} className="rounded-lg px-4 py-2.5 font-medium text-gray-600 hover:bg-gray-100">
          Cancel
        </button>
        <button type="submit" disabled={saving} className="rounded-lg bg-blue-600 px-5 py-2.5 font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
          {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add question'}
        </button>
      </div>
    </form>
  )
}
