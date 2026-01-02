/**
 * Configuration des scrapers par site
 * Permet de désactiver les sites trop lents ou non fonctionnels
 */

import { getTimeoutForSite } from '@/src/core/config/constants'

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
    timeout: getTimeoutForSite('LeBonCoin'), // 45s depuis constants.ts
    priority: 1,
    strategy: 'html-first',
    skipIfNoResults: false, // LeBonCoin a toujours des résultats
  },
  'LaCentrale': {
    enabled: true, // ✅ RÉACTIVÉ avec Scraping Browser (fallback automatique)
    timeout: getTimeoutForSite('LaCentrale'), // 40s depuis constants.ts
    priority: 2,
    strategy: 'html-first',
    skipIfNoResults: false,
  },
  'ProCarLease': {
    enabled: true,
    timeout: getTimeoutForSite('ProCarLease'), // 30s depuis constants.ts
    priority: 3,
    strategy: 'html-first',
    skipIfNoResults: true, // ✅ Skip si 0 résultats
  },
  'Kyump': {
    enabled: true,
    timeout: getTimeoutForSite('Kyump'), // 30s depuis constants.ts
    priority: 4,
    strategy: 'js-render',
    skipIfNoResults: true, // ✅ Skip si 0 résultats
  },
  'AutoScout24': {
    enabled: true, // ✅ Réactivé avec parallélisation
    timeout: getTimeoutForSite('AutoScout24'), // 30s depuis constants.ts
    priority: 5,
    strategy: 'parallel',
    skipIfNoResults: true, // ✅ Skip si 0 résultats
  },
  'LeParking': {
    enabled: true, // ✅ Réactivé avec parallélisation
    timeout: getTimeoutForSite('LeParking'), // 30s depuis constants.ts
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
    enabled: true, // ✅ Activé
    timeout: getTimeoutForSite('TransakAuto'), // 30s depuis constants.ts
    priority: 7,
    strategy: 'html-first',
    skipIfNoResults: true,
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
 * Utilise la config du site ou le timeout par défaut depuis constants.ts
 */
export function getSiteTimeout(siteName: string): number {
  return SCRAPER_CONFIG[siteName]?.timeout ?? getTimeoutForSite(siteName)
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

