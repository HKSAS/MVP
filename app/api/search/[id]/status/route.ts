/**
 * GET /api/search/[id]/status
 * Retourne le statut d'une recherche + progress (site_runs) + counts
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSearch } from '@/src/modules/search/repo/searches'
import { getSiteRuns } from '@/src/modules/search/repo/site_runs'
import { countListings } from '@/src/modules/search/repo/listings'
import { createRouteLogger } from '@/src/core/logger'

const log = createRouteLogger('api-search-status')

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: searchId } = params

    // Récupérer la recherche
    const search = await getSearch(searchId)
    if (!search) {
      return NextResponse.json(
        { error: 'Recherche non trouvée' },
        { status: 404 }
      )
    }

    // Récupérer les site_runs
    const siteRuns = await getSiteRuns(searchId)

    // Compter les listings
    const listingsCount = await countListings(searchId)

    // Préparer la réponse
    const response = {
      search: {
        id: search.id,
        brand: search.brand,
        model: search.model,
        maxPrice: search.max_price,
        fuelType: search.fuel_type,
        status: search.status,
        createdAt: search.created_at,
        updatedAt: search.updated_at,
      },
      progress: {
        siteRuns: siteRuns.map((run) => ({
          site: run.site,
          pass: run.pass,
          status: run.status,
          itemsCount: run.items_count,
          durationMs: run.duration_ms,
          error: run.error,
          createdAt: run.created_at,
        })),
        totalListings: listingsCount,
        sitesCompleted: siteRuns.filter((r) => r.status === 'ok').length,
        sitesTotal: siteRuns.length,
      },
    }

    return NextResponse.json(response)
  } catch (error) {
    log.error('Erreur récupération recherche', {
      error: error instanceof Error ? error.message : String(error),
    })

    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}






