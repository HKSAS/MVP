/**
 * Parser AutoScout24 - Extraction des annonces depuis HTML
 */

import type { ListingResponse } from '@/lib/types'
import { createRouteLogger } from '@/lib/logger'

const log = createRouteLogger('autoscout24-parser')

export interface AutoScout24RawListing {
  title: string
  price: number | null
  year: number | null
  mileage: number | null
  city: string | null
  url: string
  imageUrl: string | null
}

/**
 * Parse les annonces depuis le HTML AutoScout24
 */
export function parseAutoScout24Html(
  html: string,
  brand: string,
  model: string,
  maxPrice: number
): AutoScout24RawListing[] {
  const listings: AutoScout24RawListing[] = []

  try {
    if (html.length < 1000) {
      log.warn('HTML trop court pour AutoScout24', { htmlLength: html.length })
      return []
    }

    // AutoScout24 utilise souvent des structures comme data-item-name ou des articles
    const articleMatches = html.match(/<article[^>]*>[\s\S]*?<\/article>/g) || []
    const itemMatches = html.match(/<div[^>]*data-item-name[^>]*>[\s\S]*?<\/div>/g) || []
    const cardMatches = html.match(/<div[^>]*class=["'][^"']*(?:VehicleCard|Card|ListingCard)[^"']*["'][^>]*>[\s\S]*?<\/div>/g) || []

    // Chercher les liens vers les annonces
    const adLinkRegex = /href=["']([^"']*\/lst\/[^"']*(?:detail|annonce|voiture)[^"']*)["']/gi

    const allMatches = [...articleMatches, ...itemMatches, ...cardMatches]

    log.debug('AutoScout24 parser', {
      articlesFound: articleMatches.length,
      itemsFound: itemMatches.length,
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
        continue
      }
    }

    // Si pas de résultats, essayer extraction par liens
    if (listings.length === 0 && html.length > 50000) {
      const links: string[] = []
      let linkMatch
      while ((linkMatch = adLinkRegex.exec(html)) !== null && links.length < 50) {
        links.push(linkMatch[1])
      }

      if (links.length > 0) {
        log.debug('AutoScout24: extraction par liens', { linksCount: links.length })
        for (const linkPath of links) {
          const url = linkPath.startsWith('http') 
            ? linkPath 
            : `https://www.autoscout24.fr${linkPath}`
          
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
    log.error('Erreur parsing AutoScout24', {
      error: error instanceof Error ? error.message : String(error),
    })
  }

  log.info('AutoScout24 parser terminé', {
    listingsFound: listings.length,
  })

  return listings
}

function extractListingFromHtml(
  html: string,
  brand: string,
  model: string,
  maxPrice: number
): AutoScout24RawListing | null {
  // Extraire le titre
  const titleMatch =
    html.match(/data-item-name=["']([^"']+)["']/i) ||
    html.match(/<h[23][^>]*>([sS]*?)<\/h[23]>/i) ||
    html.match(/<a[^>]*title=["']([^"']+)["']/i)

  const title = titleMatch
    ? cleanHtml(titleMatch[1]).replace(/\s+/g, ' ').trim()
    : `${brand} ${model}`

  // Extraire le prix
  const priceMatch = html.match(/(\d{1,3}(?:\s?\d{3})*)\s*€/i) || html.match(/price["']?\s*:\s*["']?(\d+)/i)
  const price = priceMatch ? Number(priceMatch[1].replace(/\s/g, '')) : null

  if (price !== null && price > maxPrice) {
    return null
  }

  // Extraire l'URL
  const urlMatch =
    html.match(/href=["']([^"']*\/lst\/[^"']*)["']/i) ||
    html.match(/data-link=["']([^"']+)["']/i)

  const urlPath = urlMatch ? urlMatch[1] : null
  if (!urlPath) return null

  const url = urlPath.startsWith('http') ? urlPath : `https://www.autoscout24.fr${urlPath}`

  // Extraire l'année
  const yearMatch = html.match(/\b(19|20)\d{2}\b/)
  const year = yearMatch ? Number(yearMatch[0]) : null

  // Extraire le kilométrage
  const mileageMatch = html.match(/(\d{1,3}(?:\s?\d{3})*)\s*km/i)
  const mileage = mileageMatch ? Number(mileageMatch[1].replace(/\s/g, '')) : null

  // Extraire la ville
  const cityMatch = html.match(/<span[^>]*class=["'][^"']*location[^"']*["'][^>]*>([sS]*?)<\/span>/i)
  const city = cityMatch ? cleanHtml(cityMatch[1]).trim() : null

  // Extraire l'image
  const imageMatch = html.match(/<img[^>]+src=["']([^"']+)["']/i)
  const imageUrl = imageMatch ? (imageMatch[1].startsWith('http') ? imageMatch[1] : `https://www.autoscout24.fr${imageMatch[1]}`) : null

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

function extractListingFromContext(
  context: string,
  url: string,
  brand: string,
  model: string,
  maxPrice: number
): AutoScout24RawListing | null {
  const title = context.match(/data-item-name=["']([^"']+)["']/i)?.[1] || `${brand} ${model}`
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

export function convertAutoScout24ToListingResponse(
  raw: AutoScout24RawListing,
  index: number
): ListingResponse {
  const id = `autoscout24_${Date.now()}_${index}`
  const externalId = `${id}_${raw.price || 0}`

  return {
    id: externalId,
    title: raw.title,
    price_eur: raw.price,
    year: raw.year,
    mileage_km: raw.mileage,
    url: raw.url,
    imageUrl: raw.imageUrl,
    source: 'AutoScout24',
    score_ia: 50,
    score_final: 50,
  }
}

