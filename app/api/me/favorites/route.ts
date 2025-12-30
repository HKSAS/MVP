import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '@/lib/auth'
import type { Favorite, FavoriteResponse, ListingResponse } from '@/lib/types'
import { createRouteLogger } from '@/lib/logger'
import { createErrorResponse, AuthenticationError, InternalServerError } from '@/lib/errors'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

/**
 * GET /api/me/favorites
 * Retourne les annonces favorites de l'utilisateur
 */
export async function GET(request: NextRequest) {
  const log = createRouteLogger('/api/me/favorites')
  
  try {
    // Vérification de l'authentification
    const user = await requireAuth(request)
    log.info('Récupération des favoris', { userId: user.id })

    // Récupération du token d'accès pour créer un client Supabase avec les permissions utilisateur
    const authHeader = request.headers.get('authorization')
    const accessToken = authHeader?.replace('Bearer ', '') || null

    // Créer un client Supabase avec le token utilisateur (nécessaire pour RLS)
    const supabase = accessToken 
      ? createClient(supabaseUrl, supabaseAnonKey, {
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
      : createClient(supabaseUrl, supabaseAnonKey)

    // Récupération des paramètres
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '30'), 100)
    const offset = parseInt(searchParams.get('offset') || '0')

    // Récupération des favoris avec JOIN sur listings
    // Note: Supabase utilise le nom de la table pour le JOIN
    let favorites: any[] | null = null
    let error: any = null
    
    // Essayer d'abord avec le JOIN
    const { data: favoritesWithJoin, error: joinError } = await supabase
      .from('favorites')
      .select(`
        id,
        listing_id,
        created_at,
        listings!inner (
          id,
          external_id,
          title,
          price_eur,
          mileage_km,
          year,
          source,
          url,
          image_url,
          score_ia,
          score_final
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (joinError) {
      log.warn('Erreur avec JOIN, tentative alternative', { 
        error: joinError.message, 
        code: joinError.code,
        details: joinError.details,
        hint: joinError.hint,
        userId: user.id 
      })
      
      // Si le JOIN échoue, récupérer les favoris séparément
      const { data: favoritesData, error: favoritesError } = await supabase
        .from('favorites')
        .select('id, listing_id, created_at, source, listing_url, title, price, year, mileage, score, risk_score')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (favoritesError) {
        log.error('Erreur Supabase lors de la récupération des favoris', { 
          error: favoritesError.message,
          code: favoritesError.code,
          details: favoritesError.details,
          hint: favoritesError.hint,
          userId: user.id 
        })
        throw new InternalServerError('Erreur lors de la récupération des favoris', {
          dbError: favoritesError.message,
          code: favoritesError.code,
        })
      }

      // Formater les favoris sans JOIN
      favorites = favoritesData || []
      
      // Si on a des listing_id, on peut essayer de récupérer les listings séparément
      if (favorites.length > 0) {
        const listingIds = favorites
          .map((f: any) => f.listing_id)
          .filter((id: string | null) => id !== null)
        
        if (listingIds.length > 0) {
          const { data: listingsData, error: listingsError } = await supabase
            .from('listings')
            .select('id, external_id, title, price_eur, mileage_km, year, source, url, image_url, score_ia, score_final')
            .in('id', listingIds)

          if (!listingsError && listingsData) {
            // Mapper les listings aux favoris
            const listingsMap = new Map(listingsData.map((l: any) => [l.id, l]))
            favorites = favorites.map((fav: any) => ({
              ...fav,
              listings: listingsMap.get(fav.listing_id) || null
            }))
          }
        }
      }
    } else {
      favorites = favoritesWithJoin
    }

    if (!favorites) {
      favorites = []
    }

    // Formatage des résultats
    const formattedFavorites: Favorite[] = (favorites || [])
      .map((fav: any): Favorite | null => {
        // Essayer de récupérer le listing depuis le JOIN ou depuis les données directes
        let listing: any = null
        
        if (fav.listings) {
          // Format avec JOIN
          listing = Array.isArray(fav.listings) ? fav.listings[0] : fav.listings
        } else if (fav.source && fav.listing_url) {
          // Format direct depuis favorites (fallback)
          listing = {
            id: fav.listing_id || '',
            external_id: fav.listing_id || '',
            title: fav.title || '',
            price_eur: fav.price || null,
            mileage_km: fav.mileage || null,
            year: fav.year || null,
            source: fav.source || '',
            url: fav.listing_url || '',
            image_url: null,
            score_ia: fav.score || null,
            score_final: fav.risk_score !== null ? (100 - (fav.risk_score || 0)) : (fav.score || 0),
          }
        }
        
        if (!listing) {
          log.warn('Favori sans listing', { favoriteId: fav.id, listingId: fav.listing_id })
          return null
        }
        
        const listingResponse: ListingResponse = {
          id: listing.external_id || listing.id || '',
          title: listing.title || '',
          price_eur: listing.price_eur ? Number(listing.price_eur) : null,
          mileage_km: listing.mileage_km ? Number(listing.mileage_km) : null,
          year: listing.year || null,
          source: listing.source || '',
          url: listing.url || '',
          imageUrl: listing.image_url || null,
          score_ia: listing.score_ia ? Number(listing.score_ia) : null,
          score_final: listing.score_final ? Number(listing.score_final) : 0,
        }
        
        return {
          id: fav.id,
          user_id: user.id,
          listing_id: fav.listing_id,
          created_at: fav.created_at,
          listing: listingResponse,
        }
      })
      .filter((fav): fav is Favorite => fav !== null && fav.listing !== undefined)

    log.info('Favoris retournés', {
      count: formattedFavorites.length,
      userId: user.id,
    })

    const response: FavoriteResponse = {
      success: true,
      data: formattedFavorites,
    }

    return NextResponse.json(response)
  } catch (error) {
    if (error instanceof AuthenticationError) {
      log.warn('Non authentifié')
      return createErrorResponse(error)
    }

    log.error('Erreur serveur', {
      error: error instanceof Error ? error.message : String(error),
    })
    return createErrorResponse(error)
  }
}

