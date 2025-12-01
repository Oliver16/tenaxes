'use client'

import { useState, useEffect } from 'react'
import { signInWithEmail, getCurrentUser, linkResultToUser, getOrCreateUserProfile } from '@/lib/auth'

type Props = {
  sessionId: string
}

export function SaveResultsPrompt({ sessionId }: Props) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent' | 'error' | 'saved'>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [user, setUser] = useState<any>(null)
  const [isExpanded, setIsExpanded] = useState(false)

  useEffect(() => {
    // Check if user is already logged in
    checkUser()
  }, [])

  const checkUser = async () => {
    const currentUser = await getCurrentUser()
    if (currentUser) {
      setUser(currentUser)
      // Automatically link result to user if they're already logged in
      await handleLinkResult(currentUser.id, currentUser.email!)
    }
  }

  const handleLinkResult = async (userId: string, userEmail: string) => {
    try {
      // Create user profile if it doesn't exist
      await getOrCreateUserProfile(userId, userEmail)

      // Link the result to the user
      const result = await linkResultToUser(sessionId, userId)

      if (result.success) {
        setStatus('saved')
      } else {
        setStatus('error')
        setErrorMessage(result.error || 'Failed to save results')
      }
    } catch (err) {
      console.error('Error linking result:', err)
      setStatus('error')
      setErrorMessage('An unexpected error occurred')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email || !email.includes('@')) {
      setErrorMessage('Please enter a valid email address')
      setStatus('error')
      return
    }

    setStatus('loading')
    setErrorMessage('')

    const result = await signInWithEmail(email)

    if (result.success) {
      setStatus('sent')
    } else {
      setStatus('error')
      setErrorMessage(result.error || 'Failed to send magic link')
    }
  }

  // If user is already logged in and result is saved, show success message
  if (user && status === 'saved') {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl shadow-md p-6 max-w-2xl mx-auto">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-green-900 mb-1">Results Saved!</h3>
            <p className="text-green-700 text-sm">
              Your results have been saved to your account ({user.email}). You can retake the test anytime and view your history.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // If magic link was sent
  if (status === 'sent') {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-xl shadow-md p-6 max-w-2xl mx-auto">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-4">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-blue-900 mb-2">Check Your Email!</h3>
          <p className="text-blue-700 text-sm mb-4">
            We've sent a magic link to <strong>{email}</strong>. Click the link in your email to save your results and create your account.
          </p>
          <p className="text-blue-600 text-xs">
            Once you click the link, your results will be automatically saved to your account.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-xl shadow-md p-6 max-w-2xl mx-auto">
      {!isExpanded ? (
        // Collapsed state - just show a prompt
        <button
          onClick={() => setIsExpanded(true)}
          className="w-full text-left flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center group-hover:bg-purple-200 transition-colors">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-purple-900">Save Your Results</h3>
              <p className="text-purple-700 text-sm">Create a free account to save and access your results anytime</p>
            </div>
          </div>
          <svg className="w-5 h-5 text-purple-600 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      ) : (
        // Expanded state - show form
        <div>
          <div className="flex items-start gap-3 mb-4">
            <div className="flex-shrink-0 w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-purple-900 mb-1">Save Your Results</h3>
              <p className="text-purple-700 text-sm mb-4">
                Enter your email to save these results and access them anytime. We'll send you a magic link - no password needed!
              </p>

              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full px-4 py-3 border border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    disabled={status === 'loading'}
                  />
                </div>

                {status === 'error' && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-red-700 text-sm">{errorMessage}</p>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={status === 'loading'}
                    className="flex-1 px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white rounded-lg font-medium transition-colors"
                  >
                    {status === 'loading' ? 'Sending...' : 'Send Magic Link'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsExpanded(false)}
                    className="px-6 py-3 border border-purple-300 hover:border-purple-400 text-purple-700 rounded-lg font-medium transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>

              <div className="mt-4 pt-4 border-t border-purple-200">
                <div className="flex items-start gap-2 text-xs text-purple-600">
                  <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p>
                    <strong>Benefits:</strong> Save unlimited results, track how your views change over time, retake the test anytime, and access your results from any device.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
