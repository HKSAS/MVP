/**
 * Configuration centralisée pour le scraping
 * Timeouts, limites, et paramètres ZenRows
 */

/**
 * @deprecated Utiliser src/core/config/constants.ts à la place
 * Bridge de compatibilité temporaire
 */
import { SCRAPING_CONSTANTS, ZENROWS_CONFIG, getTimeoutForSite as _getTimeoutForSite, clampPrice as _clampPrice, clampMileage as _clampMileage } from '@/src/core/config/constants'

export const SCRAPING_CONFIG = {
  timeouts: {
    defaultMs: SCRAPING_CONSTANTS.timeouts.defaultMs,
    leboncoinMs: SCRAPING_CONSTANTS.timeouts.leboncoinMs,
  },
  limits: {
    maxResultsPerPass: SCRAPING_CONSTANTS.limits.maxResultsPerPass,
    maxResultsPerSite: SCRAPING_CONSTANTS.limits.maxResultsPerSite,
    maxPrice: SCRAPING_CONSTANTS.limits.maxPrice,
    maxMileage: SCRAPING_CONSTANTS.limits.maxMileage,
  },
  zenrows: {
    default: ZENROWS_CONFIG.default,
    leboncoin: ZENROWS_CONFIG.leboncoin,
    lacentrale: ZENROWS_CONFIG.lacentrale,
  },
  cache: {
    ttlMs: SCRAPING_CONSTANTS.cache.ttlMs,
  },
  ai: {
    maxTokens: SCRAPING_CONSTANTS.ai.maxTokens,
    temperature: SCRAPING_CONSTANTS.ai.temperature,
  },
} as const

export const getTimeoutForSite = _getTimeoutForSite
export const clampPrice = _clampPrice
export const clampMileage = _clampMileage

