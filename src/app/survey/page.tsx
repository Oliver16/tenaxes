'use client'

import { useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ORDERED_ITEMS } from '@/lib/instrument'
import { calculateScores } from '@/lib/scorer'
import { supabase } from '@/lib/supabase'
import { nanoid } from 'nanoid'

const RESPONSE_OPTIONS = [
  { value: -2, label: 'Strongly Disagree', short: 'SD', color: 'bg-red-600' },
  { value: -1, label: 'Disagree', short: 'D', color: 'bg-red-400' },
  { value: 0, label: 'Neutral', short: 'N', color: 'bg-gray-400' },
  { value: 1, label: 'Agree', short: 'A', color: 'bg-green-400' },
  { value: 2, label: 'Strongly Agree', short: 'SA', color: 'bg-green-600' },
]

export default function SurveyPage() {
  const router = useRouter()
  const [responses, setResponses] = useState<Record<number, number>>({})
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const currentItem = ORDERED_ITEMS[currentIndex]
  const answeredCount = Object.keys(responses).length
  const percent = Math.round((answeredCount / ORDERED_ITEMS.length) * 100)
  const isComplete = answeredCount === ORDERED_ITEMS.length

  const handleResponse = useCallback((value: number) => {
    setResponses(prev => ({ ...prev, [currentItem.id]: value }))
    if (currentIndex < ORDERED_ITEMS.length - 1) {
      setTimeout(() => setCurrentIndex(prev => prev + 1), 150)
    }
  }, [currentIndex, currentItem.id])

  const handlePrevious = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1)
    }
  }, [currentIndex])

  const handleSkip = useCallback(() => {
    if (currentIndex < ORDERED_ITEMS.length - 1) {
      setCurrentIndex(prev => prev + 1)
    }
  }, [currentIndex])

  const handleSubmit = useCallback(async () => {
    if (!isComplete) return
    
    setIsSubmitting(true)
    setError(null)

    try {
      const sessionId = nanoid(12)
      const results = calculateScores(responses)

      // Save to Supabase
      const { error: responseError } = await supabase
        .from('survey_responses')
        .insert({
          session_id: sessionId,
          responses: responses
        })

      if (responseError) throw responseError

      const { error: resultError } = await supabase
        .from('survey_results')
        .insert({
          session_id: sessionId,
          core_axes: results.coreAxes,
          facets: results.facets,
          top_flavors: results.allFlavors.filter(f => f.affinity > 0.1) // All positive matches
        })

      if (resultError) throw resultError

      // Navigate to results
      router.push(`/results/${sessionId}`)
    } catch (err) {
      console.error('Error saving results:', err)
      setError('Failed to save results. Please try again.')
      setIsSubmitting(false)
    }
  }, [isComplete, responses, router])

  return (
    <main className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Political Compass Survey</h1>
          <p className="text-gray-600">Answer honestly — there are no right or wrong answers.</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>Progress</span>
            <span>{answeredCount} / {ORDERED_ITEMS.length}</span>
          </div>
          <div className="w-full bg-gray-300 rounded-full h-3 overflow-hidden">
            <div 
              className="bg-blue-600 h-full rounded-full transition-all duration-300"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>

        {/* Question Card */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6 animate-fade-in" key={currentItem.id}>
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm font-medium text-gray-500">
              Question {currentIndex + 1} of {ORDERED_ITEMS.length}
            </span>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
              {currentItem.axis}
            </span>
          </div>
          
          <p className="text-lg text-gray-800 mb-8 leading-relaxed">
            {currentItem.text}
          </p>

          {/* Response Buttons */}
          <div className="space-y-3">
            {RESPONSE_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => handleResponse(opt.value)}
                className={`w-full py-3 px-4 rounded-lg border-2 transition-all text-left flex items-center gap-3 ${
                  responses[currentItem.id] === opt.value
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <span className={`w-3 h-3 rounded-full ${opt.color}`} />
                <span className="font-medium">{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <button
            onClick={handlePrevious}
            disabled={currentIndex === 0}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ← Previous
          </button>

          <div className="flex gap-2">
            {!isComplete && (
              <button
                onClick={handleSkip}
                disabled={currentIndex === ORDERED_ITEMS.length - 1}
                className="px-4 py-2 text-gray-500 hover:text-gray-700"
              >
                Skip
              </button>
            )}
            
            {isComplete && (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Saving...' : 'See Results →'}
              </button>
            )}
          </div>
        </div>

        {/* Remaining count */}
        <p className="text-center text-sm text-gray-500 mt-6">
          {ORDERED_ITEMS.length - answeredCount} questions remaining
        </p>

        {/* Error message */}
        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Quick navigation */}
        <div className="mt-8 flex flex-wrap gap-1 justify-center">
          {ORDERED_ITEMS.map((item, idx) => (
            <button
              key={item.id}
              onClick={() => setCurrentIndex(idx)}
              className={`w-6 h-6 text-xs rounded ${
                responses[item.id] !== undefined
                  ? 'bg-blue-500 text-white'
                  : idx === currentIndex
                  ? 'bg-blue-200 text-blue-800'
                  : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
              }`}
              title={`Question ${idx + 1}`}
            >
              {idx + 1}
            </button>
          ))}
        </div>
      </div>
    </main>
  )
}
