// lib/scrapers/leboncoin.ts
// 🎯 BRIDGE VERS LE NOUVEAU SCRAPER ZENROWS PROPRE

import { createRouteLogger } from '@/lib/logger'
import type { ScrapeQuery, ListingResponse } from '@/lib/types'
import type { ScrapingStrategy, SearchPass } from './base'
import { scrapeLeBonCoin as scrapeLeBonCoinNew } from '@/src/modules/scraping/sites/leboncoin/scraper'
import { normalizeListingUrl } from './url-normalizer'

const log = createRouteLogger('leboncoin-scraper')

export interface LeBonCoinListing {
  external_id: string
  title: string
  price: number | null
  year: number | null
  mileage: number | null
  url: string
  image_url: string | null
  score_ia: number
  source: string
  city: string | null
}

/**
 * Méthode principale d'extraction LeBonCoin - ZENROWS ONLY
 * Utilise le nouveau scraper ZenRows propre
 */
export async function scrapeLeBonCoin(
  query: ScrapeQuery,
  pass: SearchPass,
  abortSignal?: AbortSignal
): Promise<{
  listings: LeBonCoinListing[]
  strategy: ScrapingStrategy
  ms: number
}> {
  log.info('[LEBONCOIN] Démarrage scraping ZenRows', {
    pass,
    brand: query.brand,
    model: query.model,
    maxPrice: query.maxPrice,
  })
  
  try {
    // Utiliser le nouveau scraper ZenRows
    const result = await scrapeLeBonCoinNew(query, pass, abortSignal)
    
    // Convertir ListingResponse vers LeBonCoinListing
    const listings: LeBonCoinListing[] = result.listings.map(listing => ({
      external_id: listing.id,
      title: listing.title,
      price: listing.price_eur ?? null,
      year: listing.year ?? null,
      mileage: listing.mileage_km ?? null,
      url: listing.url,
      image_url: listing.imageUrl ?? null,
      score_ia: listing.score_ia ?? 50,
      source: listing.source || 'LeBonCoin',
      city: listing.city ?? null,
    }))
    
    log.info('[LEBONCOIN] Scraping terminé', {
      pass,
      strategy: result.strategy,
      totalListings: listings.length,
      ms: result.ms,
    })
    
    return {
      listings,
      strategy: result.strategy === 'zenrows' ? 'http-html' : result.strategy,
      ms: result.ms,
    }
  } catch (error) {
    log.error('[LEBONCOIN] Erreur scraping', {
      pass,
      error: error instanceof Error ? error.message : String(error),
    })
    
    return {
      listings: [],
      strategy: 'http-html',
      ms: 0,
    }
  }
}

/**
 * Convertit LeBonCoinListing en ListingResponse
 */
export function convertToListingResponse(listing: LeBonCoinListing): ListingResponse {
  // Normaliser l'URL avec le normalizer centralisé
  let finalUrl = listing.url
  if (finalUrl) {
    try {
      finalUrl = normalizeListingUrl(finalUrl, 'LeBonCoin') || finalUrl
    } catch (error) {
      log.warn('[LEBONCOIN] Erreur normalisation URL', {
        url: listing.url,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }
  
  return {
    id: listing.external_id,
    title: listing.title,
    price_eur: listing.price,
    mileage_km: listing.mileage,
    year: listing.year,
    source: listing.source,
    url: finalUrl,
    imageUrl: listing.image_url,
    score_ia: listing.score_ia,
    score_final: listing.score_ia,
    city: listing.city,
  }
}
