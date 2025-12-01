'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import {
  fetchAllQuestions,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  toggleQuestionActive,
  getAllAxes,
  type Question,
  type QuestionInput
} from '@/lib/questions'
import { QuestionEditor } from '@/components/admin/QuestionEditor'
import { QuestionList } from '@/components/admin/QuestionList'

type AxisInfo = {
  id: string
  name: string
  pole_negative: string
  pole_positive: string
  isCore: boolean
  isFacet: boolean
}

export default function QuestionsAdminPage() {
  const { user, isAdmin, loading: authLoading } = useAuth()
  const router = useRouter()
  const [questions, setQuestions] = useState<Record<string, Question[]>>({})
  const [loading, setLoading] = useState(true)
  const [selectedAxis, setSelectedAxis] = useState<string | null>(null)
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const axes = getAllAxes()
  const coreAxes = axes.filter(a => a.isCore)
  const facetAxes = axes.filter(a => a.isFacet)

  // Redirect non-admin users
  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      router.push('/')
    }
  }, [user, isAdmin, authLoading, router])

  const loadQuestions = useCallback(async () => {
    if (!user || !isAdmin) return
    setLoading(true)
    const data = await fetchAllQuestions()
    setQuestions(data)
    setLoading(false)
  }, [user, isAdmin])

  useEffect(() => {
    loadQuestions()
  }, [loadQuestions])

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 3000)
  }

  const handleSave = async (input: QuestionInput) => {
    setSaving(true)
    try {
      if (editingQuestion) {
        const updated = await updateQuestion(editingQuestion.id, input)
        if (updated) {
          showMessage('success', 'Question updated successfully')
          setEditingQuestion(null)
          await loadQuestions()
        } else {
          showMessage('error', 'Failed to update question')
        }
      } else {
        const created = await createQuestion(input)
        if (created) {
          showMessage('success', 'Question added successfully')
          setIsAdding(false)
          await loadQuestions()
        } else {
          showMessage('error', 'Failed to add question')
        }
      }
    } catch (err) {
      showMessage('error', 'An error occurred')
    }
    setSaving(false)
  }

  const handleDelete = async (id: number) => {
    const success = await deleteQuestion(id)
    if (success) {
      showMessage('success', 'Question deleted')
      await loadQuestions()
    } else {
      showMessage('error', 'Failed to delete question')
    }
  }

  const handleToggleActive = async (id: number, active: boolean) => {
    const success = await toggleQuestionActive(id, active)
    if (success) {
      showMessage('success', active ? 'Question activated' : 'Question deactivated')
      await loadQuestions()
    } else {
      showMessage('error', 'Failed to update question')
    }
  }

  const handleMoveUp = async (id: number) => {
    if (!selectedAxis) return
    const axisQuestions = questions[selectedAxis]?.filter(q => q.active) || []
    const index = axisQuestions.findIndex(q => q.id === id)
    if (index <= 0) return

    // Swap display_order with previous question
    const current = axisQuestions[index]
    const previous = axisQuestions[index - 1]
    
    await updateQuestion(current.id, { display_order: previous.display_order })
    await updateQuestion(previous.id, { display_order: current.display_order })
    await loadQuestions()
  }

  const handleMoveDown = async (id: number) => {
    if (!selectedAxis) return
    const axisQuestions = questions[selectedAxis]?.filter(q => q.active) || []
    const index = axisQuestions.findIndex(q => q.id === id)
    if (index < 0 || index >= axisQuestions.length - 1) return

    // Swap display_order with next question
    const current = axisQuestions[index]
    const next = axisQuestions[index + 1]
    
    await updateQuestion(current.id, { display_order: next.display_order })
    await updateQuestion(next.id, { display_order: current.display_order })
    await loadQuestions()
  }

  // Prevent rendering for non-admin users
  if (authLoading || !user || !isAdmin) {
    return null
  }

  const selectedAxisInfo = axes.find(a => a.id === selectedAxis)
  const selectedQuestions = selectedAxis ? questions[selectedAxis] || [] : []
  const activeCount = selectedQuestions.filter(q => q.active).length
  const totalQuestions = Object.values(questions).flat().filter(q => q.active).length

  return (
    <main className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Question Manager</h1>
            <p className="text-gray-500">Add, edit, and organize survey questions</p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/admin"
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              ← Analytics
            </Link>
            <Link
              href="/"
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm"
            >
              Back to Survey
            </Link>
          </div>
        </div>

        {/* Message Toast */}
        {message && (
          <div className={`mb-4 p-4 rounded-lg ${
            message.type === 'success' 
              ? 'bg-green-50 border border-green-200 text-green-700' 
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}>
            {message.text}
          </div>
        )}

        {/* Stats Bar */}
        <div className="bg-white rounded-xl shadow p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex gap-6">
              <div>
                <span className="text-2xl font-bold text-gray-800">{totalQuestions}</span>
                <span className="text-gray-500 ml-2">Active Questions</span>
              </div>
              <div className="border-l pl-6">
                <span className="text-2xl font-bold text-blue-600">{coreAxes.length}</span>
                <span className="text-gray-500 ml-2">Core Axes</span>
              </div>
              <div className="border-l pl-6">
                <span className="text-2xl font-bold text-purple-600">{facetAxes.length}</span>
                <span className="text-gray-500 ml-2">Facets</span>
              </div>
            </div>
            {selectedAxis && (
              <div className="text-right">
                <span className="text-sm text-gray-500">Selected axis:</span>
                <span className="ml-2 font-medium text-gray-800">{activeCount} questions</span>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Axis Selector Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow p-4 sticky top-4">
              <h2 className="font-bold text-gray-800 mb-4">Core Axes</h2>
              <div className="space-y-1 mb-6">
                {coreAxes.map(axis => {
                  const count = questions[axis.id]?.filter(q => q.active).length || 0
                  return (
                    <button
                      key={axis.id}
                      onClick={() => {
                        setSelectedAxis(axis.id)
                        setIsAdding(false)
                        setEditingQuestion(null)
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-all ${
                        selectedAxis === axis.id
                          ? 'bg-blue-100 text-blue-800 border border-blue-300'
                          : 'hover:bg-gray-100 text-gray-700'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{axis.name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          count >= 8 
                            ? 'bg-green-100 text-green-700' 
                            : count >= 4 
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {count}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1 flex justify-between">
                        <span>{axis.pole_negative}</span>
                        <span>↔</span>
                        <span>{axis.pole_positive}</span>
                      </div>
                    </button>
                  )
                })}
              </div>

              <h2 className="font-bold text-gray-800 mb-4">Style Facets</h2>
              <div className="space-y-1">
                {facetAxes.map(axis => {
                  const count = questions[axis.id]?.filter(q => q.active).length || 0
                  return (
                    <button
                      key={axis.id}
                      onClick={() => {
                        setSelectedAxis(axis.id)
                        setIsAdding(false)
                        setEditingQuestion(null)
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-all ${
                        selectedAxis === axis.id
                          ? 'bg-purple-100 text-purple-800 border border-purple-300'
                          : 'hover:bg-gray-100 text-gray-700'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{axis.name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          count >= 6 
                            ? 'bg-green-100 text-green-700' 
                            : count >= 3 
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {count}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1 flex justify-between">
                        <span>{axis.pole_negative}</span>
                        <span>↔</span>
                        <span>{axis.pole_positive}</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Question Editor Panel */}
          <div className="lg:col-span-2">
            {loading ? (
              <div className="bg-white rounded-xl shadow p-8 text-center">
                <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-gray-500">Loading questions...</p>
              </div>
            ) : !selectedAxis ? (
              <div className="bg-white rounded-xl shadow p-8 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-800 mb-2">Select an Axis</h3>
                <p className="text-gray-500">Choose a core axis or facet from the left to view and edit its questions.</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow p-6">
                {/* Axis Header */}
                <div className="flex justify-between items-start mb-6 pb-4 border-b">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        selectedAxisInfo?.isFacet 
                          ? 'bg-purple-100 text-purple-700' 
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {selectedAxisInfo?.isFacet ? 'Facet' : 'Core'}
                      </span>
                      <h2 className="text-xl font-bold text-gray-800">{selectedAxisInfo?.name}</h2>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-sm">
                      <span className="text-red-600 font-medium">← {selectedAxisInfo?.pole_negative}</span>
                      <span className="text-gray-400">to</span>
                      <span className="text-green-600 font-medium">{selectedAxisInfo?.pole_positive} →</span>
                    </div>
                  </div>
                  
                  {!isAdding && !editingQuestion && (
                    <button
                      onClick={() => setIsAdding(true)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                    >
                      <span>+</span>
                      <span>Add Question</span>
                    </button>
                  )}
                </div>

                {/* Editor Form */}
                {(isAdding || editingQuestion) && selectedAxisInfo && (
                  <div className="mb-6">
                    <QuestionEditor
                      question={editingQuestion}
                      axisId={selectedAxis}
                      axisName={selectedAxisInfo.name}
                      poleNegative={selectedAxisInfo.pole_negative}
                      polePositive={selectedAxisInfo.pole_positive}
                      onSave={handleSave}
                      onCancel={() => {
                        setIsAdding(false)
                        setEditingQuestion(null)
                      }}
                    />
                  </div>
                )}

                {/* Question List */}
                {selectedAxisInfo && (
                  <QuestionList
                    questions={selectedQuestions}
                    poleNegative={selectedAxisInfo.pole_negative}
                    polePositive={selectedAxisInfo.pole_positive}
                    onEdit={(q) => {
                      setEditingQuestion(q)
                      setIsAdding(false)
                    }}
                    onDelete={handleDelete}
                    onToggleActive={handleToggleActive}
                    onMoveUp={handleMoveUp}
                    onMoveDown={handleMoveDown}
                  />
                )}

                {/* Balance Indicator */}
                <div className="mt-6 pt-4 border-t">
                  <h4 className="text-sm font-medium text-gray-600 mb-2">Question Balance</h4>
                  <div className="flex gap-4">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 bg-red-400 rounded"></span>
                      <span className="text-sm text-gray-600">
                        {selectedQuestions.filter(q => q.active && q.key === -1).length} toward {selectedAxisInfo?.pole_negative}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 bg-green-400 rounded"></span>
                      <span className="text-sm text-gray-600">
                        {selectedQuestions.filter(q => q.active && q.key === 1).length} toward {selectedAxisInfo?.pole_positive}
                      </span>
                    </div>
                  </div>
                  {(() => {
                    const negCount = selectedQuestions.filter(q => q.active && q.key === -1).length
                    const posCount = selectedQuestions.filter(q => q.active && q.key === 1).length
                    const isBalanced = Math.abs(negCount - posCount) <= 1
                    return (
                      <p className={`text-xs mt-2 ${isBalanced ? 'text-green-600' : 'text-orange-600'}`}>
                        {isBalanced 
                          ? '✓ Questions are balanced' 
                          : '⚠ Consider balancing the number of questions for each pole'}
                      </p>
                    )
                  })()}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
