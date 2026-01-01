import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import type { UserSearch } from '@/lib/types'
import { createRouteLogger } from '@/lib/logger'
import { createErrorResponse, AuthenticationError, InternalServerError } from '@/lib/errors'
import { getSupabaseServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/me/searches
 * Retourne les dernières recherches de l'utilisateur authentifié
 */
export async function GET(request: NextRequest) {
  const log = createRouteLogger('/api/me/searches')
  
  try {
    // Vérification de l'authentification
    const user = await requireAuth(request)
    log.info(`Récupération des recherches pour user ${user.id}`)

    // Récupération des paramètres de pagination
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
    const offset = parseInt(searchParams.get('offset') || '0')

    // Créer le client Supabase avec le token de l'utilisateur pour RLS
    const supabase = await getSupabaseServerClient(request)
    
    // Récupération des recherches depuis search_queries
    const { data: searchQueries, error, count } = await supabase
      .from('search_queries')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      log.error(`Erreur Supabase: ${error.message} (user: ${user.id})`)
      throw new InternalServerError('Erreur lors de la récupération des recherches', {
        dbError: error.message,
      })
    }

    // Formater les résultats depuis search_queries (compatible avec UserSearch)
    const formattedSearches: UserSearch[] = (searchQueries || []).map((query: any) => {
      const criteria = query.criteria_json || {}
      return {
        id: query.id,
        brand: criteria.brand || '',
        model: criteria.model || '',
        max_price: criteria.max_price ? Number(criteria.max_price) : 0,
        total_results: query.results_count || 0,
        created_at: query.created_at,
      }
    })
    
    // Log détaillé pour debug
    log.info(`Recherches formatées: ${formattedSearches.length} trouvées (total en base: ${count || 0})`)
    if (formattedSearches.length > 0) {
      log.info(`Première recherche: ${formattedSearches[0].brand} ${formattedSearches[0].model}`)
    }

    log.info(`Recherches retournées: ${formattedSearches.length} pour user ${user.id}`)

    const totalPages = count ? Math.ceil(count / limit) : 1

    return NextResponse.json({
      success: true,
      data: formattedSearches,
      pagination: {
        limit,
        offset,
        total: count || 0,
        totalPages,
        page: Math.floor(offset / limit) + 1,
      },
    })
  } catch (error) {
    if (error instanceof AuthenticationError) {
      log.warn('Non authentifié')
      return createErrorResponse(error)
    }

    log.error(`Erreur serveur: ${error instanceof Error ? error.message : String(error)}`)
    return createErrorResponse(error)
  }
}

/**
 * POST /api/me/searches
 * Sauvegarde une nouvelle recherche dans l'historique
 */
export async function POST(request: NextRequest) {
  const log = createRouteLogger('/api/me/searches POST')
  
  try {
    // Vérification de l'authentification
    const user = await requireAuth(request)
    log.info(`Sauvegarde recherche pour user ${user.id}`)

    const body = await request.json()
    const { query, brand, model, max_price, location, filters, resultsCount, results } = body

    if (!query && !brand && !model) {
      return NextResponse.json({
        success: false,
        error: 'Query, brand ou model requis'
      }, { status: 400 })
    }

    // Formater les critères pour search_queries
    const criteria = {
      brand: brand || '',
      model: model || '',
      max_price: max_price || null,
      location: location || null,
      ...(filters || {})
    }

    // Construire la query string si nécessaire
    const queryString = query || `${brand || ''} ${model || ''}`.trim()

    // Créer le client Supabase avec le token de l'utilisateur pour RLS
    const supabase = await getSupabaseServerClient(request)

    // Insérer dans search_queries
    // Stocker tout dans criteria_json (la table n'a peut-être pas query_text)
    const insertData = {
      user_id: user.id,
      criteria_json: {
        ...criteria,
        query: queryString // Inclure la query dans criteria_json
      },
      results_count: resultsCount || 0,
      created_at: new Date().toISOString()
    }
    
    log.info(`Insertion recherche: ${queryString} (user: ${user.id}, results: ${resultsCount || 0})`)
    
    const { data: newSearch, error: insertError } = await supabase
      .from('search_queries')
      .insert(insertData)
      .select()
      .single()

    if (insertError) {
      log.error(`Erreur insertion recherche: ${insertError.message} (user: ${user.id})`)
      throw new InternalServerError('Erreur lors de la sauvegarde de la recherche', {
        dbError: insertError.message,
      })
    }

    log.info(`Recherche sauvegardée: ${queryString} (id: ${newSearch.id}, user: ${user.id})`)

    // Sauvegarder les résultats si fournis (optionnel - la table search_results peut ne pas exister)
    if (results && Array.isArray(results) && results.length > 0) {
      log.info(`Sauvegarde de ${results.length} résultats pour la recherche ${newSearch.id}`)
      
      // Vérifier si la table search_results existe avant d'insérer
      const { error: tableCheckError } = await supabase
        .from('search_results')
        .select('id')
        .limit(1)
      
      if (tableCheckError && tableCheckError.message.includes('does not exist')) {
        log.warn(`Table search_results n'existe pas, skip sauvegarde des résultats`)
        // Ne pas échouer - la table est optionnelle
      } else {
        const resultsToInsert = results.map((result: any) => ({
          search_id: newSearch.id,
          title: result.title || '',
          price: result.price || result.price_eur || null,
          year: result.year || null,
          mileage: result.mileage || result.mileage_km || null,
          source: result.source || '',
          score: result.score || result.score_final || 0,
          url: result.url || '',
          image_url: result.image_url || result.imageUrl || null,
          created_at: new Date().toISOString(),
        }))

        // Insérer les résultats par lots de 100 pour éviter les limites
        const batchSize = 100
        for (let i = 0; i < resultsToInsert.length; i += batchSize) {
          const batch = resultsToInsert.slice(i, i + batchSize)
          const { error: insertResultsError } = await supabase
            .from('search_results')
            .insert(batch)

          if (insertResultsError) {
            log.error(`Erreur insertion résultats (lot ${i / batchSize + 1}): ${insertResultsError.message}`)
            // Ne pas échouer la requête complète si l'insertion des résultats échoue
          } else {
            log.info(`Résultats sauvegardés: ${batch.length} résultats (lot ${i / batchSize + 1})`)
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        id: newSearch.id,
        brand: criteria.brand,
        model: criteria.model,
        max_price: criteria.max_price || 0,
        total_results: newSearch.results_count || 0,
        created_at: newSearch.created_at,
      }
    })

  } catch (error) {
    if (error instanceof AuthenticationError) {
      log.warn('Non authentifié')
      return createErrorResponse(error)
    }

    log.error(`Erreur serveur POST: ${error instanceof Error ? error.message : String(error)}`)
    return createErrorResponse(error)
  }
}

/**
 * DELETE /api/me/searches
 * Supprime l'historique de recherche de l'utilisateur
 * Optionnel : supprimer une recherche spécifique avec ?id=xxx
 */
export async function DELETE(request: NextRequest) {
  const log = createRouteLogger('/api/me/searches DELETE')
  
  try {
    // Vérification de l'authentification
    const user = await requireAuth(request)
    log.info(`Suppression historique pour user ${user.id}`)

    const { searchParams } = new URL(request.url)
    const searchId = searchParams.get('id')

    // Créer le client Supabase avec le token de l'utilisateur pour RLS
    const supabase = await getSupabaseServerClient(request)

    if (searchId) {
      // Supprimer une recherche spécifique
      const { error: deleteError } = await supabase
        .from('search_queries')
        .delete()
        .eq('id', searchId)
        .eq('user_id', user.id) // Sécurité : s'assurer que c'est bien l'utilisateur

      if (deleteError) {
        log.error(`Erreur suppression recherche: ${deleteError.message} (user: ${user.id})`)
        throw new InternalServerError('Erreur lors de la suppression de la recherche', {
          dbError: deleteError.message,
        })
      }

      log.info(`Recherche supprimée: ${searchId} (user: ${user.id})`)

      return NextResponse.json({
        success: true,
        message: 'Recherche supprimée'
      })
    } else {
      // Supprimer tout l'historique
      // D'abord compter les recherches à supprimer
      const { count } = await supabase
        .from('search_queries')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
      
      // Puis supprimer
      const { error: deleteError } = await supabase
        .from('search_queries')
        .delete()
        .eq('user_id', user.id)

      if (deleteError) {
        log.error(`Erreur suppression historique: ${deleteError.message} (user: ${user.id})`)
        throw new InternalServerError('Erreur lors de la suppression de l\'historique', {
          dbError: deleteError.message,
        })
      }

      log.info(`Historique supprimé: ${count || 0} recherches (user: ${user.id})`)

      return NextResponse.json({
        success: true,
        message: 'Historique supprimé',
        deletedCount: count || 0
      })
    }

  } catch (error) {
    if (error instanceof AuthenticationError) {
      log.warn('Non authentifié')
      return createErrorResponse(error)
    }

    log.error(`Erreur serveur DELETE: ${error instanceof Error ? error.message : String(error)}`)
    return createErrorResponse(error)
  }
}
