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
  
  // Récupérer les listings depuis le résultat (propriété supplémentaire)
  // Le résultat de oldRunSiteSearch a une propriété listings de type ListingResponse[]
  const resultWithListings = result as typeof result & { listings?: any[] }
  const rawListings = resultWithListings.listings || []
  
  // Mapper les listings depuis ListingResponse vers ListingNormalized
  const listings: ListingNormalized[] = rawListings.map((listing: any) => ({
    id: listing.id || listing.external_id || '',
    external_id: listing.external_id || listing.id || '',
    title: listing.title || '',
    price: listing.price_eur ?? listing.price ?? null,
    year: listing.year ?? null,
    mileage: listing.mileage_km ?? listing.mileage ?? null,
    fuel: listing.fuelType || listing.fuel || null,
    gearbox: listing.gearbox || null,
    city: listing.city ?? null,
    url: listing.url || '',
    image_url: listing.imageUrl || listing.image_url || null,
    source: listing.source || listing.sourceSite || siteName,
    score_ia: listing.score_ia ?? null,
    score_final: listing.score_final ?? listing.score_ia ?? null,
  }))
  
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

