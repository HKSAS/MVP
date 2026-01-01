// src/modules/scraping/sites/transakauto/scraper.ts
// 🎯 SCRAPER TRANSAKAUTO

import { scrapeWithZenRows } from '@/lib/zenrows'
import { getZenRowsApiKey } from '@/src/core/config/env'
import type { ScrapeQuery, ListingResponse } from '@/src/core/types'
import type { ScrapingStrategy, ScrapePass } from '@/src/core/types'
import { createRouteLogger } from '@/lib/logger'

const log = createRouteLogger('transakauto-scraper')

/**
 * 🎯 SCRAPER TRANSAKAUTO AVEC ZENROWS
 */
export async function scrapeTransakAuto(
  query: ScrapeQuery,
  pass: ScrapePass,
  abortSignal?: AbortSignal
): Promise<{
  listings: ListingResponse[]
  strategy: ScrapingStrategy
  ms: number
}> {
  const startTime = Date.now()
  
  const ZENROWS_API_KEY = getZenRowsApiKey()
  
  if (!ZENROWS_API_KEY) {
    log.error('[TRANSAKAUTO] ZENROWS_API_KEY manquant dans .env.local')
    return {
      listings: [],
      strategy: 'zenrows',
      ms: Date.now() - startTime,
    }
  }

  const targetUrl = buildTransakAutoURL(query, pass)
  log.info(`[TRANSAKAUTO] 🎯 Scraping: ${targetUrl}`, { pass })

  try {
    // Construire l'URL de recherche TransakAuto
    // TransakAuto utilise annonces.transakauto.com
    const searchTerm = `${query.brand} ${query.model || ''}`.trim()
    const params = new URLSearchParams({
      marque: query.brand,
      modele: query.model || '',
      prix_max: query.maxPrice.toString(),
    })
    const searchUrl = `https://annonces.transakauto.com/?${params.toString()}`
    
    log.info('[TRANSAKAUTO] 📡 Tentative avec ZenRows...', { pass, url: searchUrl })
    
    // Utiliser ZenRows pour scraper
    const html = await scrapeWithZenRows(
      searchUrl,
      {
        js_render: 'true',
        wait: '3000',
        premium_proxy: 'true',
        proxy_country: 'fr',
      },
      abortSignal
    )

    if (!html || html.length < 100) {
      log.warn('[TRANSAKAUTO] ⚠️ HTML vide ou trop court', { pass })
      return {
        listings: [],
        strategy: 'zenrows',
        ms: Date.now() - startTime,
      }
    }

    // Extraire les annonces depuis le HTML
    const listings = extractListingsFromHTML(html, query)
    
    // Debug: analyser le HTML pour comprendre la structure
    if (listings.length === 0) {
      log.warn('[TRANSAKAUTO] ⚠️ Aucune annonce trouvée, analyse du HTML...', {
        htmlLength: html.length,
        hasVehicule: html.includes('vehicule'),
        hasAnnonce: html.includes('annonce'),
        hasCard: html.includes('card'),
        hasListing: html.includes('listing'),
        sample: html.substring(0, 500),
      })
    }
    
    log.info(`[TRANSAKAUTO] ✅ ${listings.length} annonces trouvées`, { pass })
    
    return {
      listings,
      strategy: 'zenrows',
      ms: Date.now() - startTime,
    }

  } catch (error) {
    log.error('[TRANSAKAUTO] ❌ Erreur scraping:', {
      error: error instanceof Error ? error.message : String(error),
      pass,
    })
    return {
      listings: [],
      strategy: 'zenrows',
      ms: Date.now() - startTime,
    }
  }
}

/**
 * Construire l'URL de recherche TransakAuto
 */
function buildTransakAutoURL(query: ScrapeQuery, pass: ScrapePass): string {
  const { brand, model, maxPrice } = query
  
  // URL de recherche TransakAuto (utilise annonces.transakauto.com)
  const params = new URLSearchParams({
    marque: brand,
    modele: model || '',
    prix_max: maxPrice.toString(),
  })
  
  return `https://annonces.transakauto.com/?${params.toString()}`
}

/**
 * Extraire les annonces depuis le HTML
 */
function extractListingsFromHTML(html: string, query: ScrapeQuery): ListingResponse[] {
  const listings: ListingResponse[] = []
  
  try {
    // Chercher des patterns JSON dans le HTML (comme __NEXT_DATA__ ou autres structures)
    const nextDataMatch = html.match(/<script[^>]*id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/)
    if (nextDataMatch && nextDataMatch[1]) {
      try {
        const nextData = JSON.parse(nextDataMatch[1])
        // Extraire les annonces depuis __NEXT_DATA__
        const extracted = extractFromNextData(nextData, query)
        listings.push(...extracted)
        log.info('[TRANSAKAUTO] Annonces extraites depuis __NEXT_DATA__', { count: extracted.length })
      } catch (e) {
        log.warn('[TRANSAKAUTO] Erreur parsing __NEXT_DATA__', { error: e })
      }
    }
    
    // Chercher aussi dans les scripts JSON-LD
    const jsonLdMatches = html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)
    for (const match of Array.from(jsonLdMatches)) {
      try {
        const jsonLd = JSON.parse(match[1])
        if (jsonLd['@type'] === 'ItemList' && Array.isArray(jsonLd.itemListElement)) {
          for (const item of jsonLd.itemListElement) {
            if (item.item && item.item.url) {
              const listing = extractListingFromContext(JSON.stringify(item.item), item.item.url, query)
              if (listing && !listings.some(l => l.url === listing.url)) {
                listings.push(listing)
              }
            }
          }
        }
      } catch (e) {
        // Ignore JSON parsing errors
      }
    }
    
    // Si pas de __NEXT_DATA__, essayer d'extraire depuis le HTML directement
    if (listings.length === 0) {
      const extracted = extractFromHTMLAttributes(html, query)
      listings.push(...extracted)
      log.info('[TRANSAKAUTO] Annonces extraites depuis HTML', { count: extracted.length })
    }
    
  } catch (error) {
    log.error('[TRANSAKAUTO] Erreur extraction HTML', { error })
  }
  
  return listings
}

/**
 * Extraire depuis __NEXT_DATA__
 */
function extractFromNextData(nextData: any, query: ScrapeQuery): ListingResponse[] {
  const listings: ListingResponse[] = []
  
  try {
    // Chercher les annonces dans la structure JSON
    // À adapter selon la structure réelle de TransakAuto
    const findListings = (obj: any, path: string[] = []): any[] => {
      if (Array.isArray(obj)) {
        return obj
      }
      if (obj && typeof obj === 'object') {
        for (const [key, value] of Object.entries(obj)) {
          if (key.toLowerCase().includes('listing') || 
              key.toLowerCase().includes('ad') || 
              key.toLowerCase().includes('vehicle') ||
              key.toLowerCase().includes('annonce')) {
            if (Array.isArray(value)) {
              return value
            }
          }
          const found = findListings(value, [...path, key])
          if (found && found.length > 0) {
            return found
          }
        }
      }
      return []
    }
    
    const rawListings = findListings(nextData)
    
    for (const raw of rawListings.slice(0, 50)) {
      try {
        const listing = mapTransakAutoAdToUnified(raw, query)
        if (listing) {
          listings.push(listing)
        }
      } catch (e) {
        log.warn('[TRANSAKAUTO] Erreur mapping annonce', { error: e })
      }
    }
    
  } catch (error) {
    log.error('[TRANSAKAUTO] Erreur extraction __NEXT_DATA__', { error })
  }
  
  return listings
}

/**
 * Extraire depuis les attributs HTML
 */
function extractFromHTMLAttributes(html: string, query: ScrapeQuery): ListingResponse[] {
  const listings: ListingResponse[] = []
  
  try {
    // Chercher des patterns d'URLs d'annonces (plus de patterns)
    const urlPatterns = [
      /href=["']([^"']*\/vehicule[^"']*|annonce[^"']*|detail[^"']*|voiture[^"']*|auto[^"']*\/[^"']*)["']/gi,
      /data-href=["']([^"']+)["']/gi,
      /data-url=["']([^"']+)["']/gi,
      /url=["']([^"']*\/vehicule[^"']*)["']/gi,
    ]
    
    const seenUrls = new Set<string>()
    const allMatches: Array<{ url: string; index: number }> = []
    
    // Collecter toutes les URLs trouvées
    for (const pattern of urlPatterns) {
      let match: RegExpExecArray | null
      while ((match = pattern.exec(html)) !== null) {
        if (match[1] && !seenUrls.has(match[1])) {
          seenUrls.add(match[1])
          allMatches.push({ url: match[1], index: match.index || 0 })
        }
        if (match.index === pattern.lastIndex) {
          pattern.lastIndex++
        }
      }
      // Reset pattern
      pattern.lastIndex = 0
    }
    
    // Trier par index pour garder l'ordre
    allMatches.sort((a, b) => a.index - b.index)
    
    // Chercher aussi des containers d'annonces (divs avec classes spécifiques)
    const containerPatterns = [
      /<div[^>]*class=["'][^"']*(?:card|listing|annonce|vehicule|ad|product|item)[^"']*["'][^>]*>[\s\S]*?<\/div>/gi,
      /<article[^>]*>[\s\S]*?<\/article>/gi,
      /<li[^>]*class=["'][^"']*(?:card|listing|annonce|vehicule|ad|product|item)[^"']*["'][^>]*>[\s\S]*?<\/li>/gi,
    ]
    
    for (const pattern of containerPatterns) {
      const containers: RegExpExecArray[] = []
      let match: RegExpExecArray | null
      while ((match = pattern.exec(html)) !== null && containers.length < 50) {
        containers.push(match)
        if (match.index === pattern.lastIndex) {
          pattern.lastIndex++
        }
      }
      pattern.lastIndex = 0
      
      for (const container of containers) {
        const containerHtml = container[0]
        
        // Chercher une URL dans le container
        const urlMatch = containerHtml.match(/href=["']([^"']+)["']/i) ||
                        containerHtml.match(/data-href=["']([^"']+)["']/i)
        
        if (urlMatch && urlMatch[1]) {
          const url = urlMatch[1]
          // Accepter plus de patterns d'URLs
          const isValidUrl = url.includes('/vehicule') || 
                            url.includes('/annonce') || 
                            url.includes('/detail') ||
                            url.includes('/voiture') ||
                            url.includes('/auto') ||
                            (url.includes('/') && !url.includes('#'))
          
          if (!seenUrls.has(url) && isValidUrl && !url.includes('javascript:') && !url.startsWith('mailto:')) {
            seenUrls.add(url)
            const fullUrl = url.startsWith('http') ? url : `https://annonces.transakauto.com${url.startsWith('/') ? url : `/${url}`}`
            const listing = extractListingFromContext(containerHtml, fullUrl, query)
            if (listing && !listings.some(l => l.url === listing.url)) {
              listings.push(listing)
            }
          }
        }
      }
    }
    
    // Extraire depuis les URLs trouvées
    for (const match of allMatches.slice(0, 50)) {
      const url = match.url
      if (!url || url.includes('#') || url.includes('javascript:')) continue
      
      // Construire l'URL complète
      const fullUrl = url.startsWith('http') ? url : `https://annonces.transakauto.com${url.startsWith('/') ? url : `/${url}`}`
      
      // Extraire les informations depuis le contexte HTML autour de l'URL
      const contextStart = Math.max(0, match.index - 1000)
      const contextEnd = Math.min(html.length, match.index + 1000)
      const context = html.substring(contextStart, contextEnd)
      
      const listing = extractListingFromContext(context, fullUrl, query)
      if (listing && !listings.some(l => l.url === listing.url)) {
        listings.push(listing)
      }
    }
    
  } catch (error) {
    log.error('[TRANSAKAUTO] Erreur extraction HTML', { error })
  }
  
  return listings
}

/**
 * Extraire une annonce depuis le contexte HTML
 */
function extractListingFromContext(context: string, url: string, query: ScrapeQuery): ListingResponse | null {
  try {
    // Extraire le titre - chercher dans plusieurs patterns
    const titleMatch = context.match(/<h[1234][^>]*>([^<]{10,200})<\/h[1234]>/i) ||
                      context.match(/data-title=["']([^"']{10,200})["']/i) ||
                      context.match(/title=["']([^"']{10,200})["']/i) ||
                      context.match(/<a[^>]*title=["']([^"']{10,200})["']/i) ||
                      context.match(/class=["'][^"']*title[^"']*["'][^>]*>([^<]{10,200})</i) ||
                      context.match(/<span[^>]*class=["'][^"']*title[^"']*["'][^>]*>([^<]{10,200})<\/span>/i)
    
    let title = titleMatch ? cleanHtml(titleMatch[1]) : null
    
    // Si pas de titre trouvé, essayer de construire depuis la marque/modèle de la query
    if (!title || title.length < 5) {
      title = `${query.brand} ${query.model || ''}`.trim()
    }
    
    // Extraire le prix
    const priceMatch = context.match(/(\d{1,3}(?:\s?\d{3})*)\s*€/i) ||
                      context.match(/data-price=["']?(\d+)/i)
    const price = priceMatch ? parseFloat(priceMatch[1].replace(/\s/g, '')) : null
    
    // Extraire l'année
    const yearMatch = context.match(/(19|20)\d{2}/)
    const year = yearMatch ? parseInt(yearMatch[0]) : null
    
    // Extraire le kilométrage
    const mileageMatch = context.match(/(\d{1,3}(?:\s?\d{3})*)\s*km/i)
    const mileage = mileageMatch ? parseFloat(mileageMatch[1].replace(/\s/g, '')) : null
    
    // Extraire l'image
    const imageMatch = context.match(/<img[^>]+src=["']([^"']+)["']/i) ||
                      context.match(/data-src=["']([^"']+)["']/i)
    let imageUrl = imageMatch ? imageMatch[1] : null
    if (imageUrl && !imageUrl.startsWith('http')) {
      imageUrl = imageUrl.startsWith('//') ? `https:${imageUrl}` : `https://annonces.transakauto.com${imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`}`
    }
    
    // Extraire l'ID depuis l'URL
    const idMatch = url.match(/\/(\d+)/) || url.match(/id[=:](\d+)/i)
    const adId = idMatch ? idMatch[1] : `${Date.now()}_${Math.random()}`
    
    // Construire l'URL complète si nécessaire
    let fullUrl = url
    if (!fullUrl.startsWith('http')) {
      fullUrl = fullUrl.startsWith('/') 
        ? `https://annonces.transakauto.com${fullUrl}`
        : `https://annonces.transakauto.com/${fullUrl}`
    }
    
    if (!title || !fullUrl) {
      return null
    }
    
    return {
      id: `transakauto_${adId}`,
      title: title || 'Annonce TransakAuto',
      price_eur: price,
      year,
      mileage_km: mileage,
      url: fullUrl,
      imageUrl,
      source: 'TransakAuto',
      city: null,
      score_ia: 50,
      score_final: 50,
    }
  } catch (error) {
    log.warn('[TRANSAKAUTO] Erreur extraction contexte', { error })
    return null
  }
}

/**
 * Mapper une annonce TransakAuto vers le format unifié
 */
function mapTransakAutoAdToUnified(ad: any, query: ScrapeQuery): ListingResponse | null {
  try {
    const adId = ad.id || ad._id || ad.slug || `${Date.now()}_${Math.random()}`
    const url = ad.url || ad.link || ad.href || `https://transakauto.com/vehicule/${adId}`
    
    const title = ad.title || ad.name || ad.modele || `${query.brand} ${query.model || ''}`.trim()
    const price = ad.price || ad.prix || ad.priceEur || null
    const year = ad.year || ad.annee || ad.anneeMiseEnCirculation || null
    const mileage = ad.mileage || ad.kilometrage || ad.km || null
    
    let imageUrl = ad.image || ad.imageUrl || ad.photo || ad.thumbnail || null
    if (imageUrl && !imageUrl.startsWith('http')) {
      imageUrl = imageUrl.startsWith('//') ? `https:${imageUrl}` : `https://annonces.transakauto.com${imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`}`
    }
    
    // Construire l'URL complète si nécessaire
    let fullUrl = url
    if (!fullUrl.startsWith('http')) {
      fullUrl = fullUrl.startsWith('/') 
        ? `https://annonces.transakauto.com${fullUrl}`
        : `https://annonces.transakauto.com/${fullUrl}`
    }
    
    return {
      id: `transakauto_${adId}`,
      title: cleanHtml(title),
      price_eur: typeof price === 'number' ? price : (typeof price === 'string' ? parseFloat(price.replace(/[^\d]/g, '')) : null),
      year: typeof year === 'number' ? year : (typeof year === 'string' ? parseInt(year) : null),
      mileage_km: typeof mileage === 'number' ? mileage : (typeof mileage === 'string' ? parseFloat(mileage.replace(/[^\d]/g, '')) : null),
      url: fullUrl,
      imageUrl,
      source: 'TransakAuto',
      city: ad.city || ad.ville || ad.location || null,
      score_ia: 50,
      score_final: 50,
    }
  } catch (error) {
    log.warn('[TRANSAKAUTO] Erreur mapping annonce', { error })
    return null
  }
}

/**
 * Nettoyer le HTML
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

