/**
 * Types TypeScript pour les favoris et recommandations
 */

/**
 * Favori stocké en base
 */
export interface Favorite {
  id: string
  user_id: string
  source: string
  listing_id: string
  listing_url: string
  title: string | null
  price: number | null
  year: number | null
  mileage: number | null
  fuel: string | null
  transmission: string | null
  city: string | null
  score: number | null
  risk_score: number | null
  extracted_features: Record<string, any> | null
  created_at: string
}

/**
 * Listing pour le cache et les recommandations
 */
export interface ListingCache {
  id: string
  source: string
  listing_id: string
  listing_url: string
  title: string | null
  price: number | null
  year: number | null
  mileage: number | null
  fuel: string | null
  transmission: string | null
  city: string | null
  score: number | null
  risk_score: number | null
  extracted_features: Record<string, any> | null
  created_at: string
}

/**
 * Profil de préférences utilisateur
 */
export interface PreferenceProfile {
  topBrands: Array<{ brand: string; count: number }>
  budgetAvg: number
  budgetMin: number
  budgetMax: number
  mileageAvg: number
  mileageMax: number
  yearAvg: number
  yearPreference: 'recent' | 'old' | 'neutral'
  topFuel: Array<{ fuel: string; count: number }>
  topTransmission: Array<{ transmission: string; count: number }>
  topSegments: Array<{ segment: string; count: number }>
}

/**
 * Recommandation avec raison
 */
export interface Recommendation {
  listing: ListingCache
  reason: string
  matchScore: number
}

/**
 * Body pour toggle favori
 */
export interface ToggleFavoriteBody {
  source: string
  listing_id: string
  listing_url: string
  title?: string | null
  price?: number | null
  year?: number | null
  mileage?: number | null
  fuel?: string | null
  transmission?: string | null
  city?: string | null
  score?: number | null
  risk_score?: number | null
  extracted_features?: Record<string, any> | null
}

/**
 * Réponse toggle favori
 */
export interface ToggleFavoriteResponse {
  success: boolean
  status: 'added' | 'removed'
  data?: Favorite
}

/**
 * Query params pour GET /api/favorites
 */
export interface GetFavoritesQuery {
  limit?: number
  offset?: number
  sort?: 'created_at' | 'price' | 'score'
}

/**
 * Réponse GET /api/favorites
 */
export interface GetFavoritesResponse {
  success: boolean
  data: Favorite[]
  totalCount: number
}

/**
 * Réponse GET /api/recommendations
 */
export interface GetRecommendationsResponse {
  success: boolean
  data: Recommendation[]
}

