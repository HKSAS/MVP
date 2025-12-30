import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAuthenticatedUser } from '@/lib/auth'
import { createRouteLogger } from '@/lib/logger'
import { createErrorResponse } from '@/lib/errors'

export const dynamic = 'force-dynamic'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseAnonKey)

/**
 * GET /api/search/[id]
 * Récupère les détails d'une recherche et ses résultats
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const log = createRouteLogger('/api/search/[id]')
  
  try {
    const user = await getAuthenticatedUser(request)
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Non authentifié' },
        { status: 401 }
      )
    }

    const searchId = params.id

    log.info('Récupération recherche', {
      searchId,
      userId: user.id,
    })

    // Récupérer la recherche
    const { data: searchQuery, error: queryError } = await supabase
      .from('search_queries')
      .select('*')
      .eq('id', searchId)
      .eq('user_id', user.id)
      .single()

    if (queryError || !searchQuery) {
      // Log détaillé pour debug
      log.error('Recherche non trouvée', {
        searchId,
        userId: user.id,
        error: queryError?.message,
        errorCode: queryError?.code,
        errorDetails: queryError?.details,
        errorHint: queryError?.hint,
      })

      // Vérifier si c'est une erreur de permission ou si la recherche n'existe vraiment pas
      if (queryError?.code === 'PGRST116') {
        // Aucune ligne trouvée
        log.warn('Aucune recherche trouvée avec cet ID pour cet utilisateur', {
          searchId,
          userId: user.id,
        })
      }

      return NextResponse.json(
        { success: false, error: 'Recherche non trouvée ou vous n\'avez pas les droits pour y accéder' },
        { status: 404 }
      )
    }

    log.info('Recherche trouvée', {
      searchId: searchQuery.id,
      status: searchQuery.status,
      resultsCount: searchQuery.results_count,
    })

    // Récupérer TOUS les résultats de la recherche (pas de limite)
    // Utiliser range() pour récupérer tous les résultats par lots si nécessaire
    let allResults: any[] = []
    let offset = 0
    const limit = 1000 // Récupérer par lots de 1000
    let hasMore = true

    while (hasMore) {
      const { data: searchResults, error: resultsError } = await supabase
        .from('search_results')
        .select('*')
        .eq('search_id', searchId)
        .order('score', { ascending: false })
        .range(offset, offset + limit - 1)

      if (resultsError) {
        log.error('Erreur récupération résultats', {
          searchId,
          offset,
          error: resultsError.message,
          errorCode: resultsError.code,
        })
        hasMore = false
        break
      }

      if (searchResults && searchResults.length > 0) {
        allResults = [...allResults, ...searchResults]
        offset += limit
        hasMore = searchResults.length === limit // S'il y a exactement limit résultats, il pourrait y en avoir plus
      } else {
        hasMore = false
      }
    }

    const searchResults = allResults

    log.info('Résultats récupérés', {
      searchId,
      resultsCount: searchResults?.length || 0,
    })

    // Formater les résultats
    const formattedResults = (searchResults || []).map((result: any) => ({
      id: result.id,
      title: result.title,
      price: result.price,
      year: result.year,
      mileage: result.mileage,
      source: result.source,
      score: result.score,
      url: result.url,
      image_url: result.image_url,
      created_at: result.created_at,
    }))

    const criteria = searchQuery.criteria_json || {}

    log.info('Recherche récupérée', {
      searchId,
      userId: user.id,
      resultsCount: formattedResults.length,
    })

    return NextResponse.json({
      success: true,
      data: {
        id: searchQuery.id,
        created_at: searchQuery.created_at,
        last_run_at: searchQuery.last_run_at,
        results_count: searchQuery.results_count,
        status: searchQuery.status,
        criteria: {
          brand: criteria.brand || '',
          model: criteria.model || '',
          max_price: criteria.max_price,
          fuel_type: criteria.fuel_type,
          year_min: criteria.year_min,
          year_max: criteria.year_max,
          mileage_max: criteria.mileage_max,
          transmission: criteria.transmission,
          location: criteria.location,
          radius_km: criteria.radius_km,
          platforms: criteria.platforms || [],
        },
        platforms: searchQuery.platforms_json || [],
        results: formattedResults,
      },
    })
  } catch (error) {
    log.error('Erreur serveur', {
      error: error instanceof Error ? error.message : String(error),
    })
    return createErrorResponse(error)
  }
}

/**
 * DELETE /api/search/[id]
 * Supprime une recherche et ses résultats
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const log = createRouteLogger('/api/search/[id]')
  
  try {
    const user = await getAuthenticatedUser(request)
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Non authentifié' },
        { status: 401 }
      )
    }

    const searchId = params.id

    // Vérifier que la recherche appartient à l'utilisateur
    const { data: searchQuery, error: queryError } = await supabase
      .from('search_queries')
      .select('id')
      .eq('id', searchId)
      .eq('user_id', user.id)
      .single()

    if (queryError || !searchQuery) {
      log.error('Recherche non trouvée', {
        searchId,
        userId: user.id,
        error: queryError?.message,
      })
      return NextResponse.json(
        { success: false, error: 'Recherche non trouvée' },
        { status: 404 }
      )
    }

    // Supprimer la recherche (les résultats seront supprimés en cascade)
    const { error: deleteError } = await supabase
      .from('search_queries')
      .delete()
      .eq('id', searchId)
      .eq('user_id', user.id)

    if (deleteError) {
      log.error('Erreur suppression recherche', {
        searchId,
        error: deleteError.message,
      })
      throw deleteError
    }

    log.info('Recherche supprimée', {
      searchId,
      userId: user.id,
    })

    return NextResponse.json({
      success: true,
      message: 'Recherche supprimée avec succès',
    })
  } catch (error) {
    log.error('Erreur serveur', {
      error: error instanceof Error ? error.message : String(error),
    })
    return createErrorResponse(error)
  }
}

