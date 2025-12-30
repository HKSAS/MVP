/**
 * Orchestrateur pour exécuter tous les scrapers en parallèle
 * Utilise l'architecture commune SiteScraper
 */

import type { SearchCriteria, Listing, SiteResult, SearchResponse } from '@/lib/search-types'
import { createRouteLogger } from '@/lib/logger'
import { generateDedupeKey, filterListingsByCriteria, calculateMatchScore } from './common'
import { laCentraleScraper } from './lacentrale'
import { scrapeLeBonCoin } from './leboncoin'
import { convertToListingResponse } from './leboncoin'
import type { SearchPass } from './base'

const log = createRouteLogger('scraper-orchestrator')

// Liste des scrapers actifs
const ACTIVE_SCRAPERS = [
  { name: 'LeBonCoin', priority: 1 },
  { name: 'LaCentrale', priority: 2 },
  // TODO: Ajouter les autres scrapers au fur et à mesure
  // { name: 'ParuVendu', priority: 3 },
  // { name: 'AutoScout24', priority: 4 },
  // { name: 'LeParking', priority: 5 },
  // { name: 'ProCarLease', priority: 6 },
  // { name: 'TransakAuto', priority: 7 },
]

/**
 * Convertit Listing (nouveau format) en ListingResponse (ancien format pour compatibilité)
 */
function convertListingToResponse(listing: Listing): any {
  return {
    id: listing.id,
    title: listing.title,
    price_eur: listing.price,
    mileage_km: listing.mileage,
    year: listing.year,
    source: listing.sourceSite,
    url: listing.url,
    imageUrl: listing.imageUrl,
    score_ia: listing.score_ia || 50,
    score_final: listing.matchScore || listing.score_ia || 50,
  }
}

/**
 * Exécute un scraper avec gestion d'erreurs robuste
 */
async function runScraper(
  scraperName: string,
  criteria: SearchCriteria,
  log: ReturnType<typeof createRouteLogger>
): Promise<SiteResult> {
  const startTime = Date.now()
  
  try {
    let listings: Listing[] = []
    
    // Router vers le bon scraper
    if (scraperName === 'LeBonCoin') {
      // Utiliser le scraper LeBonCoin existant (à adapter progressivement)
      const result = await scrapeLeBonCoin(
        {
          brand: criteria.brand,
          model: criteria.model || '',
          maxPrice: criteria.maxPrice,
          fuelType: criteria.fuelType,
          location: criteria.zipCode,
          radius_km: criteria.radiusKm,
        },
        'strict',
        undefined // abortSignal
      )
      listings = result.listings.map(l => ({
        id: generateDedupeKey({
          title: l.title,
          price: l.price,
          year: l.year,
          mileage: l.mileage,
          url: l.url,
        }),
        sourceSite: 'LeBonCoin',
        url: l.url,
        title: l.title,
        price: l.price || 0,
        year: l.year,
        mileage: l.mileage,
        fuelType: (l as any).fuelType as any,
        gearbox: (l as any).gearbox as any,
        city: l.city,
        imageUrl: l.image_url,
        score_ia: l.score_ia,
        scrapedAt: new Date().toISOString(),
      }))
    } else if (scraperName === 'LaCentrale') {
      listings = await laCentraleScraper.search(criteria, log)
    } else {
      log.warn(`[ORCHESTRATOR] Scraper ${scraperName} non implémenté`)
      return {
        site: scraperName,
        ok: false,
        items: [],
        error: 'Scraper non implémenté',
        ms: Date.now() - startTime,
      }
    }
    
    // Filtrer selon les critères
    listings = filterListingsByCriteria(listings, criteria)
    
    // Calculer les match scores
    listings = listings.map(listing => ({
      ...listing,
      matchScore: calculateMatchScore(listing, criteria),
    }))
    
    // Trier par match score
    listings.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0))
    
    const ms = Date.now() - startTime
    
    log.info(`[ORCHESTRATOR] ${scraperName} terminé`, {
      items: listings.length,
      ms,
    })
    
    return {
      site: scraperName,
      ok: listings.length > 0,
      items: listings.map(convertListingToResponse),
      ms,
      strategy: 'http-html',
    }
  } catch (error) {
    const ms = Date.now() - startTime
    log.error(`[ORCHESTRATOR] ${scraperName} erreur`, {
      error: error instanceof Error ? error.message : String(error),
      ms,
    })
    
    return {
      site: scraperName,
      ok: false,
      items: [],
      error: error instanceof Error ? error.message : 'Erreur inconnue',
      ms,
    }
  }
}

/**
 * Orchestre tous les scrapers en parallèle
 */
export async function orchestrateSearch(
  criteria: SearchCriteria,
  log: ReturnType<typeof createRouteLogger>
): Promise<SearchResponse> {
  const totalStartTime = Date.now()
  
  log.info('[ORCHESTRATOR] Démarrage recherche multi-sites', {
    criteria: {
      brand: criteria.brand,
      model: criteria.model,
      maxPrice: criteria.maxPrice,
    },
    sites: ACTIVE_SCRAPERS.length,
  })
  
  // Exécuter tous les scrapers en parallèle
  const siteResults = await Promise.allSettled(
    ACTIVE_SCRAPERS.map(({ name }) => runScraper(name, criteria, log))
  )
  
  // Transformer les résultats
  const results: SiteResult[] = siteResults.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value
    } else {
      const siteName = ACTIVE_SCRAPERS[index]?.name || 'Unknown'
      log.error(`[ORCHESTRATOR] ${siteName} rejeté`, {
        error: result.reason instanceof Error ? result.reason.message : String(result.reason),
      })
      return {
        site: siteName,
        ok: false,
        items: [],
        error: result.reason instanceof Error ? result.reason.message : 'Erreur inconnue',
        ms: 0,
      }
    }
  })
  
  // Concaténer tous les items
  const allItems: Listing[] = []
  for (const siteResult of results) {
    if (siteResult.ok && siteResult.items.length > 0) {
      // Les items sont déjà de type Listing (pas ListingResponse)
      for (const item of siteResult.items) {
        allItems.push(item)
      }
    }
  }
  
  // Dédupliquer
  const dedupeMap = new Map<string, Listing>()
  for (const listing of allItems) {
    const key = listing.id
    if (!dedupeMap.has(key)) {
      dedupeMap.set(key, listing)
    } else {
      // Garder celui avec le meilleur matchScore
      const existing = dedupeMap.get(key)!
      if ((listing.matchScore || 0) > (existing.matchScore || 0)) {
        dedupeMap.set(key, listing)
      }
    }
  }
  
  const uniqueItems = Array.from(dedupeMap.values())
  
  // Trier par matchScore décroissant
  uniqueItems.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0))
  
  const totalMs = Date.now() - totalStartTime
  const sitesScraped = results.filter(r => r.ok).length
  
  log.info('[ORCHESTRATOR] Recherche terminée', {
    totalItems: uniqueItems.length,
    sitesScraped,
    totalMs,
  })
  
  return {
    criteria,
    items: uniqueItems.map(convertListingToResponse),
    siteResults: results,
    stats: {
      totalItems: uniqueItems.length,
      sitesScraped,
      totalMs,
    },
  }
}

