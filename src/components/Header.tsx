'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import AuthModal from './AuthModal'

export default function Header() {
  const { user, profile, signOut, loading, isAdmin } = useAuth()
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')

  const handleSignOut = async () => {
    await signOut()
  }

  const openAuthModal = (mode: 'login' | 'register') => {
    setAuthMode(mode)
    setShowAuthModal(true)
  }

  return (
    <>
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-8">
              <Link href="/" className="text-xl font-bold text-gray-900">
                TenAxes
              </Link>
              <nav className="hidden md:flex md:gap-6">
                <Link href="/survey" className="text-sm font-medium text-gray-700 hover:text-gray-900">
                  Take Survey
                </Link>
                {isAdmin && (
                  <Link href="/admin" className="text-sm font-medium text-gray-700 hover:text-gray-900">
                    Analytics
                  </Link>
                )}
                {isAdmin && (
                  <Link href="/admin/questions" className="text-sm font-medium text-gray-700 hover:text-gray-900">
                    Questions
                  </Link>
                )}
              </nav>
            </div>

            <div className="flex items-center gap-4">
              {loading ? (
                <div className="h-8 w-8 animate-pulse rounded-full bg-gray-200" />
              ) : user ? (
                <div className="flex items-center gap-4">
                  <div className="text-sm">
                    <div className="font-medium text-gray-900">{profile?.email}</div>
                    {isAdmin && (
                      <div className="text-xs text-blue-600">Admin</div>
                    )}
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openAuthModal('login')}
                    className="rounded-md px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => openAuthModal('register')}
                    className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                  >
                    Sign Up
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        defaultMode={authMode}
      />
    </>
  )
}
