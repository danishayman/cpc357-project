'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

/**
 * Hook to handle authentication state changes and automatic token refresh
 * 
 * This hook:
 * - Automatically refreshes tokens before they expire
 * - Redirects to login on session expiration
 * - Handles sign out events
 */
export function useAuth() {
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    // Set up auth state change listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      // Handle token refresh
      if (event === 'TOKEN_REFRESHED') {
        console.log('Token refreshed successfully')
      }

      // Handle signed out or expired sessions
      if (event === 'SIGNED_OUT' || (!session && event === 'USER_DELETED')) {
        router.push('/login')
      }

      // Handle invalid or expired token
      if (event === 'TOKEN_REFRESHED' && !session) {
        router.push('/login')
      }
    })

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe()
    }
  }, [router, supabase])

  return { supabase }
}
