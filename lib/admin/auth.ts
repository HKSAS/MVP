/**
 * Utilitaires pour la vérification admin côté client
 */

import { getSupabaseBrowserClient } from '@/lib/supabase/browser'

export interface AdminCheckResult {
  isAdmin: boolean
  loading: boolean
  error?: string
}

/**
 * Vérifie si l'utilisateur actuel est admin
 * Admin = role='pro' OU access_override=true
 */
export async function checkAdminStatus(): Promise<AdminCheckResult> {
  try {
    const supabase = getSupabaseBrowserClient()
    
    // Récupérer la session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError || !session) {
      return { isAdmin: false, loading: false, error: 'Not authenticated' }
    }

    // Récupérer le profil
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, access_override')
      .eq('id', session.user.id)
      .single()

    if (profileError || !profile) {
      return { isAdmin: false, loading: false, error: 'Profile not found' }
    }

    // Vérifier si admin
    const isAdmin = profile.role === 'pro' || profile.access_override === true

    return { isAdmin, loading: false }
  } catch (error) {
    console.error('Error checking admin status:', error)
    return { 
      isAdmin: false, 
      loading: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

