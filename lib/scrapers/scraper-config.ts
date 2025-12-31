/**
 * Configuration des scrapers par site
 * Permet de désactiver les sites trop lents ou non fonctionnels
 */

export interface SiteConfig {
  enabled: boolean
  timeout: number
  priority: number
  strategy?: 'html-first' | 'js-render' | 'parallel' // Stratégie de scraping
  reason?: string // Pour expliquer pourquoi un site est désactivé
}

export const SCRAPER_CONFIG: Record<string, SiteConfig> = {
  'LeBonCoin': {
    enabled: true,
    timeout: 15000,
    priority: 1,
    strategy: 'html-first',
  },
  'LaCentrale': {
    enabled: true,
    timeout: 20000,
    priority: 2,
    strategy: 'html-first',
  },
  'Aramisauto': {
    enabled: true,
    timeout: 15000,
    priority: 3,
    strategy: 'js-render',
  },
  'ProCarLease': {
    enabled: true,
    timeout: 15000,
    priority: 5,
    strategy: 'html-first',
  },
  'Kyump': {
    enabled: true,
    timeout: 15000,
    priority: 4,
    strategy: 'js-render',
  },
  'AutoScout24': {
    enabled: true, // ✅ Réactivé avec parallélisation
    timeout: 12000, // ⚡ Timeout réduit (20s → 12s)
    priority: 5,
    strategy: 'parallel',
  },
  'LeParking': {
    enabled: true, // ✅ Réactivé avec parallélisation
    timeout: 12000, // ⚡ Timeout réduit (20s → 12s)
    priority: 6,
    strategy: 'parallel',
  },
  'ParuVendu': {
    enabled: false, // ❌ Parser cassé
    timeout: 10000,
    priority: 9,
    reason: 'Parser ne trouve pas les annonces (HTML reçu mais 0 résultats)',
  },
  'TransakAuto': {
    enabled: false, // ❌ Ne fonctionne pas
    timeout: 5000,
    priority: 10,
    reason: 'Retourne 0 résultats',
  },
}

/**
 * Vérifie si un site est activé
 */
export function isSiteEnabled(siteName: string): boolean {
  return SCRAPER_CONFIG[siteName]?.enabled ?? true // Par défaut activé si non configuré
}

/**
 * Récupère le timeout pour un site
 */
export function getSiteTimeout(siteName: string): number {
  return SCRAPER_CONFIG[siteName]?.timeout ?? 20000 // 20s par défaut
}

/**
 * Liste des sites activés
 */
export function getEnabledSites(): string[] {
  return Object.entries(SCRAPER_CONFIG)
    .filter(([_, config]) => config.enabled)
    .sort(([_, a], [__, b]) => a.priority - b.priority)
    .map(([siteName]) => siteName)
}

