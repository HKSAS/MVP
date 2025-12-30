import type { ListingResponse } from '@/src/core/types'
import crypto from 'crypto'

/**
 * Normalise un texte pour la déduplication (lowercase, sans accents, sans espaces multiples)
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Supprimer les accents
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Extrait les mots-clés du modèle depuis le titre
 */
function extractModelKeywords(title: string, brand: string): string[] {
  const normalized = normalizeText(title)
  const brandLower = normalizeText(brand)
  
  // Enlever la marque du titre
  let withoutBrand = normalized.replace(new RegExp(brandLower, 'gi'), '').trim()
  
  // Extraire les mots significatifs (longueur > 2, pas des nombres seuls)
  const words = withoutBrand.split(/\s+/).filter(word => {
    return word.length > 2 && !/^\d+$/.test(word)
  })
  
  // Prendre les 2-3 premiers mots significatifs
  return words.slice(0, 3)
}

/**
 * Génère une clé de déduplication robuste pour une annonce
 */
export function generateDedupeKey(listing: ListingResponse): string {
  const title = normalizeText(listing.title || '')
  const price = listing.price_eur || 0
  const year = listing.year || 0
  const mileage = listing.mileage_km || 0
  const city = normalizeText(listing.source || '')
  
  // Extraire les mots-clés du modèle
  const modelKeywords = extractModelKeywords(listing.title || '', listing.source || '')
  const keywordsStr = modelKeywords.join('_')
  
  // Construire la clé composite
  const keyParts = [
    title.substring(0, 100), // Limiter la longueur
    price.toString(),
    year.toString(),
    Math.floor(mileage / 1000).toString(), // Arrondir au millier
    city,
    keywordsStr,
  ]
  
  const keyString = keyParts.join('|')
  
  // Générer un hash MD5 pour la clé finale
  return crypto.createHash('md5').update(keyString).digest('hex')
}

/**
 * Déduplique une liste d'annonces
 * Garde l'annonce avec le meilleur score ou la plus complète en cas de doublon
 */
export function deduplicateListings(listings: ListingResponse[]): ListingResponse[] {
  const seen = new Map<string, ListingResponse>()
  
  for (const listing of listings) {
    const dedupeKey = generateDedupeKey(listing)
    
    if (!seen.has(dedupeKey)) {
      seen.set(dedupeKey, listing)
    } else {
      // Doublon détecté : garder le meilleur
      const existing = seen.get(dedupeKey)!
      
      // Critères de choix :
      // 1. Meilleur score_final
      // 2. Plus de champs renseignés
      // 3. Meilleur score_ia
      
      const existingScore = existing.score_final ?? existing.score_ia ?? 0
      const newScore = listing.score_final ?? listing.score_ia ?? 0
      
      const existingCompleteness = calculateCompleteness(existing)
      const newCompleteness = calculateCompleteness(listing)
      
      let shouldReplace = false
      
      if (newScore > existingScore) {
        shouldReplace = true
      } else if (newScore === existingScore && newCompleteness > existingCompleteness) {
        shouldReplace = true
      } else if (newScore === existingScore && newCompleteness === existingCompleteness) {
        // En dernier recours, meilleur score_ia
        const existingIa = existing.score_ia ?? 0
        const newIa = listing.score_ia ?? 0
        if (newIa > existingIa) {
          shouldReplace = true
        }
      }
      
      if (shouldReplace) {
        seen.set(dedupeKey, listing)
      }
    }
  }
  
  return Array.from(seen.values())
}

/**
 * Calcule un score de complétude (0-100) pour une annonce
 */
function calculateCompleteness(listing: ListingResponse): number {
  let score = 0
  
  if (listing.title) score += 20
  if (listing.price_eur !== null && listing.price_eur > 0) score += 25
  if (listing.year !== null && listing.year > 0) score += 20
  if (listing.mileage_km !== null && listing.mileage_km > 0) score += 20
  if (listing.imageUrl) score += 10
  if (listing.url) score += 5
  
  return score
}

