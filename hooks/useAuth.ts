/**
 * Hook React pour l'authentification
 * 
 * Usage:
 *   const { user, loading, signOut } = useAuth()
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseBrowserClient } from '@/lib/supabase/browser'
import type { User } from '@supabase/supabase-js'

export interface UseAuthResult {
  user: User | null
  loading: boolean
  signOut: () => Promise<void>
  refresh: () => Promise<void>
}

/**
 * Hook pour gérer l'authentification utilisateur
 */
export function useAuth(): UseAuthResult {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  
  const refresh = async () => {
    setLoading(true)
    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error) throw error
      setUser(user)
    } catch (error) {
      console.error('Erreur useAuth:', error)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }
  
  const signOut = async () => {
    try {
      await supabase.auth.signOut()
      setUser(null)
      router.push('/login')
    } catch (error) {
      console.error('Erreur signOut:', error)
    }
  }
  
  useEffect(() => {
    refresh()
    
    // Écouter les changements d'auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
      
      if (event === 'SIGNED_OUT') {
        router.push('/login')
      }
    })
    
    return () => {
      subscription.unsubscribe()
    }
  }, [router, supabase.auth])
  
  return {
    user,
    loading,
    signOut,
    refresh
  }
}

