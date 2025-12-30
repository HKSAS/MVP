import type { ListingResponse, ScrapeQuery } from '@/src/core/types'

export interface ScoreBreakdown {
  score: number
  reasons: string[]
  flags: string[]
}

/**
 * Calcule un score professionnel pour une annonce (0-100)
 * Basé sur des critères de marché automobile
 */
export function scoreListing(
  listing: ListingResponse,
  criteria: ScrapeQuery,
  allListings: ListingResponse[]
): ScoreBreakdown {
  let score = 50 // Score de base
  const reasons: string[] = []
  const flags: string[] = []
  
  // 1. Cohérence prix vs âge/km
  if (listing.price_eur && listing.year && listing.mileage_km) {
    const age = new Date().getFullYear() - listing.year
    const kmPerYear = listing.mileage_km / Math.max(age, 1)
    
    // Prix raisonnable pour l'âge
    const avgPricePerYear = listing.price_eur / Math.max(age, 1)
    if (avgPricePerYear > 5000 && avgPricePerYear < 15000) {
      score += 10
      reasons.push('Prix cohérent avec l\'âge du véhicule')
    } else if (avgPricePerYear < 2000) {
      score -= 15
      flags.push('prix_suspect')
      reasons.push('Prix anormalement bas pour l\'âge')
    }
    
    // Kilométrage cohérent avec l'âge
    if (kmPerYear >= 10000 && kmPerYear <= 20000) {
      score += 5
      reasons.push('Kilométrage cohérent avec l\'âge')
    } else if (kmPerYear > 30000) {
      score -= 10
      flags.push('km_incoherent')
      reasons.push('Kilométrage très élevé pour l\'âge')
    } else if (kmPerYear < 5000 && age > 3) {
      score -= 5
      flags.push('km_suspect')
      reasons.push('Kilométrage anormalement bas')
    }
  }
  
  // 2. Comparaison avec le marché (autres annonces similaires)
  if (listing.price_eur && allListings.length > 0) {
    const similarListings = allListings.filter(l => 
      l.year === listing.year &&
      l.mileage_km && listing.mileage_km &&
      Math.abs((l.mileage_km || 0) - (listing.mileage_km || 0)) < 20000
    )
    
    if (similarListings.length > 0) {
      const avgPrice = similarListings.reduce((sum, l) => sum + (l.price_eur || 0), 0) / similarListings.length
      const priceDiff = ((listing.price_eur - avgPrice) / avgPrice) * 100
      
      if (priceDiff < -10) {
        score += 15
        reasons.push('Prix inférieur à la moyenne du marché')
      } else if (priceDiff > 20) {
        score -= 10
        flags.push('prix_eleve')
        reasons.push('Prix supérieur à la moyenne du marché')
      }
    }
  }
  
  // 3. Complétude des informations
  let completeness = 0
  if (listing.title && listing.title.length > 10) completeness += 20
  if (listing.price_eur) completeness += 25
  if (listing.year) completeness += 20
  if (listing.mileage_km) completeness += 20
  if (listing.imageUrl) completeness += 10
  if (listing.url) completeness += 5
  
  if (completeness >= 80) {
    score += 10
    reasons.push('Annonce complète avec toutes les informations')
  } else if (completeness < 50) {
    score -= 10
    flags.push('annonce_incomplete')
    reasons.push('Annonce incomplète (informations manquantes)')
  }
  
  // 4. Analyse du titre (détection de flags)
  const titleLower = (listing.title || '').toLowerCase()
  
  // Détecter des mots-clés suspects
  const suspiciousKeywords = [
    'urgent', 'cash', 'virement', 'étranger', 'départ', 'déménagement',
    'divorce', 'héritage', 'décès', 'rapide', 'immédiat'
  ]
  
  for (const keyword of suspiciousKeywords) {
    if (titleLower.includes(keyword)) {
      flags.push('texte_suspect')
      score -= 5
      reasons.push(`Mots-clés suspects détectés: "${keyword}"`)
    }
  }
  
  // Détecter vendeur pro
  const proKeywords = ['concession', 'garage', 'professionnel', 'pro', 'commercial']
  for (const keyword of proKeywords) {
    if (titleLower.includes(keyword)) {
      flags.push('vendeur_pro')
      // Vendeur pro n'est pas forcément négatif, mais on le note
      reasons.push('Vendeur professionnel détecté')
    }
  }
  
  // 5. Cohérence avec les critères de recherche
  if (criteria.maxPrice && listing.price_eur) {
    if (listing.price_eur <= criteria.maxPrice * 0.9) {
      score += 5
      reasons.push('Prix bien en dessous du budget maximum')
    }
  }
  
  if (criteria.year_min && listing.year && listing.year >= criteria.year_min) {
    score += 5
  }
  
  if (criteria.mileage_max && listing.mileage_km && listing.mileage_km <= criteria.mileage_max) {
    score += 5
  }
  
  // 6. Score IA existant (si disponible)
  if (listing.score_ia !== null && listing.score_ia !== undefined) {
    // Ponderer le score IA (30% du score final)
    score = score * 0.7 + listing.score_ia * 0.3
  }
  
  // Normaliser entre 0 et 100
  score = Math.max(0, Math.min(100, Math.round(score)))
  
  return {
    score,
    reasons: reasons.length > 0 ? reasons : ['Annonce standard'],
    flags,
  }
}

/**
 * Calcule les scores pour toutes les annonces
 */
export function scoreAllListings(
  listings: ListingResponse[],
  criteria: ScrapeQuery
): ListingResponse[] {
  return listings.map(listing => {
    const breakdown = scoreListing(listing, criteria, listings)
    
    return {
      ...listing,
      score_final: breakdown.score,
      score_ia: listing.score_ia ?? breakdown.score,
    }
  })
}

