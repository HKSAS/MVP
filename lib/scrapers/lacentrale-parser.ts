/**
 * Parser LaCentrale - Extraction des annonces depuis HTML
 */

import type { ListingResponse } from '@/lib/types'
import { createRouteLogger } from '@/lib/logger'

const log = createRouteLogger('lacentrale-parser')

export interface LaCentraleRawListing {
  title: string
  price: number | null
  year: number | null
  mileage: number | null
  city: string | null
  url: string
  imageUrl: string | null
}

/**
 * Parse les annonces depuis le HTML LaCentrale
 */
export function parseLaCentraleHtml(
  html: string,
  brand: string,
  model: string,
  maxPrice: number
): LaCentraleRawListing[] {
  const listings: LaCentraleRawListing[] = []

  try {
    if (html.length < 1000) {
      log.warn('HTML trop court pour LaCentrale', { htmlLength: html.length })
      return []
    }

    // LaCentrale utilise souvent des structures avec class="adLineContainer" ou data-*
    const adLineMatches = html.match(/<div[^>]*class=["'][^"']*adLineContainer[^"']*["'][^>]*>[sS]*?<\/div>/g) || []
    const vehicleMatches = html.match(/<div[^>]*class=["'][^"']*vehicle[^"']*["'][^>]*>[sS]*?<\/div>/g) || []
    const articleMatches = html.match(/<article[^>]*>[sS]*?<\/article>/g) || []
    
    // Chercher aussi les structures JSON embedded
    const jsonMatches = html.match(/window\.__INITIAL_STATE__\s*=\s*({[\s\S]+?});/) || []
    const jsonLdMatches = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>(.+?)<\/script>/g) || []

    // Chercher les liens vers les annonces
    const adLinkRegex = /href=["']([^"']*\/annonce[^"']*\/[^"']*)["']/gi

    const allMatches = [...adLineMatches, ...vehicleMatches, ...articleMatches]

    log.debug('LaCentrale parser', {
      adLinesFound: adLineMatches.length,
      vehiclesFound: vehicleMatches.length,
      articlesFound: articleMatches.length,
      jsonFound: jsonMatches.length > 0,
      jsonLdFound: jsonLdMatches.length,
      htmlLength: html.length,
    })

    // Essayer d'extraire depuis JSON embedded si disponible
    if (jsonMatches.length > 0) {
      try {
        const jsonStr = jsonMatches[0]?.match(/{[\s\S]+}/)?.[0]
        if (jsonStr) {
          const jsonData = JSON.parse(jsonStr)
          // Chercher les annonces dans la structure JSON (structure peut varier)
          const ads = jsonData?.ads || jsonData?.listings || jsonData?.vehicles || []
          if (Array.isArray(ads) && ads.length > 0) {
            log.debug('LaCentrale: extraction depuis JSON embedded', { adsCount: ads.length })
            for (const ad of ads.slice(0, 100)) {
              try {
                const listing = extractListingFromJson(ad, brand, model, maxPrice)
                if (listing) {
                  listings.push(listing)
                }
              } catch (error) {
                continue
              }
            }
          }
        }
      } catch (error) {
        log.debug('LaCentrale: échec parsing JSON embedded', { error: error instanceof Error ? error.message : String(error) })
      }
    }

    // Extraire depuis les matches HTML
    if (listings.length === 0) {
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
    }

    // Si pas de résultats, essayer extraction par liens
    if (listings.length === 0 && html.length > 50000) {
      const links: string[] = []
      let linkMatch
      while ((linkMatch = adLinkRegex.exec(html)) !== null && links.length < 50) {
        links.push(linkMatch[1])
      }

      if (links.length > 0) {
        log.debug('LaCentrale: extraction par liens', { linksCount: links.length })
        for (const linkPath of links) {
          const url = linkPath.startsWith('http') 
            ? linkPath 
            : `https://www.lacentrale.fr${linkPath}`
          
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
    log.error('Erreur parsing LaCentrale', {
      error: error instanceof Error ? error.message : String(error),
    })
  }

  log.info('LaCentrale parser terminé', {
    listingsFound: listings.length,
  })

  return listings
}

function extractListingFromJson(
  ad: any,
  brand: string,
  model: string,
  maxPrice: number
): LaCentraleRawListing | null {
  const price = typeof ad.price === 'number' ? ad.price : (typeof ad.price === 'string' ? Number(ad.price.replace(/\s/g, '')) : null)
  
  if (price !== null && price > maxPrice) {
    return null
  }

  const title = ad.title || ad.name || ad.label || `${brand} ${model}`
  const url = ad.url || ad.link || ad.href || null
  if (!url) return null

  const fullUrl = url.startsWith('http') ? url : `https://www.lacentrale.fr${url}`

  return {
    title: String(title),
    price,
    year: typeof ad.year === 'number' ? ad.year : (typeof ad.year === 'string' ? Number(ad.year) : null),
    mileage: typeof ad.mileage === 'number' ? ad.mileage : (typeof ad.mileage === 'string' ? Number(String(ad.mileage).replace(/\s/g, '')) : null),
    city: ad.city || ad.location || null,
    url: fullUrl,
    imageUrl: ad.image || ad.imageUrl || ad.photo || null,
  }
}

function extractListingFromHtml(
  html: string,
  brand: string,
  model: string,
  maxPrice: number
): LaCentraleRawListing | null {
  // Extraire le titre
  const titleMatch =
    html.match(/data-title=["']([^"']+)["']/i) ||
    html.match(/<h[23][^>]*>([sS]*?)<\/h[23]>/i) ||
    html.match(/<a[^>]*title=["']([^"']+)["']/i)

  const title = titleMatch
    ? cleanHtml(titleMatch[1]).replace(/\s+/g, ' ').trim()
    : `${brand} ${model}`

  // Extraire le prix
  const priceMatch = html.match(/(\d{1,3}(?:\s?\d{3})*)\s*€/i) || html.match(/data-price=["']?(\d+)/i)
  const price = priceMatch ? Number(priceMatch[1].replace(/\s/g, '')) : null

  if (price !== null && price > maxPrice) {
    return null
  }

  // Extraire l'URL
  const urlMatch =
    html.match(/href=["']([^"']*\/annonce[^"']*)["']/i) ||
    html.match(/data-url=["']([^"']+)["']/i) ||
    html.match(/data-link=["']([^"']+)["']/i)

  const urlPath = urlMatch ? urlMatch[1] : null
  if (!urlPath) return null

  const url = urlPath.startsWith('http') ? urlPath : `https://www.lacentrale.fr${urlPath}`

  // Extraire l'année
  const yearMatch = html.match(/\b(19|20)\d{2}\b/)
  const year = yearMatch ? Number(yearMatch[0]) : null

  // Extraire le kilométrage
  const mileageMatch = html.match(/(\d{1,3}(?:\s?\d{3})*)\s*km/i)
  const mileage = mileageMatch ? Number(mileageMatch[1].replace(/\s/g, '')) : null

  // Extraire la ville
  const cityMatch = html.match(/<span[^>]*class=["'][^"']*city[^"']*["'][^>]*>([sS]*?)<\/span>/i) ||
                    html.match(/data-city=["']([^"']+)["']/i)
  const city = cityMatch ? cleanHtml(cityMatch[1]).trim() : null

  // Extraire l'image
  const imageMatch = html.match(/<img[^>]+src=["']([^"']+)["']/i)
  const imageUrl = imageMatch ? (imageMatch[1].startsWith('http') ? imageMatch[1] : `https://www.lacentrale.fr${imageMatch[1]}`) : null

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
): LaCentraleRawListing | null {
  const title = context.match(/data-title=["']([^"']+)["']/i)?.[1] || 
                context.match(/title=["']([^"']+)["']/i)?.[1] || 
                `${brand} ${model}`
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

export function convertLaCentraleToListingResponse(
  raw: LaCentraleRawListing,
  index: number
): ListingResponse {
  const id = `lacentrale_${Date.now()}_${index}`
  const externalId = `${id}_${raw.price || 0}`

  return {
    id: externalId,
    title: raw.title,
    price_eur: raw.price,
    year: raw.year,
    mileage_km: raw.mileage,
    url: raw.url,
    imageUrl: raw.imageUrl,
    source: 'LaCentrale',
    score_ia: 50,
    score_final: 50,
  }
}

