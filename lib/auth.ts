/**
 * Utilitaires d'authentification Supabase
 */

import { createClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { AuthenticationError } from './errors'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Client avec service role key pour les opérations serveur
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

/**
 * Récupère l'utilisateur authentifié depuis la requête
 * Essaie d'abord les headers, puis les cookies Supabase
 * @param request - La requête Next.js
 * @returns L'utilisateur ou null si non authentifié
 */
export async function getAuthenticatedUser(request: NextRequest): Promise<{ id: string; email: string } | null> {
  try {
    // Méthode 1 : Récupérer le token depuis les headers
    const authHeader = request.headers.get('authorization')
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '')
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)

      if (!error && user) {
        return {
          id: user.id,
          email: user.email || '',
        }
      }
    }

    // Méthode 2 : Récupérer depuis les cookies Supabase
    const cookieStore = await cookies()
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      // @ts-ignore - cookies option exists but not in types
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set() {
          // Ne pas modifier les cookies côté serveur
        },
        remove() {
          // Ne pas modifier les cookies côté serveur
        },
      },
    })

    const { data: { session }, error: sessionError } = await supabase.auth.getSession()

    if (!sessionError && session?.user) {
      return {
        id: session.user.id,
        email: session.user.email || '',
      }
    }

    return null
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
    throw new AuthenticationError('Authentication required')
  }

  return user
}

/**
 * Alias pour requireAuth - nom plus explicite pour le front
 * Récupère l'utilisateur authentifié ou lance une erreur 401
 * @param request - La requête Next.js
 * @returns L'utilisateur authentifié
 * @throws Error avec message &apos;Unauthorized: Authentication required&apos; si non authentifié
 */
export async function getCurrentUserOrThrow(request: NextRequest): Promise<{ id: string; email: string }> {
  return requireAuth(request)
}

/**
 * Vérifie si l'utilisateur a le rôle admin
 * @param userId - L'ID de l'utilisateur
 * @returns true si admin, false sinon
 */
export async function isAdmin(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()

    if (error || !data) {
      return false
    }

    return data.role === 'admin'
  } catch (error) {
    console.error('Erreur vérification admin:', error)
    return false
  }
}

/**
 * Vérifie si l'utilisateur authentifié est admin
 * @param request - La requête Next.js
 * @returns true si admin, false sinon
 */
export async function requireAdmin(request: NextRequest): Promise<{ id: string; email: string }> {
  const user = await requireAuth(request)
  
  const admin = await isAdmin(user.id)
  if (!admin) {
    throw new AuthenticationError('Admin access required')
  }
  
  return user
}
