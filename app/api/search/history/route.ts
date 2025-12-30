import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAuthenticatedUser } from '@/lib/auth'
import { createRouteLogger } from '@/lib/logger'
import { createErrorResponse } from '@/lib/errors'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseAnonKey)

/**
 * GET /api/search/history
 * Récupère l'historique des recherches de l'utilisateur authentifié
 */
export async function GET(request: NextRequest) {
  const log = createRouteLogger('/api/search/history')
  
  try {
    const user = await getAuthenticatedUser(request)
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Non authentifié' },
        { status: 401 }
      )
    }

    // Récupérer les paramètres de pagination
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    // Récupérer les recherches de l'utilisateur
    const { data: searchQueries, error, count } = await supabase
      .from('search_queries')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      log.error('Erreur récupération historique', {
        error: error.message,
        userId: user.id,
      })
      throw error
    }

    // Formater les résultats pour le frontend
    const formattedQueries = (searchQueries || []).map((query: any) => {
      const criteria = query.criteria_json || {}
      return {
        id: query.id,
        created_at: query.created_at,
        last_run_at: query.last_run_at,
        results_count: query.results_count,
        status: query.status,
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
        platforms: query.platforms_json || [],
      }
    })

    const totalPages = count ? Math.ceil(count / limit) : 1

    log.info('Historique récupéré', {
      userId: user.id,
      count: formattedQueries.length,
      total: count || 0,
      page,
    })

    return NextResponse.json({
      success: true,
      data: formattedQueries,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages,
      },
    })
  } catch (error) {
    log.error('Erreur serveur', {
      error: error instanceof Error ? error.message : String(error),
    })
    return createErrorResponse(error)
  }
}

