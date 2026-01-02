// ═══════════════════════════════════════════════════════════════
// PREMIUM SCORING SERVICE - Analyse intelligente des annonces
// ═══════════════════════════════════════════════════════════════

import type { ListingResponse, ScrapeQuery } from '@/lib/types'

export interface PremiumScore {
  overall: number         // Score global 0-100
  priceScore: number      // Score prix (100 = excellent prix, 0 = trop cher)
  kmScore: number         // Score kilométrage
  ageScore: number        // Score âge
  qualityScore: number    // Qualité annonce
  trustScore: number      // Score vendeur
  dealScore: number       // Score bonne affaire 0-100
  negotiationMargin: number // % de marge de négociation
  
  dealType: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'AVERAGE' | 'OVERPRICED'
  priceVsMarket: number   // % vs prix marché (-20% = bonne affaire)
  
  insights: string[]      // ["Prix 15% sous le marché", "Kilométrage faible"]
  warnings: string[]      // ["Prix suspect", "Annonce peu détaillée"]
  badges: Badge[]         // ["GOOD_DEAL", "LOW_MILEAGE", "RECENT"]
}

export enum Badge {
  GOOD_DEAL = 'BONNE_AFFAIRE',
  EXCELLENT_DEAL = 'EXCELLENTE_AFFAIRE',
  LOW_MILEAGE = 'FAIBLE_KILOMETRAGE',
  RECENT = 'RECENTE',
  VERIFIED_SELLER = 'VENDEUR_VERIFIE',
  PRICE_DROP = 'BAISSE_DE_PRIX',
  NEGOTIABLE = 'NEGOCIABLE',
  HIGH_DEMAND = 'FORTE_DEMANDE'
}

export interface ScoredListing extends ListingResponse {
  premiumScore: PremiumScore
}

export interface MarketData {
  brand: string
  model: string
  averagePrice: number
  medianPrice: number
  minPrice: number
  maxPrice: number
  totalListings: number
}

// Poids pour le score global
const DEFAULT_WEIGHTS = {
  priceScore: 0.35,
  kmScore: 0.20,
  ageScore: 0.15,
  qualityScore: 0.15,
  trustScore: 0.15,
}

/**
 * Score complet d'une annonce avec analyse premium
 */
export async function scoreListingPremium(
  listing: ListingResponse,
  query: ScrapeQuery,
  marketData?: MarketData,
  allListings?: ListingResponse[]
): Promise<ScoredListing> {
  
  // 1. PRICE SCORE (35%)
  const priceScore = calculatePriceScore(listing, marketData, allListings)
  const priceVsMarket = marketData 
    ? ((listing.price_eur || 0) - marketData.averagePrice) / marketData.averagePrice * 100
    : 0
  
  // 2. KM SCORE (20%)
  const kmScore = calculateKmScore(listing)
  
  // 3. AGE SCORE (15%)
  const ageScore = calculateAgeScore(listing)
  
  // 4. QUALITY SCORE (15%)
  const qualityScore = calculateQualityScore(listing)
  
  // 5. TRUST SCORE (15%)
  const trustScore = calculateTrustScore(listing)
  
  // Score global pondéré
  const overall = Math.round(
    priceScore * DEFAULT_WEIGHTS.priceScore +
    kmScore * DEFAULT_WEIGHTS.kmScore +
    ageScore * DEFAULT_WEIGHTS.ageScore +
    qualityScore * DEFAULT_WEIGHTS.qualityScore +
    trustScore * DEFAULT_WEIGHTS.trustScore
  )
  
  // Déterminer le type de deal
  const dealType = determineDealType(priceVsMarket, overall)
  
  // Score bonne affaire
  const dealScore = calculateDealScore(priceScore, kmScore, qualityScore)
  
  // Estimation de la marge de négociation
  const negotiationMargin = estimateNegotiation(listing, priceVsMarket)
  
  // Générer insights et warnings
  const { insights, warnings } = generateInsights(
    listing,
    priceVsMarket,
    kmScore,
    qualityScore,
    trustScore
  )
  
  // Attribuer badges
  const badges = assignBadges(dealScore, priceScore, kmScore, listing)
  
  const premiumScore: PremiumScore = {
    overall,
    priceScore,
    kmScore,
    ageScore,
    qualityScore,
    trustScore,
    dealScore,
    negotiationMargin,
    dealType,
    priceVsMarket,
    insights,
    warnings,
    badges
  }
  
  return {
    ...listing,
    premiumScore
  }
}

/**
 * PRICE SCORE: Compare le prix au marché
 */
function calculatePriceScore(
  listing: ListingResponse,
  marketData?: MarketData,
  allListings?: ListingResponse[]
): number {
  const price = listing.price_eur || 0
  if (!price) return 50 // Score neutre si pas de prix
  
  // Utiliser marketData si disponible
  if (marketData && marketData.averagePrice > 0) {
    const percentDiff = ((price - marketData.averagePrice) / marketData.averagePrice) * 100
    
    if (percentDiff <= -20) return 100  // 20%+ sous le marché
    if (percentDiff <= -10) return 90   // 10-20% sous le marché
    if (percentDiff <= -5) return 80    // 5-10% sous le marché
    if (percentDiff <= 0) return 70     // Prix marché
    if (percentDiff <= 5) return 60     // 0-5% au-dessus
    if (percentDiff <= 10) return 50    // 5-10% au-dessus
    if (percentDiff <= 20) return 30    // 10-20% au-dessus
    return 10                           // 20%+ au-dessus
  }
  
  // Fallback: comparer avec les autres listings
  if (allListings && allListings.length > 0) {
    const similarListings = allListings.filter(l => 
      l.year === listing.year &&
      l.mileage_km && listing.mileage_km &&
      Math.abs((l.mileage_km || 0) - (listing.mileage_km || 0)) < 20000
    )
    
    if (similarListings.length > 0) {
      const avgPrice = similarListings.reduce((sum, l) => sum + (l.price_eur || 0), 0) / similarListings.length
      const percentDiff = ((price - avgPrice) / avgPrice) * 100
      
      if (percentDiff < -10) return 90
      if (percentDiff < -5) return 80
      if (percentDiff <= 5) return 70
      if (percentDiff <= 10) return 50
      if (percentDiff <= 20) return 30
      return 10
    }
  }
  
  return 50 // Score neutre si pas de données
}

/**
 * KM SCORE: Basé sur km/an (moyenne 15 000 km/an en France)
 */
function calculateKmScore(listing: ListingResponse): number {
  if (!listing.mileage_km || !listing.year) return 50
  
  const age = new Date().getFullYear() - listing.year
  if (age <= 0) return 50
  
  const expectedKm = age * 15000
  const kmRatio = listing.mileage_km / expectedKm
  
  if (kmRatio <= 0.5) return 100  // Moitié du kilométrage attendu
  if (kmRatio <= 0.7) return 90   // Kilométrage faible
  if (kmRatio <= 1.0) return 80   // Kilométrage normal
  if (kmRatio <= 1.3) return 60   // Kilométrage élevé
  if (kmRatio <= 1.5) return 40   // Très élevé
  return 20                       // Excessif
}

/**
 * AGE SCORE
 */
function calculateAgeScore(listing: ListingResponse): number {
  if (!listing.year) return 50
  
  const age = new Date().getFullYear() - listing.year
  
  if (age <= 1) return 100
  if (age <= 3) return 90
  if (age <= 5) return 80
  if (age <= 7) return 70
  if (age <= 10) return 60
  if (age <= 15) return 40
  return 20
}

/**
 * QUALITY SCORE: Qualité de l'annonce
 */
function calculateQualityScore(listing: ListingResponse): number {
  let score = 50 // Base
  
  // Photos
  if (listing.imageUrl) score += 15
  
  // Informations complètes
  if (listing.year) score += 5
  if (listing.mileage_km) score += 5
  if (listing.city) score += 5
  
  // Titre détaillé
  if (listing.title && listing.title.length > 30) score += 10
  
  return Math.min(score, 100)
}

/**
 * TRUST SCORE: Fiabilité du vendeur
 */
function calculateTrustScore(listing: ListingResponse): number {
  let score = 50 // Base
  
  // Source fiable
  if (listing.source === 'LaCentrale' || listing.source === 'AutoScout24') {
    score += 20 // Concessionnaires vérifiés
  } else if (listing.source === 'LeBonCoin') {
    score += 10 // Particuliers/Pros
  }
  
  // Détecter vendeur pro dans le titre
  const titleLower = (listing.title || '').toLowerCase()
  const proKeywords = ['concession', 'garage', 'professionnel', 'pro', 'commercial']
  if (proKeywords.some(kw => titleLower.includes(kw))) {
    score += 15
  }
  
  return Math.min(score, 100)
}

/**
 * Déterminer le type de deal
 */
function determineDealType(
  priceVsMarket: number,
  overall: number
): 'EXCELLENT' | 'GOOD' | 'FAIR' | 'AVERAGE' | 'OVERPRICED' {
  if (priceVsMarket <= -15 && overall >= 80) return 'EXCELLENT'
  if (priceVsMarket <= -10 && overall >= 70) return 'GOOD'
  if (priceVsMarket <= -5 && overall >= 60) return 'FAIR'
  if (priceVsMarket <= 5) return 'AVERAGE'
  return 'OVERPRICED'
}

/**
 * DEAL SCORE: Score bonne affaire
 */
function calculateDealScore(
  priceScore: number,
  kmScore: number,
  qualityScore: number
): number {
  // Bonne affaire = bon prix + bon kilométrage + bonne qualité
  const avgScore = (priceScore * 0.5 + kmScore * 0.3 + qualityScore * 0.2)
  
  // Seulement si le prix est vraiment bon (>70)
  if (priceScore < 70) return 0
  
  return Math.round(avgScore)
}

/**
 * Estimer la marge de négociation
 */
function estimateNegotiation(listing: ListingResponse, priceVsMarket: number): number {
  const price = listing.price_eur || 0
  if (!price) return 0
  
  let baseNegotiation = 0.05 // 5% de base
  
  // Détecter si pro ou particulier
  const titleLower = (listing.title || '').toLowerCase()
  const isPro = ['concession', 'garage', 'professionnel', 'pro'].some(kw => titleLower.includes(kw))
  
  if (isPro) {
    baseNegotiation = 0.03 // Pro : 3%
  } else {
    baseNegotiation = 0.08 // Particulier : 8%
  }
  
  // Ajuster selon prix vs marché
  if (priceVsMarket > 10) baseNegotiation += 0.05 // Si cher, plus de négo
  
  return Math.round(price * baseNegotiation)
}

/**
 * Générer insights et warnings
 */
function generateInsights(
  listing: ListingResponse,
  priceVsMarket: number,
  kmScore: number,
  qualityScore: number,
  trustScore: number
): { insights: string[]; warnings: string[] } {
  const insights: string[] = []
  const warnings: string[] = []
  
  // INSIGHTS
  if (priceVsMarket <= -15) {
    insights.push(`💰 Prix exceptionnel : ${Math.abs(Math.round(priceVsMarket))}% sous le marché`)
  } else if (priceVsMarket <= -10) {
    insights.push(`✅ Bon prix : ${Math.abs(Math.round(priceVsMarket))}% sous le marché`)
  }
  
  if (kmScore >= 90 && listing.mileage_km && listing.year) {
    const age = new Date().getFullYear() - listing.year
    if (age > 0) {
      const kmPerYear = Math.round(listing.mileage_km / age)
      insights.push(`🚗 Kilométrage très faible : ${kmPerYear.toLocaleString()} km/an en moyenne`)
    }
  }
  
  if (trustScore >= 80) {
    insights.push('🛡️ Vendeur fiable détecté')
  }
  
  if (qualityScore >= 80) {
    insights.push('📸 Annonce détaillée')
  }
  
  // WARNINGS
  if (priceVsMarket <= -25) {
    warnings.push('⚠️ Prix très bas : vérifier l\'état réel du véhicule')
  }
  
  if (priceVsMarket >= 15) {
    warnings.push('⚠️ Prix élevé par rapport au marché')
  }
  
  if (kmScore <= 40) {
    warnings.push('⚠️ Kilométrage élevé pour l\'année')
  }
  
  if (qualityScore <= 40) {
    warnings.push('⚠️ Annonce peu détaillée')
  }
  
  if (trustScore <= 40 && (listing.price_eur || 0) > 15000) {
    warnings.push('ℹ️ Vente particulier : bien vérifier les documents')
  }
  
  return { insights, warnings }
}

/**
 * Attribuer badges
 */
function assignBadges(
  dealScore: number,
  priceScore: number,
  kmScore: number,
  listing: ListingResponse
): Badge[] {
  const badges: Badge[] = []
  
  if (dealScore >= 85) badges.push(Badge.EXCELLENT_DEAL)
  else if (dealScore >= 75) badges.push(Badge.GOOD_DEAL)
  
  if (kmScore >= 85) badges.push(Badge.LOW_MILEAGE)
  
  // TODO: Ajouter RECENT si données disponibles
  // TODO: Ajouter VERIFIED_SELLER si données disponibles
  // TODO: Ajouter PRICE_DROP si historique prix disponible
  
  return badges
}

/**
 * Score toutes les annonces
 */
export async function scoreAllListingsPremium(
  listings: ListingResponse[],
  query: ScrapeQuery,
  marketData?: MarketData
): Promise<ScoredListing[]> {
  return await Promise.all(
    listings.map(listing => scoreListingPremium(listing, query, marketData, listings))
  )
}

