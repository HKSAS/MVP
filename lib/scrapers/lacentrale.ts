/**
 * LaCentrale scraper
 * Utilise ZenRows pour le scraping et le parser existant
 */

import type { SearchCriteria, Listing } from '@/lib/search-types'
import { createRouteLogger } from '@/lib/logger'
import { scrapeWithZenRows } from '@/lib/zenrows'
import { parseLaCentraleHtml } from './lacentrale-parser'
import { SCRAPING_CONFIG } from './config'

const log = createRouteLogger('lacentrale-scraper')

export const laCentraleScraper = {
  async search(criteria: SearchCriteria, logger?: any): Promise<Listing[]> {
    const loggerInstance = logger || log
    const startTime = Date.now()
    
    try {
      // Construire l'URL de recherche
      const model = criteria.model || ''
      const searchUrl = `https://www.lacentrale.fr/listing?makesModels=${encodeURIComponent(criteria.brand)}-${encodeURIComponent(model)}&priceMax=${criteria.maxPrice}`
      
      loggerInstance.info('[LACENTRALE] Démarrage scraping', {
        url: searchUrl,
        brand: criteria.brand,
        model,
        maxPrice: criteria.maxPrice,
      })
      
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
      loggerInstance.info('[LACENTRALE] Scraping terminé', {
        listingsFound: listings.length,
        ms,
      })
      
      return listings
    } catch (error) {
      const ms = Date.now() - startTime
      loggerInstance.error('[LACENTRALE] Erreur scraping', {
        error: error instanceof Error ? error.message : String(error),
        ms,
      })
      return []
    }
  }
}
