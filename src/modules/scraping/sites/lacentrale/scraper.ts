// src/modules/scraping/sites/lacentrale/scraper.ts
// 🎯 SCRAPER LACENTRALE - ZENROWS ONLY - ULTRA PROPRE
// Même structure exacte que LeBonCoin

import { scrapeWithZenRows } from '@/lib/zenrows'
import { getZenRowsApiKey } from '@/src/core/config/env'
import type { ScrapeQuery, ListingResponse } from '@/src/core/types'
import type { ScrapingStrategy, ScrapePass } from '@/src/core/types'
import { createRouteLogger } from '@/lib/logger'

const log = createRouteLogger('lacentrale-scraper-zenrows')

/**
 * ✅ Génère un session_id valide pour ZenRows
 * Format: "lc-{timestamp}-{random}" (chaîne alphanumérique)
 */
function generateSessionId(): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 7)
  return `lc-${timestamp}-${random}`
}

/**
 * 🎯 SCRAPER LACENTRALE AVEC ZENROWS
 * Version identique à LeBonCoin
 */
export async function scrapeLaCentrale(
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
    log.error('[LACENTRALE] ZENROWS_API_KEY manquant dans .env.local')
    return {
      listings: [],
      strategy: 'zenrows',
      ms: Date.now() - startTime,
    }
  }

  const targetUrl = buildLaCentraleURL(query, pass)
  log.info(`[LACENTRALE] 🎯 Scraping: ${targetUrl}`, { pass })
  
  // 🔍 DEBUG : Log de l'URL générée
  console.log('[LACENTRALE DEBUG] URL générée:', targetUrl)

  try {
    // STRATÉGIE 1 : HTML BRUT SANS JS (comme LeBonCoin)
    // LaCentrale retourne les annonces dans le HTML brut, pas besoin de JS rendering
    log.info('[LACENTRALE] 📡 Tentative HTML brut (sans js_render)...', { pass })
    const listingsFromHTML = await extractFromHTMLBrut(targetUrl, abortSignal)
    
    if (listingsFromHTML.length > 0) {
      log.info(`[LACENTRALE] ✅ ${listingsFromHTML.length} annonces via HTML brut`, { pass })
      
      // 🔍 DEBUG : Log des premières annonces extraites
      console.log('[LACENTRALE DEBUG] Premières annonces extraites:', {
        count: listingsFromHTML.length,
        sample: listingsFromHTML.slice(0, 3).map(l => ({
          title: l.title,
          price: l.price_eur,
          url: l.url,
          year: l.year,
          mileage: l.mileage_km
        }))
      })
      
      return {
        listings: listingsFromHTML,
        strategy: 'zenrows',
        ms: Date.now() - startTime,
      }
    }

    log.warn('[LACENTRALE] ⚠️ HTML brut vide, essai avec JS rendering...', { pass })
    
    // STRATÉGIE 2 : Essayer d'extraire avec js_render (fallback si HTML brut échoue)
    const listings = await extractFromJSRender(targetUrl, abortSignal)
    
    if (listings.length > 0) {
      log.info(`[LACENTRALE] ✅ ${listings.length} annonces via JS rendering`, { pass })
      
      // 🔍 DEBUG : Log des premières annonces extraites
      console.log('[LACENTRALE DEBUG] Premières annonces extraites:', {
        count: listings.length,
        sample: listings.slice(0, 3).map(l => ({
          title: l.title,
          price: l.price_eur,
          url: l.url,
          year: l.year,
          mileage: l.mileage_km
        }))
      })
      
      return {
        listings,
        strategy: 'zenrows',
        ms: Date.now() - startTime,
      }
    }

    log.warn('[LACENTRALE] ❌ Aucune annonce trouvée', { pass })
    return {
      listings: [],
      strategy: 'zenrows',
      ms: Date.now() - startTime,
    }

  } catch (error) {
    log.error('[LACENTRALE] ❌ Erreur scraping:', {
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
 * STRATÉGIE 1 : Extraire depuis HTML brut (SANS js_render)
 * LaCentrale bloque avec js_render mais retourne les données dans le HTML brut
 */
async function extractFromHTMLBrut(
  url: string,
  abortSignal?: AbortSignal
): Promise<ListingResponse[]> {
  log.info('[LACENTRALE] 📡 Requête ZenRows HTML brut (sans js_render)...')
  
  // Paramètres ZenRows premium pour éviter le blocage 422
  const sessionId = generateSessionId()
  log.info(`[LACENTRALE] Session ID généré: ${sessionId}`)
  
  const zenrowsParams = {
    premium_proxy: 'true',
    proxy_country: 'fr',
    block_resources: 'image,media,font',
    // Ajouter session_id pour éviter la détection (format alphanumérique valide)
    session_id: sessionId,
  }
  
  const response = await scrapeWithZenRows(
    url,
    zenrowsParams,
    abortSignal,
    {
      maxAttempts: 2, // Retry si 422
      retryableStatuses: [422, 403, 429],
      backoffMs: 2000,
    }
  )

  if (!response || response.length < 100) {
    log.warn('[LACENTRALE] ❌ ZenRows HTML trop court ou vide')
    return []
  }

  const html = response
  log.info(`[LACENTRALE] 📊 HTML brut reçu: ${(html.length / 1024).toFixed(2)} KB`)

  // Chercher d'abord __INITIAL_STATE__ ou __NEXT_DATA__ dans le HTML brut (comme LeBonCoin)
  // LaCentrale peut utiliser __INITIAL_STATE__ ou d'autres structures JSON
  const initialStateMatch = html.match(/window\.__INITIAL_STATE__\s*=\s*({[\s\S]+?});/)
  if (initialStateMatch) {
    try {
      const jsonStr = initialStateMatch[1]
      const jsonData = JSON.parse(jsonStr)
      
      // 🔍 DEBUG : Log la structure JSON pour voir ce qui est disponible
      console.log('[LACENTRALE DEBUG] Structure __INITIAL_STATE__:', {
        keys: Object.keys(jsonData || {}),
        hasAds: !!jsonData?.ads,
        hasListings: !!jsonData?.listings,
        hasVehicles: !!jsonData?.vehicles,
        hasData: !!jsonData?.data,
      })
      
      const ads = 
        jsonData?.ads ||
        jsonData?.listings ||
        jsonData?.vehicles ||
        jsonData?.data?.ads ||
        jsonData?.data?.listings ||
        jsonData?.searchResults?.ads ||
        jsonData?.search?.results?.listings ||
        jsonData?.listing?.results ||
        []

      if (ads && Array.isArray(ads) && ads.length > 0) {
        log.info(`[LACENTRALE] ✅ ${ads.length} annonces dans __INITIAL_STATE__ (HTML brut)`)
        return ads.map(mapLaCentraleAdToUnified)
      } else {
        console.log('[LACENTRALE DEBUG] Aucune annonce trouvée dans __INITIAL_STATE__')
      }
    } catch (error) {
      log.warn('[LACENTRALE] Erreur parsing __INITIAL_STATE__:', {
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  // Chercher __NEXT_DATA__ (si LaCentrale utilise Next.js)
  const nextDataMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/)
  if (nextDataMatch) {
    try {
      const jsonData = JSON.parse(nextDataMatch[1])
      
      // 🔍 DEBUG : Log la structure JSON pour voir ce qui est disponible
      console.log('[LACENTRALE DEBUG] Structure __NEXT_DATA__:', {
        hasPageProps: !!jsonData?.props?.pageProps,
        pagePropsKeys: Object.keys(jsonData?.props?.pageProps || {}),
      })
      
      const ads = 
        jsonData?.props?.pageProps?.ads ||
        jsonData?.props?.pageProps?.listings ||
        jsonData?.props?.pageProps?.data?.ads ||
        jsonData?.props?.pageProps?.data?.listings ||
        jsonData?.props?.pageProps?.searchResults?.ads ||
        jsonData?.props?.pageProps?.search?.results?.listings ||
        jsonData?.props?.initialState?.ads ||
        []

      if (ads && Array.isArray(ads) && ads.length > 0) {
        log.info(`[LACENTRALE] ✅ ${ads.length} annonces dans __NEXT_DATA__ (HTML brut)`)
        return ads.map(mapLaCentraleAdToUnified)
      } else {
        console.log('[LACENTRALE DEBUG] Aucune annonce trouvée dans __NEXT_DATA__')
      }
    } catch (error) {
      log.warn('[LACENTRALE] Erreur parsing __NEXT_DATA__:', {
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  // Si pas de JSON, parser les attributs HTML
  return extractFromHTMLAttributes(html)
}

/**
 * STRATÉGIE 2 : Extraire depuis HTML avec js_render (fallback si HTML brut échoue)
 */
async function extractFromJSRender(
  url: string,
  abortSignal?: AbortSignal
): Promise<ListingResponse[]> {
  log.info('[LACENTRALE] 📡 Requête ZenRows avec JS rendering (fallback)...')
  
  // Paramètres ZenRows premium avec JS rendering pour fallback
  const sessionId = generateSessionId()
  log.info(`[LACENTRALE] Session ID généré (fallback JS): ${sessionId}`)
  
  const zenrowsParams = {
    js_render: 'true',
    premium_proxy: 'true',
    proxy_country: 'fr',
    wait: '3000', // Réduire à 3s pour plus de vitesse
    block_resources: 'image,media,font',
    // Ajouter session_id pour éviter la détection (format alphanumérique valide)
    session_id: sessionId,
  }
  
  const response = await scrapeWithZenRows(
    url,
    zenrowsParams,
    abortSignal,
    {
      maxAttempts: 2, // Retry si 422
      retryableStatuses: [422, 403, 429],
      backoffMs: 2000,
    }
  )

  if (!response || response.length < 100) {
    log.warn('[LACENTRALE] ❌ ZenRows HTML trop court ou vide')
    return []
  }

  const html = response
  log.info(`[LACENTRALE] 📊 HTML reçu: ${(html.length / 1024).toFixed(2)} KB`)

  // Chercher __INITIAL_STATE__ dans le HTML avec JS rendering
  const initialStateMatch = html.match(/window\.__INITIAL_STATE__\s*=\s*({[\s\S]+?});/)
  if (initialStateMatch) {
    try {
      const jsonStr = initialStateMatch[1]
      const jsonData = JSON.parse(jsonStr)
      
      const ads = 
        jsonData?.ads ||
        jsonData?.listings ||
        jsonData?.vehicles ||
        jsonData?.data?.ads ||
        jsonData?.data?.listings ||
        []

      if (ads && Array.isArray(ads) && ads.length > 0) {
        log.info(`[LACENTRALE] ✅ ${ads.length} annonces dans __INITIAL_STATE__ (JS render)`)
        return ads.map(mapLaCentraleAdToUnified)
      }
    } catch (error) {
      log.warn('[LACENTRALE] Erreur parsing __INITIAL_STATE__ (JS render)')
    }
  }

  // Chercher __NEXT_DATA__
  const nextDataMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/)
  if (!nextDataMatch) {
    log.warn('[LACENTRALE] ⚠️ __INITIAL_STATE__ et __NEXT_DATA__ non trouvés dans le HTML')
    return []
  }

  try {
    const jsonData = JSON.parse(nextDataMatch[1])
    
    const ads = 
      jsonData?.props?.pageProps?.ads ||
      jsonData?.props?.pageProps?.listings ||
      jsonData?.props?.pageProps?.data?.ads ||
      jsonData?.props?.pageProps?.data?.listings ||
      jsonData?.props?.initialState?.ads ||
      []

    if (!ads || !Array.isArray(ads)) {
      log.warn('[LACENTRALE] ⚠️ Structure JSON inattendue')
      return []
    }

    log.info(`[LACENTRALE] ✅ ${ads.length} annonces dans __NEXT_DATA__`)

    return ads.map(mapLaCentraleAdToUnified)

  } catch (error) {
    log.error('[LACENTRALE] ❌ Erreur parsing JSON:', {
      error: error instanceof Error ? error.message : String(error),
    })
    return []
  }
}

/**
 * Parser les attributs HTML depuis le HTML brut
 */
function extractFromHTMLAttributes(html: string): ListingResponse[] {
  const listings: ListingResponse[] = []
  
  // Chercher les containers d'annonces LaCentrale
  // LaCentrale utilise différents formats de conteneurs
  const containerRegex = /<a[^>]*href=["']([^"']*(?:\/auto-occasion-annonce[^"']*|\/annonce[^"']*))["'][^>]*>([\s\S]*?)<\/a>/gi
  
  let match
  while ((match = containerRegex.exec(html)) !== null && listings.length < 200) {
    const urlPath = match[1]
    const content = match[2]
    
    // Extraire prix
    const priceMatch = content.match(/(\d{1,3}(?:\s?\d{3})*)\s*€/i) || 
                       content.match(/data-price=["']?(\d+)/i)
    const price = priceMatch ? parseFloat(priceMatch[1].replace(/\s/g, '')) : null
    
    // Extraire titre
    const titleMatch = content.match(/<h[23][^>]*>([\s\S]*?)<\/h[23]>/i) ||
                       content.match(/<a[^>]*title=["']([^"']+)["']/i) ||
                       content.match(/data-title=["']([^"']+)["']/i)
    const title = titleMatch ? cleanHtml(titleMatch[1]).replace(/\s+/g, ' ').trim() : ''
    
    // Extraire image
    const imageMatch = content.match(/<img[^>]+src=["']([^"']+)["']/i) ||
                       content.match(/<img[^>]+data-src=["']([^"']+)["']/i)
    let imageUrl = imageMatch ? imageMatch[1] : null
    if (imageUrl && !imageUrl.startsWith('http')) {
      imageUrl = imageUrl.startsWith('//') ? `https:${imageUrl}` : `https://www.lacentrale.fr${imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`}`
    }
    
    // Extraire localisation
    const locationMatch = content.match(/<span[^>]*class=["'][^"']*city[^"']*["'][^>]*>([\s\S]*?)<\/span>/i) ||
                          content.match(/data-city=["']([^"']+)["']/i)
    const city = locationMatch ? cleanHtml(locationMatch[1]).trim() : null
    
    if (title || urlPath) {
      const fullUrl = urlPath.startsWith('http') 
        ? urlPath 
        : `https://www.lacentrale.fr${urlPath.startsWith('/') ? urlPath : `/${urlPath}`}`
      
      // Nettoyer l'URL
      const cleanUrl = fullUrl.split('#')[0].split('?')[0]
      
      // Extraire l'ID depuis l'URL
      const adIdMatch = cleanUrl.match(/\/auto-occasion-annonce-([^\/\.\?]+)/) ||
                        cleanUrl.match(/\/annonce\/([^\/\?]+)/) ||
                        cleanUrl.match(/\/annonce-([^\/\.\?]+)\.html/)
      const adId = adIdMatch ? adIdMatch[1] : `${Date.now()}_${listings.length}`
      
      listings.push({
        id: `lacentrale_${adId}`,
        title: title || 'Annonce LaCentrale',
        price_eur: price,
        year: null,
        mileage_km: null,
        url: cleanUrl,
        imageUrl,
        source: 'LaCentrale',
        city,
        score_ia: 50,
        score_final: 50,
      })
    }
  }

  log.info(`[LACENTRALE] 📊 ${listings.length} annonces extraites depuis attributs HTML`)
  return listings
}

/**
 * Nettoyer le HTML
 */
function cleanHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Construction URL de recherche LaCentrale
 */
function buildLaCentraleURL(query: ScrapeQuery, pass: ScrapePass): string {
  const base = 'https://www.lacentrale.fr/listing'
  const searchParams = new URLSearchParams()

  // Construire le filtre makesModelsCommercialNames - LaCentrale utilise le format "BRAND:MODEL"
  // Format correct : RENAULT:CLIO (avec deux-points, pas tiret)
  const brand = (query.brand || '').trim().toUpperCase().replace(/\s+/g, '')
  const model = (query.model || '').trim().toUpperCase().replace(/\s+/g, '')
  
  if (brand) {
    if (model) {
      // Format avec deux-points pour marque:modèle
      const makeModel = `${brand}:${model}`
      searchParams.set('makesModelsCommercialNames', makeModel)
    } else {
      // Seulement la marque
      searchParams.set('makesModelsCommercialNames', brand)
    }
  }
  
  // Prix selon la passe
  if (pass === 'strict') {
    if (query.maxPrice) {
      searchParams.set('priceMax', String(query.maxPrice))
    }
    if (query.minPrice) {
      searchParams.set('priceMin', String(query.minPrice))
    }
  } else if (pass === 'relaxed') {
    const relaxedMax = Math.floor(query.maxPrice * 1.1)
    searchParams.set('priceMax', String(relaxedMax))
  } else {
    // opportunity
    const opportunityMax = Math.floor(query.maxPrice * 1.2)
    searchParams.set('priceMax', String(opportunityMax))
  }
  
  if (query.maxMileage) {
    searchParams.set('mileageMax', String(query.maxMileage))
  }
  
  if (query.minYear) {
    searchParams.set('yearMin', String(query.minYear))
  }

  return `${base}?${searchParams.toString()}`
}

/**
 * Mapper annonce LaCentrale vers format unifié
 */
function mapLaCentraleAdToUnified(ad: any): ListingResponse {
  // Extraire le titre
  const title = ad.title || ad.name || ad.label || ad.model || 'Annonce LaCentrale'
  
  // Extraire l'ID
  const adId = ad.id || ad.adId || ad.listId || ad.externalId || `${Date.now()}`
  
  // Construire l'URL - LaCentrale peut avoir différents formats
  let urlPath = ad.url || ad.link || ad.href || ad.path || `/auto-occasion-annonce-${adId}.html`
  
  // Nettoyer l'URL
  urlPath = String(urlPath).split('#')[0].split('?')[0]
  
  // Construire l'URL complète
  const url = urlPath.startsWith('http') 
    ? urlPath 
    : `https://www.lacentrale.fr${urlPath.startsWith('/') ? urlPath : `/${urlPath}`}`
  
  // Extraire le prix
  let price: number | null = null
  if (typeof ad.price === 'number') {
    price = ad.price
  } else if (typeof ad.price === 'string') {
    price = parseFloat(ad.price.replace(/\s/g, ''))
  } else if (ad.priceEur) {
    price = typeof ad.priceEur === 'number' ? ad.priceEur : parseFloat(String(ad.priceEur))
  }
  
  // Extraire l'année
  let year: number | null = null
  if (typeof ad.year === 'number') {
    year = ad.year
  } else if (typeof ad.year === 'string') {
    year = parseInt(ad.year)
  } else if (ad.registrationYear) {
    year = typeof ad.registrationYear === 'number' ? ad.registrationYear : parseInt(String(ad.registrationYear))
  }
  
  // Extraire le kilométrage
  let mileage: number | null = null
  if (typeof ad.mileage === 'number') {
    mileage = ad.mileage
  } else if (typeof ad.mileage === 'string') {
    mileage = parseFloat(ad.mileage.replace(/\s/g, ''))
  } else if (ad.mileageKm) {
    mileage = typeof ad.mileageKm === 'number' ? ad.mileageKm : parseFloat(String(ad.mileageKm))
  }
  
  // Extraire les images - chercher dans toutes les propriétés possibles
  let imageUrl: string | null = null
  
  const imageSources = [
    ad.imageUrl,
    ad.image,
    ad.photo,
    ad.thumbnail,
    ad.img,
    ad.picture,
    ad.photoUrl,
    ad.thumbnailUrl,
    ad.media?.url,
    ad.media?.src,
    ad.pictures?.[0],
    ad.photos?.[0],
    ad.images?.[0],
    ad.thumbnails?.[0],
    ad.media?.images?.[0],
  ]
  
  for (const src of imageSources) {
    if (!src) continue
    
    if (typeof src === 'string') {
      imageUrl = src
      break
    } else if (typeof src === 'object' && src !== null) {
      imageUrl = src.url || src.src || src.href || src.path || null
      if (imageUrl) break
    } else if (Array.isArray(src) && src.length > 0) {
      const firstImg = src[0]
      if (typeof firstImg === 'string') {
        imageUrl = firstImg
        break
      } else if (typeof firstImg === 'object') {
        imageUrl = firstImg.url || firstImg.src || firstImg.href || null
        if (imageUrl) break
      }
    }
  }
  
  // Normaliser l'URL de l'image
  if (imageUrl) {
    imageUrl = imageUrl.split('?')[0].split('#')[0]
    if (!imageUrl.startsWith('http')) {
      if (imageUrl.startsWith('//')) {
        imageUrl = `https:${imageUrl}`
      } else if (imageUrl.startsWith('/')) {
        imageUrl = `https://www.lacentrale.fr${imageUrl}`
      } else {
        imageUrl = `https://www.lacentrale.fr/${imageUrl}`
      }
    }
  }
  
  // Extraire la localisation
  const city = ad.city || ad.location || ad.locationCity || ad.cityLabel || null

  return {
    id: `lacentrale_${adId}`,
    title: String(title),
    price_eur: price,
    year,
    mileage_km: mileage,
    url,
    imageUrl,
    source: 'LaCentrale',
    city,
    score_ia: 50,
    score_final: 50,
  }
}
