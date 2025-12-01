'use client'

import { useState } from 'react'
import type { Question } from '@/lib/questions'

type QuestionWithResponse = {
  question: Question
  response: number
  isOutlier: boolean
  contributionDirection: 'positive' | 'negative' | 'neutral'
}

type AxisDrillDownProps = {
  axisId: string
  axisName: string
  conceptualScore: number
  appliedScore: number
  questions: Question[]
  responses: Record<number, number>
}

export function AxisDrillDown({
  axisId,
  axisName,
  conceptualScore,
  appliedScore,
  questions,
  responses
}: AxisDrillDownProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  // Filter questions for this axis
  const axisQuestions = questions.filter(q => q.axis_id === axisId)

  // Separate by type and include responses
  const conceptualQuestions = axisQuestions
    .filter(q => q.question_type === 'conceptual' && responses[q.id] !== undefined)
    .map(q => analyzeQuestion(q, responses[q.id], conceptualScore))

  const appliedQuestions = axisQuestions
    .filter(q => q.question_type === 'applied' && responses[q.id] !== undefined)
    .map(q => analyzeQuestion(q, responses[q.id], appliedScore))

  // Find outliers - questions that pull opposite to the overall score
  const conflictingConceptual = conceptualQuestions.filter(q => q.isOutlier)
  const conflictingApplied = appliedQuestions.filter(q => q.isOutlier)

  const totalConflicts = conflictingConceptual.length + conflictingApplied.length

  if (conceptualQuestions.length === 0 && appliedQuestions.length === 0) {
    return null
  }

  return (
    <div className="mt-3 border-t border-gray-200 pt-3">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full text-left flex items-center justify-between text-sm text-gray-600 hover:text-gray-800 transition-colors"
      >
        <span className="flex items-center gap-2">
          <svg
            className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="font-medium">View individual questions</span>
          {totalConflicts > 0 && (
            <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
              {totalConflicts} {totalConflicts === 1 ? 'outlier' : 'outliers'}
            </span>
          )}
        </span>
        <span className="text-xs text-gray-400">
          {conceptualQuestions.length + appliedQuestions.length} questions
        </span>
      </button>

      {isExpanded && (
        <div className="mt-4 space-y-6">
          {/* Conceptual Questions */}
          {conceptualQuestions.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-blue-700 mb-3 flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full" />
                Conceptual Beliefs ({conceptualQuestions.length})
              </h4>
              <div className="space-y-2">
                {conceptualQuestions.map((item) => (
                  <QuestionCard key={item.question.id} item={item} type="conceptual" />
                ))}
              </div>
            </div>
          )}

          {/* Applied Questions */}
          {appliedQuestions.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-green-700 mb-3 flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full" />
                Practical Application ({appliedQuestions.length})
              </h4>
              <div className="space-y-2">
                {appliedQuestions.map((item) => (
                  <QuestionCard key={item.question.id} item={item} type="applied" />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function QuestionCard({
  item,
  type
}: {
  item: QuestionWithResponse
  type: 'conceptual' | 'applied'
}) {
  const responseLabels: Record<number, string> = {
    2: 'Strongly Agree',
    1: 'Agree',
    0: 'Neutral',
    '-1': 'Disagree',
    '-2': 'Strongly Disagree'
  }

  const responseColors: Record<number, string> = {
    2: 'bg-green-100 text-green-800 border-green-300',
    1: 'bg-green-50 text-green-700 border-green-200',
    0: 'bg-gray-100 text-gray-700 border-gray-300',
    '-1': 'bg-red-50 text-red-700 border-red-200',
    '-2': 'bg-red-100 text-red-800 border-red-300'
  }

  const cardColor = type === 'conceptual' ? 'border-blue-200' : 'border-green-200'
  const outlierHighlight = item.isOutlier ? 'ring-2 ring-amber-300 bg-amber-50' : 'bg-white'

  return (
    <div className={`p-3 rounded border ${cardColor} ${outlierHighlight} text-xs`}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <p className="text-gray-700 flex-1">{item.question.text}</p>
        {item.isOutlier && (
          <span className="text-xs bg-amber-200 text-amber-900 px-2 py-1 rounded-full whitespace-nowrap font-medium">
            Outlier
          </span>
        )}
      </div>

      <div className="flex items-center justify-between">
        <span className={`px-2 py-1 rounded border font-medium ${responseColors[item.response]}`}>
          {responseLabels[item.response]}
        </span>

        {item.isOutlier && (
          <span className="text-xs text-amber-700">
            Pulls opposite to your overall {type} tendency
          </span>
        )}
      </div>
    </div>
  )
}

/**
 * Analyzes a question to determine if it's an outlier
 * An outlier is when the contribution direction differs from the overall score direction
 */
function analyzeQuestion(
  question: Question,
  response: number,
  overallScore: number
): QuestionWithResponse {
  // Calculate the contribution this response made to the axis score
  // contribution = response * key * weight
  const contribution = response * question.key * question.weight

  // Determine direction of contribution
  let contributionDirection: 'positive' | 'negative' | 'neutral' = 'neutral'
  if (contribution > 0.5) contributionDirection = 'positive'
  else if (contribution < -0.5) contributionDirection = 'negative'

  // An outlier is when:
  // - The overall score is positive (> 0.2) but this question contributed negatively
  // - The overall score is negative (< -0.2) but this question contributed positively
  // - The contribution is strong (absolute value > 1.5)
  const isSignificantContribution = Math.abs(contribution) > 1.5
  const isOppositeDirection =
    (overallScore > 0.2 && contribution < -0.5) ||
    (overallScore < -0.2 && contribution > 0.5)

  const isOutlier = isSignificantContribution && isOppositeDirection

  return {
    question,
    response,
    isOutlier,
    contributionDirection
  }
}
