/**
 * Système de vérification d'accès utilisateur
 * 
 * Vérifie si un utilisateur a accès aux fonctionnalités premium/VIP
 * en combinant :
 * - Le système VIP (access_override)
 * - Le plan_type dans profiles
 * - Les abonnements Stripe actifs
 */

import { getSupabaseBrowserClient } from './supabase/browser'

export interface AccessResult {
  hasAccess: boolean
  reason: string | null
  source?: 'vip' | 'plan_type' | 'subscription' | null
}

/**
 * Vérifie si un utilisateur a accès aux fonctionnalités premium
 * @param userId - ID de l'utilisateur (optionnel, récupéré automatiquement si non fourni)
 * @returns Résultat de la vérification d'accès
 */
export async function checkUserAccess(userId?: string): Promise<AccessResult> {
  const supabase = getSupabaseBrowserClient()
  
  try {
    // Récupérer l'utilisateur si pas fourni
    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { 
          hasAccess: false, 
          reason: 'Non connecté',
          source: null
        }
      }
      userId = user.id
    }
    
    // Appeler la fonction SQL qui vérifie tout
    const { data, error } = await supabase
      .rpc('check_user_has_access', { p_user_id: userId })
    
    if (error) {
      console.error('Erreur check access:', error)
      return { 
        hasAccess: false, 
        reason: 'Erreur de vérification',
        source: null
      }
    }
    
    if (data === true) {
      // Récupérer les détails pour savoir la source de l'accès
      const { data: profile } = await supabase
        .from('profiles')
        .select('access_override, plan_type')
        .eq('id', userId)
        .single()
      
      let source: 'vip' | 'plan_type' | 'subscription' | null = null
      
      if (profile?.access_override) {
        source = 'vip'
      } else if (profile?.plan_type && ['premium', 'enterprise', 'lifetime_free'].includes(profile.plan_type)) {
        source = 'plan_type'
      } else {
        source = 'subscription'
      }
      
      return { 
        hasAccess: true,
        reason: null,
        source
      }
    }
    
    return { 
      hasAccess: false, 
      reason: 'Abonnement requis',
      source: null
    }
    
  } catch (error) {
    console.error('Erreur:', error)
    return { 
      hasAccess: false, 
      reason: 'Erreur serveur',
      source: null
    }
  }
}

/**
 * Hook React pour vérifier l'accès utilisateur
 * 
 * ⚠️ Pour utiliser ce hook dans un composant React, utilisez plutôt :
 *   import { useAccess } from '@/hooks/useAccess'
 * 
 * Ce fichier exporte uniquement la fonction checkUserAccess() pour usage direct.
 */

