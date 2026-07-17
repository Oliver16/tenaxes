'use client'

import { useState } from 'react'
import type { Question, QuestionAxisLinkInput, QuestionInput } from '@/lib/questions'

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
  const [axisLinks, setAxisLinks] = useState<QuestionAxisLinkInput[]>(
    () => (question?.question_axis_links || [])
      .filter((link): link is typeof link & { role: 'secondary' | 'tradeoff' } => link.role !== 'primary')
      .map(link => ({ axis_id: link.axis_id, role: link.role, axis_key: link.axis_key, weight: link.weight }))
  )
  const metadata = question?.question_metadata
  const [policyDomain, setPolicyDomain] = useState(metadata?.policy_domain || '')
  const [latentConflict, setLatentConflict] = useState(metadata?.latent_conflict || '')
  const [actorLevel, setActorLevel] = useState(metadata?.actor_level || '')
  const [policyInstrument, setPolicyInstrument] = useState(metadata?.policy_instrument || '')
  const [scenarioConditions, setScenarioConditions] = useState(metadata?.scenario_conditions || '')
  const [itemFamily, setItemFamily] = useState<'base' | 'collision' | 'controversy_stress'>(metadata?.item_family || 'base')
  const [collisionPair, setCollisionPair] = useState(metadata?.collision_pair || '')
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
    if (!policyDomain.trim()) return setError('Policy domain is required')
    if (axisLinks.some(link => link.axis_id === axisId)) return setError('Cross-axis links must point to an axis other than the primary axis')
    if (new Set(axisLinks.map(link => `${link.axis_id}:${link.role}`)).size !== axisLinks.length) {
      return setError('Each cross-axis role can only be used once per axis')
    }
    const tradeoffCount = axisLinks.filter(link => link.role === 'tradeoff').length
    if (itemFamily === 'collision' && (tradeoffCount !== 1 || !collisionPair.trim())) {
      return setError('Collision items require exactly one tradeoff link and a collision-pair ID')
    }
    if (tradeoffCount > 0 && itemFamily !== 'collision') return setError('Tradeoff links require the Collision item family')

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
        active,
        axis_links: axisLinks,
        metadata: {
          policy_domain: policyDomain.trim(),
          latent_conflict: latentConflict.trim() || undefined,
          actor_level: actorLevel.trim() || undefined,
          policy_instrument: policyInstrument.trim() || undefined,
          scenario_conditions: scenarioConditions.trim() || undefined,
          item_family: itemFamily,
          collision_pair: collisionPair.trim() || undefined
        }
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

      <section className="space-y-4 rounded-xl border border-indigo-200 bg-indigo-50/50 p-4 sm:p-5">
        <div>
          <h3 className="font-semibold text-gray-900">Cross-axis scoring and tension links</h3>
          <p className="mt-1 text-sm text-gray-600">
            The primary link is kept in sync with the axis, direction, and question weight above. Secondary links add a capped score to another axis; tradeoff links define collision/tension evidence and do not add an axis score.
          </p>
        </div>

        {axisLinks.length === 0 ? (
          <p className="rounded-lg border border-dashed border-indigo-200 bg-white px-4 py-3 text-sm text-gray-500">No secondary or tradeoff links. This question only scores its primary axis.</p>
        ) : (
          <div className="space-y-3">
            {axisLinks.map((link, index) => {
              const linkedAxis = axes.find(option => option.id === link.axis_id)
              return (
                <div key={`${index}-${link.role}-${link.axis_id}`} className="grid gap-3 rounded-xl border border-indigo-200 bg-white p-3 md:grid-cols-[150px_minmax(180px,1fr)_minmax(180px,1fr)_110px_auto] md:items-end">
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Role
                    <select value={link.role} onChange={event => setAxisLinks(current => current.map((item, itemIndex) => itemIndex === index ? { ...item, role: event.target.value as QuestionAxisLinkInput['role'] } : item))} className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium normal-case tracking-normal text-gray-800">
                      <option value="secondary">Secondary score</option>
                      <option value="tradeoff">Tradeoff / tension</option>
                    </select>
                  </label>
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Linked axis
                    <select value={link.axis_id} onChange={event => setAxisLinks(current => current.map((item, itemIndex) => itemIndex === index ? { ...item, axis_id: event.target.value } : item))} className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium normal-case tracking-normal text-gray-800">
                      {axes.filter(option => option.id !== axisId).map(option => <option key={option.id} value={option.id}>{option.id} — {option.name}</option>)}
                    </select>
                  </label>
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Agreement points toward
                    <select value={link.axis_key} onChange={event => setAxisLinks(current => current.map((item, itemIndex) => itemIndex === index ? { ...item, axis_key: Number(event.target.value) as 1 | -1 } : item))} className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium normal-case tracking-normal text-gray-800">
                      <option value={-1}>− {linkedAxis?.pole_negative || 'Negative pole'}</option>
                      <option value={1}>+ {linkedAxis?.pole_positive || 'Positive pole'}</option>
                    </select>
                  </label>
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Link weight
                    <input type="number" min="0.01" max="10" step="0.05" value={link.weight} onChange={event => setAxisLinks(current => current.map((item, itemIndex) => itemIndex === index ? { ...item, weight: Number(event.target.value) } : item))} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium normal-case tracking-normal text-gray-800" />
                  </label>
                  <button type="button" onClick={() => setAxisLinks(current => current.filter((_, itemIndex) => itemIndex !== index))} className="rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50">Remove</button>
                </div>
              )
            })}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setAxisLinks(current => [...current, { axis_id: axes.find(option => option.id !== axisId)?.id || '', role: 'secondary', axis_key: 1, weight: 0.25 }])} className="rounded-lg border border-indigo-300 bg-white px-3 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50">+ Secondary scoring link</button>
          <button type="button" onClick={() => { setItemFamily('collision'); setAxisLinks(current => [...current, { axis_id: axes.find(option => option.id !== axisId)?.id || '', role: 'tradeoff', axis_key: 1, weight: 1 }]) }} className="rounded-lg border border-violet-300 bg-white px-3 py-2 text-sm font-semibold text-violet-700 hover:bg-violet-50">+ Tradeoff / tension link</button>
        </div>
      </section>

      <section className="space-y-4 rounded-xl border border-gray-200 p-4 sm:p-5">
        <div>
          <h3 className="font-semibold text-gray-900">Analysis metadata</h3>
          <p className="mt-1 text-sm text-gray-500">These tags drive topic coverage, domain-exception checks, controversy analysis, and collision grouping.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="text-sm font-medium text-gray-700">Item family
            <select value={itemFamily} onChange={event => setItemFamily(event.target.value as typeof itemFamily)} className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-900">
              <option value="base">Base</option><option value="collision">Collision / tension</option><option value="controversy_stress">Controversy stress</option>
            </select>
          </label>
          <label className="text-sm font-medium text-gray-700">Policy domain
            <input value={policyDomain} onChange={event => setPolicyDomain(event.target.value)} required maxLength={200} placeholder="e.g. healthcare" className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900" />
          </label>
          <label className="text-sm font-medium text-gray-700">Latent conflict
            <input value={latentConflict} onChange={event => setLatentConflict(event.target.value)} maxLength={300} placeholder="e.g. Liberty vs Public Order" className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900" />
          </label>
          <label className="text-sm font-medium text-gray-700">Actor level
            <input value={actorLevel} onChange={event => setActorLevel(event.target.value)} maxLength={300} placeholder="national / local / private" className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900" />
          </label>
          <label className="text-sm font-medium text-gray-700">Policy instrument
            <input value={policyInstrument} onChange={event => setPolicyInstrument(event.target.value)} maxLength={300} placeholder="tax, mandate, subsidy…" className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900" />
          </label>
          {itemFamily === 'collision' && <label className="text-sm font-medium text-gray-700">Collision-pair ID
            <input value={collisionPair} onChange={event => setCollisionPair(event.target.value)} required maxLength={100} placeholder="C1-C3-A" className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 font-mono text-gray-900" />
          </label>}
        </div>
        <label className="block text-sm font-medium text-gray-700">Scenario conditions
          <textarea value={scenarioConditions} onChange={event => setScenarioConditions(event.target.value)} rows={3} maxLength={1000} placeholder="Constraints or conditions that make this scenario analytically distinct." className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-3 text-gray-900" />
        </label>
      </section>

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
