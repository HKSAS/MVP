/**
 * LaCentrale scraper
 * Bridge vers le nouveau scraper amélioré avec fallback vers l'ancien
 */

import type { SearchCriteria, Listing } from '@/lib/search-types'
import { createRouteLogger } from '@/lib/logger'
import { scrapeWithZenRows } from '@/lib/zenrows'
import { parseLaCentraleHtml } from './lacentrale-parser'
import { SCRAPING_CONFIG } from './config'
import { scrapeLaCentrale as scrapeLaCentraleNew } from '@/src/modules/scraping/sites/lacentrale/scraper'

const log = createRouteLogger('lacentrale-scraper')

export const laCentraleScraper = {
  async search(criteria: SearchCriteria, logger?: any): Promise<Listing[]> {
    const loggerInstance = logger || log
    const startTime = Date.now()
    
    try {
      // NOUVEAU SCRAPER AMÉLIORÉ - Essayer d'abord le nouveau scraper
      try {
        loggerInstance.info('[LACENTRALE] Tentative avec nouveau scraper amélioré...')
        
        const result = await scrapeLaCentraleNew(
          {
            brand: criteria.brand,
            model: criteria.model,
            maxPrice: criteria.maxPrice,
            minPrice: criteria.minPrice,
            maxMileage: criteria.maxMileage,
            minYear: criteria.minYear,
            zipCode: criteria.zipCode,
            radiusKm: criteria.radiusKm,
          },
          'strict', // Pass strict pour commencer
          undefined // abortSignal
        )
        
        if (result.listings && result.listings.length > 0) {
          // Convertir ListingResponse vers Listing
          const listings: Listing[] = result.listings.map((listing) => ({
            id: listing.id,
            sourceSite: 'LaCentrale',
            url: listing.url,
            title: listing.title,
            price: listing.price_eur || 0,
            year: listing.year ?? null,
            mileage: listing.mileage_km ?? null,
            city: listing.city ?? null,
            imageUrl: listing.image_url || listing.imageUrl || null,
            score_ia: listing.score_ia || 50,
            scrapedAt: new Date().toISOString(),
          }))
          
          const ms = Date.now() - startTime
          loggerInstance.info('[LACENTRALE] ✅ Nouveau scraper: succès', {
            listingsFound: listings.length,
            ms,
            strategy: result.strategy,
          })
          
          return listings
        } else {
          loggerInstance.warn('[LACENTRALE] ⚠️ Nouveau scraper: aucun résultat, fallback vers ancien...')
        }
      } catch (newScraperError) {
        loggerInstance.warn('[LACENTRALE] ⚠️ Nouveau scraper: erreur, fallback vers ancien', {
          error: newScraperError instanceof Error ? newScraperError.message : String(newScraperError),
        })
      }
      
      // FALLBACK: Ancien scraper (méthode classique)
      loggerInstance.info('[LACENTRALE] Utilisation de l\'ancien scraper (fallback)...')
      
      // Construire l'URL de recherche
      const model = criteria.model || ''
      const searchUrl = `https://www.lacentrale.fr/listing?makesModels=${encodeURIComponent(criteria.brand)}-${encodeURIComponent(model)}&priceMax=${criteria.maxPrice}`
      
      // Paramètres ZenRows pour LaCentrale
      const zenrowsParams = SCRAPING_CONFIG.zenrows.lacentrale || SCRAPING_CONFIG.zenrows.default
      
      // Scraper avec ZenRows
      const html = await scrapeWithZenRows(searchUrl, zenrowsParams)
      
      if (!html || html.length < 1000) {
        loggerInstance.warn('[LACENTRALE] HTML trop court ou vide', {
          htmlLength: html?.length || 0,
        })
        return []
      }
      
      // Parser le HTML
      const rawListings = parseLaCentraleHtml(
        html,
        criteria.brand,
        model,
        criteria.maxPrice
      )
      
      // Convertir en format Listing
      const listings: Listing[] = rawListings.map((raw, index) => ({
        id: `lacentrale_${Date.now()}_${index}`,
        sourceSite: 'LaCentrale',
        url: raw.url,
        title: raw.title,
        price: raw.price || 0,
        year: raw.year,
        mileage: raw.mileage,
        city: raw.city,
        imageUrl: raw.imageUrl,
        score_ia: 50,
        scrapedAt: new Date().toISOString(),
      }))
      
      const ms = Date.now() - startTime
      loggerInstance.info('[LACENTRALE] Ancien scraper: terminé', {
        listingsFound: listings.length,
        ms,
      })
      
      return listings
    } catch (error) {
      const ms = Date.now() - startTime
      loggerInstance.error('[LACENTRALE] ❌ Erreur scraping', {
        error: error instanceof Error ? error.message : String(error),
        ms,
      })
      return []
    }
  }
}
