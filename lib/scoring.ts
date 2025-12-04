/**
 * Système de scoring des annonces pour classer par pertinence
 * 
 * LOGIQUE DE SCORING :
 * 
 * Le score final (0-100) est calculé à partir de 6 critères :
 * 
 * 1. PRIX VS MARCHÉ (0-30 points)
 *    - Compare le prix de l'annonce à la moyenne des prix de toutes les annonces similaires
 *    - Prix très compétitif (< 85% de la moyenne) → 30 points
 *    - Prix compétitif (85-95%) → 25 points
 *    - Prix normal (95-105%) → 20 points
 *    - Prix élevé (105-115%) → 10 points
 *    - Prix très élevé (> 115%) → 0 point
 * 
 * 2. KILOMÉTRAGE (0-20 points)
 *    - Moins de 30k km → 20 points
 *    - 30k-50k km → 18 points
 *    - 50k-100k km → 15 points
 *    - 100k-150k km → 10 points
 *    - 150k-200k km → 5 points
 *    - Plus de 200k km → 0 point
 * 
 * 3. ANNÉE (0-15 points)
 *    - Véhicule très récent (0-2 ans) → 15 points
 *    - Récent (3-5 ans) → 12 points
 *    - Moyen (6-10 ans) → 8 points
 *    - Ancien (11-15 ans) → 4 points
 *    - Très ancien (> 15 ans) → 0 point
 * 
 * 4. SOURCE (0-10 points)
 *    - Sites professionnels (LaCentrale, AutoScout24) → 10 points
 *    - Sites généralistes (LeBonCoin, ParuVendu) → 7 points
 *    - Autres sites → 5 points
 * 
 * 5. COMPLÉTUDE (0-15 points)
 *    - Présence de prix → +3 points
 *    - Présence de kilométrage → +3 points
 *    - Présence d'année → +3 points
 *    - Présence d'image → +3 points
 *    - Titre descriptif (≥20 caractères) → +3 points
 * 
 * 6. SCORE IA BRUT (0-10 points)
 *    - Si le modèle IA a fourni un score_ia, il est normalisé (0-100 → 0-10)
 *    - Sinon → 5 points (neutre)
 * 
 * AJUSTEMENTS POSSIBLES :
 * - Modifier les seuils dans les fonctions scorePrice(), scoreMileage(), etc.
 * - Ajuster les poids relatifs en modifiant les valeurs de retour (ex: 0-30 → 0-40 pour le prix)
 * - Ajouter de nouveaux critères (ex: carburant, nombre de propriétaires)
 */

export interface NormalizedListing {
  external_id: string
  title: string
  price_eur: number | null
  mileage_km: number | null
  year: number | null
  source: string
  url: string
  imageUrl: string | null
  score_ia: number | null
  fuelType?: string | null
}

export interface ScoringContext {
  allListings: NormalizedListing[]
}

/**
 * Calcule les statistiques du marché pour un ensemble d'annonces
 */
function computeMarketStats(listings: NormalizedListing[]): {
  avgPrice: number | null
  medianPrice: number | null
  minPrice: number | null
  maxPrice: number | null
  avgMileage: number | null
  avgYear: number | null
} {
  const prices = listings
    .map((l) => l.price_eur)
    .filter((p): p is number => p !== null && p > 0)
  const mileages = listings
    .map((l) => l.mileage_km)
    .filter((m): m is number => m !== null && m > 0)
  const years = listings
    .map((l) => l.year)
    .filter((y): y is number => y !== null && y > 1900)

  const sortedPrices = [...prices].sort((a, b) => a - b)
  const medianPrice =
    sortedPrices.length > 0
      ? sortedPrices.length % 2 === 0
        ? (sortedPrices[sortedPrices.length / 2 - 1] + sortedPrices[sortedPrices.length / 2]) / 2
        : sortedPrices[Math.floor(sortedPrices.length / 2)]
      : null

  return {
    avgPrice: prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : null,
    medianPrice,
    minPrice: prices.length > 0 ? Math.min(...prices) : null,
    maxPrice: prices.length > 0 ? Math.max(...prices) : null,
    avgMileage: mileages.length > 0 ? mileages.reduce((a, b) => a + b, 0) / mileages.length : null,
    avgYear: years.length > 0 ? years.reduce((a, b) => a + b, 0) / years.length : null,
  }
}

/**
 * Score basé sur le prix vs marché (0-30 points)
 */
function scorePrice(price: number | null, marketStats: ReturnType<typeof computeMarketStats>): number {
  if (!price || !marketStats.avgPrice || price <= 0) {
    return 15 // Score neutre si pas de prix
  }

  const avgPrice = marketStats.avgPrice
  const priceRatio = price / avgPrice

  // Prix très compétitif (sous la moyenne de 15%+)
  if (priceRatio < 0.85) {
    return 30
  }
  // Prix compétitif (sous la moyenne de 5-15%)
  if (priceRatio < 0.95) {
    return 25
  }
  // Prix proche de la moyenne (±5%)
  if (priceRatio >= 0.95 && priceRatio <= 1.05) {
    return 20
  }
  // Prix un peu élevé (5-15% au-dessus)
  if (priceRatio > 1.05 && priceRatio <= 1.15) {
    return 10
  }
  // Prix très élevé (15%+ au-dessus)
  return 0
}

/**
 * Score basé sur le kilométrage (0-20 points)
 */
function scoreMileage(mileage: number | null): number {
  if (!mileage || mileage <= 0) {
    return 10 // Score neutre si pas de km
  }

  // Très faible kilométrage (< 30k km)
  if (mileage < 30000) {
    return 20
  }
  // Faible kilométrage (30k-50k km)
  if (mileage < 50000) {
    return 18
  }
  // Kilométrage normal (50k-100k km)
  if (mileage < 100000) {
    return 15
  }
  // Kilométrage moyen (100k-150k km)
  if (mileage < 150000) {
    return 10
  }
  // Kilométrage élevé (150k-200k km)
  if (mileage < 200000) {
    return 5
  }
  // Très élevé (> 200k km)
  return 0
}

/**
 * Score basé sur l'année (0-15 points)
 */
function scoreYear(year: number | null): number {
  if (!year || year < 1900) {
    return 7 // Score neutre si pas d'année
  }

  const currentYear = new Date().getFullYear()
  const age = currentYear - year

  // Véhicule très récent (0-2 ans)
  if (age <= 2) {
    return 15
  }
  // Véhicule récent (3-5 ans)
  if (age <= 5) {
    return 12
  }
  // Véhicule moyen (6-10 ans)
  if (age <= 10) {
    return 8
  }
  // Véhicule ancien (11-15 ans)
  if (age <= 15) {
    return 4
  }
  // Véhicule très ancien (> 15 ans)
  return 0
}

/**
 * Score basé sur la source (0-10 points)
 */
function scoreSource(source: string): number {
  const sourceLower = source.toLowerCase()

  // Sites réputés / professionnels
  if (sourceLower.includes('lacentrale') || sourceLower.includes('autoscout')) {
    return 10
  }
  // Sites généralistes mais fiables
  if (sourceLower.includes('leboncoin') || sourceLower.includes('paruvendu')) {
    return 7
  }
  // Autres sites
  return 5
}

/**
 * Score basé sur la complétude de l'annonce (0-15 points)
 */
function scoreCompleteness(listing: NormalizedListing): number {
  let score = 0

  // Présence de prix
  if (listing.price_eur !== null && listing.price_eur > 0) {
    score += 3
  }

  // Présence de kilométrage
  if (listing.mileage_km !== null && listing.mileage_km > 0) {
    score += 3
  }

  // Présence d'année
  if (listing.year !== null && listing.year > 1900) {
    score += 3
  }

  // Présence d'image
  if (listing.imageUrl && listing.imageUrl.length > 0) {
    score += 3
  }

  // Présence de titre descriptif (au moins 20 caractères)
  if (listing.title && listing.title.length >= 20) {
    score += 3
  }

  return score
}

/**
 * Score basé sur le score IA brut (0-10 points)
 */
function scoreAI(scoreIA: number | null): number {
  if (!scoreIA || scoreIA < 0 || scoreIA > 100) {
    return 5 // Score neutre si pas de score IA
  }

  // Normaliser le score IA (0-100) vers (0-10)
  return Math.round((scoreIA / 100) * 10)
}

/**
 * Calcule le score de pertinence final d'une annonce (0-100)
 * 
 * @param listing - L'annonce à scorer
 * @param context - Le contexte contenant toutes les annonces pour calculer les stats du marché
 * @returns Score entre 0 et 100
 */
export function computeListingScore(
  listing: NormalizedListing,
  context: ScoringContext
): number {
  const marketStats = computeMarketStats(context.allListings)

  // Calcul des sous-scores
  const priceScore = scorePrice(listing.price_eur, marketStats) // 0-30
  const mileageScore = scoreMileage(listing.mileage_km) // 0-20
  const yearScore = scoreYear(listing.year) // 0-15
  const sourceScore = scoreSource(listing.source) // 0-10
  const completenessScore = scoreCompleteness(listing) // 0-15
  const aiScore = scoreAI(listing.score_ia) // 0-10

  // Total théorique max: 30 + 20 + 15 + 10 + 15 + 10 = 100
  const totalScore = priceScore + mileageScore + yearScore + sourceScore + completenessScore + aiScore

  // Clamp entre 0 et 100
  return Math.max(0, Math.min(100, Math.round(totalScore)))
}

