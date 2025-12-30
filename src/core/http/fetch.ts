/**
 * Wrapper HTTP avec retry, timeout, et gestion d'erreurs robuste
 */

import { createRouteLogger } from '@/src/core/logger'
import { SCRAPING_CONSTANTS } from '../config/constants'

const log = createRouteLogger('http-fetch')

export interface FetchOptions extends RequestInit {
  timeout?: number
  retries?: number
  retryableStatuses?: number[]
  signal?: AbortSignal
}

/**
 * Fetch avec retry et timeout
 */
export async function fetchWithRetry(
  url: string,
  options: FetchOptions = {}
): Promise<Response> {
  const {
    timeout = 30000,
    retries = options.retries ?? SCRAPING_CONSTANTS.retries.http.maxAttempts,
    retryableStatuses = [500, 502, 503, 504, 408, 429],
    signal: externalSignal,
    ...fetchOptions
  } = options

  let lastError: Error | null = null

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      // Créer un AbortController pour le timeout
      const abortController = new AbortController()
      const timeoutId = setTimeout(() => abortController.abort(), timeout)

      // Combiner les signaux
      const combinedSignal = externalSignal
        ? new AbortController()
        : abortController

      if (externalSignal) {
        externalSignal.addEventListener('abort', () => {
          combinedSignal.abort()
        })
      }

      const response = await fetch(url, {
        ...fetchOptions,
        signal: combinedSignal.signal,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          ...fetchOptions.headers,
        },
      })

      clearTimeout(timeoutId)

      // Vérifier le statut
      if (!response.ok && retryableStatuses.includes(response.status)) {
        if (attempt < retries) {
          const backoffMs =
            SCRAPING_CONSTANTS.retries.http.backoffMs *
            Math.pow(2, attempt - 1)
          log.warn(`HTTP retry ${attempt}/${retries} après ${backoffMs}ms`, {
            url,
            status: response.status,
            attempt,
          })
          await new Promise((resolve) => setTimeout(resolve, backoffMs))
          continue
        }
      }

      return response
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      // Si abort, ne pas retry
      if (lastError.name === 'AbortError' || externalSignal?.aborted) {
        throw lastError
      }

      if (attempt < retries) {
        const backoffMs =
          SCRAPING_CONSTANTS.retries.http.backoffMs *
          Math.pow(2, attempt - 1)
        log.warn(`HTTP retry ${attempt}/${retries} après ${backoffMs}ms`, {
          url,
          error: lastError.message,
          attempt,
        })
        await new Promise((resolve) => setTimeout(resolve, backoffMs))
        continue
      }
    }
  }

  throw lastError || new Error(`Échec après ${retries} tentatives`)
}

/**
 * Fetch et retourne le texte avec gestion d'erreurs
 */
export async function fetchText(
  url: string,
  options: FetchOptions = {}
): Promise<string> {
  const response = await fetchWithRetry(url, options)
  const text = await response.text()

  if (!response.ok) {
    throw new Error(
      `HTTP ${response.status}: ${text.substring(0, 200)}`
    )
  }

  return text
}






