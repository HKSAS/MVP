/**
 * Helpers centralisés pour la gestion des variables d'environnement
 * Garantit la cohérence et la sécurité
 */

/**
 * Requiert une variable d'environnement (throw si manquante)
 */
export function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value || value.trim() === '') {
    throw new Error(`Variable d'environnement requise manquante: ${name}`)
  }
  return value
}

/**
 * Récupère une variable d'environnement (retourne undefined si manquante)
 */
export function getEnv(name: string): string | undefined {
  const value = process.env[name]
  return value && value.trim() !== '' ? value : undefined
}

/**
 * Récupère une variable d'environnement avec une valeur par défaut
 */
export function getEnvWithDefault(name: string, defaultValue: string): string {
  return getEnv(name) || defaultValue
}

/**
 * Vérifie qu'une variable d'environnement est présente (sans la retourner)
 */
export function hasEnv(name: string): boolean {
  return !!getEnv(name)
}

// ============================================================================
// Variables d'environnement validées au chargement
// ============================================================================

// Variables publiques (OK côté client)
export const NEXT_PUBLIC_SUPABASE_URL = getEnv('NEXT_PUBLIC_SUPABASE_URL')
export const NEXT_PUBLIC_SUPABASE_ANON_KEY = getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
export const NEXT_PUBLIC_SITE_URL = getEnv('NEXT_PUBLIC_SITE_URL')

// Variables privées (UNIQUEMENT côté serveur)
// Ces fonctions doivent être appelées uniquement dans des routes API ou server components
export function getZenRowsApiKey(): string {
  return requireEnv('ZENROWS_API_KEY')
}

export function getOpenAIApiKey(): string {
  return requireEnv('OPENAI_API_KEY')
}

export function getStripeSecretKey(): string {
  return requireEnv('STRIPE_SECRET_KEY')
}

export function getSupabaseServiceRoleKey(): string | undefined {
  return getEnv('SUPABASE_SERVICE_ROLE_KEY')
}

/**
 * Récupère un Price ID Stripe pour un plan donné
 * Standard: STRIPE_PRICE_ID_39, STRIPE_PRICE_ID_299, STRIPE_PRICE_ID_599, STRIPE_PRICE_ID_999
 * Compatibilité: STRIPE_PRICE_39, STRIPE_PRICE_299, etc. (fallback)
 */
export function getStripePriceId(plan: string): string | null {
  // Standard: STRIPE_PRICE_ID_39
  const standardKey = `STRIPE_PRICE_ID_${plan.replace('pack_', '')}`
  const standardValue = getEnv(standardKey)
  if (standardValue) {
    return standardValue
  }

  // Fallback: STRIPE_PRICE_39 (ancienne convention)
  const fallbackKey = `STRIPE_PRICE_${plan.replace('pack_', '')}`
  const fallbackValue = getEnv(fallbackKey)
  if (fallbackValue) {
    return fallbackValue
  }

  return null
}

/**
 * Valide que les variables d'environnement critiques sont présentes
 * (pour les routes API uniquement)
 */
export function validateServerEnv(): { valid: boolean; missing: string[] } {
  const required = [
    'ZENROWS_API_KEY',
    'OPENAI_API_KEY',
    'STRIPE_SECRET_KEY',
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  ]

  const missing: string[] = []
  for (const key of required) {
    if (!hasEnv(key)) {
      missing.push(key)
    }
  }

  return {
    valid: missing.length === 0,
    missing,
  }
}

