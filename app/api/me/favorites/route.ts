import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '@/lib/auth'
import type { Favorite, FavoriteResponse, ListingResponse } from '@/lib/types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseAnonKey)

/**
 * GET /api/me/favorites
 * Retourne les annonces favorites de l'utilisateur
 */
export async function GET(request: NextRequest) {
  const routePrefix = '[API /api/me/favorites]'
  
  try {
    // Vérification de l'authentification
    const user = await requireAuth(request)
    console.log(`${routePrefix} 👤 Utilisateur: ${user.id}`)

    // Récupération des paramètres
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '30'), 100)
    const offset = parseInt(searchParams.get('offset') || '0')

    // Récupération des favoris avec JOIN sur listings
    // Note: Supabase utilise le nom de la table pour le JOIN
    const { data: favorites, error } = await supabase
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

    if (error) {
      console.error(`${routePrefix} ❌ Erreur Supabase:`, error)
      return NextResponse.json(
        { success: false, error: 'Erreur lors de la récupération des favoris' },
        { status: 500 }
      )
    }

    // Formatage des résultats
    const formattedFavorites: Favorite[] = (favorites || [])
      .filter((fav: any) => fav.listings) // Filtrer les favoris sans listing (si supprimé)
      .map((fav: any) => {
        const listing = Array.isArray(fav.listings) ? fav.listings[0] : fav.listings
        if (!listing) return null
        
        return {
          id: fav.id,
          user_id: user.id,
          listing_id: fav.listing_id,
          created_at: fav.created_at,
          listing: {
            id: listing.external_id || listing.id,
            title: listing.title,
            price_eur: listing.price_eur ? Number(listing.price_eur) : null,
            mileage_km: listing.mileage_km ? Number(listing.mileage_km) : null,
            year: listing.year || null,
            source: listing.source,
            url: listing.url,
            imageUrl: listing.image_url,
            score_ia: listing.score_ia ? Number(listing.score_ia) : null,
            score_final: listing.score_final ? Number(listing.score_final) : 0,
          } as ListingResponse,
        }
      })
      .filter((fav): fav is Favorite => fav !== null)

    console.log(`${routePrefix} ✅ ${formattedFavorites.length} favori(s) retourné(s)`)

    const response: FavoriteResponse = {
      success: true,
      data: formattedFavorites,
    }

    return NextResponse.json(response)
  } catch (error: any) {
    if (error.message === 'Unauthorized: Authentication required') {
      console.error(`${routePrefix} ❌ Non authentifié`)
      return NextResponse.json(
        { success: false, error: 'Authentification requise' },
        { status: 401 }
      )
    }

    console.error(`${routePrefix} ❌ Erreur serveur:`, error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erreur serveur',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    )
  }
}

