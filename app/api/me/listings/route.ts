import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '@/lib/auth'
import type { ListingResponse } from '@/lib/types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseAnonKey)

/**
 * GET /api/me/listings
 * Retourne les annonces associées aux recherches de l'utilisateur
 */
export async function GET(request: NextRequest) {
  const routePrefix = '[API /api/me/listings]'
  
  try {
    // Vérification de l'authentification
    const user = await requireAuth(request)
    console.log(`${routePrefix} 👤 Utilisateur: ${user.id}`)

    // Récupération des paramètres
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '30'), 100)
    const offset = parseInt(searchParams.get('offset') || '0')
    const searchId = searchParams.get('search_id') // Optionnel : filtrer par recherche

    // Construction de la requête
    let query = supabase
      .from('listings')
      .select('external_id, title, price_eur, mileage_km, year, source, url, image_url, score_ia, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (searchId) {
      query = query.eq('search_id', searchId)
    }

    const { data: listings, error } = await query

    if (error) {
      console.error(`${routePrefix} ❌ Erreur Supabase:`, error)
      return NextResponse.json(
        { success: false, error: 'Erreur lors de la récupération des annonces' },
        { status: 500 }
      )
    }

    const formattedListings: ListingResponse[] = (listings || []).map((listing) => ({
      id: listing.external_id,
      title: listing.title,
      price_eur: listing.price_eur ? Number(listing.price_eur) : null,
      mileage_km: listing.mileage_km ? Number(listing.mileage_km) : null,
      year: listing.year || null,
      source: listing.source,
      url: listing.url,
      imageUrl: listing.image_url,
      score_ia: listing.score_ia ? Number(listing.score_ia) : null,
      score_final: 0, // Non calculé dans cette route (utiliser /api/search pour avoir le score)
    }))

    console.log(`${routePrefix} ✅ ${formattedListings.length} annonce(s) retournée(s)`)

    return NextResponse.json({
      success: true,
      data: formattedListings,
      pagination: {
        limit,
        offset,
        total: formattedListings.length,
      },
    })
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

