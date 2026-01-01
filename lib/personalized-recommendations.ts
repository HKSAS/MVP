/**
 * 🎯 SYSTÈME DE RECOMMANDATIONS PERSONNALISÉES AVANCÉ
 * Basé sur l'historique de recherches ET les favoris
 */

import { buildUserPreferenceProfile, scoreListingForUser } from './recommendations/engine'
import type { Favorite, ListingCache, PreferenceProfile } from './types/favorites'
import type { ListingResponse } from './types'

export interface PersonalizedRecommendation {
  listing: ListingResponse
  matchScore: number
  reasons: string[]
  confidence: 'low' | 'medium' | 'high'
  category: 'perfect_match' | 'good_match' | 'similar_match'
}

interface SearchHistoryEntry {
  brand?: string
  model?: string
  max_price?: number
  year_min?: number
  year_max?: number
  mileage_max?: number
  fuelType?: string
  location?: string
}

/**
 * Construit un profil de préférences depuis l'historique de recherches
 */
export function buildPreferenceProfileFromHistory(
  searchHistory: SearchHistoryEntry[]
): PreferenceProfile | null {
  if (searchHistory.length === 0) {
    return null
  }

  // Analyser l'historique
  const brandCounts = new Map<string, number>()
  const fuelCounts = new Map<string, number>()
  const priceValues: number[] = []
  const mileageValues: number[] = []
  const yearValues: number[] = []

  for (const search of searchHistory) {
    if (search.brand) {
      brandCounts.set(search.brand.toLowerCase(), (brandCounts.get(search.brand.toLowerCase()) || 0) + 1)
    }
    if (search.fuelType && search.fuelType !== 'all' && search.fuelType !== 'any') {
      fuelCounts.set(search.fuelType.toLowerCase(), (fuelCounts.get(search.fuelType.toLowerCase()) || 0) + 1)
    }
    if (search.max_price) {
      priceValues.push(search.max_price)
    }
    if (search.mileage_max) {
      mileageValues.push(search.mileage_max)
    }
    if (search.year_min) {
      yearValues.push(search.year_min)
    }
    if (search.year_max) {
      yearValues.push(search.year_max)
    }
  }

  // Calculer moyennes
  const budgetAvg = priceValues.length > 0
    ? Math.round(priceValues.reduce((a, b) => a + b, 0) / priceValues.length)
    : 0
  const budgetMin = priceValues.length > 0 ? Math.min(...priceValues) : 0
  const budgetMax = priceValues.length > 0 ? Math.max(...priceValues) : 0

  const mileageAvg = mileageValues.length > 0
    ? Math.round(mileageValues.reduce((a, b) => a + b, 0) / mileageValues.length)
    : 0
  const mileageMax = mileageValues.length > 0 ? Math.max(...mileageValues) : 0

  const yearAvg = yearValues.length > 0
    ? Math.round(yearValues.reduce((a, b) => a + b, 0) / yearValues.length)
    : 0

  const currentYear = new Date().getFullYear()
  const yearPreference: 'recent' | 'old' | 'neutral' =
    yearAvg >= currentYear - 3 ? 'recent' :
    yearAvg <= currentYear - 10 ? 'old' :
    'neutral'

  const topBrands = Array.from(brandCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([brand, count]) => ({ brand, count }))

  const topFuel = Array.from(fuelCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([fuel, count]) => ({ fuel, count }))

  return {
    topBrands,
    budgetAvg,
    budgetMin,
    budgetMax,
    mileageAvg,
    mileageMax,
    yearAvg,
    yearPreference,
    topFuel,
    topTransmission: [],
    topSegments: [],
  }
}

/**
 * Fusionne deux profils de préférences (favoris + historique)
 */
export function mergePreferenceProfiles(
  favoritesProfile: PreferenceProfile | null,
  historyProfile: PreferenceProfile | null
): PreferenceProfile | null {
  if (!favoritesProfile && !historyProfile) return null
  if (!favoritesProfile) return historyProfile
  if (!historyProfile) return favoritesProfile

  // Fusionner les marques (pondérer par nombre d'occurrences)
  const brandMap = new Map<string, number>()
  favoritesProfile.topBrands.forEach(b => {
    brandMap.set(b.brand, (brandMap.get(b.brand) || 0) + b.count * 2) // Favoris = poids x2
  })
  historyProfile.topBrands.forEach(b => {
    brandMap.set(b.brand, (brandMap.get(b.brand) || 0) + b.count)
  })
  const topBrands = Array.from(brandMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([brand, count]) => ({ brand, count }))

  // Fusionner les budgets (moyenne pondérée)
  const budgetAvg = Math.round(
    (favoritesProfile.budgetAvg * 0.6 + historyProfile.budgetAvg * 0.4)
  )
  const budgetMin = Math.min(favoritesProfile.budgetMin || 0, historyProfile.budgetMin || 0)
  const budgetMax = Math.max(favoritesProfile.budgetMax || 0, historyProfile.budgetMax || 0)

  // Fusionner kilométrage
  const mileageAvg = Math.round(
    (favoritesProfile.mileageAvg * 0.6 + historyProfile.mileageAvg * 0.4)
  )
  const mileageMax = Math.max(favoritesProfile.mileageMax || 0, historyProfile.mileageMax || 0)

  // Fusionner année
  const yearAvg = Math.round(
    (favoritesProfile.yearAvg * 0.6 + historyProfile.yearAvg * 0.4)
  )
  const yearPreference = favoritesProfile.yearPreference || historyProfile.yearPreference

  // Fusionner carburant
  const fuelMap = new Map<string, number>()
  favoritesProfile.topFuel.forEach(f => {
    fuelMap.set(f.fuel, (fuelMap.get(f.fuel) || 0) + f.count * 2)
  })
  historyProfile.topFuel.forEach(f => {
    fuelMap.set(f.fuel, (fuelMap.get(f.fuel) || 0) + f.count)
  })
  const topFuel = Array.from(fuelMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([fuel, count]) => ({ fuel, count }))

  return {
    topBrands,
    budgetAvg,
    budgetMin,
    budgetMax,
    mileageAvg,
    mileageMax,
    yearAvg,
    yearPreference,
    topFuel,
    topTransmission: favoritesProfile.topTransmission || historyProfile.topTransmission || [],
    topSegments: favoritesProfile.topSegments || historyProfile.topSegments || [],
  }
}

/**
 * Génère des recommandations personnalisées depuis une liste d'annonces
 */
export function generatePersonalizedRecommendations(
  listings: ListingResponse[],
  userProfile: PreferenceProfile,
  userFavoriteIds: Set<string> = new Set(),
  limit: number = 10
): PersonalizedRecommendation[] {
  // Convertir ListingResponse en ListingCache pour le scoring
  const listingCaches: ListingCache[] = listings.map(listing => ({
    id: listing.id,
    listing_id: listing.id.split(':').pop() || listing.id,
    source: listing.source,
    listing_url: listing.url,
    title: listing.title || null,
    price: listing.price_eur || null,
    mileage: listing.mileage_km || null,
    year: listing.year || null,
    fuel: null, // À extraire depuis title si possible
    transmission: null,
    city: listing.city || null,
    score: listing.score_final || listing.score_ia || null,
    risk_score: null, // Non disponible dans ListingResponse
    extracted_features: {
      brand: extractBrandFromTitle(listing.title),
      model: extractModelFromTitle(listing.title),
    },
    created_at: new Date().toISOString(),
  }))

  // Scorer chaque annonce
  const scored = listingCaches.map(listing => {
    const { matchScore, reason } = scoreListingForUser(listing, userProfile, userFavoriteIds)
    return {
      listing: listings[listingCaches.indexOf(listing)],
      matchScore,
      reasons: reason.split(' + '),
      confidence: matchScore >= 70 ? 'high' : matchScore >= 50 ? 'medium' : 'low',
      category: matchScore >= 80 ? 'perfect_match' : matchScore >= 60 ? 'good_match' : 'similar_match',
    } as PersonalizedRecommendation
  })

  // Trier par score décroissant et limiter
  return scored
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, limit)
    .filter(r => r.matchScore > 0) // Filtrer les matches à 0
}

/**
 * Extrait la marque depuis un titre
 */
function extractBrandFromTitle(title: string): string | null {
  const titleLower = title.toLowerCase()
  const commonBrands = [
    'peugeot', 'renault', 'citroen', 'citroën', 'volkswagen', 'vw', 'ford', 'opel',
    'bmw', 'mercedes', 'audi', 'volvo', 'fiat', 'seat', 'skoda',
    'toyota', 'nissan', 'honda', 'mazda', 'hyundai', 'kia',
    'tesla', 'dacia', 'ds', 'alfa romeo', 'mini', 'smart',
  ]

  for (const brand of commonBrands) {
    if (titleLower.includes(brand)) {
      return brand
    }
  }

  // Prendre le premier mot
  const firstWord = titleLower.split(/\s+/)[0]
  if (firstWord && firstWord.length > 2) {
    return firstWord
  }

  return null
}

/**
 * Extrait le modèle depuis un titre
 */
function extractModelFromTitle(title: string): string | null {
  const titleLower = title.toLowerCase()
  const commonModels = [
    'golf', 'polo', 'passat', 'tiguan', 'touareg',
    'clio', 'megane', 'captur', 'kadjar', 'scenic',
    '208', '308', '3008', '5008', '2008',
    'a3', 'a4', 'a5', 'q3', 'q5',
    'serie 3', 'serie 5', 'x1', 'x3', 'x5',
    'classe a', 'classe c', 'classe e', 'gla', 'glc',
  ]

  for (const model of commonModels) {
    if (titleLower.includes(model)) {
      return model
    }
  }

  return null
}

