/**
 * Système de tracking d'utilisation
 * 
 * Enregistre les recherches et analyses effectuées
 */

import { getSupabaseBrowserClient } from '@/lib/supabase/browser'

export interface TrackUsageResult {
  success: boolean
  remaining?: number
  unlimited?: boolean
  message?: string
  error?: string
  show_alert?: boolean
}

/**
 * Enregistre l'utilisation d'une fonctionnalité
 * Vérifie automatiquement les quotas avant d'enregistrer
 */
export async function trackUsage(
  actionType: 'recherche' | 'analyse',
  actionData?: Record<string, any>,
  userId?: string
): Promise<TrackUsageResult> {
  const supabase = getSupabaseBrowserClient()
  
  // Récupérer l'utilisateur si pas fourni
  if (!userId) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return {
        success: false,
        message: 'Non authentifié',
        error: 'not_authenticated'
      }
    }
    userId = user.id
  }
  
  // Appeler la fonction SQL qui vérifie et enregistre
  const { data, error } = await supabase
    .rpc('track_usage', {
      p_user_id: userId,
      p_action_type: actionType,
      p_action_data: actionData || {}
    })
  
  if (error) {
    console.error('Erreur track_usage:', error)
    return {
      success: false,
      message: 'Erreur lors du tracking',
      error: error.message
    }
  }
  
  // Vérifier si le tracking a réussi
  if (data.success === false) {
    return {
      success: false,
      message: data.message || 'Quota épuisé',
      error: data.error || 'quota_exceeded',
      show_alert: data.show_alert || false
    }
  }
  
  return {
    success: true,
    remaining: data.remaining,
    unlimited: data.unlimited,
    show_alert: data.show_alert || false
  }
}

/**
 * Récupère l'historique d'utilisation d'un utilisateur
 */
export async function getUsageHistory(
  limit: number = 50,
  userId?: string
): Promise<Array<{
  id: string
  action_type: 'recherche' | 'analyse'
  action_data: Record<string, any>
  created_at: string
}>> {
  const supabase = getSupabaseBrowserClient()
  
  if (!userId) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return []
    }
    userId = user.id
  }
  
  const { data, error } = await supabase
    .from('usage_tracking')
    .select('id, action_type, action_data, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)
  
  if (error) {
    console.error('Erreur getUsageHistory:', error)
    return []
  }
  
  return data || []
}

