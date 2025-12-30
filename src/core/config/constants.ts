/**
 * Constantes centralisées pour le scraping et le backend
 * Timeouts, limites, retries, concurrence
 */

export const SCRAPING_CONSTANTS = {
  timeouts: {
    defaultMs: 240000, // 4 minutes pour les sites standards
    leboncoinMs: 360000, // 6 minutes pour LeBonCoin (prioritaire)
    perPassMs: 60000, // 60s max par passe
    globalSiteMs: 25000, // 25s max par site (avant abort)
  },
  limits: {
    maxResultsPerPass: 50,
    maxResultsPerSite: 100,
    maxPrice: 300000, // Plafond de sécurité
    maxMileage: 500000, // Plafond kilométrage
    maxHtmlLogLength: 20000, // Limite HTML dans les logs (20k chars)
  },
  concurrency: {
    maxSitesParallel: 3, // Max 3 sites en parallèle
    maxPlaywrightInstances: 2, // Max 2 instances Playwright simultanées
  },
  retries: {
    zenrows: {
      maxAttempts: 2,
      retryableStatuses: [422, 403, 429, 500, 502, 503],
      backoffMs: 2000,
    },
    http: {
      maxAttempts: 3,
      backoffMs: 1000,
    },
  },
  cache: {
    ttlMs: 5 * 60 * 1000, // 5 minutes
  },
  ai: {
    maxTokens: 16384, // Limite pour gpt-4o-mini
    temperature: 0.05,
  },
} as const

/**
 * Configuration ZenRows standardisée
 * IMPORTANT: block_resources doit être une STRING (liste de ressources) ou omis
 */
export const ZENROWS_CONFIG = {
  default: {
    js_render: 'true',
    premium_proxy: 'true',
    wait: '20000',
    block_resources: 'image,media,font', // STRING, pas boolean
  },
  leboncoin: {
    js_render: 'true',
    premium_proxy: 'true',
    wait: '20000',
    block_resources: 'image,media,font',
  },
  lacentrale: {
    js_render: 'true',
    premium_proxy: 'true',
    proxy_country: 'fr',
    block_resources: 'image,media,font', // STRING corrigée
    wait: '5000', // Augmenté pour meilleure stabilité
    // Headers personnalisés pour éviter RESP001
    custom_headers: true,
  },
} as const

/**
 * Récupère le timeout approprié pour un site
 */
export function getTimeoutForSite(siteName: string): number {
  return siteName === 'LeBonCoin'
    ? SCRAPING_CONSTANTS.timeouts.leboncoinMs
    : SCRAPING_CONSTANTS.timeouts.defaultMs
}

/**
 * Valide et limite un prix
 */
export function clampPrice(price: number): number {
  return Math.max(0, Math.min(price, SCRAPING_CONSTANTS.limits.maxPrice))
}

/**
 * Valide et limite un kilométrage
 */
export function clampMileage(mileage: number): number {
  return Math.max(0, Math.min(mileage, SCRAPING_CONSTANTS.limits.maxMileage))
}

/**
 * Types de passes de recherche
 */
export type ScrapePass = 'strict' | 'relaxed' | 'opportunity'

/**
 * Stratégies de scraping
 */
export type ScrapingStrategy =
  | 'api-direct'
  | 'zenrows'
  | 'playwright-remote'
  | 'playwright-local'
  | 'http-html'
  | 'xhr-json'
  | 'json-embedded'
  | 'ai-fallback'






