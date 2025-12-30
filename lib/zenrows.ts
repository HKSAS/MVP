/**
 * Client ZenRows réutilisable
 * Gère l'appel à l'API ZenRows avec gestion d'erreurs robuste
 */

import { logger } from './logger'
import { getZenRowsApiKey } from './env'

const ZENROWS_BASE_URL = 'https://api.zenrows.com/v1'

/**
 * Scrape une URL via ZenRows avec retry automatique
 * @param targetUrl - L'URL à scraper (doit être absolue et valide)
 * @param params - Paramètres ZenRows supplémentaires (js_render, premium_proxy, wait, etc.)
 * @param signal - AbortSignal pour annuler la requête
 * @param retryConfig - Configuration de retry (maxAttempts, retryableStatuses, backoffMs)
 * @returns Le HTML scrapé
 */
export async function scrapeWithZenRows(
  targetUrl: string,
  params: Record<string, any> = {},
  signal?: AbortSignal,
  retryConfig?: {
    maxAttempts?: number
    retryableStatuses?: number[]
    backoffMs?: number
  }
): Promise<string> {
  const maxAttempts = retryConfig?.maxAttempts ?? 1
  const retryableStatuses = retryConfig?.retryableStatuses ?? []
  const backoffMs = retryConfig?.backoffMs ?? 1000
  
  let lastError: Error | null = null
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await scrapeWithZenRowsOnce(targetUrl, params, signal)
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      
      // Vérifier si on doit retry
      const shouldRetry = 
        attempt < maxAttempts &&
        (retryableStatuses.length === 0 || 
         (lastError.message.includes('422') || 
          lastError.message.includes('403') || 
          lastError.message.includes('429')))
      
      if (!shouldRetry) {
        throw lastError
      }
      
      // Backoff exponentiel
      const delay = backoffMs * Math.pow(2, attempt - 1)
      logger.warn(`ZenRows retry ${attempt}/${maxAttempts} après ${delay}ms`, {
        url: targetUrl,
        attempt,
        error: lastError.message,
      })
      
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  
  throw lastError || new Error('Erreur inconnue ZenRows')
}

/**
 * Scrape une URL via ZenRows (une seule tentative)
 */
async function scrapeWithZenRowsOnce(
  targetUrl: string,
  params: Record<string, any> = {},
  signal?: AbortSignal
): Promise<string> {
  // Validation de l'URL
  if (!targetUrl || typeof targetUrl !== 'string') {
    throw new Error(`URL cible vide ou invalide: ${targetUrl}`)
  }

  // Encoder l'URL (mais pas avec encodeURIComponent sur l'URL entière)
  const encodedTargetUrl = encodeURI(targetUrl)

  // Construction de l'URL ZenRows
  const apiKey = getZenRowsApiKey()
  const url = new URL(ZENROWS_BASE_URL)
  url.searchParams.set('apikey', apiKey)
  url.searchParams.set('url', encodedTargetUrl)

  // Paramètres ZenRows par défaut
  const defaultParams = {
    js_render: 'true',
    premium_proxy: 'true',
    wait: '5000',
    // Optionnel : activer json_response pour voir les requêtes XHR (utile pour debug)
    // json_response: 'true', // Décommenter pour activer
  }

  // Fusion des paramètres (les params passés en argument écrasent les defaults)
  const finalParams = { ...defaultParams, ...params }

  // Ajout des paramètres à l'URL
  for (const [key, value] of Object.entries(finalParams)) {
    url.searchParams.set(key, String(value))
  }

  try {
    const res = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      signal,
    })

    const text = await res.text()

    if (!res.ok) {
      logger.error('ZenRows HTTP error', {
        status: res.status,
        url: targetUrl,
        responsePreview: text.substring(0, 200),
      })
      
      throw new Error(`ZenRows HTTP ${res.status}: ${text.substring(0, 200)}`)
    }

    if (text.length < 100) {
      logger.warn('HTML trop court', {
        url: targetUrl,
        length: text.length,
      })
      throw new Error(`HTML trop court (${text.length} caractères) - probablement bloqué ou erreur`)
    }

    logger.debug('Scraping réussi', {
      url: targetUrl,
      htmlLength: text.length,
    })

    return text
  } catch (error) {
    if (error instanceof Error) {
      logger.error('Erreur scraping ZenRows', {
        url: targetUrl,
        error: error.message,
      })
      throw error
    }
    logger.error('Erreur inconnue scraping', {
      url: targetUrl,
      error: String(error),
    })
    throw new Error(`Erreur inconnue lors du scraping: ${String(error)}`)
  }
}

