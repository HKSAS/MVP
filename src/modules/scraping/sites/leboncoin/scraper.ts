// src/modules/scraping/sites/leboncoin/scraper.ts
// 🎯 SCRAPER LEBONCOIN - ZENROWS ONLY - ULTRA PROPRE

import { scrapeWithZenRows } from '@/lib/zenrows'
import { getZenRowsApiKey } from '@/src/core/config/env'
import type { ScrapeQuery, ListingResponse } from '@/src/core/types'
import type { ScrapingStrategy, ScrapePass } from '@/src/core/types'
import { createRouteLogger } from '@/lib/logger'

const log = createRouteLogger('leboncoin-scraper-zenrows')

/**
 * 🎯 SCRAPER LEBONCOIN AVEC ZENROWS
 * Version optimisée après diagnostic
 */
export async function scrapeLeBonCoin(
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
    log.error('[LBC] ZENROWS_API_KEY manquant dans .env.local')
    return {
      listings: [],
      strategy: 'zenrows',
      ms: Date.now() - startTime,
    }
  }

  const targetUrl = buildLeBonCoinURL(query, pass)
  log.info(`[LBC] 🎯 Scraping: ${targetUrl}`, { pass })

  try {
    // STRATÉGIE 1 : HTML BRUT SANS JS (LeBonCoin bloque avec js_render)
    // LeBonCoin retourne les annonces dans le HTML brut, pas besoin de JS rendering
    log.info('[LBC] 📡 Tentative HTML brut (sans js_render)...', { pass })
    const listingsFromHTML = await extractFromHTMLBrut(targetUrl, abortSignal)
    
    if (listingsFromHTML.length > 0) {
      log.info(`[LBC] ✅ ${listingsFromHTML.length} annonces via HTML brut`, { pass })
      return {
        listings: listingsFromHTML,
        strategy: 'zenrows',
        ms: Date.now() - startTime,
      }
    }

    log.warn('[LBC] ⚠️ HTML brut vide, essai avec __NEXT_DATA__...', { pass })
    
    // STRATÉGIE 2 : Essayer d'extraire le JSON de __NEXT_DATA__ (peut être présent dans HTML brut)
    const listings = await extractFromNextData(targetUrl, abortSignal)
    
    if (listings.length > 0) {
      log.info(`[LBC] ✅ ${listings.length} annonces via __NEXT_DATA__`, { pass })
      return {
        listings,
        strategy: 'zenrows',
        ms: Date.now() - startTime,
      }
    }

    log.warn('[LBC] ❌ Aucune annonce trouvée', { pass })
    return {
      listings: [],
      strategy: 'zenrows',
      ms: Date.now() - startTime,
    }

  } catch (error) {
    log.error('[LBC] ❌ Erreur scraping:', {
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
 * LeBonCoin bloque avec js_render mais retourne les données dans le HTML brut
 */
async function extractFromHTMLBrut(
  url: string,
  abortSignal?: AbortSignal
): Promise<ListingResponse[]> {
  log.info('[LBC] 📡 Requête ZenRows HTML brut (sans js_render)...')
  
  const response = await scrapeWithZenRows(
    url,
    {
      // ⚠️ PAS de js_render - LeBonCoin bloque avec
      premium_proxy: 'true',
      proxy_country: 'fr',
      block_resources: 'image,media,font',
    },
    abortSignal
  )

  if (!response || response.length < 100) {
    log.warn('[LBC] ❌ ZenRows HTML trop court ou vide')
    return []
  }

  const html = response
  log.info(`[LBC] 📊 HTML brut reçu: ${(html.length / 1024).toFixed(2)} KB`)

  // Chercher d'abord __NEXT_DATA__ dans le HTML brut (il peut être présent)
  const jsonMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/)
  
  if (jsonMatch) {
    try {
      const jsonData = JSON.parse(jsonMatch[1])
      
      const ads = 
        jsonData?.props?.pageProps?.searchData?.ads ||
        jsonData?.props?.pageProps?.ads ||
        jsonData?.props?.pageProps?.data?.ads ||
        jsonData?.props?.initialState?.ads ||
        []

      if (ads && Array.isArray(ads) && ads.length > 0) {
        log.info(`[LBC] ✅ ${ads.length} annonces dans __NEXT_DATA__ (HTML brut)`)
        return ads.map(mapLBCAdToUnified)
      }
    } catch (error) {
      log.warn('[LBC] Erreur parsing __NEXT_DATA__:', {
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  // Si pas de __NEXT_DATA__, parser les attributs data-qa-id
  return extractFromHTMLAttributes(html)
}

/**
 * STRATÉGIE 2 : Extraire depuis __NEXT_DATA__ avec js_render (fallback si HTML brut échoue)
 */
async function extractFromNextData(
  url: string,
  abortSignal?: AbortSignal
): Promise<ListingResponse[]> {
  log.info('[LBC] 📡 Requête ZenRows avec JS rendering (fallback)...')
  
  const response = await scrapeWithZenRows(
    url,
    {
      js_render: 'true',
      premium_proxy: 'true',
      proxy_country: 'fr',
      wait: '5000',
      wait_for: '.styles_adCard__yVfDO',
      block_resources: 'image,media,font',
    },
    abortSignal
  )

  if (!response || response.length < 100) {
    log.warn('[LBC] ❌ ZenRows HTML trop court ou vide')
    return []
  }

  const html = response
  log.info(`[LBC] 📊 HTML reçu: ${(html.length / 1024).toFixed(2)} KB`)

  // Chercher le JSON __NEXT_DATA__
  const jsonMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/)
  
  if (!jsonMatch) {
    log.warn('[LBC] ⚠️ __NEXT_DATA__ non trouvé dans le HTML')
    
    // Debug: sauvegarder HTML pour inspection
    if (process.env.NODE_ENV === 'development') {
      const fs = require('fs')
      fs.writeFileSync('debug-lbc.html', html)
      log.info('[LBC] 💾 HTML sauvegardé → debug-lbc.html')
    }
    
    return []
  }

  try {
    const jsonData = JSON.parse(jsonMatch[1])
    
    // Navigation dans la structure Next.js
    const ads = 
      jsonData?.props?.pageProps?.searchData?.ads ||
      jsonData?.props?.pageProps?.ads ||
      jsonData?.props?.pageProps?.data?.ads ||
      jsonData?.props?.initialState?.ads ||
      []

    if (!ads || !Array.isArray(ads)) {
      log.warn('[LBC] ⚠️ Structure JSON inattendue')
      log.warn('[LBC] Keys disponibles:', Object.keys(jsonData?.props?.pageProps || {}))
      
      // Sauvegarder le JSON pour debug
      if (process.env.NODE_ENV === 'development') {
        const fs = require('fs')
        fs.writeFileSync('debug-lbc-json.json', JSON.stringify(jsonData, null, 2))
        log.info('[LBC] 💾 JSON sauvegardé → debug-lbc-json.json')
      }
      
      return []
    }

    log.info(`[LBC] ✅ ${ads.length} annonces dans __NEXT_DATA__`)

    return ads.map(mapLBCAdToUnified)

  } catch (error) {
    log.error('[LBC] ❌ Erreur parsing JSON:', {
      error: error instanceof Error ? error.message : String(error),
    })
    return []
  }
}

/**
 * Parser les attributs HTML data-qa-id depuis le HTML brut
 */
function extractFromHTMLAttributes(html: string): ListingResponse[] {
  const listings: ListingResponse[] = []
  
  // Chercher tous les containers d'annonces avec data-qa-id
  const containerRegex = /<a[^>]*data-qa-id="aditem_container"[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gs
  
  let match
  while ((match = containerRegex.exec(html)) !== null && listings.length < 100) {
    const urlPath = match[1]
    const content = match[2]
    
    // Extraire prix
    const priceMatch = content.match(/data-qa-id="aditem_price"[^>]*>([^<]*)</i)
    const price = priceMatch ? parseFloat(priceMatch[1].replace(/[^\d]/g, '')) : null
    
    // Extraire titre
    const titleMatch = content.match(/data-qa-id="aditem_title"[^>]*>([^<]*)</i)
    const title = titleMatch ? titleMatch[1].trim() : ''
    
    // Extraire image
    const imageMatch = content.match(/<img[^>]+src="([^"]*)"[^>]*>/i)
    const imageUrl = imageMatch ? imageMatch[1] : null
    
    // Extraire localisation
    const locationMatch = content.match(/data-qa-id="aditem_location"[^>]*>([^<]*)</i)
    const city = locationMatch ? locationMatch[1].trim() : null
    
    if (title || urlPath) {
      const fullUrl = urlPath.startsWith('http') 
        ? urlPath 
        : `https://www.leboncoin.fr${urlPath}`
      
      // Extraire l'ID depuis l'URL
      const adIdMatch = fullUrl.match(/\/ad\/(\d+)/)
      const adId = adIdMatch ? adIdMatch[1] : `${Date.now()}_${listings.length}`
      
      listings.push({
        id: `lbc_${adId}`,
        title: title || 'Annonce LeBonCoin',
        price_eur: price,
        year: null,
        mileage_km: null,
        url: fullUrl,
        imageUrl: imageUrl ? (imageUrl.startsWith('http') ? imageUrl : `https:${imageUrl}`) : null,
        source: 'LeBonCoin',
        city,
        score_ia: 50,
        score_final: 50,
      })
    }
  }

  log.info(`[LBC] 📊 ${listings.length} annonces extraites depuis attributs HTML`)
  return listings
}


/**
 * Construction URL de recherche LeBonCoin
 */
function buildLeBonCoinURL(query: ScrapeQuery, pass: ScrapePass): string {
  const base = 'https://www.leboncoin.fr/recherche'
  const searchParams = new URLSearchParams()

  searchParams.set('category', '2') // 2 = Voitures
  
  // Construire le texte de recherche
  const searchText = [query.brand, query.model].filter(Boolean).join(' ')
  if (searchText) {
    searchParams.set('text', searchText)
  }
  
  // Prix selon la passe
  if (pass === 'strict') {
    if (query.minPrice) {
      searchParams.set('price', `${query.minPrice}-${query.maxPrice}`)
    } else {
      searchParams.set('price', `0-${query.maxPrice}`)
    }
  } else if (pass === 'relaxed') {
    const relaxedMax = Math.floor(query.maxPrice * 1.1)
    searchParams.set('price', `0-${relaxedMax}`)
  } else {
    // opportunity
    const opportunityMax = Math.floor(query.maxPrice * 1.2)
    searchParams.set('price', `0-${opportunityMax}`)
  }
  
  if (query.maxMileage) {
    searchParams.set('mileage', `min-${query.maxMileage}`)
  }
  
  if (query.minYear) {
    searchParams.set('regdate', `${query.minYear}-max`)
  }
  
  if (query.zipCode) {
    searchParams.set('locations', query.zipCode)
  }

  return `${base}?${searchParams.toString()}`
}

/**
 * Mapper annonce LBC vers format unifié
 */
function mapLBCAdToUnified(ad: any): ListingResponse {
  // Extraire marque/modèle du titre si pas dans attributes
  const title = ad.subject || ad.title || ''
  const titleParts = title.toLowerCase().split(' ')
  const brand = ad.attributes?.brand || titleParts[0] || ''
  const model = ad.attributes?.model || titleParts[1] || ''

  // Extraire l'ID
  const adId = ad.list_id || ad.id || ad.adId || ''
  
  // Construire l'URL
  const url = ad.url || `https://www.leboncoin.fr/ad/${adId}`
  
  // Extraire le prix
  let price: number | null = null
  if (Array.isArray(ad.price) && ad.price.length > 0) {
    price = ad.price[0]
  } else if (typeof ad.price === 'number') {
    price = ad.price
  }
  
  // Extraire les images
  let imageUrl: string | null = null
  if (ad.images?.urls_thumb?.[0]) {
    imageUrl = ad.images.urls_thumb[0]
  } else if (ad.images?.urls_large?.[0]) {
    imageUrl = ad.images.urls_large[0]
  } else if (ad.images?.thumb?.[0]) {
    imageUrl = ad.images.thumb[0]
  } else if (ad.images?.large?.[0]) {
    imageUrl = ad.images.large[0]
  }
  
  // Extraire la localisation
  const city = ad.location?.city || ad.location?.city_label || null
  
  // Extraire kilométrage
  const mileage = ad.attributes?.mileage || ad.mileage || null
  
  // Extraire année
  const year = ad.attributes?.regdate || ad.attributes?.year || ad.year || null

  return {
    id: `lbc_${adId}`,
    title,
    price_eur: price,
    year,
    mileage_km: mileage,
    url,
    imageUrl,
    source: 'LeBonCoin',
    city,
    score_ia: 50,
    score_final: 50,
  }
}

