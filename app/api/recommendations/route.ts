import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth'
import { createRouteLogger } from '@/lib/logger'
import { createErrorResponse } from '@/lib/errors'
import { getSupabaseAdminClient } from '@/lib/supabase/server'
import {
  buildPreferenceProfileFromHistory,
  mergePreferenceProfiles,
  generatePersonalizedRecommendations,
} from '@/lib/personalized-recommendations'
import { buildUserPreferenceProfile } from '@/lib/recommendations/engine'
import type { ListingResponse } from '@/lib/types'

export const dynamic = 'force-dynamic'

/**
 * Génère des recommandations personnalisées pour un utilisateur
 */
export async function GET(request: NextRequest) {
  const log = createRouteLogger('/api/recommendations')
  
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      )
    }

    const supabase = getSupabaseAdminClient()

    // Récupérer les favoris
    const { data: favorites, error: favoritesError } = await supabase
      .from('favorites')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (favoritesError) {
      log.warn('Erreur récupération favoris (non-bloquant)', { error: favoritesError })
    }

    // Récupérer l'historique de recherches
    const { data: searchHistory, error: historyError } = await supabase
      .from('search_queries')
      .select('criteria_json')
      .eq('user_id', user.id)
      .order('last_run_at', { ascending: false })
      .limit(20)

    if (historyError) {
      log.warn('Erreur récupération historique (non-bloquant)', { error: historyError })
    }

    // Construire les profils
    const favoritesProfile = favorites && favorites.length > 0
      ? buildUserPreferenceProfile(favorites as any)
      : null

    const historyProfile = searchHistory && searchHistory.length > 0
      ? buildPreferenceProfileFromHistory(searchHistory.map(s => s.criteria_json || {}))
      : null

    const mergedProfile = mergePreferenceProfiles(favoritesProfile, historyProfile)

    if (!mergedProfile) {
      return NextResponse.json({
        success: true,
        recommendations: [],
        message: 'Pas assez de données pour générer des recommandations. Effectuez quelques recherches ou ajoutez des favoris.',
      })
    }

    // Récupérer les listings récents depuis le cache
    const { data: cachedListings, error: cacheError } = await supabase
      .from('listings_cache')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)

    if (cacheError || !cachedListings) {
      log.warn('Erreur récupération cache listings (non-bloquant)', { error: cacheError })
      return NextResponse.json({
        success: true,
        recommendations: [],
        message: 'Aucune annonce disponible pour le moment.',
      })
    }
    
    // Convertir en ListingResponse
    const listings: ListingResponse[] = cachedListings.map((cache: any) => ({
      id: `${cache.source}:${cache.listing_id}`,
      title: cache.title || 'Annonce',
      price_eur: cache.price,
      year: cache.year,
      mileage_km: cache.mileage,
      url: cache.url || '',
      imageUrl: cache.image_url,
      source: cache.source || 'Unknown',
      score_ia: cache.score || null,
      score_final: cache.score || null,
      city: null,
    }))

    // Générer les recommandations
    const favoriteIds = new Set(
      (favorites || []).map((f: any) => `${f.source}:${f.listing_id}`)
    )

    const recommendations = generatePersonalizedRecommendations(
      listings,
      mergedProfile,
      favoriteIds,
      10
    )

    log.info('Recommandations générées', {
      userId: user.id,
      count: recommendations.length,
      profileBrands: mergedProfile.topBrands.map(b => b.brand),
    })

    return NextResponse.json({
      success: true,
      recommendations: recommendations.map(r => ({
        listing: r.listing,
        matchScore: r.matchScore,
        reasons: r.reasons,
        confidence: r.confidence,
        category: r.category,
      })),
      profile: {
        topBrands: mergedProfile.topBrands,
        budgetRange: `${mergedProfile.budgetMin.toLocaleString('fr-FR')} - ${mergedProfile.budgetMax.toLocaleString('fr-FR')} €`,
        mileageMax: mergedProfile.mileageMax,
      },
    })
  } catch (error) {
    log.error('Erreur génération recommandations', {
      error: error instanceof Error ? error.message : String(error),
    })
    return createErrorResponse(error)
  }
}
