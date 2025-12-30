/**
 * GET /api/search/[id]/results?page=1&limit=50
 * Retourne les listings paginés, triés par score desc
 */

import { NextRequest, NextResponse } from 'next/server'
import { getListings } from '@/src/modules/search/repo/listings'
import { getSearch } from '@/src/modules/search/repo/searches'
import { createRouteLogger } from '@/src/core/logger'

const log = createRouteLogger('api-search-results')

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: searchId } = params

    // Vérifier que la recherche existe
    const search = await getSearch(searchId)
    if (!search) {
      return NextResponse.json(
        { error: 'Recherche non trouvée' },
        { status: 404 }
      )
    }

    // Récupérer page et limit depuis query params
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100) // Max 100

    // Récupérer les listings paginés
    const { listings, total } = await getListings(searchId, page, limit)

    // Mapper vers le format API
    const listingsApi = listings.map((listing) => ({
      id: listing.id,
      title: listing.title,
      price: listing.price,
      year: listing.year,
      mileage: listing.mileage,
      fuel: listing.fuel,
      city: listing.city,
      url: listing.url,
      site: listing.site,
      score: listing.score,
      risk: listing.risk,
    }))

    const totalPages = Math.ceil(total / limit)

    return NextResponse.json({
      searchId,
      listings: listingsApi,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    })
  } catch (error) {
    log.error('Erreur récupération résultats', {
      error: error instanceof Error ? error.message : String(error),
    })

    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}






