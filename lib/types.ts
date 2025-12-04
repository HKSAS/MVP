/**
 * Types TypeScript partagés entre frontend et backend
 */

// ============================================================================
// TYPES POUR LES ANNONCES
// ============================================================================

export interface Listing {
  id?: string
  external_id: string
  title: string
  price_eur: number | null
  mileage_km: number | null
  year: number | null
  source: string
  url: string
  imageUrl: string | null
  score_ia: number | null
  created_at?: string
}

// Format normalisé pour le frontend
export interface ListingResponse {
  id: string
  title: string
  price_eur: number | null
  mileage_km: number | null
  year: number | null
  source: string
  url: string
  imageUrl: string | null
  score_ia: number | null
  score_final: number // Score de pertinence final (0-100)
}

// ============================================================================
// TYPES POUR L'ANALYSE ANTI-ARNaque
// ============================================================================

export interface AnalyzeListingInput {
  url?: string
  title?: string
  description?: string
  price_eur?: number
  mileage_km?: number
  year?: number
}

export interface MarketPriceEstimate {
  min: number | null
  max: number | null
  comment: string
}

export interface AnalyzeListingResponse {
  success: boolean
  data?: {
    summary: string
    risk_score: number
    risk_level: 'low' | 'medium' | 'high'
    market_price_estimate: MarketPriceEstimate
    positives: string[]
    warnings: string[]
    final_recommendation: string
    technical_notes?: string
  }
  error?: string
  details?: any
}

// ============================================================================
// TYPES POUR LES RECHERCHES
// ============================================================================

export interface SearchQuery {
  brand: string
  model: string
  max_price: number
  fuelType?: 'essence' | 'diesel' | 'hybride' | 'electrique' | string
  page?: number
  limit?: number
}

export interface SearchResponse {
  success: boolean
  query: {
    brand: string
    model: string
    maxPrice: number
    fuelType?: string
  }
  sites: Record<string, { count: number }>
  listings: ListingResponse[]
  stats: {
    total: number
    sites_scraped: number
    sites_failed: number
  }
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  error?: string
}

// ============================================================================
// TYPES POUR LE DASHBOARD
// ============================================================================

export interface UserSearch {
  id: string
  brand: string
  model: string
  max_price: number
  total_results: number
  created_at: string
}

export interface UserAnalyzedListing {
  id: string
  url: string | null
  risk_score: number
  risk_level: 'low' | 'medium' | 'high'
  summary: string
  created_at: string
}

// ============================================================================
// TYPES POUR LE CONTACT
// ============================================================================

export interface ContactInput {
  name: string
  email: string
  message: string
}

export interface ContactResponse {
  success: boolean
  message: string
}

// ============================================================================
// TYPES POUR L'AUTHENTIFICATION
// ============================================================================

export interface AuthUser {
  id: string
  email: string
  created_at: string
}

// ============================================================================
// TYPES POUR LES FAVORIS
// ============================================================================

export interface Favorite {
  id: string
  user_id: string
  listing_id: string
  created_at: string
  listing?: ListingResponse // Populé via JOIN
}

export interface FavoriteResponse {
  success: boolean
  data?: Favorite[]
  message?: string
}

