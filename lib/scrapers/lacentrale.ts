/**
 * LaCentrale scraper
 * TODO: Implémenter le scraper LaCentrale
 */

import type { SearchCriteria, Listing } from '@/lib/search-types'
import { createRouteLogger } from '@/lib/logger'

const log = createRouteLogger('lacentrale-scraper')

export const laCentraleScraper = {
  async search(criteria: SearchCriteria, logger?: any): Promise<Listing[]> {
    const loggerInstance = logger || log
    loggerInstance.warn('[LACENTRALE] Scraper non implémenté, retourne liste vide')
    // TODO: Implémenter le scraping LaCentrale
    return []
  }
}
