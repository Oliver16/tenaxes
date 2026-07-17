'use client'

import { useState } from 'react'
import { createQuestionBankVersion } from '@/lib/questions'

type Props = {
  sourceVersion: string
  sourceQuestionCount: number
  onCreated: (version: string, questionCount: number) => Promise<void>
  onCancel: () => void
}

export function QuestionBankVersionDialog({ sourceVersion, sourceQuestionCount, onCreated, onCancel }: Props) {
  const [version, setVersion] = useState('')
  const [name, setName] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const created = await createQuestionBankVersion({
        sourceVersion,
        version: version.trim(),
        name: name.trim(),
        notes: notes.trim() || undefined
      })
      await onCreated(created.bankVersion, created.questionCount)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Failed to create bank version')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="flex items-start justify-between gap-4 border-b border-gray-200 pb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-violet-600">Create revision</p>
          <h2 className="mt-1 text-2xl font-bold text-gray-900">New question-bank version</h2>
          <p className="mt-2 text-sm text-gray-500">
            Clone all {sourceQuestionCount} questions, scoring links, and semantic metadata from <strong>{sourceVersion}</strong>.
          </p>
        </div>
        <button type="button" onClick={onCancel} aria-label="Close" className="rounded-lg p-2 text-2xl leading-none text-gray-400 hover:bg-gray-100">&times;</button>
      </div>

      <div className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-900">
        The new version starts as a draft. The source remains live and unchanged until you explicitly publish the revision; completed results stay pinned to their original bank.
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium text-gray-700">
          Version ID
          <input
            value={version}
            onChange={event => setVersion(event.target.value)}
            required
            autoFocus
            placeholder="v2.3"
            pattern="v[0-9]+(\.[0-9]+){1,2}(-[a-zA-Z0-9.-]+)?"
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 font-mono text-gray-900 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200"
          />
        </label>
        <label className="block text-sm font-medium text-gray-700">
          Display name
          <input
            value={name}
            onChange={event => setName(event.target.value)}
            required
            placeholder="Polyaxis v2.3"
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200"
          />
        </label>
      </div>

      <label className="block text-sm font-medium text-gray-700">
        Revision notes <span className="font-normal text-gray-400">(recommended)</span>
        <textarea
          value={notes}
          onChange={event => setNotes(event.target.value)}
          rows={4}
          maxLength={2000}
          placeholder="What is this revision intended to change or test?"
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-3 text-gray-900 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200"
        />
      </label>

      {error && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      <div className="flex justify-end gap-3 border-t border-gray-200 pt-4">
        <button type="button" onClick={onCancel} disabled={saving} className="rounded-lg px-4 py-2.5 font-medium text-gray-600 hover:bg-gray-100">Cancel</button>
        <button type="submit" disabled={saving} className="rounded-lg bg-violet-600 px-5 py-2.5 font-semibold text-white hover:bg-violet-700 disabled:opacity-50">
          {saving ? 'Cloning bank…' : `Create from ${sourceVersion}`}
        </button>
      </div>
    </form>
  )
}
