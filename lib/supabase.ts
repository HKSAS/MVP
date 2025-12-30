/**
 * Client Supabase - Export par défaut pour compatibilité
 * 
 * ⚠️ Pour les composants client (browser), utilisez plutôt:
 *   import { getSupabaseBrowserClient } from '@/lib/supabase/browser'
 *   const supabase = getSupabaseBrowserClient()
 * 
 * Ce fichier maintient la compatibilité avec le code existant qui utilise:
 *   import { supabase } from '@/lib/supabase'
 */

import { getSupabaseBrowserClient } from './supabase/browser'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Export par défaut pour compatibilité avec le code existant
let supabaseInstance: SupabaseClient | null = null

function getSupabaseInstance(): SupabaseClient {
  if (supabaseInstance) {
    return supabaseInstance
  }

  // Si côté client, utiliser le client browser
  if (typeof window !== 'undefined') {
    supabaseInstance = getSupabaseBrowserClient()
    return supabaseInstance
  }

  // Côté serveur - créer un client basique
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Variables d\'environnement Supabase manquantes côté serveur. ' +
      'Vérifiez NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY'
    )
  }

  // Pour le serveur, créer un client simple
  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey)
  return supabaseInstance
}

// Export par défaut (compatibilité) - lazy getter via Proxy
// Cela permet de créer le client seulement quand il est utilisé
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const instance = getSupabaseInstance()
    const value = instance[prop as keyof SupabaseClient]
    // Si c'est une fonction, bind le contexte
    if (typeof value === 'function') {
      return value.bind(instance)
    }
    return value
  }
}) as SupabaseClient

// Fonction helper pour vérifier la configuration
export function isSupabaseConfigured(): boolean {
  try {
    if (typeof window !== 'undefined') {
      getSupabaseBrowserClient()
      return true
    }
    // Côté serveur
    return !!(
      process.env.NEXT_PUBLIC_SUPABASE_URL && 
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )
  } catch {
    return false
  }
}

// Export du client browser pour usage explicite
export { getSupabaseBrowserClient } from './supabase/browser'

