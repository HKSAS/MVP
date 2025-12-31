/**
 * Configuration des scrapers par site
 * Permet de désactiver les sites trop lents ou non fonctionnels
 */

export interface SiteConfig {
  enabled: boolean
  timeout: number
  priority: number
  strategy?: 'html-first' | 'js-render' | 'parallel' // Stratégie de scraping
  skipIfNoResults?: boolean // ✅ NOUVEAU: Skip les passes suivantes si 0 résultats en strict
  reason?: string // Pour expliquer pourquoi un site est désactivé
}

export const SCRAPER_CONFIG: Record<string, SiteConfig> = {
  'LeBonCoin': {
    enabled: true,
    timeout: 15000,
    priority: 1,
    strategy: 'html-first',
    skipIfNoResults: false, // LeBonCoin a toujours des résultats
  },
  'LaCentrale': {
    enabled: true, // ✅ RÉACTIVÉ
    timeout: 20000,
    priority: 2,
    strategy: 'html-first',
    skipIfNoResults: false, // Important, on veut les 3 passes
  },
  'ProCarLease': {
    enabled: true,
    timeout: 15000,
    priority: 3,
    strategy: 'html-first',
    skipIfNoResults: true, // ✅ Skip si 0 résultats
  },
  'Kyump': {
    enabled: true,
    timeout: 15000,
    priority: 4,
    strategy: 'js-render',
    skipIfNoResults: true, // ✅ Skip si 0 résultats
  },
  'AutoScout24': {
    enabled: true, // ✅ Réactivé avec parallélisation
    timeout: 12000, // ⚡ Timeout réduit (20s → 12s)
    priority: 5,
    strategy: 'parallel',
    skipIfNoResults: true, // ✅ Skip si 0 résultats
  },
  'LeParking': {
    enabled: true, // ✅ Réactivé avec parallélisation
    timeout: 12000, // ⚡ Timeout réduit (20s → 12s)
    priority: 6,
    strategy: 'parallel',
    skipIfNoResults: true, // ✅ Skip si 0 résultats
  },
  'Aramisauto': {
    enabled: false, // ❌ DÉSACTIVÉ (parser cassé)
    timeout: 15000,
    priority: 7,
    strategy: 'js-render',
    skipIfNoResults: true,
    reason: 'Parser cassé - 0 résultats malgré HTML téléchargé',
  },
  'ParuVendu': {
    enabled: false, // ❌ Parser cassé
    timeout: 10000,
    priority: 8,
    skipIfNoResults: true,
    reason: 'Parser ne trouve pas les annonces (HTML reçu mais 0 résultats)',
  },
  'TransakAuto': {
    enabled: false, // ❌ Ne fonctionne pas
    timeout: 5000,
    priority: 9,
    skipIfNoResults: true,
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
 * Récupère la config complète d'un site
 */
export function getSiteConfig(siteName: string): SiteConfig | undefined {
  return SCRAPER_CONFIG[siteName]
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

/**
 * Alias pour compatibilité
 */
export function getActiveSites(): string[] {
  return getEnabledSites()
}

