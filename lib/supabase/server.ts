/**
 * Client Supabase pour le serveur (API routes)
 * Utilise la session de l'utilisateur depuis les headers Authorization
 */

import { createClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

/**
 * Obtient le client Supabase avec la session de l'utilisateur
 * Pour les API routes Next.js
 * Utilise les cookies HTTP pour la session
 */
export async function getSupabaseServerClient(request?: NextRequest) {
  // Créer le client basique
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
  
  // Si une requête est fournie, essayer d'extraire le token depuis les headers
  if (request) {
    const authHeader = request.headers.get('authorization')
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '')
      // Vérifier le token
      const { data: { user } } = await supabase.auth.getUser(token)
      if (user) {
        // Créer un client avec ce token
        return createClient(supabaseUrl, supabaseAnonKey, {
          global: {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        })
      }
    }
  }
  
  return supabase
}

/**
 * Obtient le client Supabase avec service role (pour opérations admin)
 */
export function getSupabaseAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

