/**
 * Client ZenRows avec gestion d'erreurs RESP001 et fallback
 */

import { createRouteLogger } from '@/src/core/logger'
import { getZenRowsApiKey } from '@/src/core/config/env'
import { SCRAPING_CONSTANTS, ZENROWS_CONFIG } from '@/src/core/config/constants'
import type { ScrapingStrategy } from '@/src/core/types'

const log = createRouteLogger('zenrows-client')

const ZENROWS_BASE_URL = 'https://api.zenrows.com/v1'

export interface ZenRowsParams {
  js_render?: 'true' | 'false'
  premium_proxy?: 'true' | 'false'
  wait?: string // en ms
  block_resources?: string // Liste: 'image,media,font' ou vide pour désactiver
  proxy_country?: string // 'fr', 'us', etc.
  custom_headers?: boolean // Pour activer headers personnalisés
}

export interface ZenRowsResult {
  html: string
  strategy: ScrapingStrategy
  ms: number
}

/**
 * Scrape via ZenRows avec gestion RESP001 et fallback
 */
export async function scrapeWithZenRows(
  targetUrl: string,
  siteName: 'default' | 'leboncoin' | 'lacentrale' = 'default',
  signal?: AbortSignal
): Promise<ZenRowsResult> {
  const startTime = Date.now()
  const config = ZENROWS_CONFIG[siteName] || ZENROWS_CONFIG.default
  const retryConfig = SCRAPING_CONSTANTS.retries.zenrows

  // Construire les paramètres ZenRows
  const params: ZenRowsParams = {
    js_render: config.js_render as 'true' | 'false',
    premium_proxy: config.premium_proxy as 'true' | 'false',
    wait: config.wait,
    block_resources: config.block_resources,
    ...((config as any).proxy_country && { proxy_country: (config as any).proxy_country }),
  }

  // Headers personnalisés pour LaCentrale si configuré
  const headers: HeadersInit = {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  }

  let lastError: Error | null = null

  for (let attempt = 1; attempt <= retryConfig.maxAttempts; attempt++) {
    try {
      const html = await scrapeOnce(targetUrl, params, headers, signal)

      return {
        html,
        strategy: 'zenrows',
        ms: Date.now() - startTime,
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      const errorMsg = lastError.message

      // Détecter RESP001 (LaCentrale bloquée)
      if (
        errorMsg.includes('RESP001') ||
        errorMsg.includes('422') ||
        errorMsg.includes('Could not get content')
      ) {
        log.warn('ZenRows RESP001 détecté - site probablement bloqué', {
          site: siteName,
          attempt,
          url: targetUrl,
        })

        // Si c'est LaCentrale et premier essai, essayer sans block_resources
        if (siteName === 'lacentrale' && attempt === 1) {
          log.info('Tentative LaCentrale sans block_resources', {
            url: targetUrl,
          })
          try {
            const paramsNoBlock = { ...params }
            delete paramsNoBlock.block_resources

            const html = await scrapeOnce(
              targetUrl,
              paramsNoBlock,
              headers,
              signal
            )

            return {
              html,
              strategy: 'zenrows',
              ms: Date.now() - startTime,
            }
          } catch (retryError) {
            // Ignore et continue avec le fallback
          }
        }

        // Si après retry toujours RESP001, throw pour déclencher fallback
        if (attempt >= retryConfig.maxAttempts) {
          throw new Error(
            `ZenRows RESP001 (site bloqué) - déclencher fallback Playwright`
          )
        }
      }

      // Vérifier si retryable
      const isRetryable =
        retryConfig.retryableStatuses.some((status) =>
          errorMsg.includes(String(status))
        ) || attempt < retryConfig.maxAttempts

      if (!isRetryable) {
        throw lastError
      }

      // Backoff exponentiel
      const backoffMs = retryConfig.backoffMs * Math.pow(2, attempt - 1)
      log.warn(`ZenRows retry ${attempt}/${retryConfig.maxAttempts} après ${backoffMs}ms`, {
        url: targetUrl,
        attempt,
        error: errorMsg,
      })

      await new Promise((resolve) => setTimeout(resolve, backoffMs))
    }
  }

  throw lastError || new Error('Échec ZenRows après retries')
}

/**
 * Scrape une fois (sans retry)
 */
async function scrapeOnce(
  targetUrl: string,
  params: ZenRowsParams,
  headers: HeadersInit,
  signal?: AbortSignal
): Promise<string> {
  if (!targetUrl || typeof targetUrl !== 'string') {
    throw new Error(`URL invalide: ${targetUrl}`)
  }

  const apiKey = getZenRowsApiKey()
  const url = new URL(ZENROWS_BASE_URL)
  url.searchParams.set('apikey', apiKey)
  url.searchParams.set('url', encodeURI(targetUrl))

  // Ajouter les paramètres
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value))
    }
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers,
    signal,
  })

  const text = await response.text()

  if (!response.ok) {
    // Parser l'erreur JSON si possible
    let errorDetail = text.substring(0, 200)
    try {
      const errorJson = JSON.parse(text)
      if (errorJson.code) {
        errorDetail = `code: ${errorJson.code}, message: ${errorJson.title || errorJson.message}`
      }
    } catch {
      // Ignore si pas JSON
    }

    log.error('ZenRows HTTP error', {
      status: response.status,
      url: targetUrl,
      errorDetail,
    })

    throw new Error(`ZenRows HTTP ${response.status}: ${errorDetail}`)
  }

  if (text.length < 100) {
    throw new Error(
      `HTML trop court (${text.length} chars) - probablement bloqué`
    )
  }

  log.debug('ZenRows scraping réussi', {
    url: targetUrl,
    htmlLength: text.length,
  })

  return text
}

