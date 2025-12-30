import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '@/lib/auth'
import { createRouteLogger } from '@/lib/logger'
import { createErrorResponse, ValidationError, AuthenticationError } from '@/lib/errors'
import { z } from 'zod'
import type { ToggleFavoriteBody, ToggleFavoriteResponse } from '@/lib/types/favorites'

const log = createRouteLogger('/api/favorites/toggle')

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

const toggleFavoriteSchema = z.object({
  source: z.string().min(1, 'Source requise'),
  listing_id: z.string().min(1, 'Listing ID requis'),
  listing_url: z.string().url('URL invalide'),
  title: z.string().optional(),
  price: z.number().int().positive().optional().nullable(),
  year: z.number().int().min(1900).max(2100).optional().nullable(),
  mileage: z.number().int().positive().optional().nullable(),
  fuel: z.string().optional().nullable(),
  transmission: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  score: z.number().int().min(0).max(100).optional().nullable(),
  risk_score: z.number().int().min(0).max(100).optional().nullable(),
  extracted_features: z.record(z.any()).optional().nullable(),
})

/**
 * POST /api/favorites/toggle
 * Ajoute ou supprime un favori
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    log.info('🔵 [FAVORITES/TOGGLE] Début requête')
    
    // Récupérer le token depuis les headers
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      log.error('❌ [FAVORITES/TOGGLE] Pas de token dans les headers')
      return NextResponse.json({
        success: false,
        error: 'Vous devez être connecté pour ajouter aux favoris',
        code: 'AUTHENTICATION_ERROR'
      }, { status: 401 })
    }
    
    const token = authHeader.replace('Bearer ', '')
    
    // Vérifier l'authentification et récupérer l'utilisateur
    let user
    try {
      user = await requireAuth(request)
      log.info('✅ [FAVORITES/TOGGLE] Utilisateur authentifié', { userId: user.id, email: user.email })
    } catch (authError) {
      log.error('❌ [FAVORITES/TOGGLE] Erreur authentification', { 
        error: authError instanceof Error ? authError.message : String(authError)
      })
      throw authError
    }
    
    const userId = user.id
    
    // Créer le client Supabase avec le token de session (IMPORTANT pour RLS)
    const supabase = createSupabaseClientWithToken(token)
    
    // Parser et valider le body
    let body
    try {
      body = await request.json()
      log.info('📥 [FAVORITES/TOGGLE] Body reçu', { 
        source: body.source, 
        listing_id: body.listing_id,
        hasTitle: !!body.title 
      })
    } catch (parseError) {
      log.error('❌ [FAVORITES/TOGGLE] Erreur parsing body', { error: parseError instanceof Error ? parseError.message : String(parseError) })
      throw new ValidationError('Body JSON invalide')
    }
    
    const validationResult = toggleFavoriteSchema.safeParse(body)
    
    if (!validationResult.success) {
      log.error('❌ [FAVORITES/TOGGLE] Validation échouée', { 
        errors: validationResult.error.errors,
        body: body 
      })
      throw new ValidationError('Données invalides', validationResult.error.errors)
    }
    
    const data = validationResult.data as ToggleFavoriteBody
    log.info('✅ [FAVORITES/TOGGLE] Données validées', { 
      source: data.source, 
      listing_id: data.listing_id 
    })
    
    // Vérifier si le favori existe déjà
    log.info('🔍 [FAVORITES/TOGGLE] Vérification existence favori', { 
      userId, 
      source: data.source, 
      listing_id: data.listing_id 
    })
    
    const { data: existing, error: checkError } = await supabase
      .from('favorites')
      .select('id')
      .eq('user_id', userId)
      .eq('source', data.source)
      .eq('listing_id', data.listing_id)
      .maybeSingle()
    
    if (checkError) {
      log.error('❌ [FAVORITES/TOGGLE] Erreur vérification favori', { 
        error: checkError.message,
        code: checkError.code,
        details: checkError.details,
        hint: checkError.hint,
        userId,
        tableExists: 'Vérifiez que la table favorites existe dans Supabase'
      })
      throw new Error(`Erreur lors de la vérification du favori: ${checkError.message}`)
    }
    
    log.info('🔍 [FAVORITES/TOGGLE] Résultat vérification', { 
      exists: !!existing,
      existingId: existing?.id 
    })
    
    // Si existe => supprimer
    if (existing) {
      log.info('🗑️ [FAVORITES/TOGGLE] Suppression favori', { 
        favoriteId: existing.id,
        userId, 
        source: data.source, 
        listingId: data.listing_id 
      })
      
      const { error: deleteError } = await supabase
        .from('favorites')
        .delete()
        .eq('id', existing.id)
        .eq('user_id', userId) // Sécurité: double vérification user_id
      
      if (deleteError) {
        log.error('❌ [FAVORITES/TOGGLE] Erreur suppression favori', { 
          error: deleteError.message,
          code: deleteError.code,
          details: deleteError.details,
          hint: deleteError.hint,
          favoriteId: existing.id,
          userId
        })
        throw new Error(`Erreur lors de la suppression du favori: ${deleteError.message}`)
      }
      
      const duration = Date.now() - startTime
      log.info('✅ [FAVORITES/TOGGLE] Favori supprimé avec succès', { 
        userId, 
        source: data.source, 
        listingId: data.listing_id,
        duration: `${duration}ms`
      })
      
      return NextResponse.json<ToggleFavoriteResponse>({
        success: true,
        status: 'removed',
      })
    }
    
    // Sinon => créer
    // Convertir undefined en null pour Supabase (qui accepte null mais pas undefined)
    const favoriteData = {
      user_id: userId, // SÉCURITÉ: toujours depuis la session, jamais depuis le client
      source: data.source,
      listing_id: data.listing_id,
      listing_url: data.listing_url,
      title: data.title ?? null,
      price: (data.price ?? null) as number | null,
      year: (data.year ?? null) as number | null,
      mileage: (data.mileage ?? null) as number | null,
      fuel: data.fuel ?? null,
      transmission: data.transmission ?? null,
      city: data.city ?? null,
      score: (data.score ?? null) as number | null,
      risk_score: (data.risk_score ?? null) as number | null,
      extracted_features: data.extracted_features ?? {},
    }
    
    log.info('➕ [FAVORITES/TOGGLE] Insertion favori', { 
      userId, 
      source: data.source, 
      listingId: data.listing_id,
      favoriteData: { ...favoriteData, user_id: '[REDACTED]' } // Ne pas logger user_id en clair
    })
    
    const { data: newFavorite, error: insertError } = await supabase
      .from('favorites')
      .insert(favoriteData)
      .select()
      .single()
    
    if (insertError) {
      // Analyser le type d'erreur Supabase
      const errorCode = insertError.code
      const errorMessage = insertError.message
      const isRLSError = errorCode === '42501' || errorMessage.includes('row-level security') || errorMessage.includes('policy')
      const isConstraintError = errorCode === '23505' || errorMessage.includes('unique constraint') || errorMessage.includes('duplicate')
      const isForeignKeyError = errorCode === '23503' || errorMessage.includes('foreign key')
      
      let userFriendlyMessage = 'Erreur lors de l\'ajout du favori'
      
      if (isRLSError) {
        userFriendlyMessage = 'Erreur de permissions. Vérifiez que vous êtes connecté et que les policies RLS sont correctement configurées.'
      } else if (isConstraintError) {
        userFriendlyMessage = 'Cette annonce est déjà dans vos favoris.'
      } else if (isForeignKeyError) {
        userFriendlyMessage = 'Erreur de référence utilisateur. Veuillez vous reconnecter.'
      } else if (errorCode === '42P01') {
        userFriendlyMessage = 'La table favorites n\'existe pas. Contactez le support.'
      }
      
      log.error('❌ [FAVORITES/TOGGLE] Erreur insertion favori', { 
        error: errorMessage,
        code: errorCode,
        details: insertError.details,
        hint: insertError.hint,
        userId,
        isRLSError,
        isConstraintError,
        isForeignKeyError,
        tableExists: 'Vérifiez que la table favorites existe dans Supabase',
        rlsEnabled: 'Vérifiez que RLS est correctement configuré',
        favoriteData: { ...favoriteData, user_id: '[REDACTED]' }
      })
      
      throw new Error(userFriendlyMessage)
    }
    
    const duration = Date.now() - startTime
    log.info('✅ [FAVORITES/TOGGLE] Favori ajouté avec succès', { 
      userId, 
      source: data.source, 
      listingId: data.listing_id,
      favoriteId: newFavorite.id,
      duration: `${duration}ms`
    })
    
    return NextResponse.json<ToggleFavoriteResponse>({
      success: true,
      status: 'added',
      data: newFavorite,
    })
    
  } catch (error) {
    const duration = Date.now() - startTime
    
    if (error instanceof AuthenticationError) {
      log.error('❌ [FAVORITES/TOGGLE] Erreur authentification', {
        error: error.message,
        duration: `${duration}ms`
      })
      return NextResponse.json({
        success: false,
        error: 'Vous devez être connecté pour ajouter aux favoris',
        code: 'AUTHENTICATION_ERROR'
      }, { status: 401 })
    }
    
    if (error instanceof ValidationError) {
      log.error('❌ [FAVORITES/TOGGLE] Erreur validation', {
        error: error.message,
        duration: `${duration}ms`
      })
      return NextResponse.json({
        success: false,
        error: error.message || 'Données invalides',
        code: 'VALIDATION_ERROR',
        details: error.details
      }, { status: 400 })
    }
    
    // Erreur générique - essayer d'extraire un message utile
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : undefined
    
    // Détecter le type d'erreur
    const isDatabaseError = errorMessage.includes('relation') || 
                           errorMessage.includes('does not exist') ||
                           errorMessage.includes('column') ||
                           errorMessage.includes('syntax error')
    const isRLSError = errorMessage.includes('row-level security') || 
                      errorMessage.includes('policy') ||
                      errorMessage.includes('permission denied') ||
                      errorMessage.includes('new row violates')
    const isConstraintError = errorMessage.includes('unique constraint') ||
                            errorMessage.includes('duplicate key')
    const isForeignKeyError = errorMessage.includes('foreign key') ||
                             errorMessage.includes('violates foreign key')
    
    let userMessage = 'Une erreur s\'est produite lors de l\'ajout du favori'
    let errorCode = 'INTERNAL_SERVER_ERROR'
    
    if (isDatabaseError) {
      userMessage = 'Erreur de base de données. Vérifiez que la table favorites existe et est correctement configurée.'
      errorCode = 'DATABASE_ERROR'
    } else if (isRLSError) {
      userMessage = 'Erreur de permissions. Vérifiez que vous êtes bien connecté et que les policies RLS sont correctement configurées.'
      errorCode = 'RLS_ERROR'
    } else if (isConstraintError) {
      userMessage = 'Cette annonce est déjà dans vos favoris.'
      errorCode = 'DUPLICATE_ERROR'
    } else if (isForeignKeyError) {
      userMessage = 'Erreur de référence. L\'utilisateur n\'existe pas.'
      errorCode = 'FOREIGN_KEY_ERROR'
    }
    
    log.error('❌ [FAVORITES/TOGGLE] Erreur serveur inattendue', {
      error: errorMessage,
      stack: errorStack,
      duration: `${duration}ms`,
      isDatabaseError,
      isRLSError,
      isConstraintError,
      isForeignKeyError,
      // En développement, inclure plus de détails
      ...(process.env.NODE_ENV === 'development' && {
        fullError: String(error),
        errorType: error instanceof Error ? error.constructor.name : typeof error
      })
    })
    
    return NextResponse.json({
      success: false,
      error: userMessage,
      code: errorCode,
      // En développement, inclure le message d'erreur complet
      ...(process.env.NODE_ENV === 'development' && { 
        details: errorMessage,
        stack: errorStack
      })
    }, { status: 500 })
  }
}

