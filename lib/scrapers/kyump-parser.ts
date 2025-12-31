/**
 * Parser Kyump - Extraction des annonces depuis HTML
 */

import type { ListingResponse } from '@/lib/types'
import { createRouteLogger } from '@/lib/logger'
import { scrapeWithZenRows } from '@/lib/zenrows'

const log = createRouteLogger('kyump-parser')

export interface KyumpRawListing {
  title: string
  price: number | null
  year: number | null
  mileage: number | null
  city: string | null
  url: string
  imageUrl: string | null
}

/**
 * Scrape Kyump
 */
export async function scrapeKyump(
  brand: string,
  model: string,
  maxPrice: number
): Promise<KyumpRawListing[]> {
  const url = `https://www.kyump.com/voiture-occasion?marque=${encodeURIComponent(brand.toUpperCase())}&modele=${encodeURIComponent((model || '').toUpperCase())}&prixMax=${maxPrice}`
  
  log.info(`[Kyump] 🎯 Scraping: ${url}`)
  
  try {
    const html = await scrapeWithZenRows(
      url,
      {
        js_render: 'true',
        wait: '3000',
        premium_proxy: 'true',
        proxy_country: 'fr',
        block_resources: 'image,media,font',
      }
    )
    
    return parseKyumpHtml(html, brand, model, maxPrice)
  } catch (error) {
    log.error('[Kyump] ❌ Erreur scraping', {
      error: error instanceof Error ? error.message : String(error),
    })
    return []
  }
}

/**
 * Parse les annonces depuis le HTML Kyump
 */
export function parseKyumpHtml(
  html: string,
  brand: string,
  model: string,
  maxPrice: number
): KyumpRawListing[] {
  const listings: KyumpRawListing[] = []

  try {
    if (html.length < 1000) {
      log.warn('HTML trop court pour Kyump', { htmlLength: html.length })
      return []
    }

    // Chercher les containers d'annonces
    const cardMatches = html.match(/<div[^>]*class=["'][^"']*(?:car-card|vehicle-card|listing-item)[^"']*["'][^>]*>[\s\S]*?<\/div>/gi) || []
    const articleMatches = html.match(/<article[^>]*>[\s\S]*?<\/article>/gi) || []
    
    // Chercher les liens vers les annonces
    const adLinkRegex = /href=["']([^"']*\/voiture-occasion[^"']*\/[^"']*)["']/gi

    const allMatches = [...cardMatches, ...articleMatches]

    log.debug('Kyump parser', {
      cardsFound: cardMatches.length,
      articlesFound: articleMatches.length,
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
        const linkPath = linkMatch[1]
        if (!links.includes(linkPath)) {
          links.push(linkPath)
        }
      }

      if (links.length > 0) {
        log.debug('Kyump: extraction par liens', { linksCount: links.length })
        for (const linkPath of links) {
          const url = linkPath.startsWith('http') 
            ? linkPath 
            : `https://www.kyump.com${linkPath}`
          
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
    log.error('Erreur parsing Kyump', {
      error: error instanceof Error ? error.message : String(error),
    })
  }

  log.info('Kyump parser terminé', {
    listingsFound: listings.length,
  })

  return listings
}

function extractListingFromHtml(
  html: string,
  brand: string,
  model: string,
  maxPrice: number
): KyumpRawListing | null {
  // Extraire le titre
  const titleMatch =
    html.match(/<h[23][^>]*>([\s\S]*?)<\/h[23]>/i) ||
    html.match(/<a[^>]*title=["']([^"']+)["']/i) ||
    html.match(/data-title=["']([^"']+)["']/i)

  const title = titleMatch
    ? cleanHtml(titleMatch[1]).replace(/\s+/g, ' ').trim()
    : `${brand} ${model}`

  // Extraire le prix
  const priceMatch = html.match(/(\d{1,3}(?:\s?\d{3})*)\s*€/i) || 
                     html.match(/data-price=["']?(\d+)/i)
  const price = priceMatch ? Number(priceMatch[1].replace(/\s/g, '')) : null

  if (price !== null && price > maxPrice) {
    return null
  }

  // Extraire l'URL
  const urlMatch =
    html.match(/href=["']([^"']*\/voiture-occasion[^"']*\/[^"']*)["']/i) ||
    html.match(/data-url=["']([^"']+)["']/i)

  const urlPath = urlMatch ? urlMatch[1] : null
  if (!urlPath) return null

  const url = urlPath.startsWith('http') ? urlPath : `https://www.kyump.com${urlPath}`

  // Extraire l'année
  const yearMatch = html.match(/\b(19|20)\d{2}\b/)
  const year = yearMatch ? Number(yearMatch[0]) : null

  // Extraire le kilométrage
  const mileageMatch = html.match(/(\d{1,3}(?:\s?\d{3})*)\s*km/i)
  const mileage = mileageMatch ? Number(mileageMatch[1].replace(/\s/g, '')) : null

  // Extraire la ville
  const cityMatch = html.match(/<span[^>]*class=["'][^"']*city[^"']*["'][^>]*>([\s\S]*?)<\/span>/i)
  const city = cityMatch ? cleanHtml(cityMatch[1]).trim() : null

  // Extraire l'image
  const imageMatch = html.match(/<img[^>]+src=["']([^"']+)["']/i) ||
                      html.match(/<img[^>]+data-src=["']([^"']+)["']/i)
  const imageUrl = imageMatch 
    ? (imageMatch[1].startsWith('http') ? imageMatch[1] : `https://www.kyump.com${imageMatch[1]}`)
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

function extractListingFromContext(
  context: string,
  url: string,
  brand: string,
  model: string,
  maxPrice: number
): KyumpRawListing | null {
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

export function convertKyumpToListingResponse(
  raw: KyumpRawListing,
  index: number
): ListingResponse {
  const id = `kyump_${Date.now()}_${index}`
  const externalId = `${id}_${raw.price || 0}`

  return {
    id: externalId,
    title: raw.title,
    price_eur: raw.price,
    year: raw.year,
    mileage_km: raw.mileage,
    url: raw.url,
    imageUrl: raw.imageUrl,
    source: 'Kyump',
    city: raw.city,
    score_ia: 50,
    score_final: 50,
  }
}

