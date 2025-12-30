/**
 * Parser ParuVendu - Extraction des annonces depuis HTML
 * Bridge vers le parser dans src/modules/scraping
 */

import type { ListingResponse } from '@/lib/types'
import { createRouteLogger } from '@/lib/logger'

const log = createRouteLogger('paruvendu-parser')

export interface ParuVenduRawListing {
  title: string
  price: number | null
  year: number | null
  mileage: number | null
  city: string | null
  url: string
  imageUrl: string | null
}

/**
 * Parse les annonces depuis le HTML ParuVendu
 */
export function parseParuVenduHtml(
  html: string,
  brand: string,
  model: string,
  maxPrice: number
): ParuVenduRawListing[] {
  const listings: ParuVenduRawListing[] = []

  try {
    // Parser health check
    if (html.length < 1000) {
      log.warn('HTML trop court pour ParuVendu', { htmlLength: html.length })
      return []
    }

    // Rechercher les conteneurs d'annonces
    const articleMatches = html.match(/<article[^>]*>[sS]*?<\/article>/g) || []
    const cardMatches =
      html.match(/<div[^>]*class=["'][^"']*(?:card|item|listing|annonce|vehicule)[^"']*["'][^>]*>[sS]*?<\/div>/g) ||
      []

    // Essayer aussi les liens directs vers les annonces
    const adLinkRegex =
      /href=["']([^"']*\/a\/voiture[^"']*\/(?:detail|annonce|fiche)[^"']*)["']/gi

    const allMatches = [...articleMatches, ...cardMatches]

    log.debug('ParuVendu parser', {
      articlesFound: articleMatches.length,
      cardsFound: cardMatches.length,
      htmlLength: html.length,
    })

    // Extraire depuis les matches
    for (const match of allMatches.slice(0, 100)) {
      try {
        const listing = extractListingFromHtml(match, brand, model, maxPrice)
        if (listing) {
          listings.push(listing)
        }
      } catch (error) {
        // Ignore les erreurs individuelles
        continue
      }
    }

    // Si pas de résultats mais HTML volumineux, essayer extraction par liens
    if (listings.length === 0 && html.length > 50000) {
      log.warn('parser_miss - HTML volumineux mais 0 résultats', {
        htmlLength: html.length,
      })

      // Essayer extraction par liens
      const links: string[] = []
      let linkMatch
      while (
        (linkMatch = adLinkRegex.exec(html)) !== null &&
        links.length < 50
      ) {
        links.push(linkMatch[1])
      }

      if (links.length > 0) {
        log.debug('ParuVendu: extraction par liens', { linksCount: links.length })
        for (const linkPath of links) {
          const url = linkPath.startsWith('http')
            ? linkPath
            : `https://www.paruvendu.fr${linkPath}`
          
          // Chercher contexte autour du lien
          const linkIndex = html.indexOf(linkPath)
          if (linkIndex !== -1) {
            const context = html.substring(
              Math.max(0, linkIndex - 2000),
              Math.min(html.length, linkIndex + 2000)
            )
            const listing = extractListingFromContext(context, url, brand, model, maxPrice)
            if (listing) {
              listings.push(listing)
            }
          }
        }
      }
    }
  } catch (error) {
    log.error('Erreur parsing ParuVendu', {
      error: error instanceof Error ? error.message : String(error),
    })
  }

  log.info('ParuVendu parser terminé', {
    listingsFound: listings.length,
  })

  return listings
}

/**
 * Extrait une annonce depuis un fragment HTML
 */
function extractListingFromHtml(
  html: string,
  brand: string,
  model: string,
  maxPrice: number
): ParuVenduRawListing | null {
  // Extraire le titre
  const titleMatch =
    html.match(/<h[23][^>]*>([sS]*?)<\/h[23]>/i) ||
    html.match(/<a[^>]*title=["']([^"']+)["']/i) ||
    html.match(/class=["'][^"']*title[^"']*["'][^>]*>([sS]*?)<\/[^>]+>/i)

  const title = titleMatch
    ? cleanHtml(titleMatch[1])
        .replace(/\s+/g, ' ')
        .trim()
    : `${brand} ${model}`

  // Extraire le prix
  const priceMatch = html.match(/(\d{1,3}(?:\s?\d{3})*)\s*€/i)
  const price = priceMatch
    ? Number(priceMatch[1].replace(/\s/g, ''))
    : null

  if (price !== null && price > maxPrice) {
    return null // Filtrer par prix
  }

  // Extraire l'URL
  const urlMatch =
    html.match(/href=["']([^"']*\/a\/voiture[^"']*)["']/i) ||
    html.match(/href=["']([^"']*\/detail[^"']*)["']/i)

  const urlPath = urlMatch ? urlMatch[1] : null
  if (!urlPath) return null

  const url = urlPath.startsWith('http')
    ? urlPath
    : `https://www.paruvendu.fr${urlPath}`

  // Extraire l'année
  const yearMatch = html.match(/\b(19|20)\d{2}\b/)
  const year = yearMatch ? Number(yearMatch[0]) : null

  // Extraire le kilométrage
  const mileageMatch = html.match(/(\d{1,3}(?:\s?\d{3})*)\s*km/i)
  const mileage = mileageMatch
    ? Number(mileageMatch[1].replace(/\s/g, ''))
    : null

  // Extraire la ville
  const cityMatch =
    html.match(/<span[^>]*class=["'][^"']*ville[^"']*["'][^>]*>([sS]*?)<\/span>/i) ||
    html.match(/<div[^>]*class=["'][^"']*city[^"']*["'][^>]*>([sS]*?)<\/div>/i)
  const city = cityMatch ? cleanHtml(cityMatch[1]).trim() : null

  // Extraire l'image
  const imageMatch = html.match(/<img[^>]+src=["']([^"']+)["']/i)
  const imageUrl = imageMatch
    ? (imageMatch[1].startsWith('http')
        ? imageMatch[1]
        : `https://www.paruvendu.fr${imageMatch[1]}`)
    : null

  return {
    title,
    price,
    year,
    mileage,
    city,
    url,
    imageUrl,
  }
}

/**
 * Extrait depuis un contexte autour d'un lien
 */
function extractListingFromContext(
  context: string,
  url: string,
  brand: string,
  model: string,
  maxPrice: number
): ParuVenduRawListing | null {
  const title = context.match(/title=["']([^"']+)["']/i)?.[1] || `${brand} ${model}`
  const priceMatch = context.match(/(\d{1,3}(?:\s?\d{3})*)\s*€/i)
  const price = priceMatch ? Number(priceMatch[1].replace(/\s/g, '')) : null

  if (price !== null && price > maxPrice) {
    return null
  }

  const yearMatch = context.match(/\b(19|20)\d{2}\b/)
  const year = yearMatch ? Number(yearMatch[0]) : null

  const mileageMatch = context.match(/(\d{1,3}(?:\s?\d{3})*)\s*km/i)
  const mileage = mileageMatch ? Number(mileageMatch[1].replace(/\s/g, '')) : null

  return {
    title: cleanHtml(title).trim(),
    price,
    year,
    mileage,
    city: null,
    url,
    imageUrl: null,
  }
}

/**
 * Nettoie le HTML pour extraire le texte
 */
function cleanHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Convertit un ParuVenduRawListing vers ListingResponse
 */
export function convertParuVenduToListingResponse(
  raw: ParuVenduRawListing,
  index: number
): ListingResponse {
  const id = `paruvendu_${Date.now()}_${index}`
  const externalId = `${id}_${raw.price || 0}`

  return {
    id: externalId,
    title: raw.title,
    price_eur: raw.price,
    year: raw.year,
    mileage_km: raw.mileage,
    url: raw.url,
    imageUrl: raw.imageUrl,
    source: 'ParuVendu',
    score_ia: 50,
    score_final: 50,
  }
}

