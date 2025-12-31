// src/modules/scraping/sites/lacentrale/scraper.ts
// 🎯 SCRAPER LACENTRALE - ZENROWS ONLY - ULTRA PROPRE
// Version améliorée avec multi-stratégies comme LeBonCoin

import { scrapeWithZenRows } from '@/lib/zenrows'
import { getZenRowsApiKey } from '@/src/core/config/env'
import type { ScrapeQuery, ListingResponse } from '@/src/core/types'
import type { ScrapingStrategy, ScrapePass } from '@/src/core/types'
import { createRouteLogger } from '@/lib/logger'

const log = createRouteLogger('lacentrale-scraper-zenrows')

/**
 * 🎯 SCRAPER LACENTRALE AVEC ZENROWS
 * Version améliorée avec multi-stratégies de fallback
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

  try {
    // STRATÉGIE 0 : Essayer HTML brut SANS js_render d'abord (comme LeBonCoin)
    // LaCentrale peut avoir les données dans le HTML brut, c'est beaucoup plus rapide
    log.info('[LACENTRALE] 📡 Tentative HTML brut SANS js_render (comme LeBonCoin)...', { pass })
    let listingsFromHTMLBrutSansJS = await extractFromHTMLBrutSansJS(targetUrl, abortSignal)
    
    // Filtrer les résultats pour s'assurer qu'ils correspondent à la recherche
    const beforeFilter = listingsFromHTMLBrutSansJS.length
    listingsFromHTMLBrutSansJS = filterListingsByQuery(listingsFromHTMLBrutSansJS, query, pass)
    log.info(`[LACENTRALE] 📊 Filtrage HTML brut sans JS: ${beforeFilter} → ${listingsFromHTMLBrutSansJS.length} annonces`, { pass })
    
    if (listingsFromHTMLBrutSansJS.length > 0) {
      log.info(`[LACENTRALE] ✅ ${listingsFromHTMLBrutSansJS.length} annonces via HTML brut sans JS (après filtrage)`, { pass })
      return {
        listings: listingsFromHTMLBrutSansJS,
        strategy: 'zenrows',
        ms: Date.now() - startTime,
      }
    }

    log.warn('[LACENTRALE] ⚠️ HTML brut sans JS vide, essai avec autoparse...', { pass })
    
    // STRATÉGIE 1 : Essayer avec autoparse de ZenRows pour extraire JSON directement
    let listingsFromAutoparse = await extractFromAutoparse(targetUrl, abortSignal)
    
    // Filtrer les résultats
    const beforeFilterAutoparse = listingsFromAutoparse.length
    listingsFromAutoparse = filterListingsByQuery(listingsFromAutoparse, query, pass)
    log.info(`[LACENTRALE] 📊 Filtrage autoparse: ${beforeFilterAutoparse} → ${listingsFromAutoparse.length} annonces`, { pass })
    
    if (listingsFromAutoparse.length > 0) {
      log.info(`[LACENTRALE] ✅ ${listingsFromAutoparse.length} annonces via autoparse (après filtrage)`, { pass })
      return {
        listings: listingsFromAutoparse,
        strategy: 'zenrows',
        ms: Date.now() - startTime,
      }
    }

    log.warn('[LACENTRALE] ⚠️ Autoparse vide, essai HTML brut avec JSON embedded...', { pass })
    
    // STRATÉGIE 2 : Essayer HTML brut avec JSON embedded (si disponible)
    let listingsFromHTML = await extractFromHTMLBrut(targetUrl, abortSignal)
    
    // Filtrer les résultats
    listingsFromHTML = filterListingsByQuery(listingsFromHTML, query, pass)
    
    if (listingsFromHTML.length > 0) {
      log.info(`[LACENTRALE] ✅ ${listingsFromHTML.length} annonces via HTML brut (après filtrage)`, { pass })
      return {
        listings: listingsFromHTML,
        strategy: 'zenrows',
        ms: Date.now() - startTime,
      }
    }

    log.warn('[LACENTRALE] ⚠️ HTML brut vide, essai avec JS rendering...', { pass })
    
    // STRATÉGIE 3 : Essayer avec JS rendering pour obtenir le JSON complet
    let listings = await extractFromJSRender(targetUrl, abortSignal)
    
    // Filtrer les résultats
    listings = filterListingsByQuery(listings, query, pass)
    
    if (listings.length > 0) {
      log.info(`[LACENTRALE] ✅ ${listings.length} annonces via JS rendering (après filtrage)`, { pass })
      return {
        listings,
        strategy: 'zenrows',
        ms: Date.now() - startTime,
      }
    }

    log.warn('[LACENTRALE] ⚠️ JS rendering vide, essai avec parsing HTML...', { pass })
    
    // STRATÉGIE 4 : Fallback vers parsing HTML classique
    let listingsFromHTMLParsing = await extractFromHTMLParsing(targetUrl, abortSignal)
    
    // Filtrer les résultats
    listingsFromHTMLParsing = filterListingsByQuery(listingsFromHTMLParsing, query, pass)
    
    if (listingsFromHTMLParsing.length > 0) {
      log.info(`[LACENTRALE] ✅ ${listingsFromHTMLParsing.length} annonces via parsing HTML (après filtrage)`, { pass })
      return {
        listings: listingsFromHTMLParsing,
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
 * STRATÉGIE 0 : Utiliser autoparse de ZenRows pour extraire JSON directement
 * ZenRows peut automatiquement parser et extraire les données structurées
 */
async function extractFromAutoparse(
  url: string,
  abortSignal?: AbortSignal
): Promise<ListingResponse[]> {
  log.info('[LACENTRALE] 📡 Requête ZenRows avec autoparse...')
  
  try {
    // Utiliser ZenRows avec autoparse pour obtenir directement du JSON
    const apiKey = getZenRowsApiKey()
    if (!apiKey) {
      log.warn('[LACENTRALE] ZENROWS_API_KEY manquant')
      return []
    }

    const zenrowsUrl = new URL('https://api.zenrows.com/v1')
    zenrowsUrl.searchParams.set('apikey', apiKey)
    zenrowsUrl.searchParams.set('url', url)
    zenrowsUrl.searchParams.set('autoparse', 'true')
    zenrowsUrl.searchParams.set('premium_proxy', 'true')
    zenrowsUrl.searchParams.set('proxy_country', 'fr') // Recommandé par ZenRows pour éviter restrictions géographiques
    zenrowsUrl.searchParams.set('js_render', 'true') // Nécessaire pour RESP001
    zenrowsUrl.searchParams.set('wait', '3000') // Réduire le temps d'attente pour JS rendering (3s au lieu de 5s par défaut)
    // Ne pas utiliser mode: auto avec autoparse, cela peut causer des conflits

    const response = await fetch(zenrowsUrl.toString(), {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      signal: abortSignal,
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Erreur inconnue')
      log.warn('[LACENTRALE] Erreur autoparse ZenRows', { 
        status: response.status,
        error: errorText.substring(0, 500) 
      })
      return []
    }

    let jsonData: any
    try {
      jsonData = await response.json()
    } catch (error) {
      log.warn('[LACENTRALE] Impossible de parser la réponse JSON', {
        error: error instanceof Error ? error.message : String(error),
      })
      return []
    }
    
    // Le JSON peut être un tableau ou un objet
    const dataArray = Array.isArray(jsonData) ? jsonData : [jsonData]
    
    log.info(`[LACENTRALE] 📊 JSON autoparse reçu: ${dataArray.length} objets à analyser`)
    
    const listings: ListingResponse[] = []
    const seenUrls = new Set<string>() // Éviter les doublons
    
    // Fonction récursive pour chercher des annonces dans des structures imbriquées
    const findListingsInObject = (obj: any, depth = 0): void => {
      if (depth > 5) return // Limiter la profondeur de recherche
      if (!obj || typeof obj !== 'object') return
      
      // Pattern 1: Si l'objet lui-même ressemble à une annonce
      if ((obj.href || obj.url || obj.lien || obj.link) && (obj.title || obj.titre || obj.label || obj.name)) {
        const listing = extractListingFromAutoparseItem(obj)
        if (listing && !seenUrls.has(listing.url)) {
          seenUrls.add(listing.url)
          listings.push(listing)
        }
      }
      
      // Pattern 2: Chercher dans des propriétés connues contenant des tableaux
      const arrayProps = ['ads', 'listings', 'vehicles', 'results', 'items', 'data', 'vehiclesList', 'classifieds', 'products', 'offers']
      for (const prop of arrayProps) {
        if (Array.isArray(obj[prop])) {
          for (const item of obj[prop]) {
            if (item && typeof item === 'object') {
              findListingsInObject(item, depth + 1)
            }
          }
        }
      }
      
      // Pattern 3: Chercher récursivement dans toutes les propriétés
      for (const key in obj) {
        if (obj.hasOwnProperty(key) && typeof obj[key] === 'object' && obj[key] !== null) {
          findListingsInObject(obj[key], depth + 1)
        }
      }
    }
    
    // Chercher les objets qui ressemblent à des annonces de véhicules
    for (const item of dataArray) {
      findListingsInObject(item)
    }

    log.info(`[LACENTRALE] 📊 ${listings.length} annonces extraites via autoparse`)
    return listings // Retourner toutes les annonces trouvées (pas de limite)
  } catch (error) {
    log.warn('[LACENTRALE] ⚠️ Erreur autoparse, passage à stratégie suivante', {
      error: error instanceof Error ? error.message : String(error),
    })
    return []
  }
}

/**
 * Extraire une annonce depuis un objet JSON d'autoparse
 */
function extractListingFromAutoparseItem(item: any): ListingResponse | null {
  try {
    // Chercher l'URL
    const urlPath = item.href || item.url || item.lien || item.link || item.path
    if (!urlPath) return null
    
    // Filtrer les URLs qui ne sont pas des annonces de véhicules
    // Accepter les URLs avec /listing, /annonce, /occasion, ou contenant un ID d'annonce
    const urlStr = String(urlPath).toLowerCase()
    const isListingUrl = urlStr.includes('/listing') || 
                         urlStr.includes('/annonce') || 
                         urlStr.includes('/occasion') ||
                         urlStr.includes('/voiture') ||
                         (urlStr.includes('lacentrale') && (item.price || item.priceEur || item.title))
    
    if (!isListingUrl) return null
    
    const fullUrl = urlPath.startsWith('http') 
      ? urlPath 
      : `https://www.lacentrale.fr${urlPath.startsWith('/') ? urlPath : `/${urlPath}`}`
    
    // Extraire le titre
    const title = item.title || item.titre || item.label || item.name || 'Annonce LaCentrale'
    
    // Extraire le prix (peut être dans différentes propriétés)
    let price: number | null = null
    if (typeof item.price === 'number') {
      price = item.price
    } else if (typeof item.price === 'string') {
      price = parseFloat(item.price.replace(/\s/g, ''))
    } else if (item.priceEur) {
      price = typeof item.priceEur === 'number' ? item.priceEur : parseFloat(String(item.priceEur))
    }
    
    // Extraire l'année
    let year: number | null = null
    if (typeof item.year === 'number') {
      year = item.year
    } else if (typeof item.year === 'string') {
      year = parseInt(item.year)
    }
    
    // Extraire le kilométrage
    let mileage: number | null = null
    if (typeof item.mileage === 'number') {
      mileage = item.mileage
    } else if (typeof item.mileage === 'string') {
      mileage = parseFloat(item.mileage.replace(/\s/g, ''))
    } else if (item.mileageKm) {
      mileage = typeof item.mileageKm === 'number' ? item.mileageKm : parseFloat(String(item.mileageKm))
    }
    
    // Extraire la ville
    const city = item.city || item.ville || item.location || null
    
    // Extraire l'image
    let imageUrl: string | null = null
    if (item.imageUrl) {
      imageUrl = Array.isArray(item.imageUrl) ? item.imageUrl[0] : item.imageUrl
    } else if (item.image) {
      imageUrl = Array.isArray(item.image) ? item.image[0] : item.image
    }
    if (imageUrl && !imageUrl.startsWith('http')) {
      imageUrl = `https://www.lacentrale.fr${imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`}`
    }
    
    // Extraire l'ID depuis l'URL - LaCentrale utilise plusieurs formats :
    // - /auto-occasion-annonce-XXXXX.html -> XXXXX
    // - /annonce/XXXXX -> XXXXX
    // - /annonce-XXXXX.html -> XXXXX
    const adIdMatch = 
      fullUrl.match(/\/auto-occasion-annonce-([^\/\.\?]+)/) ||
      fullUrl.match(/\/annonce\/([^\/\?]+)/) ||
      fullUrl.match(/\/annonce-([^\/\.\?]+)\.html/) ||
      fullUrl.match(/listing[^\/]*\/([^\/\?]+)/)
    const adId = adIdMatch ? adIdMatch[1] : `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    return {
      id: `lacentrale_${adId}`,
      title: String(title),
      price_eur: price,
      year,
      mileage_km: mileage,
      url: fullUrl,
      imageUrl,
      source: 'LaCentrale',
      city,
      score_ia: 50,
      score_final: 50,
    }
  } catch (error) {
    log.warn('[LACENTRALE] Erreur extraction item autoparse', {
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  }
}

/**
 * STRATÉGIE 0 : Extraire depuis HTML brut SANS js_render (comme LeBonCoin)
 * Teste d'abord sans JS rendering car c'est beaucoup plus rapide et peut fonctionner
 */
async function extractFromHTMLBrutSansJS(
  url: string,
  abortSignal?: AbortSignal
): Promise<ListingResponse[]> {
  log.info('[LACENTRALE] 📡 Requête ZenRows HTML brut (sans js_render)...')
  
  try {
    const response = await scrapeWithZenRows(
      url,
      {
        // PAS de js_render - comme LeBonCoin, on essaie d'abord sans JS
        premium_proxy: 'true',
        proxy_country: 'fr',
        block_resources: 'image,media,font',
      },
      abortSignal
    )

    if (!response || response.length < 100) {
      log.warn('[LACENTRALE] ❌ HTML brut sans JS trop court ou vide')
      return []
    }

    const html = response
    log.info(`[LACENTRALE] 📊 HTML brut reçu: ${(html.length / 1024).toFixed(2)} KB`)

    // Chercher JSON embedded dans le HTML brut (comme LeBonCoin avec __NEXT_DATA__)
    // 1. __INITIAL_STATE__
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
          []

        if (ads && Array.isArray(ads) && ads.length > 0) {
          log.info(`[LACENTRALE] ✅ ${ads.length} annonces dans __INITIAL_STATE__ (HTML brut)`)
          return ads.map(mapLaCentraleAdToUnified)
        }
      } catch (error) {
        log.warn('[LACENTRALE] Erreur parsing __INITIAL_STATE__ (HTML brut)', {
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    // 2. __NEXT_DATA__
    const nextDataMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/)
    if (nextDataMatch) {
      try {
        const jsonData = JSON.parse(nextDataMatch[1])
        
        const ads = 
          jsonData?.props?.pageProps?.ads ||
          jsonData?.props?.pageProps?.listings ||
          jsonData?.props?.pageProps?.data?.ads ||
          jsonData?.props?.initialState?.ads ||
          []

        if (ads && Array.isArray(ads) && ads.length > 0) {
          log.info(`[LACENTRALE] ✅ ${ads.length} annonces dans __NEXT_DATA__ (HTML brut)`)
          return ads.map(mapLaCentraleAdToUnified)
        }
      } catch (error) {
        log.warn('[LACENTRALE] Erreur parsing __NEXT_DATA__ (HTML brut)', {
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    // 3. Si pas de JSON, essayer parsing HTML classique
    return extractFromHTMLAttributes(html)
  } catch (error) {
    log.warn('[LACENTRALE] ⚠️ Erreur HTML brut sans JS, passage à stratégie suivante', {
      error: error instanceof Error ? error.message : String(error),
    })
    return []
  }
}

/**
 * STRATÉGIE 1 : Extraire depuis HTML brut avec JSON embedded
 * LaCentrale peut avoir des données dans __INITIAL_STATE__ ou autres structures JSON
 */
async function extractFromHTMLBrut(
  url: string,
  abortSignal?: AbortSignal
): Promise<ListingResponse[]> {
  log.info('[LACENTRALE] 📡 Requête ZenRows HTML brut...')
  
  try {
    const response = await scrapeWithZenRows(
      url,
      {
        premium_proxy: 'true',
        proxy_country: 'fr', // Recommandé par ZenRows pour éviter restrictions géographiques
        js_render: 'true', // Nécessaire pour éviter RESP001
        wait: '3000', // Réduire le temps d'attente pour JS rendering (3s au lieu de 5s par défaut)
        block_resources: 'image,media,font',
      },
      abortSignal
    )

    if (!response || response.length < 100) {
      log.warn('[LACENTRALE] ❌ ZenRows HTML trop court ou vide')
      return []
    }

    const html = response
    log.info(`[LACENTRALE] 📊 HTML brut reçu: ${(html.length / 1024).toFixed(2)} KB`)

  // Chercher différents types de JSON embedded
  // 1. __INITIAL_STATE__
  const initialStateMatch = html.match(/window\.__INITIAL_STATE__\s*=\s*({[\s\S]+?});/)
  if (initialStateMatch) {
    try {
      const jsonStr = initialStateMatch[1]
      const jsonData = JSON.parse(jsonStr)
      
      // Chercher les annonces dans différentes structures possibles
      const ads = 
        jsonData?.ads ||
        jsonData?.listings ||
        jsonData?.vehicles ||
        jsonData?.data?.ads ||
        jsonData?.data?.listings ||
        jsonData?.searchResults?.ads ||
        []

      if (ads && Array.isArray(ads) && ads.length > 0) {
        log.info(`[LACENTRALE] ✅ ${ads.length} annonces dans __INITIAL_STATE__`)
        return ads.map(mapLaCentraleAdToUnified)
      }
    } catch (error) {
      log.warn('[LACENTRALE] Erreur parsing __INITIAL_STATE__:', {
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  // 2. __NEXT_DATA__ (si LaCentrale utilise Next.js)
  const nextDataMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/)
  if (nextDataMatch) {
    try {
      const jsonData = JSON.parse(nextDataMatch[1])
      
      const ads = 
        jsonData?.props?.pageProps?.ads ||
        jsonData?.props?.pageProps?.listings ||
        jsonData?.props?.pageProps?.data?.ads ||
        jsonData?.props?.initialState?.ads ||
        []

      if (ads && Array.isArray(ads) && ads.length > 0) {
        log.info(`[LACENTRALE] ✅ ${ads.length} annonces dans __NEXT_DATA__`)
        return ads.map(mapLaCentraleAdToUnified)
      }
    } catch (error) {
      log.warn('[LACENTRALE] Erreur parsing __NEXT_DATA__:', {
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  // 3. JSON-LD (structured data)
  const jsonLdMatches = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/g) || []
  for (const jsonLdMatch of jsonLdMatches) {
    try {
      const jsonStr = jsonLdMatch.match(/<script[^>]*>([\s\S]*?)<\/script>/)?.[1]
      if (jsonStr) {
        const jsonData = JSON.parse(jsonStr)
        if (jsonData['@type'] === 'Product' || jsonData['@type'] === 'Vehicle') {
          const listing = mapJsonLdToUnified(jsonData)
          if (listing) {
            log.info('[LACENTRALE] ✅ Annonce trouvée dans JSON-LD')
            return [listing]
          }
        }
      }
    } catch (error) {
      continue
    }
  }

    // Si pas de JSON trouvé, essayer parsing HTML direct
    return extractFromHTMLAttributes(html)
  } catch (error: any) {
    // Si erreur RESP001 ou 422, LaCentrale bloque - essayer sans proxy_country
    if (error?.message?.includes('422') || error?.message?.includes('RESP001')) {
      log.warn('[LACENTRALE] ⚠️ Blocage détecté (RESP001), essai sans proxy_country...')
      try {
        const responseRetry = await scrapeWithZenRows(
          url,
          {
            premium_proxy: 'true',
            // Pas de proxy_country pour éviter le blocage
            block_resources: 'image,media,font',
          },
          abortSignal
        )
        
        if (responseRetry && responseRetry.length >= 100) {
          log.info(`[LACENTRALE] 📊 HTML brut reçu (retry): ${(responseRetry.length / 1024).toFixed(2)} KB`)
          // Essayer d'extraire depuis le HTML
          return extractFromHTMLAttributes(responseRetry)
        }
      } catch (retryError) {
        log.warn('[LACENTRALE] ⚠️ Retry échoué aussi')
      }
    }
    // Si erreur, retourner vide pour passer à la stratégie suivante
    log.warn('[LACENTRALE] ⚠️ Erreur HTML brut, passage à stratégie suivante')
    return []
  }
}

/**
 * STRATÉGIE 2 : Extraire depuis JS rendering (fallback)
 */
async function extractFromJSRender(
  url: string,
  abortSignal?: AbortSignal
): Promise<ListingResponse[]> {
  log.info('[LACENTRALE] 📡 Requête ZenRows avec JS rendering...')
  
  try {
    // Utiliser proxy_country: 'fr' comme recommandé par ZenRows
    const response = await scrapeWithZenRows(
      url,
      {
        js_render: 'true',
        premium_proxy: 'true',
        proxy_country: 'fr', // Recommandé par ZenRows pour éviter restrictions géographiques
        wait: '3000', // Réduire le temps d'attente pour JS rendering (3s au lieu de 5s par défaut)
        block_resources: 'image,media,font',
      },
      abortSignal
    )

    if (!response || response.length < 100) {
      log.warn('[LACENTRALE] ❌ ZenRows HTML trop court ou vide')
      return []
    }

    const html = response
    log.info(`[LACENTRALE] 📊 HTML reçu: ${(html.length / 1024).toFixed(2)} KB`)

    // Essayer les mêmes extractions JSON que dans HTML brut
    // (car le JS rendering peut avoir généré plus de données)
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
          []

        if (ads && Array.isArray(ads) && ads.length > 0) {
          log.info(`[LACENTRALE] ✅ ${ads.length} annonces dans __INITIAL_STATE__ (JS render)`)
          return ads.map(mapLaCentraleAdToUnified)
        }
      } catch (error) {
        log.warn('[LACENTRALE] Erreur parsing __INITIAL_STATE__ (JS render)')
      }
    }

    // Si pas de JSON, essayer parsing HTML
    return extractFromHTMLAttributes(html)
  } catch (error: any) {
    // Si erreur RESP001, essayer avec des paramètres différents
    if (error?.message?.includes('422') || error?.message?.includes('RESP001')) {
      log.warn('[LACENTRALE] ⚠️ Blocage JS rendering, essai avec paramètres minimaux...')
      try {
        const responseRetry = await scrapeWithZenRows(
          url,
          {
            premium_proxy: 'true',
            block_resources: 'image,media,font',
            // Pas de js_render, pas de proxy_country
          },
          abortSignal
        )
        
        if (responseRetry && responseRetry.length >= 100) {
          log.info(`[LACENTRALE] 📊 HTML reçu (retry minimal): ${(responseRetry.length / 1024).toFixed(2)} KB`)
          return extractFromHTMLAttributes(responseRetry)
        }
      } catch (retryError) {
        log.warn('[LACENTRALE] ⚠️ Retry minimal échoué aussi')
      }
    }
    log.warn('[LACENTRALE] ⚠️ Erreur JS rendering, passage à stratégie suivante')
    return []
  }
}

/**
 * STRATÉGIE 3 : Fallback parsing HTML classique
 */
async function extractFromHTMLParsing(
  url: string,
  abortSignal?: AbortSignal
): Promise<ListingResponse[]> {
  log.info('[LACENTRALE] 📡 Requête ZenRows pour parsing HTML...')
  
  const response = await scrapeWithZenRows(
    url,
    {
      js_render: 'true',
      premium_proxy: 'true',
      proxy_country: 'fr',
      wait: '3000', // Réduire le temps d'attente pour JS rendering (3s au lieu de 5s par défaut)
      block_resources: 'image,media,font',
    },
    abortSignal
  )

  if (!response || response.length < 100) {
    return []
  }

  return extractFromHTMLAttributes(response)
}

/**
 * Parser les attributs HTML depuis le HTML
 * Amélioré avec la logique de l'ancien parser LaCentrale
 */
function extractFromHTMLAttributes(html: string): ListingResponse[] {
  const listings: ListingResponse[] = []
  
  try {
    // 1. Chercher les containers d'annonces spécifiques à LaCentrale
    const adLineMatches = html.match(/<div[^>]*class=["'][^"']*adLineContainer[^"']*["'][^>]*>[\s\S]*?<\/div>/gi) || []
    const vehicleMatches = html.match(/<div[^>]*class=["'][^"']*vehicle[^"']*["'][^>]*>[\s\S]*?<\/div>/gi) || []
    const articleMatches = html.match(/<article[^>]*>[\s\S]*?<\/article>/gi) || []
    
    // 2. Extraire depuis les matches HTML
    const allMatches = [...adLineMatches, ...vehicleMatches, ...articleMatches]
    
    // Augmenter la limite pour extraire plus d'annonces (500 au lieu de 100)
    for (const match of allMatches.slice(0, 500)) {
      try {
        const listing = extractListingFromHtmlMatch(match)
        if (listing) {
          listings.push(listing)
        }
      } catch (error) {
        continue
      }
    }
    
    // 3. Si pas de résultats, essayer extraction par liens (comme l'ancien parser)
    if (listings.length === 0 && html.length > 50000) {
      // LaCentrale utilise plusieurs formats d'URL, les capturer tous :
      // - /auto-occasion-annonce-xxxxx.html
      // - /annonce/xxxxx
      // - /annonce-xxxxx.html
      const adLinkRegex = /href=["']([^"']*(?:\/auto-occasion-annonce[^"']*\.html|\/annonce[^"']*(?:\/[^"']*|\.html)))["']/gi
      const links: string[] = []
      let linkMatch
      
      // Augmenter la limite pour extraire plus de liens (200 au lieu de 50)
      while ((linkMatch = adLinkRegex.exec(html)) !== null && links.length < 200) {
        let linkPath = linkMatch[1]
        // Nettoyer l'URL (enlever fragments et query params inutiles)
        linkPath = linkPath.split('#')[0].split('?')[0]
        // Éviter les doublons
        if (!links.includes(linkPath)) {
          links.push(linkPath)
        }
      }
      
      if (links.length > 0) {
        log.info(`[LACENTRALE] 📊 Extraction par liens: ${links.length} liens trouvés`)
        for (const linkPath of links) {
          try {
            // Construire l'URL complète
            const url = linkPath.startsWith('http') 
              ? linkPath 
              : `https://www.lacentrale.fr${linkPath.startsWith('/') ? linkPath : `/${linkPath}`}`
            
            // Extraire le contexte autour du lien (2000 caractères avant et après)
            const linkIndex = html.indexOf(linkPath)
            if (linkIndex !== -1) {
              const context = html.substring(
                Math.max(0, linkIndex - 2000),
                Math.min(html.length, linkIndex + 2000)
              )
              
              const listing = extractListingFromContext(context, url)
              if (listing) {
                listings.push(listing)
              }
            }
          } catch (error) {
            continue
          }
        }
      }
    }
  } catch (error) {
    log.warn('[LACENTRALE] Erreur extraction HTML', {
      error: error instanceof Error ? error.message : String(error),
    })
  }

  log.info(`[LACENTRALE] 📊 ${listings.length} annonces extraites depuis attributs HTML`)
  return listings
}

/**
 * Extraire une annonce depuis un match HTML (div, article, etc.)
 */
function extractListingFromHtmlMatch(html: string): ListingResponse | null {
  // Extraire l'URL - LaCentrale utilise plusieurs formats :
  // - /auto-occasion-annonce-xxxxx.html
  // - /annonce/xxxxx
  // - /annonce-xxxxx.html
  // - URLs complètes https://www.lacentrale.fr/...
  const urlMatch =
    html.match(/href=["']([^"']*\/auto-occasion-annonce[^"']*)["']/i) ||
    html.match(/href=["']([^"']*\/annonce[^"']*\.html)["']/i) ||
    html.match(/href=["']([^"']*\/annonce[^"']*\/[^"']*)["']/i) ||
    html.match(/href=["']([^"']*\/annonce[^"']*)["']/i) ||
    html.match(/data-url=["']([^"']+)["']/i) ||
    html.match(/data-link=["']([^"']+)["']/i)
  
  const urlPath = urlMatch ? urlMatch[1] : null
  if (!urlPath) return null
  
  // Nettoyer l'URL (enlever les fragments et query params inutiles)
  let cleanUrlPath = urlPath.split('#')[0].split('?')[0]
  
  // Construire l'URL complète
  const fullUrl = cleanUrlPath.startsWith('http') 
    ? cleanUrlPath 
    : `https://www.lacentrale.fr${cleanUrlPath.startsWith('/') ? cleanUrlPath : `/${cleanUrlPath}`}`
  
  // Extraire titre
  const titleMatch =
    html.match(/data-title=["']([^"']+)["']/i) ||
    html.match(/<h[23][^>]*>([\s\S]*?)<\/h[23]>/i) ||
    html.match(/<a[^>]*title=["']([^"']+)["']/i)
  
  const title = titleMatch
    ? cleanHtml(titleMatch[1]).replace(/\s+/g, ' ').trim()
    : 'Annonce LaCentrale'
  
  // Extraire prix
  const priceMatch = html.match(/(\d{1,3}(?:\s?\d{3})*)\s*€/i) || 
                     html.match(/data-price=["']?(\d+)/i)
  const price = priceMatch ? parseFloat(priceMatch[1].replace(/\s/g, '')) : null
  
  // Extraire année
  const yearMatch = html.match(/\b(19|20)\d{2}\b/)
  const year = yearMatch ? parseInt(yearMatch[0]) : null
  
  // Extraire kilométrage
  const mileageMatch = html.match(/(\d{1,3}(?:\s?\d{3})*)\s*km/i)
  const mileage = mileageMatch ? parseFloat(mileageMatch[1].replace(/\s/g, '')) : null
  
  // Extraire ville
  const cityMatch =
    html.match(/<span[^>]*class=["'][^"']*city[^"']*["'][^>]*>([\s\S]*?)<\/span>/i) ||
    html.match(/data-city=["']([^"']+)["']/i)
  const city = cityMatch ? cleanHtml(cityMatch[1]).trim() : null
  
  // Extraire image
  const imageMatch = html.match(/<img[^>]+src=["']([^"']+)["']/i)
  const imageUrl = imageMatch 
    ? (imageMatch[1].startsWith('http') ? imageMatch[1] : `https://www.lacentrale.fr${imageMatch[1]}`)
    : null
  
  // Extraire ID depuis l'URL
  const adIdMatch = fullUrl.match(/\/annonce\/([^\/]+)/)
  const adId = adIdMatch ? adIdMatch[1] : `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  
  return {
    id: `lacentrale_${adId}`,
    title,
    price_eur: price,
    year,
    mileage_km: mileage,
    url: fullUrl,
    imageUrl,
    source: 'LaCentrale',
    city,
    score_ia: 50,
    score_final: 50,
  }
}

/**
 * Extraire une annonce depuis le contexte autour d'un lien
 */
function extractListingFromContext(context: string, url: string): ListingResponse | null {
  const titleMatch =
    context.match(/data-title=["']([^"']+)["']/i) ||
    context.match(/title=["']([^"']+)["']/i)
  
  const title = titleMatch
    ? cleanHtml(titleMatch[1]).trim()
    : 'Annonce LaCentrale'
  
  const priceMatch = context.match(/(\d{1,3}(?:\s?\d{3})*)\s*€/i)
  const price = priceMatch ? parseFloat(priceMatch[1].replace(/\s/g, '')) : null
  
  const yearMatch = context.match(/\b(19|20)\d{2}\b/)
  const year = yearMatch ? parseInt(yearMatch[0]) : null
  
  const mileageMatch = context.match(/(\d{1,3}(?:\s?\d{3})*)\s*km/i)
  const mileage = mileageMatch ? parseFloat(mileageMatch[1].replace(/\s/g, '')) : null
  
  // Extraire l'ID depuis l'URL - LaCentrale utilise plusieurs formats
  const adIdMatch = 
    url.match(/\/auto-occasion-annonce-([^\/\.\?]+)/) ||
    url.match(/\/annonce\/([^\/\?]+)/) ||
    url.match(/\/annonce-([^\/\.\?]+)\.html/)
  const adId = adIdMatch ? adIdMatch[1] : `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  
  return {
    id: `lacentrale_${adId}`,
    title,
    price_eur: price,
    year,
    mileage_km: mileage,
    url,
    imageUrl: null,
    source: 'LaCentrale',
    city: null,
    score_ia: 50,
    score_final: 50,
  }
}

/**
 * Filtrer les listings pour s'assurer qu'ils correspondent aux critères de recherche
 */
function filterListingsByQuery(
  listings: ListingResponse[],
  query: ScrapeQuery,
  pass: ScrapePass
): ListingResponse[] {
  if (!query.brand) return listings // Si pas de marque, retourner tout
  
  const brandLower = query.brand.toLowerCase().trim()
  const modelLower = query.model?.toLowerCase().trim()
  
  // Normaliser la marque (par exemple, "AUDI" peut être écrit "audi" ou "Audi")
  const brandVariations = [
    brandLower,
    brandLower.replace(/\s+/g, ''), // Enlever espaces
    brandLower.replace(/\s+/g, '-'), // Remplacer par tirets
  ]
  
  return listings.filter((listing) => {
    // Vérifier la marque dans le titre
    const titleLower = (listing.title || '').toLowerCase().trim()
    
    // Vérifier si une des variations de la marque est présente
    const hasBrand = brandVariations.some(brandVar => titleLower.includes(brandVar))
    
    // Si pas de marque trouvée, rejeter
    if (!hasBrand) {
      return false
    }
    
    // Si un modèle est spécifié
    if (modelLower) {
      const modelVariations = [
        modelLower,
        modelLower.replace(/\s+/g, ''),
        modelLower.replace(/\s+/g, '-'),
        ` ${modelLower} `, // Modèle avec espaces autour pour éviter "a3" dans "fa3"
      ]
      
      const hasModel = modelVariations.some(modelVar => titleLower.includes(modelVar))
      
      // En mode strict, exiger marque ET modèle (mais être tolérant si la marque est claire)
      if (pass === 'strict') {
        // Si on a la marque et le modèle, OK
        if (hasBrand && hasModel) return true
        // Sinon, seulement si on a la marque ET que le modèle est court (risque de faux positif)
        if (hasBrand && modelLower.length >= 3) return false
        // Si modèle très court (2 caractères), accepter même sans modèle exact (car peut être dans l'URL)
        return hasBrand
      }
      // En mode relaxed/opportunity, accepter si on a la marque OU le modèle
      return hasBrand || hasModel
    }
    
    // Si pas de modèle spécifié, accepter si on a la marque
    return hasBrand
  })
}

/**
 * Construction URL de recherche LaCentrale
 */
function buildLaCentraleURL(query: ScrapeQuery, pass: ScrapePass): string {
  const base = 'https://www.lacentrale.fr/listing'
  const searchParams = new URLSearchParams()

  // Construire le filtre makesModels - LaCentrale utilise le format "BRAND-MODEL"
  // Normaliser la marque et le modèle (majuscules, enlever espaces)
  const brand = (query.brand || '').trim().toUpperCase().replace(/\s+/g, '-')
  const model = (query.model || '').trim().toUpperCase().replace(/\s+/g, '-')
  
  // Si on a une marque, l'ajouter au makesModels
  if (brand) {
    const makesModels = model ? `${brand}-${model}` : brand
    searchParams.set('makesModels', makesModels)
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
    const relaxedMax = Math.floor((query.maxPrice || 0) * 1.1)
    searchParams.set('priceMax', String(relaxedMax))
  } else {
    // opportunity
    const opportunityMax = Math.floor((query.maxPrice || 0) * 1.2)
    searchParams.set('priceMax', String(opportunityMax))
  }
  
  // Ajouter d'autres filtres si disponibles
  if (query.maxMileage) {
    searchParams.set('mileageMax', String(query.maxMileage))
  }
  
  if (query.minYear) {
    searchParams.set('yearMin', String(query.minYear))
  }

  const finalUrl = `${base}?${searchParams.toString()}`
  log.info(`[LACENTRALE] 🔗 URL construite: ${finalUrl}`)
  return finalUrl
}

/**
 * Mapper annonce LaCentrale depuis JSON vers format unifié
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
  
  // Extraire les images
  let imageUrl: string | null = null
  if (ad.image) {
    imageUrl = typeof ad.image === 'string' ? ad.image : ad.image.url || ad.image.src || null
  } else if (ad.images?.[0]) {
    imageUrl = typeof ad.images[0] === 'string' ? ad.images[0] : ad.images[0].url || ad.images[0].src || null
  } else if (ad.photo) {
    imageUrl = ad.photo
  } else if (ad.thumbnail) {
    imageUrl = ad.thumbnail
  }
  
  if (imageUrl && !imageUrl.startsWith('http')) {
    imageUrl = `https://www.lacentrale.fr${imageUrl}`
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

/**
 * Mapper JSON-LD vers format unifié
 */
function mapJsonLdToUnified(jsonLd: any): ListingResponse | null {
  try {
    const name = jsonLd.name || jsonLd.title || 'Annonce LaCentrale'
    const price = jsonLd.offers?.price || jsonLd.price || null
    const url = jsonLd.url || jsonLd.id || null
    const image = jsonLd.image || jsonLd.thumbnailUrl || null
    
    if (!url) return null
    
    return {
      id: `lacentrale_jsonld_${Date.now()}`,
      title: String(name),
      price_eur: typeof price === 'number' ? price : (typeof price === 'string' ? parseFloat(price) : null),
      year: null,
      mileage_km: null,
      url: url.startsWith('http') ? url : `https://www.lacentrale.fr${url}`,
      imageUrl: image,
      source: 'LaCentrale',
      city: null,
      score_ia: 50,
      score_final: 50,
    }
  } catch {
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
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

