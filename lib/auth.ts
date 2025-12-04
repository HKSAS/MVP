/**
 * Utilitaires d'authentification Supabase
 */

import { createClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Client avec service role key pour les opérations serveur
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

/**
 * Récupère l'utilisateur authentifié depuis la requête
 * @param request - La requête Next.js
 * @returns L'utilisateur ou null si non authentifié
 */
export async function getAuthenticatedUser(request: NextRequest): Promise<{ id: string; email: string } | null> {
  try {
    // Récupérer le token depuis les headers
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null
    }

    const token = authHeader.replace('Bearer ', '')

    // Vérifier le token avec Supabase
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)

    if (error || !user) {
      return null
    }

    return {
      id: user.id,
      email: user.email || '',
    }
  } catch (error) {
    console.error('Erreur authentification:', error)
    return null
  }
}

/**
 * Vérifie si l'utilisateur est authentifié
 * @param request - La requête Next.js
 * @returns true si authentifié, false sinon
 */
export async function isAuthenticated(request: NextRequest): Promise<boolean> {
  const user = await getAuthenticatedUser(request)
  return user !== null
}

/**
 * Middleware pour protéger une route API
 * @param request - La requête Next.js
 * @returns L'utilisateur ou lance une erreur
 */
export async function requireAuth(request: NextRequest): Promise<{ id: string; email: string }> {
  const user = await getAuthenticatedUser(request)

  if (!user) {
    throw new Error('Unauthorized: Authentication required')
  }

  return user
}

/**
 * Alias pour requireAuth - nom plus explicite pour le front
 * Récupère l'utilisateur authentifié ou lance une erreur 401
 * @param request - La requête Next.js
 * @returns L'utilisateur authentifié
 * @throws Error avec message 'Unauthorized: Authentication required' si non authentifié
 */
export async function getCurrentUserOrThrow(request: NextRequest): Promise<{ id: string; email: string }> {
  return requireAuth(request)
}

