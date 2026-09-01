'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

declare global {
  interface Window {
    AndroidWidget?: {
      saveSession(token: string): void
      clearSession(): void
    }
  }
}

export function AndroidWidgetProvider() {
  useEffect(() => {
    const supabase = createClient()

    // Send initial session if it exists
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.access_token && typeof window !== 'undefined' && window.AndroidWidget) {
        window.AndroidWidget.saveSession(session.access_token)
      }
    })

    // Listen for auth state changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (typeof window === 'undefined' || !window.AndroidWidget) return

      if (session?.access_token) {
        window.AndroidWidget.saveSession(session.access_token)
      } else if (event === 'SIGNED_OUT') {
        window.AndroidWidget.clearSession()
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return null
}
