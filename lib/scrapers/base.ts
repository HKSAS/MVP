import type { ScrapeQuery, SiteResult, ListingResponse } from '@/lib/types'
import { createRouteLogger } from '@/lib/logger'

export type SearchPass = 'strict' | 'relaxed' | 'opportunity'
export type ScrapingStrategy = 'json' | 'http-html' | 'headless' | 'ai-fallback' | 'xhr-json' | 'playwright-remote' | 'api-json'

export interface PassAttempt {
  pass: SearchPass
  ok: boolean
  items: number
  ms: number
  note?: string
}

export interface EnhancedSiteResult extends SiteResult {
  strategyUsed?: ScrapingStrategy
  attempts?: PassAttempt[]
}

/**
 * Construit une query assouplie selon la passe
 */
export function buildRelaxedQuery(
  originalQuery: ScrapeQuery,
  pass: SearchPass
): ScrapeQuery {
  const relaxed = { ...originalQuery }

  switch (pass) {
    case 'strict':
      // Pas de modification
      break

    case 'relaxed':
      // Élargir le budget de 10%
      relaxed.maxPrice = Math.floor(relaxed.maxPrice * 1.1)
      // Enlever les restrictions de localisation si présentes
      if (relaxed.location) {
        relaxed.location = undefined
        relaxed.radius_km = undefined
      }
      break

    case 'opportunity':
      // Budget encore plus large (+20%)
      relaxed.maxPrice = Math.floor(relaxed.maxPrice * 1.2)
      // Enlever toutes les restrictions optionnelles
      relaxed.location = undefined
      relaxed.radius_km = undefined
      // Pour LeBonCoin, on peut chercher juste la marque
      break
  }

  return relaxed
}

/**
 * Construit une URL de recherche selon la passe
 */
export function buildSearchUrl(
  siteName: string,
  query: ScrapeQuery,
  pass: SearchPass
): string {
  const relaxedQuery = buildRelaxedQuery(query, pass)

  switch (siteName) {
    case 'LeBonCoin':
      return buildLeBonCoinUrl(relaxedQuery, pass)
    case 'LaCentrale':
      return buildLaCentraleUrl(relaxedQuery)
    case 'ParuVendu':
      return buildParuVenduUrl(relaxedQuery)
    case 'AutoScout24':
      return buildAutoScout24Url(relaxedQuery)
    case 'LeParking':
      return buildLeParkingUrl(relaxedQuery)
    case 'ProCarLease':
      return buildProCarLeaseUrl(relaxedQuery)
    default:
      throw new Error(`Site non supporté: ${siteName}`)
  }
}

function buildLeBonCoinUrl(query: ScrapeQuery, pass: SearchPass): string {
  const params = new URLSearchParams()
  
  switch (pass) {
    case 'strict':
      // Pass 1 : Opportunités récentes - tri time, requête exacte brand+model
      params.set('text', `${query.brand} ${query.model}`.trim())
      params.set('price', `0-${query.maxPrice}`)
      params.set('sort', 'time')
      params.set('order', 'desc')
      params.set('category', '2') // Voitures
      break
      
    case 'relaxed':
      // Pass 2 : Marché complet - tri pertinence, budget +10%
      const relaxedPrice = Math.floor(query.maxPrice * 1.1)
      params.set('text', `${query.brand} ${query.model}`.trim())
      params.set('price', `0-${relaxedPrice}`)
      params.set('sort', 'relevance') // Tri pertinence
      params.set('order', 'desc')
      params.set('category', '2')
      break
      
    case 'opportunity':
      // Pass 3 : Fallback ultra large - brand seule + budget +20%
      const opportunityPrice = Math.floor(query.maxPrice * 1.2)
      params.set('text', query.brand) // Juste la marque (modèle en option)
      params.set('price', `0-${opportunityPrice}`)
      params.set('sort', 'time')
      params.set('order', 'desc')
      params.set('category', '2')
      break
  }
  
  return `https://www.leboncoin.fr/recherche?${params.toString()}`
}

function buildLaCentraleUrl(query: ScrapeQuery): string {
  const priceMax = query.maxPrice
  const model = query.model || ''
  return `https://www.lacentrale.fr/listing?makesModels=${encodeURIComponent(query.brand)}-${encodeURIComponent(model)}&priceMax=${priceMax}`
}

function buildParuVenduUrl(query: ScrapeQuery): string {
  const brandSlug = query.brand.toLowerCase().trim().replace(/\s+/g, '-')
  const modelSlug = (query.model || '').toLowerCase().trim().replace(/\s+/g, '-')
  return `https://www.paruvendu.fr/a/voiture-occasion/${encodeURIComponent(brandSlug)}/${encodeURIComponent(modelSlug)}/`
}

function buildAutoScout24Url(query: ScrapeQuery): string {
  const baseModel = (query.model || '').toLowerCase().replace(/\s+/g, ' ').replace(/\s+\d+[a-zA-Z]*$/, '').trim()
  const brandSlug = query.brand.toLowerCase().replace(/\s+/g, '-')
  const modelSlug = baseModel.replace(/\s+/g, '-')
  return `https://www.autoscout24.fr/lst/${brandSlug}/${modelSlug}?price=${query.maxPrice}`
}

function buildLeParkingUrl(query: ScrapeQuery): string {
  const searchTerm = `${query.brand} ${query.model}`.toLowerCase().trim().replace(/\s+/g, '-')
  return `https://www.leparking.fr/voiture/${encodeURIComponent(searchTerm)}/prix-max-${query.maxPrice}`
}

function buildProCarLeaseUrl(query: ScrapeQuery): string {
  const params = new URLSearchParams({
    marque: query.brand,
    modele: query.model || '',
    prix_max: query.maxPrice.toString(),
  })
  return `https://procarlease.com/fr/vehicules?${params.toString()}`
}

