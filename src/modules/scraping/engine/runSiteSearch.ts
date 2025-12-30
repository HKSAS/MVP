/**
 * Exécute une recherche sur un site avec système de passes
 * IMPORTANT: Ce fichier est un placeholder - l'implémentation réelle est dans lib/scrapers/run-site-search.ts
 * À migrer progressivement
 */

import type { SearchParams, ListingNormalized, SiteResult, ScrapePass, ScrapingStrategy } from '@/src/core/types'

export interface SiteSearchResult {
  ok: boolean
  items: number
  ms: number
  strategy: ScrapingStrategy
  listings: ListingNormalized[]
  error?: string
}

/**
 * Exécute une recherche sur un site
 * Bridge vers l'ancien code (à migrer progressivement)
 */
export async function runSiteSearch(
  siteName: string,
  params: SearchParams
): Promise<SiteSearchResult> {
  // Import depuis l'ancien code (temporaire jusqu'à migration complète)
  const { runSiteSearch: oldRunSiteSearch } = await import('@/lib/scrapers/run-site-search')
  
  // Adapter les paramètres
  const query = {
    brand: params.brand,
    model: params.model || '',
    maxPrice: params.maxPrice,
    minPrice: params.minPrice,
    fuelType: params.fuelType,
    minYear: params.minYear,
    maxYear: params.maxYear,
    maxMileage: params.maxMileage,
    zipCode: params.zipCode,
    radiusKm: params.radiusKm,
  }
  
  const result = await oldRunSiteSearch(siteName, query, [])
  
  // Mapper les listings depuis le format ancien vers ListingNormalized
  // TODO: Améliorer le mapping une fois la migration complète
  const listings: ListingNormalized[] = []
  
  // Adapter le résultat
  return {
    ok: result.ok,
    items: result.items,
    ms: result.ms,
    strategy: result.strategy as ScrapingStrategy,
    listings,
    error: result.error,
  }
}

