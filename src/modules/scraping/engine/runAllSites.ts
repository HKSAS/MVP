/**
 * Exécute le scraping sur tous les sites en parallèle (avec limite de concurrence)
 */

import type { SearchParams, ListingNormalized, SiteResult } from '@/src/core/types'
import { runSiteSearch } from './runSiteSearch'
import { createRouteLogger } from '@/src/core/logger'

const log = createRouteLogger('run-all-sites')

const SITES = [
  'LeBonCoin',
  'LaCentrale',
  'ParuVendu',
  'AutoScout24',
  'LeParking',
  'ProCarLease',
  'TransakAuto',
]

export interface RunAllSitesOptions {
  concurrency?: number // Nombre max de sites en parallèle
  onSiteComplete?: (
    site: string,
    result: SiteRunResult,
    durationMs: number
  ) => Promise<void>
}

export interface SiteRunResult extends SiteResult {
  listings: ListingNormalized[]
}

/**
 * Exécute tous les sites avec contrôle de concurrence
 */
export async function runAllSites(
  params: SearchParams,
  options: RunAllSitesOptions = {}
): Promise<SiteRunResult[]> {
  const concurrency = options.concurrency || 3
  const results: SiteRunResult[] = []
  const pending: Promise<void>[] = []
  let siteIndex = 0

  log.info('Démarrage scraping parallèle', {
    sitesCount: SITES.length,
    concurrency,
    brand: params.brand,
    model: params.model,
  })

  // Fonction pour exécuter un site
  async function runSite(site: string): Promise<void> {
    const startTime = Date.now()

    try {
      const result = await runSiteSearch(site, params)
      const durationMs = Date.now() - startTime

      const siteResult: SiteRunResult = {
        site,
        ok: result.ok,
        items: result.items,
        ms: durationMs,
        strategy: result.strategy,
        listings: result.listings || [],
        error: result.error,
      }

      results.push(siteResult)

      // Callback si fourni
      if (options.onSiteComplete) {
        await options.onSiteComplete(site, siteResult, durationMs)
      }

      log.info('Site terminé', {
        site,
        ok: result.ok,
        items: result.items,
        ms: durationMs,
      })
    } catch (error) {
      const durationMs = Date.now() - startTime
      const errorMsg = error instanceof Error ? error.message : String(error)

      const siteResult: SiteRunResult = {
        site,
        ok: false,
        items: 0,
        ms: durationMs,
        strategy: 'ai-fallback',
        listings: [],
        error: errorMsg,
      }

      results.push(siteResult)

      if (options.onSiteComplete) {
        await options.onSiteComplete(site, siteResult, durationMs)
      }

      log.error('Site échoué', {
        site,
        error: errorMsg,
        ms: durationMs,
      })
    }
  }

  // Exécuter avec limite de concurrence
  while (siteIndex < SITES.length || pending.length > 0) {
    // Lancer de nouveaux sites jusqu'à la limite de concurrence
    while (pending.length < concurrency && siteIndex < SITES.length) {
      const site = SITES[siteIndex++]
      const promise = runSite(site).finally(() => {
        // Retirer de pending quand terminé
        const index = pending.indexOf(promise)
        if (index > -1) {
          pending.splice(index, 1)
        }
      })

      pending.push(promise)
    }

    // Attendre qu'au moins un site se termine
    if (pending.length > 0) {
      await Promise.race(pending)
    }
  }

  // Attendre que tous les sites restants se terminent
  await Promise.all(pending)

  log.info('Tous les sites terminés', {
    total: results.length,
    successful: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
    totalItems: results.reduce((sum, r) => sum + r.items, 0),
  })

  return results
}

