/**
 * Client Supabase pour le navigateur
 * 
 * Ce fichier exporte une fonction qui crée un client Supabase
 * uniquement pour le côté client (browser).
 * 
 * Usage:
 *   import { getSupabaseBrowserClient } from '@/lib/supabase/browser'
 *   const supabase = getSupabaseBrowserClient()
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'

let browserClient: SupabaseClient | null = null

/**
 * Obtient ou crée le client Supabase pour le navigateur
 * 
 * @throws {Error} Si les variables d'environnement sont manquantes
 */
export function getSupabaseBrowserClient(): SupabaseClient {
  // Si le client existe déjà, le retourner (singleton)
  if (browserClient) {
    return browserClient
  }

  // Vérifier que nous sommes côté client
  if (typeof window === 'undefined') {
    throw new Error(
      'getSupabaseBrowserClient() ne peut être appelé que côté client (browser). ' +
      'Utilisez getSupabaseServerClient() pour le serveur.'
    )
  }

  // Récupérer les variables d'environnement
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Logs dev pour diagnostic
  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 [DEV] Variables d\'environnement:', {
      hasUrl: !!supabaseUrl,
      urlLength: supabaseUrl?.length || 0,
      hasKey: !!supabaseAnonKey,
      keyLength: supabaseAnonKey?.length || 0,
      origin: window.location.origin,
    })
  }

  // Vérification stricte - throw une erreur explicite si manquant
  if (!supabaseUrl || !supabaseAnonKey) {
    const missingVars: string[] = []
    if (!supabaseUrl) missingVars.push('NEXT_PUBLIC_SUPABASE_URL')
    if (!supabaseAnonKey) missingVars.push('NEXT_PUBLIC_SUPABASE_ANON_KEY')

    const errorMsg = `Variables d'environnement Supabase manquantes: ${missingVars.join(', ')}\n` +
      `Vérifiez votre fichier .env.local et redémarrez le serveur de développement (npm run dev)`
    
    console.error('❌ [DEV]', errorMsg)
    throw new Error(errorMsg)
  }

  // Validation de l'URL
  try {
    new URL(supabaseUrl)
  } catch {
    throw new Error(
      `NEXT_PUBLIC_SUPABASE_URL n'est pas une URL valide: ${supabaseUrl}`
    )
  }

  // Logs dev uniquement
  if (process.env.NODE_ENV === 'development') {
    console.log('🔵 [DEV] Client Supabase initialisé:', {
      origin: window.location.origin,
      supabaseUrl: supabaseUrl,
      hasAnonKey: !!supabaseAnonKey,
      // Ne jamais logger la clé elle-même
    })
  }

  // Créer le client avec configuration optimisée
  browserClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
    },
    global: {
      // Headers pour éviter les problèmes CORS
      headers: {
        'apikey': supabaseAnonKey,
      },
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  })

  // Test de connexion en dev pour diagnostiquer les problèmes
  if (process.env.NODE_ENV === 'development') {
    // Tester la connexion à l'API Supabase
    fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'HEAD',
      headers: {
        'apikey': supabaseAnonKey,
      },
    })
      .then(response => {
        if (response.ok) {
          console.log('✅ [DEV] Connexion Supabase testée avec succès');
        } else {
          console.warn('⚠️ [DEV] Connexion Supabase testée mais réponse:', response.status, response.statusText);
        }
      })
      .catch(error => {
        console.error('❌ [DEV] Erreur lors du test de connexion Supabase:', error);
        console.error('💡 [DEV] Vérifiez:', {
          url: supabaseUrl,
          origin: typeof window !== 'undefined' ? window.location.origin : 'N/A',
          errorMessage: error.message,
        });
      });
  }

  return browserClient
}

