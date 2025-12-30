/**
 * Service de recherche - Orchestration principale
 */

import { createSearch, updateSearchStatus, getSearch } from '../repo/searches'
import { createSiteRun } from '../repo/site_runs'
import { createListingRaw, createListingsBatch } from '../repo/listings'
import { runAllSites } from '@/src/modules/scraping/engine/runAllSites'
import { deduplicateListings } from '../domain/dedup'
import { scoreAllListings } from '../domain/scoring'
import type { SearchParams, ListingNormalized } from '@/src/core/types'
import { createRouteLogger } from '@/src/core/logger'
import type { SearchRecord } from '../repo/searches'

const log = createRouteLogger('search-service')

export interface SearchResult {
  searchId: string
  status: 'queued' | 'running' | 'done' | 'failed'
  totalListings: number
  sitesCompleted: number
  sitesTotal: number
  error?: string
}

/**
 * Crée une nouvelle recherche et la met en queue (ou exécute sync)
 */
export async function createSearchJob(
  params: SearchParams & { userId?: string | null },
  executeSync: boolean = false // Temporaire: exécution sync au lieu de BullMQ
): Promise<SearchResult> {
  // Créer la recherche en DB
  const search = await createSearch(params)

  log.info('Recherche créée', {
    searchId: search.id,
    brand: params.brand,
    model: params.model,
    maxPrice: params.maxPrice,
    status: search.status,
  })

  // Si exécution sync, lancer immédiatement
  if (executeSync) {
    return await executeSearch(search.id)
  }

  // Sinon, retourner queued (sera traité par worker BullMQ plus tard)
  return {
    searchId: search.id,
    status: 'queued',
    totalListings: 0,
    sitesCompleted: 0,
    sitesTotal: 0,
  }
}

/**
 * Exécute une recherche complète (appelé par worker ou sync)
 */
export async function executeSearch(searchId: string): Promise<SearchResult> {
  const startTime = Date.now()

  try {
    // Récupérer la recherche
    const search = await getSearch(searchId)
    if (!search) {
      throw new Error(`Recherche ${searchId} non trouvée`)
    }

    // Mettre à jour statut running
    await updateSearchStatus(searchId, 'running')

    log.info('Exécution recherche démarrée', {
      searchId,
      brand: search.brand,
      model: search.model,
    })

    // Préparer les paramètres de recherche
    const searchParams: SearchParams = {
      brand: search.brand,
      model: search.model || undefined,
      maxPrice: search.max_price,
      fuelType: search.fuel_type as any || undefined,
    }

    // Exécuter runAllSites (concurrency=3)
    const allListings: ListingNormalized[] = []
    const siteRuns = await runAllSites(
      searchParams,
      {
        concurrency: 3,
        onSiteComplete: async (site, result, durationMs) => {
          // Enregistrer site_run
          await createSiteRun(
            searchId,
            site,
            'strict', // TODO: gérer les passes
            result.ok ? 'ok' : 'failed',
            result.items,
            durationMs,
            result.error || null
          )

          // Enregistrer listings_raw (première passe seulement)
          for (const listing of result.listings || []) {
            await createListingRaw(searchId, site, listing.url, {
              title: listing.title,
              price: listing.price,
              year: listing.year,
              mileage: listing.mileage,
              source: listing.source,
            })
          }

          // Ajouter aux listings
          allListings.push(...(result.listings || []))
        },
      }
    )

    // Déduplication
    const uniqueListings = deduplicateListings(allListings)
    log.info('Déduplication terminée', {
      before: allListings.length,
      after: uniqueListings.length,
    })

    // Scoring
    const scoredListings = scoreAllListings(uniqueListings, searchParams)
    log.info('Scoring terminé', {
      total: scoredListings.length,
      top3: scoredListings.slice(0, 3).map((l) => ({
        title: l.title.substring(0, 30),
        score: l.score_final,
      })),
    })

    // Enregistrer les listings finaux
    await createListingsBatch(searchId, scoredListings)

    // Mettre à jour statut done
    await updateSearchStatus(searchId, 'done')

    const totalMs = Date.now() - startTime
    log.info('Recherche terminée avec succès', {
      searchId,
      totalListings: scoredListings.length,
      totalMs,
    })

    return {
      searchId,
      status: 'done',
      totalListings: scoredListings.length,
      sitesCompleted: siteRuns.filter((r) => r.ok).length,
      sitesTotal: siteRuns.length,
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)

    log.error('Erreur exécution recherche', {
      searchId,
      error: errorMsg,
    })

    await updateSearchStatus(searchId, 'failed')

    return {
      searchId,
      status: 'failed',
      totalListings: 0,
      sitesCompleted: 0,
      sitesTotal: 0,
      error: errorMsg,
    }
  }
}

