/**
 * Configuration des scrapers par site
 * Permet de désactiver les sites trop lents ou non fonctionnels
 */

export interface SiteConfig {
  enabled: boolean
  timeout: number
  priority: number
  reason?: string // Pour expliquer pourquoi un site est désactivé
}

export const SCRAPER_CONFIG: Record<string, SiteConfig> = {
  'LeBonCoin': {
    enabled: true,
    timeout: 15000,
    priority: 1, // Toujours le meilleur
  },
  'LaCentrale': {
    enabled: true,
    timeout: 20000,
    priority: 2,
  },
  'ProCarLease': {
    enabled: true,
    timeout: 15000,
    priority: 3,
  },
  'AutoScout24': {
    enabled: false, // ❌ Temporairement désactivé (trop lent)
    timeout: 20000,
    priority: 4,
    reason: '163s pour 1 annonce - À optimiser',
  },
  'LeParking': {
    enabled: false, // ❌ Temporairement désactivé (trop lent)
    timeout: 20000,
    priority: 5,
    reason: '64s pour 1 annonce - À optimiser',
  },
  'ParuVendu': {
    enabled: false, // ❌ Parser cassé
    timeout: 10000,
    priority: 6,
    reason: 'Parser ne trouve pas les annonces (HTML reçu mais 0 résultats)',
  },
  'TransakAuto': {
    enabled: false, // ❌ Ne fonctionne pas
    timeout: 5000,
    priority: 7,
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

