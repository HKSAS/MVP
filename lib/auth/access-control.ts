/**
 * Système de contrôle d'accès pour Autoval IA
 * 
 * Vérifie les quotas, abonnements et accès VIP
 */

import { getSupabaseBrowserClient } from '@/lib/supabase/browser'

export type AccessResult = {
  hasAccess: boolean
  reason: 'vip_access' | 'admin_access' | 'subscription_active' | 'trial_active' | 'free_quota' | 'user_not_found'
  message: string
  isAdmin?: boolean
  isVip?: boolean
  quotaRecherchesRestantes?: number
  quotaAnalysesRestantes?: number
  unlimited?: boolean
  plan?: string
  trialEnds?: string
}

/**
 * Vérifie l'accès global de l'utilisateur
 */
export async function checkUserAccess(userId?: string): Promise<AccessResult> {
  const supabase = getSupabaseBrowserClient()
  
  // Récupérer l'utilisateur connecté si pas fourni
  if (!userId) {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return {
        hasAccess: false,
        reason: 'user_not_found',
        message: 'Non authentifié'
      }
    }
    userId = user.id
  }
  
  // Appeler la fonction SQL
  const { data, error } = await supabase
    .rpc('check_user_access', { p_user_id: userId })
  
  if (error) {
    console.error('Erreur check_user_access:', error)
    return {
      hasAccess: false,
      reason: 'user_not_found',
      message: 'Erreur de vérification'
    }
  }
  
  return {
    hasAccess: data.has_access,
    reason: data.reason,
    message: data.message,
    isAdmin: data.is_admin,
    isVip: data.is_vip,
    quotaRecherchesRestantes: data.quota_recherches_restantes,
    quotaAnalysesRestantes: data.quota_analyses_restantes,
    unlimited: data.unlimited,
    plan: data.plan,
    trialEnds: data.trial_ends
  }
}

/**
 * Vérifie si l'utilisateur peut effectuer une action spécifique
 */
export async function canPerformAction(
  actionType: 'recherche' | 'analyse',
  userId?: string
): Promise<{
  canPerform: boolean
  reason: string
  remaining?: number
  unlimited?: boolean
  message?: string
  show_alert?: boolean
}> {
  const supabase = getSupabaseBrowserClient()
  
  // Récupérer l'utilisateur si pas fourni
  if (!userId) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return {
        canPerform: false,
        reason: 'not_authenticated',
        message: 'Vous devez être connecté'
      }
    }
    userId = user.id
  }
  
  const { data, error } = await supabase
    .rpc('can_perform_action', {
      p_user_id: userId,
      p_action_type: actionType
    })
  
  if (error) {
    console.error('Erreur can_perform_action:', error)
    return {
      canPerform: false,
      reason: 'error',
      message: 'Erreur de vérification'
    }
  }
  
  return {
    canPerform: data.can_perform,
    reason: data.reason,
    remaining: data.remaining,
    unlimited: data.unlimited,
    message: data.message,
    show_alert: data.show_alert
  }
}

