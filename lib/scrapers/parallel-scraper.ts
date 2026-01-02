/**
 * Système de parallélisation HTML + JS pour les scrapers
 * Lance HTML brut et JS rendering en parallèle pour améliorer les performances
 */

import { scrapeWithZenRows } from '@/lib/zenrows'
import { createRouteLogger } from '@/lib/logger'

const log = createRouteLogger('parallel-scraper')

export interface ParallelScrapeResult {
  html: string
  strategy: 'html-parallel' | 'js-parallel'
  ms: number
}

/**
 * Scrape avec stratégies parallèles (HTML brut + JS rendering)
 * Prend le premier résultat valide qui arrive
 */
export async function scrapeWithParallelStrategies(
  url: string,
  siteName: string,
  abortSignal?: AbortSignal
): Promise<ParallelScrapeResult> {
  log.info(`[${siteName}] ⚡ Stratégies parallèles: HTML + JS`)
  
  const startTime = Date.now()
  
  // Lance HTML brut ET JS render EN PARALLÈLE
  const [htmlResult, jsResult] = await Promise.allSettled([
    scrapeWithZenRows(
      url,
      {
        js_render: 'false', // HTML brut
        premium_proxy: 'true',
        proxy_country: 'fr',
        block_resources: 'image,media,font',
      },
      abortSignal
    ),
    scrapeWithZenRows(
      url,
      {
        js_render: 'true', // JS rendering
        wait: '2000', // ✅ Réduit de 3s à 2s pour être plus rapide
        premium_proxy: 'true',
        proxy_country: 'fr',
        block_resources: 'image,media,font',
      },
      abortSignal
    )
  ])
  
  const elapsed = Date.now() - startTime
  
  // Prend le premier résultat valide (HTML brut prioritaire)
  if (htmlResult.status === 'fulfilled' && htmlResult.value && htmlResult.value.length > 10000) {
    log.info(`[${siteName}] ✅ HTML brut choisi (${elapsed}ms)`)
    return { html: htmlResult.value, strategy: 'html-parallel', ms: elapsed }
  }
  
  if (jsResult.status === 'fulfilled' && jsResult.value && jsResult.value.length > 10000) {
    log.info(`[${siteName}] ✅ JS render choisi (${elapsed}ms)`)
    return { html: jsResult.value, strategy: 'js-parallel', ms: elapsed }
  }
  
  // Log les erreurs
  if (htmlResult.status === 'rejected') {
    log.warn(`[${siteName}] HTML brut échoué:`, {
      error: htmlResult.reason instanceof Error ? htmlResult.reason.message : String(htmlResult.reason),
    })
  }
  
  if (jsResult.status === 'rejected') {
    log.warn(`[${siteName}] JS render échoué:`, {
      error: jsResult.reason instanceof Error ? jsResult.reason.message : String(jsResult.reason),
    })
  }
  
  throw new Error(`Toutes les stratégies parallèles ont échoué pour ${siteName}`)
}

