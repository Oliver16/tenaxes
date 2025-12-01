'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

import { supabase } from '@/lib/supabase'

export default function AuthCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const exchangeSession = async () => {
      const code = searchParams.get('code')

      if (!code) {
        router.replace('/')
        return
      }

      await supabase.auth.exchangeCodeForSession(code)
      router.replace('/')
    }

    exchangeSession()
  }, [router, searchParams])

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-lg font-medium">Completing sign in...</p>
    </div>
  )
}
