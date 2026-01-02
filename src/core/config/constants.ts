/**
 * Constantes centralisées pour le scraping et le backend
 * Timeouts, limites, retries, concurrence
 */

export const SCRAPING_CONSTANTS = {
  timeouts: {
    defaultMs: 30000, // 30 secondes pour les sites standards (optimisé pour rapidité)
    leboncoinMs: 45000, // 45 secondes pour LeBonCoin (rapide et efficace)
    perPassMs: 20000, // 20s max par passe (réduit pour rapidité)
    globalSiteMs: 15000, // 15s max par site (avant abort - optimisé)
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
    wait: '8000', // Réduit à 8s pour rapidité (était 20s)
    block_resources: 'image,media,font', // STRING, pas boolean
  },
  leboncoin: {
    js_render: 'true',
    premium_proxy: 'true',
    wait: '10000', // Réduit à 10s pour LeBonCoin rapide (était 20s)
    block_resources: 'image,media,font',
  },
  lacentrale: {
    js_render: 'true',
    premium_proxy: 'true',
    proxy_country: 'fr',
    block_resources: 'image,media,font', // STRING corrigée
    wait: '5000', // Conservé à 5s (déjà optimisé)
    // Headers personnalisés pour éviter RESP001
    custom_headers: true,
  },
} as const

/**
 * Récupère le timeout approprié pour un site
 */
export function getTimeoutForSite(siteName: string): number {
  if (siteName === 'LeBonCoin') {
    return SCRAPING_CONSTANTS.timeouts.leboncoinMs // 45s
  }
  // LaCentrale nécessite un peu plus de temps car JS rendering + proxy_country
  if (siteName === 'LaCentrale') {
    return 40000 // 40 secondes pour LaCentrale (optimisé)
  }
  return SCRAPING_CONSTANTS.timeouts.defaultMs // 30s
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
  | 'zenrows-browser'
  | 'playwright-remote'
  | 'playwright-local'
  | 'http-html'
  | 'xhr-json'
  | 'json-embedded'
  | 'ai-fallback'






