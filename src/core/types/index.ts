/**
 * Types TypeScript stricts pour le backend
 */

/**
 * Paramètres de recherche
 */
export interface SearchParams {
  brand: string
  model?: string
  maxPrice: number
  minPrice?: number
  fuelType?: 'essence' | 'diesel' | 'hybrid' | 'electric' | 'any'
  minYear?: number
  maxYear?: number
  maxMileage?: number
  gearbox?: 'manual' | 'automatic' | 'any'
  sellerType?: 'professional' | 'private' | 'any'
  zipCode?: string
  radiusKm?: number
  bodyType?: string
}

/**
 * Listing normalisé (format interne)
 */
export interface ListingNormalized {
  id: string
  external_id: string
  title: string
  price: number | null
  year: number | null
  mileage: number | null
  fuel: string | null
  gearbox: string | null
  city: string | null
  url: string
  image_url: string | null
  source: string
  score?: number
  risk?: number
  score_ia?: number
  score_final?: number
  canonical_id?: string // Pour la déduplication
}

/**
 * Résultat d'un site
 */
export interface SiteResult {
  site: string
  ok: boolean
  items: number
  ms: number
  strategy: string
  error?: string
  attempts?: Array<{
    pass: 'strict' | 'relaxed' | 'opportunity'
    ok: boolean
    items: number
    ms: number
    note?: string
  }>
}

/**
 * Passes de recherche
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

/**
 * Requête de scraping
 */
export interface ScrapeQuery {
  brand: string
  model?: string
  maxPrice: number
  minPrice?: number
  fuelType?: string
  minYear?: number
  maxYear?: number
  maxMileage?: number
  zipCode?: string
  radiusKm?: number
  transmission?: string // 'manuelle' | 'automatique' | 'semi_automatique'
  bodyType?: string // 'berline' | 'break' | 'suv' | etc.
  doors?: string // '3' | '5'
  seats?: string // '2' | '4' | '5' | '7'
  color?: string
  location?: string // Ville ou région
}

/**
 * Réponse d'analyse de listing (pour compatibilité avec analyse-listing)
 * Format réel: { success: boolean, data: analysisData, error?: string }
 */
export interface AnalyzeListingResponse {
  success: boolean
  data?: {
    score: number
    reliabilityScore: number
    riskLevel: 'low' | 'medium' | 'high'
    recommendation: string
    marketPrice: {
      min: number
      max: number
      vehiclePrice: number
      position: 'basse_fourchette' | 'moyenne' | 'haute_fourchette' | 'hors_fourchette'
      negotiationAdvice: string
      explanation: Array<{ factor: string; impact: number }>
    }
    scoreBreakdown: Array<{
      criterion: string
      points: number
      details: string
    }> | {
      total: number
      factors: Array<{
        name: string
        score: number
        weight: number
      }>
    }
    redFlags: Array<{
      type: string
      severity: 'low' | 'medium' | 'high' | 'critical'
      message: string
      details?: string
    }>
    positives: string[]
    watchouts: string[]
    knownIssues: Array<{
      category: string
      items: string[]
    }>
    buyerChecklist: string[]
    finalVerdict: string
    extractedData?: any
    summary?: string
    risk_score?: number
    warnings?: string[]
    advice?: string
    final_recommendation?: string
    [key: string]: any
  }
  error?: string
  [key: string]: any
}

/**
 * Réponse contact (pour compatibilité)
 */
export interface ContactResponse {
  success: boolean
  message?: string
  error?: string
}

/**
 * Listing Response (format API - pour compatibilité)
 */
export interface ListingResponse {
  id: string
  title: string
  price_eur: number | null | undefined
  year: number | null | undefined
  mileage_km: number | null | undefined
  url: string
  imageUrl?: string | null | undefined
  source: string
  score_ia?: number | null
  score_final?: number | null
  city?: string | null | undefined
}

/**
 * User Analyzed Listing (pour compatibilité)
 */
export interface UserAnalyzedListing {
  id: any
  url: any
  title?: string | null
  price?: number | null
  year?: number | null
  mileage?: number | null
  risk_score: number
  risk_level: 'low' | 'medium' | 'high'
  summary: any
  created_at: any
  hasFullResult?: boolean
  user_id?: string
  raw_input?: any
  market_min?: number | null
  market_max?: number | null
  recommendation?: string | null
  positives?: string[] | null
  warnings?: string[] | null
  [key: string]: any
}

/**
 * Favorite (pour compatibilité)
 */
export interface Favorite {
  id: string
  user_id?: string
  listing_id?: string
  listing: ListingResponse
  created_at: string
}

/**
 * Favorite Response (pour compatibilité)
 */
export interface FavoriteResponse {
  success: boolean
  data?: Favorite[]
  count?: number
  [key: string]: any
}

/**
 * User Search (pour compatibilité)
 */
export interface UserSearch {
  id: any
  brand: any
  model: any
  max_price: number
  total_results?: any
  created_at: any
  user_id?: string
  fuel_type?: string | null
  status?: string
  updated_at?: string
  [key: string]: any
}

/**
 * Search Response (format API - pour compatibilité)
 */
export interface SearchResponse {
  criteria: {
    brand: string
    model?: string | null
    maxPrice: number
    minPrice?: number | null
    fuelType?: string | null
    minYear?: number | null
    maxYear?: number | null
    maxMileage?: number | null
    zipCode?: string | null
    radiusKm?: number | null
    [key: string]: any
  }
  items: ListingResponse[]
  siteResults: Array<{
    site: string
    ok: boolean
    items: number
    ms: number
    strategy: string
    error?: string
  }>
  stats: {
    totalItems: number
    sitesScraped: number
    totalMs: number
  }
  [key: string]: any
}

/**
 * Scrape Query (pour compatibilité)
 */
export interface ScrapeQuery {
  brand: string
  model?: string
  maxPrice: number
  minPrice?: number
  fuelType?: string
  minYear?: number
  maxYear?: number
  maxMileage?: number
  zipCode?: string
  radiusKm?: number
  [key: string]: any
}
