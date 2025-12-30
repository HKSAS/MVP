/**
 * Moteur de recommandations pour Autoval IA
 * Calcule les suggestions basées sur les favoris de l'utilisateur
 */

import type { Favorite, ListingCache, PreferenceProfile, Recommendation } from '@/lib/types/favorites'

/**
 * Construit le profil de préférences utilisateur à partir de ses favoris
 */
export function buildUserPreferenceProfile(favorites: Favorite[]): PreferenceProfile | null {
  if (favorites.length === 0) {
    return null
  }
  
  // Compter les marques
  const brandCounts = new Map<string, number>()
  const fuelCounts = new Map<string, number>()
  const transmissionCounts = new Map<string, number>()
  const segmentCounts = new Map<string, number>()
  
  let totalPrice = 0
  let priceCount = 0
  let minPrice = Infinity
  let maxPrice = 0
  
  let totalMileage = 0
  let mileageCount = 0
  let maxMileage = 0
  
  let totalYear = 0
  let yearCount = 0
  
  for (const fav of favorites) {
    // Extraire marque depuis title ou extracted_features
    const brand = extractBrand(fav)
    if (brand) {
      brandCounts.set(brand, (brandCounts.get(brand) || 0) + 1)
    }
    
    // Extraire segment depuis extracted_features
    const segment = fav.extracted_features?.segment || fav.extracted_features?.category
    if (segment) {
      segmentCounts.set(segment, (segmentCounts.get(segment) || 0) + 1)
    }
    
    // Prix
    if (fav.price && fav.price > 0) {
      totalPrice += fav.price
      priceCount++
      minPrice = Math.min(minPrice, fav.price)
      maxPrice = Math.max(maxPrice, fav.price)
    }
    
    // Kilométrage
    if (fav.mileage && fav.mileage > 0) {
      totalMileage += fav.mileage
      mileageCount++
      maxMileage = Math.max(maxMileage, fav.mileage)
    }
    
    // Année
    if (fav.year && fav.year > 1900) {
      totalYear += fav.year
      yearCount++
    }
    
    // Carburant
    if (fav.fuel) {
      fuelCounts.set(fav.fuel, (fuelCounts.get(fav.fuel) || 0) + 1)
    }
    
    // Transmission
    if (fav.transmission) {
      transmissionCounts.set(fav.transmission, (transmissionCounts.get(fav.transmission) || 0) + 1)
    }
  }
  
  // Calculer moyennes
  const budgetAvg = priceCount > 0 ? Math.round(totalPrice / priceCount) : 0
  const mileageAvg = mileageCount > 0 ? Math.round(totalMileage / mileageCount) : 0
  const yearAvg = yearCount > 0 ? Math.round(totalYear / yearCount) : 0
  
  // Déterminer préférence année
  const currentYear = new Date().getFullYear()
  const yearPreference: 'recent' | 'old' | 'neutral' = 
    yearAvg >= currentYear - 3 ? 'recent' :
    yearAvg <= currentYear - 10 ? 'old' :
    'neutral'
  
  // Budget avec marge (20% de chaque côté)
  const budgetMargin = budgetAvg * 0.2
  const budgetMin = Math.max(0, Math.round(budgetAvg - budgetMargin))
  const budgetMax = Math.round(budgetAvg + budgetMargin)
  
  // Kilométrage max raisonnable (moyenne + 30%)
  const mileageMax = Math.round(mileageAvg * 1.3)
  
  // Trier et prendre top 3
  const topBrands = Array.from(brandCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([brand, count]) => ({ brand, count }))
  
  const topFuel = Array.from(fuelCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([fuel, count]) => ({ fuel, count }))
  
  const topTransmission = Array.from(transmissionCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([transmission, count]) => ({ transmission, count }))
  
  const topSegments = Array.from(segmentCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([segment, count]) => ({ segment, count }))
  
  return {
    topBrands,
    budgetAvg,
    budgetMin: minPrice !== Infinity ? minPrice : budgetMin,
    budgetMax,
    mileageAvg,
    mileageMax,
    yearAvg,
    yearPreference,
    topFuel,
    topTransmission,
    topSegments,
  }
}

/**
 * Extrait la marque depuis un favori
 */
function extractBrand(fav: Favorite): string | null {
  // Essayer extracted_features.brand
  if (fav.extracted_features?.brand) {
    return String(fav.extracted_features.brand).toLowerCase()
  }
  
  // Essayer extracted_features.marque
  if (fav.extracted_features?.marque) {
    return String(fav.extracted_features.marque).toLowerCase()
  }
  
  // Parser depuis le title
  if (fav.title) {
    const titleLower = fav.title.toLowerCase()
    const commonBrands = [
      'peugeot', 'renault', 'citroen', 'volkswagen', 'ford', 'opel',
      'bmw', 'mercedes', 'audi', 'volvo', 'fiat', 'seat', 'skoda',
      'toyota', 'nissan', 'honda', 'mazda', 'hyundai', 'kia',
      'tesla', 'dacia', 'ds', 'alfa romeo', 'mini', 'smart'
    ]
    
    for (const brand of commonBrands) {
      if (titleLower.includes(brand)) {
        return brand
      }
    }
    
    // Prendre le premier mot du titre
    const firstWord = titleLower.split(/\s+/)[0]
    if (firstWord && firstWord.length > 2) {
      return firstWord
    }
  }
  
  return null
}

/**
 * Score une annonce pour un utilisateur selon son profil
 */
export function scoreListingForUser(
  listing: ListingCache,
  profile: PreferenceProfile,
  userFavoriteIds: Set<string> // Set de "source:listing_id" pour éviter les doublons
): { matchScore: number; reason: string } {
  let score = 0
  const reasons: string[] = []
  
  // Vérifier si déjà en favori
  const favoriteKey = `${listing.source}:${listing.listing_id}`
  if (userFavoriteIds.has(favoriteKey)) {
    return { matchScore: 0, reason: 'Déjà en favoris' }
  }
  
  // Marque match (30 points max)
  const listingBrand = extractBrandFromListing(listing)
  if (listingBrand) {
    const brandMatch = profile.topBrands.find(b => 
      b.brand.toLowerCase() === listingBrand.toLowerCase()
    )
    if (brandMatch) {
      const brandPoints = 30 * (brandMatch.count / profile.topBrands[0].count)
      score += brandPoints
      reasons.push(`Marque préférée (${brandMatch.brand})`)
    }
  }
  
  // Segment match (15 points max)
  const listingSegment = listing.extracted_features?.segment || listing.extracted_features?.category
  if (listingSegment && profile.topSegments.length > 0) {
    const segmentMatch = profile.topSegments.find(s =>
      s.segment.toLowerCase() === String(listingSegment).toLowerCase()
    )
    if (segmentMatch) {
      score += 15
      reasons.push('Segment préféré')
    }
  }
  
  // Prix proche du budget (25 points max)
  if (listing.price && listing.price > 0 && profile.budgetAvg > 0) {
    const priceDiff = Math.abs(listing.price - profile.budgetAvg)
    const pricePercent = (priceDiff / profile.budgetAvg) * 100
    
    if (pricePercent <= 10) {
      score += 25
      reasons.push('Budget parfait')
    } else if (pricePercent <= 20) {
      score += 15
      reasons.push('Budget proche')
    } else if (pricePercent <= 30) {
      score += 5
    } else if (listing.price > profile.budgetMax) {
      score -= 10 // Pénalité si trop cher
    }
  }
  
  // Kilométrage (15 points max)
  if (listing.mileage && listing.mileage > 0 && profile.mileageMax > 0) {
    if (listing.mileage <= profile.mileageAvg) {
      score += 15
      reasons.push('Kilométrage faible')
    } else if (listing.mileage <= profile.mileageMax) {
      score += 8
      reasons.push('Kilométrage acceptable')
    } else {
      score -= 10 // Pénalité si trop de km
    }
  }
  
  // Année (10 points max)
  if (listing.year && listing.year > 1900 && profile.yearAvg > 0) {
    const yearDiff = Math.abs(listing.year - profile.yearAvg)
    if (yearDiff <= 2) {
      score += 10
      reasons.push('Année proche')
    } else if (yearDiff <= 5) {
      score += 5
    }
    
    // Bonus si préférence récente et listing récent
    if (profile.yearPreference === 'recent' && listing.year >= new Date().getFullYear() - 3) {
      score += 5
    }
  }
  
  // Score Autoval IA élevé (20 points max)
  if (listing.score && listing.score >= 80) {
    score += 20
    reasons.push('Excellent score Autoval IA')
  } else if (listing.score && listing.score >= 70) {
    score += 10
    reasons.push('Bon score Autoval IA')
  } else if (listing.score && listing.score < 50) {
    score -= 15 // Pénalité si score faible
  }
  
  // Risk score faible (10 points max)
  if (listing.risk_score !== null && listing.risk_score !== undefined) {
    if (listing.risk_score <= 20) {
      score += 10
      reasons.push('Risque faible')
    } else if (listing.risk_score <= 40) {
      score += 5
    } else if (listing.risk_score >= 70) {
      score -= 20 // Pénalité si risque élevé
    }
  }
  
  // Carburant match (5 points)
  if (listing.fuel && profile.topFuel.length > 0) {
    const fuelMatch = profile.topFuel.find(f =>
      f.fuel.toLowerCase() === listing.fuel?.toLowerCase()
    )
    if (fuelMatch) {
      score += 5
    }
  }
  
  // Transmission match (5 points)
  if (listing.transmission && profile.topTransmission.length > 0) {
    const transmissionMatch = profile.topTransmission.find(t =>
      t.transmission.toLowerCase() === listing.transmission?.toLowerCase()
    )
    if (transmissionMatch) {
      score += 5
    }
  }
  
  // Normaliser le score entre 0 et 100
  const matchScore = Math.max(0, Math.min(100, score))
  
  // Construire la raison
  const reason = reasons.length > 0
    ? reasons.slice(0, 3).join(' + ')
    : 'Correspond à vos critères'
  
  return { matchScore, reason }
}

/**
 * Extrait la marque depuis un listing
 */
function extractBrandFromListing(listing: ListingCache): string | null {
  if (listing.extracted_features?.brand) {
    return String(listing.extracted_features.brand).toLowerCase()
  }
  
  if (listing.extracted_features?.marque) {
    return String(listing.extracted_features.marque).toLowerCase()
  }
  
  if (listing.title) {
    const titleLower = listing.title.toLowerCase()
    const commonBrands = [
      'peugeot', 'renault', 'citroen', 'volkswagen', 'ford', 'opel',
      'bmw', 'mercedes', 'audi', 'volvo', 'fiat', 'seat', 'skoda',
      'toyota', 'nissan', 'honda', 'mazda', 'hyundai', 'kia',
      'tesla', 'dacia', 'ds', 'alfa romeo', 'mini', 'smart'
    ]
    
    for (const brand of commonBrands) {
      if (titleLower.includes(brand)) {
        return brand
      }
    }
    
    const firstWord = titleLower.split(/\s+/)[0]
    if (firstWord && firstWord.length > 2) {
      return firstWord
    }
  }
  
  return null
}

