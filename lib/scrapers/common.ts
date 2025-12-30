/**
 * Architecture commune pour tous les scrapers
 * Philosophie : parsing DOM déterministe + fallback IA uniquement si nécessaire
 */

import type { SearchCriteria, Listing, FuelType, GearboxType, SellerType } from '@/lib/search-types'
import { normalizeText, normalizeFuelType, normalizeGearboxType } from '@/lib/search-types'
import { parsePrice, parseMileage, parseYear } from '@/lib/search-types'
import { scrapeWithZenRows } from '@/lib/zenrows'
import { SCRAPING_CONFIG } from './config'
import { createRouteLogger } from '@/lib/logger'
import { normalizeListingUrl } from './url-normalizer'
import { getOpenAIApiKey } from '@/lib/env'
import OpenAI from 'openai'
import crypto from 'crypto'

const log = createRouteLogger('scraper-common')

// ============================================================================
// INTERFACE SCRAPER COMMUNE
// ============================================================================

export interface SiteScraper {
  name: string
  search: (criteria: SearchCriteria, log: ReturnType<typeof createRouteLogger>) => Promise<Listing[]>
}

// ============================================================================
// FALLBACK IA GÉNÉRIQUE (pour tous les sites)
// ============================================================================

/**
 * Fallback IA : utilisé uniquement si le parsing DOM renvoie 0 résultats
 * alors que le HTML est volumineux (> 200k) et qu'il n'y a pas d'erreur évidente
 */
export async function parseWithAI(
  siteName: string,
  html: string,
  criteria: SearchCriteria,
  log: ReturnType<typeof createRouteLogger>
): Promise<Listing[]> {
  const openaiApiKey = getOpenAIApiKey()
  if (!openaiApiKey) {
    log.warn(`[${siteName}] OpenAI API key manquante, impossible d'utiliser le fallback IA`)
    return []
  }

  const openai = new OpenAI({ apiKey: openaiApiKey })

  // Construire un snippet HTML pertinent (40-60k caractères)
  const relevantSnippet = buildRelevantHtmlSnippet(html, criteria.brand, criteria.model || '', siteName)
  
  if (relevantSnippet.length < 1000) {
    log.debug(`[${siteName}] HTML snippet trop petit pour l'IA (${relevantSnippet.length} chars)`)
    return []
  }

  const prompt = `Tu es un expert en extraction de données d'annonces automobiles depuis HTML.

Site: ${siteName}
Marque recherchée: ${criteria.brand}
Modèle recherché: ${criteria.model || 'tous modèles'}
Budget max: ${criteria.maxPrice}€

Extrais TOUTES les annonces de véhicules depuis ce HTML. Chaque annonce doit avoir :
- title (obligatoire)
- price (nombre en euros, ou null)
- year (année, ou null)
- mileage (kilométrage en km, ou null)
- url (URL ABSOLUE https://, obligatoire)
- imageUrl (URL absolue, ou null)
- city (ville, ou null)
- fuelType (essence/diesel/hybride/electrique/gpl/any, ou null)
- gearbox (manual/auto/any, ou null)

Critères de filtrage :
- Prix max: ${criteria.maxPrice}€
${criteria.minPrice ? `- Prix min: ${criteria.minPrice}€` : ''}
${criteria.minYear ? `- Année min: ${criteria.minYear}` : ''}
${criteria.maxYear ? `- Année max: ${criteria.maxYear}` : ''}
${criteria.maxMileage ? `- Kilométrage max: ${criteria.maxMileage}km` : ''}
${criteria.fuelType && criteria.fuelType !== 'any' ? `- Carburant: ${criteria.fuelType}` : ''}
${criteria.gearbox && criteria.gearbox !== 'any' ? `- Boîte: ${criteria.gearbox}` : ''}

Retourne UNIQUEMENT un JSON valide avec ce format :
{
  "listings": [
    {
      "title": "Titre complet de l'annonce",
      "price": 25000,
      "year": 2020,
      "mileage": 50000,
      "url": "https://www.site.fr/ad/123456",
      "imageUrl": "https://www.site.fr/image.jpg",
      "city": "Paris",
      "fuelType": "essence",
      "gearbox": "manual"
    }
  ]
}

Si une info manque, mets null. MAIS l'URL et le titre sont OBLIGATOIRES.
Si tu ne trouves AUCUNE annonce, retourne { "listings": [] }.

HTML à analyser (${relevantSnippet.length.toLocaleString()} caractères) :
"""${relevantSnippet.substring(0, 50000)}"""`

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Tu es un expert en extraction de données structurées depuis HTML. Tu retournes UNIQUEMENT du JSON valide, sans texte avant/après.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: SCRAPING_CONFIG.ai.temperature,
      max_tokens: SCRAPING_CONFIG.ai.maxTokens,
    })

    const content = response.choices[0]?.message?.content?.trim() || '{"listings":[]}'
    
    // Nettoyer le JSON
    let jsonStr = content
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.replace(/^```json\s*/, '').replace(/\s*```$/, '')
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```\s*/, '').replace(/\s*```$/, '')
    }

    const parsed = JSON.parse(jsonStr) as { listings: any[] }
    const rawListings = parsed.listings || []

    // Normaliser en Listing[]
    const listings: Listing[] = []
    for (const raw of rawListings) {
      if (!raw.title || !raw.url) continue

      const price = parsePrice(raw.price)
      const mileage = parseMileage(raw.mileage)
      const year = parseYear(raw.year)

      // Filtrer selon les critères
      if (price !== null) {
        if (price > criteria.maxPrice) continue
        if (criteria.minPrice && price < criteria.minPrice) continue
      }
      if (year !== null) {
        if (criteria.minYear && year < criteria.minYear) continue
        if (criteria.maxYear && year > criteria.maxYear) continue
      }
      if (mileage !== null && criteria.maxMileage && mileage > criteria.maxMileage) continue

      const normalizedUrl = normalizeListingUrl(raw.url, siteName)
      if (!normalizedUrl) continue

      const dedupeKey = generateDedupeKey({
        title: normalizeText(raw.title),
        price,
        year,
        mileage,
        url: normalizedUrl,
      })

      listings.push({
        id: dedupeKey,
        sourceSite: siteName,
        url: normalizedUrl,
        title: normalizeText(raw.title),
        price: price || 0,
        year,
        mileage,
        fuelType: normalizeFuelType(raw.fuelType),
        gearbox: normalizeGearboxType(raw.gearbox),
        city: raw.city ? normalizeText(raw.city) : null,
        imageUrl: raw.imageUrl || null,
        score_ia: 50, // Sera recalculé après
        scrapedAt: new Date().toISOString(),
      })
    }

    log.info(`[${siteName}] Fallback IA terminé`, {
      itemsFromAI: listings.length,
    })

    return listings
  } catch (error) {
    log.error(`[${siteName}] Erreur fallback IA`, {
      error: error instanceof Error ? error.message : String(error),
    })
    return []
  }
}

// ============================================================================
// HELPERS DE FILTRAGE HTML
// ============================================================================

/**
 * Construit un snippet HTML pertinent pour l'IA (filtre les lignes pertinentes)
 */
function buildRelevantHtmlSnippet(
  html: string,
  brand: string,
  model: string,
  siteName: string
): string {
  const lines = html.split('\n')
  const relevantLines: string[] = []
  const brandLower = brand.toLowerCase()
  const modelLower = model.toLowerCase()

  for (const line of lines) {
    const lineLower = line.toLowerCase()
    
    // Garder les lignes qui contiennent :
    // - des prix (€, euro, price)
    // - des kilométrages (km, mileage)
    // - des années (19xx, 20xx)
    // - la marque ou le modèle
    // - des liens d'annonces (/ad/, /detail/, /voiture/, etc.)
    // - des classes/attributs d'annonces (aditem, listing, card, etc.)
    
    if (
      lineLower.includes('€') ||
      lineLower.includes('euro') ||
      lineLower.includes('price') ||
      lineLower.includes('km') ||
      lineLower.includes('mileage') ||
      /\b(19|20)\d{2}\b/.test(line) ||
      lineLower.includes(brandLower) ||
      (modelLower && lineLower.includes(modelLower)) ||
      lineLower.includes('/ad/') ||
      lineLower.includes('/detail/') ||
      lineLower.includes('/voiture/') ||
      lineLower.includes('aditem') ||
      lineLower.includes('listing') ||
      lineLower.includes('vehicle') ||
      lineLower.includes('card')
    ) {
      relevantLines.push(line)
    }
  }

  const snippet = relevantLines.join('\n')
  return snippet.substring(0, 60000) // Limiter à 60k caractères
}

// ============================================================================
// HELPERS DE DÉDUPLICATION
// ============================================================================

interface DedupeKeyInput {
  title: string
  price: number | null
  year: number | null
  mileage: number | null
  url: string
}

/**
 * Génère une clé de déduplication stable
 */
export function generateDedupeKey(input: DedupeKeyInput): string {
  const parts = [
    normalizeText(input.title).toLowerCase().substring(0, 50),
    input.price?.toString() || '0',
    input.year?.toString() || '0',
    input.mileage?.toString() || '0',
    input.url.split('?')[0], // URL sans query params
  ]
  
  const key = parts.join('|')
  return crypto.createHash('md5').update(key).digest('hex')
}

// ============================================================================
// HELPERS DE FILTRAGE POST-SCRAPING
// ============================================================================

/**
 * Filtre les listings selon les critères de recherche
 */
export function filterListingsByCriteria(
  listings: Listing[],
  criteria: SearchCriteria
): Listing[] {
  return listings.filter(listing => {
    // Prix
    if (listing.price > criteria.maxPrice) return false
    if (criteria.minPrice && listing.price < criteria.minPrice) return false

    // Année
    if (listing.year !== null && listing.year !== undefined) {
      if (criteria.minYear && listing.year < criteria.minYear) return false
      if (criteria.maxYear && listing.year > criteria.maxYear) return false
    }

    // Kilométrage
    if (listing.mileage !== null && listing.mileage !== undefined) {
      if (criteria.maxMileage && listing.mileage > criteria.maxMileage) return false
    }

    // Carburant
    if (criteria.fuelType && criteria.fuelType !== 'any') {
      if (listing.fuelType && listing.fuelType !== criteria.fuelType) return false
    }

    // Boîte
    if (criteria.gearbox && criteria.gearbox !== 'any') {
      if (listing.gearbox && listing.gearbox !== criteria.gearbox) return false
    }

    // Type de vendeur
    if (criteria.sellerType && criteria.sellerType !== 'any') {
      if (listing.sellerType && listing.sellerType !== criteria.sellerType) return false
    }

    return true
  })
}

// ============================================================================
// HELPERS DE CALCUL DE MATCH SCORE
// ============================================================================

/**
 * Calcule un score de match entre un listing et les critères de recherche
 */
export function calculateMatchScore(
  listing: Listing,
  criteria: SearchCriteria
): number {
  let score = 50 // Base

  // Prix : plus proche du maxPrice = meilleur score
  if (listing.price > 0 && criteria.maxPrice > 0) {
    const priceRatio = listing.price / criteria.maxPrice
    if (priceRatio <= 0.8) score += 20 // Prix très en dessous = bonus
    else if (priceRatio <= 0.9) score += 10 // Prix en dessous = bonus
    else if (priceRatio <= 1.0) score += 5 // Prix dans le budget = ok
    else score -= 10 // Prix au-dessus = pénalité
  }

  // Année : plus récente = meilleur score
  if (listing.year) {
    const currentYear = new Date().getFullYear()
    const age = currentYear - listing.year
    if (age <= 2) score += 15
    else if (age <= 5) score += 10
    else if (age <= 10) score += 5
  }

  // Kilométrage : plus bas = meilleur score
  if (listing.mileage) {
    if (listing.mileage < 50000) score += 15
    else if (listing.mileage < 100000) score += 10
    else if (listing.mileage < 150000) score += 5
  }

  // Match exact carburant/boîte
  if (criteria.fuelType && criteria.fuelType !== 'any' && listing.fuelType === criteria.fuelType) {
    score += 10
  }
  if (criteria.gearbox && criteria.gearbox !== 'any' && listing.gearbox === criteria.gearbox) {
    score += 10
  }

  return Math.min(100, Math.max(0, score))
}

