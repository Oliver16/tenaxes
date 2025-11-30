'use client'

import { useState, useEffect } from 'react'
import type { Question, QuestionInput } from '@/lib/questions'

type Props = {
  question?: Question | null
  axisId: string
  axisName: string
  poleNegative: string
  polePositive: string
  onSave: (input: QuestionInput) => Promise<void>
  onCancel: () => void
}

export function QuestionEditor({
  question,
  axisId,
  axisName,
  poleNegative,
  polePositive,
  onSave,
  onCancel
}: Props) {
  const [text, setText] = useState(question?.text || '')
  const [key, setKey] = useState<1 | -1>(question?.key || 1)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isEdit = !!question

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!text.trim()) {
      setError('Question text is required')
      return
    }

    setSaving(true)
    setError(null)

    try {
      await onSave({
        axis_id: axisId,
        key,
        text: text.trim(),
        display_order: question?.display_order
      })
    } catch (err) {
      setError('Failed to save question')
      setSaving(false)
    }
  }

  return (
    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
      <h3 className="font-medium text-gray-800 mb-4">
        {isEdit ? 'Edit Question' : 'Add New Question'}
      </h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Question Text */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Question Text
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-800"
            rows={3}
            placeholder="Enter the question statement..."
          />
        </div>

        {/* Key (Which pole does agreement push toward) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Agreement Direction
          </label>
          <p className="text-xs text-gray-500 mb-2">
            When someone agrees with this statement, which pole does it indicate?
          </p>
          <div className="flex gap-3">
            <label className={`flex-1 p-3 rounded-lg border-2 cursor-pointer transition-all ${
              key === -1 
                ? 'border-red-500 bg-red-50' 
                : 'border-gray-200 hover:border-gray-300'
            }`}>
              <input
                type="radio"
                name="key"
                value={-1}
                checked={key === -1}
                onChange={() => setKey(-1)}
                className="sr-only"
              />
              <div className="text-center">
                <span className="block font-medium text-red-700">← {poleNegative}</span>
                <span className="text-xs text-gray-500">Key: -1</span>
              </div>
            </label>
            
            <label className={`flex-1 p-3 rounded-lg border-2 cursor-pointer transition-all ${
              key === 1 
                ? 'border-green-500 bg-green-50' 
                : 'border-gray-200 hover:border-gray-300'
            }`}>
              <input
                type="radio"
                name="key"
                value={1}
                checked={key === 1}
                onChange={() => setKey(1)}
                className="sr-only"
              />
              <div className="text-center">
                <span className="block font-medium text-green-700">{polePositive} →</span>
                <span className="text-xs text-gray-500">Key: +1</span>
              </div>
            </label>
          </div>
        </div>

        {/* Error */}
        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            disabled={saving}
          >
            {saving ? 'Saving...' : (isEdit ? 'Update' : 'Add Question')}
          </button>
        </div>
      </form>
    </div>
  )
}
