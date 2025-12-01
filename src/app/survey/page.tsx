'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { AXES } from '@/lib/instrument'
import { fetchActiveQuestions, type Question } from '@/lib/questions'
import { calculateScoresFromQuestions } from '@/lib/scorer'
import type { Database } from '@/lib/database.types'
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
  const { user } = useAuth()
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [responses, setResponses] = useState<Record<number, number>>({})
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch questions from database
  useEffect(() => {
    async function loadQuestions() {
      setLoading(true)
      const data = await fetchActiveQuestions()
      // Sort by display_order
      data.sort((a, b) => a.display_order - b.display_order)
      setQuestions(data)
      setLoading(false)
    }
    loadQuestions()
  }, [])

  const currentItem = questions[currentIndex]
  const answeredCount = Object.keys(responses).length
  const percent = questions.length > 0 ? Math.round((answeredCount / questions.length) * 100) : 0
  const isComplete = questions.length > 0 && answeredCount === questions.length

  const handleResponse = useCallback((value: number) => {
    if (!currentItem) return
    setResponses(prev => ({ ...prev, [currentItem.id]: value }))
    if (currentIndex < questions.length - 1) {
      setTimeout(() => setCurrentIndex(prev => prev + 1), 150)
    }
  }, [currentIndex, currentItem, questions.length])

  const handlePrevious = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1)
    }
  }, [currentIndex])

  const handleSkip = useCallback(() => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1)
    }
  }, [currentIndex, questions.length])

  const handleSubmit = useCallback(async () => {
    if (!isComplete) return

    setIsSubmitting(true)
    setError(null)

    try {
      const sessionId = nanoid(12)
      const results = calculateScoresFromQuestions(responses, questions)

      // Persist via API route to avoid client-side Supabase insert failures
      const payload = {
        session_id: sessionId,
        user_id: user?.id ?? null,
        responses,
        core_axes: results.coreAxes,
        facets: results.facets,
        top_flavors: results.allFlavors.filter(f => f.affinity > 0.1)
      }

      const response = await fetch('/api/survey/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({}))
        throw new Error(errorPayload.error || 'Failed to save results')
      }

      // Navigate to results
      router.push(`/results/${sessionId}`)
    } catch (err) {
      console.error('Error saving results:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to save results. Please try again.'
      setError(errorMessage)
      setIsSubmitting(false)
    }
  }, [isComplete, responses, questions, router, user])

  // Loading state
  if (loading) {
    return (
      <main className="min-h-screen bg-gray-100 py-8 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading survey...</p>
        </div>
      </main>
    )
  }

  // No questions loaded
  if (questions.length === 0) {
    return (
      <main className="min-h-screen bg-gray-100 py-8 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-gray-600">No questions available. Please check back later.</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">TenAxes Survey</h1>
          <p className="text-gray-600">Answer honestly — there are no right or wrong answers.</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>Progress</span>
            <span>{answeredCount} / {questions.length}</span>
          </div>
          <div className="w-full bg-gray-300 rounded-full h-3 overflow-hidden">
            <div 
              className="bg-blue-600 h-full rounded-full transition-all duration-300"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>

        {/* Question Card */}
        {currentItem && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6 animate-fade-in" key={currentItem.id}>
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm font-medium text-gray-500">
                Question {currentIndex + 1} of {questions.length}
              </span>
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
                {currentItem.axis_id}
              </span>
            </div>
            
            <p className="text-lg text-gray-800 mb-6 leading-relaxed">
              {currentItem.text}
            </p>

            {/* Educational Content */}
            {currentItem.educational_content && (
              <div className="mb-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <div className="text-sm text-blue-900 leading-relaxed whitespace-pre-wrap">
                    {currentItem.educational_content}
                  </div>
                </div>
              </div>
            )}

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
        )}

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
                disabled={currentIndex === questions.length - 1}
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
          {questions.length - answeredCount} questions remaining
        </p>

        {/* Error message */}
        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Quick navigation */}
        <div className="mt-8 flex flex-wrap gap-1 justify-center">
          {questions.map((item, idx) => (
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
