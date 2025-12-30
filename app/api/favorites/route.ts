import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '@/lib/auth'
import { createRouteLogger } from '@/lib/logger'
import { createErrorResponse, AuthenticationError } from '@/lib/errors'
import type { GetFavoritesQuery, GetFavoritesResponse } from '@/lib/types/favorites'

export const dynamic = 'force-dynamic'

const log = createRouteLogger('/api/favorites GET')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

/**
 * Crée un client Supabase avec le token de session de l'utilisateur
 * Nécessaire pour que RLS fonctionne correctement
 */
function createSupabaseClientWithToken(accessToken: string) {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

/**
 * GET /api/favorites
 * Récupère la liste des favoris de l'utilisateur connecté
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    log.info('🔵 [FAVORITES/GET] Début requête')
    
    // Récupérer le token depuis les headers
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      log.error('❌ [FAVORITES/GET] Pas de token dans les headers')
      return NextResponse.json({
        success: false,
        error: 'Vous devez être connecté',
        code: 'AUTHENTICATION_ERROR'
      }, { status: 401 })
    }
    
    const token = authHeader.replace('Bearer ', '')
    
    // Vérifier l'authentification et récupérer l'utilisateur
    let user
    try {
      user = await requireAuth(request)
      log.info('✅ [FAVORITES/GET] Utilisateur authentifié', { userId: user.id, email: user.email })
    } catch (authError) {
      log.error('❌ [FAVORITES/GET] Erreur authentification', { 
        error: authError instanceof Error ? authError.message : String(authError)
      })
      throw authError
    }
    
    const userId = user.id
    
    // Créer le client Supabase avec le token de session (IMPORTANT pour RLS)
    const supabase = createSupabaseClientWithToken(token)
    
    // Parser les query params
    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)
    const sort = searchParams.get('sort') || 'created_at'
    
    // Valider les paramètres
    const validSorts = ['created_at', 'price', 'score']
    const sortBy = validSorts.includes(sort) ? sort : 'created_at'
    
    log.info('📥 [FAVORITES/GET] Paramètres', { userId, limit, offset, sortBy })
    
    // Construire la requête
    let query = supabase
      .from('favorites')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
    
    // Trier
    switch (sortBy) {
      case 'price':
        query = query.order('price', { ascending: false, nullsFirst: false })
        break
      case 'score':
        query = query.order('score', { ascending: false, nullsFirst: false })
        break
      default:
        query = query.order('created_at', { ascending: false })
    }
    
    // Pagination
    query = query.range(offset, offset + limit - 1)
    
    log.info('🔍 [FAVORITES/GET] Exécution requête Supabase', { userId })
    const { data: favorites, error, count } = await query
    
    if (error) {
      log.error('❌ [FAVORITES/GET] Erreur récupération favoris', { 
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        userId,
        tableExists: 'Vérifiez que la table favorites existe dans Supabase'
      })
      throw new Error(`Erreur lors de la récupération des favoris: ${error.message}`)
    }
    
    const duration = Date.now() - startTime
    log.info('✅ [FAVORITES/GET] Favoris récupérés avec succès', { 
      userId, 
      count: favorites?.length || 0, 
      totalCount: count || 0,
      duration: `${duration}ms`
    })
    
    return NextResponse.json<GetFavoritesResponse>({
      success: true,
      data: favorites || [],
      totalCount: count || 0,
    })
    
  } catch (error) {
    const duration = Date.now() - startTime
    
    if (error instanceof AuthenticationError) {
      log.error('❌ [FAVORITES/GET] Erreur authentification', {
        error: error.message,
        duration: `${duration}ms`
      })
      return createErrorResponse(error)
    }
    
    log.error('❌ [FAVORITES/GET] Erreur serveur inattendue', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      duration: `${duration}ms`
    })
    
    return createErrorResponse(error)
  }
}
