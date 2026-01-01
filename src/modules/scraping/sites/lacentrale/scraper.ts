// src/modules/scraping/sites/lacentrale/scraper.ts
// 🎯 SCRAPER LACENTRALE - ZENROWS ONLY - ULTRA PROPRE
// Même structure exacte que LeBonCoin

import { scrapeWithZenRows } from '@/lib/zenrows'
import { getZenRowsApiKey } from '@/src/core/config/env'
import type { ScrapeQuery, ListingResponse } from '@/src/core/types'
import type { ScrapingStrategy, ScrapePass } from '@/src/core/types'
import { createRouteLogger } from '@/lib/logger'
import { loadScrapingBrowserDeps } from '@/lib/scrapers/scraping-browser-wrapper'

const log = createRouteLogger('lacentrale-scraper-zenrows')

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
    // ✅ STRATÉGIE 1 : ZenRows API HTTP (rapide)
    log.info('[LACENTRALE] 📡 Tentative avec ZenRows API HTTP...', { pass })
    const listings = await extractFromJSRender(targetUrl, abortSignal)
    
    if (listings.length > 0) {
      log.info(`[LACENTRALE] ✅ ${listings.length} annonces via ZenRows API HTTP`, { pass })
      
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

    log.warn('[LACENTRALE] ⚠️ ZenRows API HTTP échoué, essai avec Scraping Browser...', { pass })

  } catch (error) {
    // Si l'API HTTP échoue (ex: 422 RESP001), essayer le Scraping Browser
    const errorMessage = error instanceof Error ? error.message : String(error)
    const isZenRowsBlocked = errorMessage.includes('422') || errorMessage.includes('RESP001') || errorMessage.includes('403')
    
    if (isZenRowsBlocked) {
      log.warn('[LACENTRALE] ⚠️ ZenRows API HTTP bloqué, essai avec Scraping Browser...', { 
        error: errorMessage,
        pass 
      })
    } else {
      log.error('[LACENTRALE] ❌ Erreur scraping:', {
        error: errorMessage,
        pass,
      })
      return {
        listings: [],
        strategy: 'zenrows',
        ms: Date.now() - startTime,
      }
    }
  }

  // ✅ STRATÉGIE 2 : ZenRows Scraping Browser (navigateur réel, contourne anti-bot)
  try {
    log.info('[LACENTRALE] 🌐 Tentative avec ZenRows Scraping Browser (Playwright)...', { pass })
    const browserListings = await extractWithScrapingBrowser(targetUrl, abortSignal)
    
    if (browserListings.length > 0) {
      log.info(`[LACENTRALE] ✅ ${browserListings.length} annonces via Scraping Browser`, { pass })
      
      return {
        listings: browserListings,
        strategy: 'zenrows-browser',
        ms: Date.now() - startTime,
      }
    }
    
    log.warn('[LACENTRALE] ❌ Scraping Browser n\'a pas retourné de résultats', { pass })
  } catch (browserError) {
    log.error('[LACENTRALE] ❌ Erreur Scraping Browser:', {
      error: browserError instanceof Error ? browserError.message : String(browserError),
      pass,
    })
  }

  // Aucune stratégie n'a fonctionné
  log.warn('[LACENTRALE] ❌ Aucune annonce trouvée avec toutes les stratégies', { pass })
  return {
    listings: [],
    strategy: 'zenrows',
    ms: Date.now() - startTime,
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
  // ⚠️ IMPORTANT : Ne PAS utiliser js_render pour LaCentrale (bloque)
  // Les paramètres par défaut dans zenrows.ts ont js_render: 'true', on doit l'écraser
  const zenrowsParams = {
    js_render: 'false', // ❌ PAS de JS rendering - LaCentrale bloque avec
    premium_proxy: 'true',
    proxy_country: 'fr',
    block_resources: 'image,media,font',
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
  
  // 🔍 DEBUG : Log HTML reçu
  console.log('[LACENTRALE DEBUG] HTML reçu:', {
    length: html.length,
    hasListing: html.includes('listing') || html.includes('annonce'),
    hasInitialState: html.includes('__INITIAL_STATE__'),
    hasNextData: html.includes('__NEXT_DATA__'),
    snippet: html.substring(0, 500),
  })

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
        
        // 🔍 DEBUG : Log structure première annonce pour comprendre les propriétés disponibles
        if (ads[0]) {
          console.log('[LACENTRALE DEBUG] Structure première annonce:', {
            keys: Object.keys(ads[0]),
            hasTitle: !!ads[0].title,
            hasName: !!ads[0].name,
            hasBrand: !!ads[0].brand,
            hasMake: !!ads[0].make,
            hasModel: !!ads[0].model,
            hasMakeModel: !!ads[0].makeModel,
            sample: {
              title: ads[0].title,
              name: ads[0].name,
              brand: ads[0].brand,
              make: ads[0].make,
              model: ads[0].model,
              makeModel: ads[0].makeModel,
              year: ads[0].year,
              price: ads[0].price,
              priceEur: ads[0].priceEur,
              price_eur: ads[0].price_eur,
              vehicle: ads[0].vehicle ? {
                price: ads[0].vehicle.price,
                priceEur: ads[0].vehicle.priceEur,
              } : null,
              car: ads[0].car ? {
                price: ads[0].car.price,
                priceEur: ads[0].car.priceEur,
              } : null,
            }
          })
        }
        
        const mappedAds = ads.map(mapLaCentraleAdToUnified)
        
        // 🔍 DEBUG : Log résultats mapping avec prix
        console.log('[LACENTRALE DEBUG] Mapping terminé (__INITIAL_STATE__):', {
          listingsFound: mappedAds.length,
          firstListing: mappedAds[0] ? {
            title: mappedAds[0].title,
            price_eur: mappedAds[0].price_eur,
            year: mappedAds[0].year,
            mileage_km: mappedAds[0].mileage_km,
            url: mappedAds[0].url,
            source: mappedAds[0].source,
          } : null,
          listingsWithPrice: mappedAds.filter(l => l.price_eur !== null && l.price_eur !== undefined).length,
          listingsWithoutPrice: mappedAds.filter(l => l.price_eur === null || l.price_eur === undefined).length,
        })
        
        return mappedAds
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
        
        // 🔍 DEBUG : Log structure première annonce pour comprendre les propriétés disponibles
        if (ads[0]) {
          console.log('[LACENTRALE DEBUG] Structure première annonce (__NEXT_DATA__):', {
            keys: Object.keys(ads[0]),
            hasTitle: !!ads[0].title,
            hasName: !!ads[0].name,
            hasBrand: !!ads[0].brand,
            hasMake: !!ads[0].make,
            hasModel: !!ads[0].model,
            hasMakeModel: !!ads[0].makeModel,
            sample: {
              title: ads[0].title,
              name: ads[0].name,
              brand: ads[0].brand,
              make: ads[0].make,
              model: ads[0].model,
              makeModel: ads[0].makeModel,
              year: ads[0].year,
              price: ads[0].price,
            }
          })
        }
        
        const mappedAds = ads.map(mapLaCentraleAdToUnified)
        
        // 🔍 DEBUG : Log résultats mapping
        console.log('[LACENTRALE DEBUG] Mapping terminé (__NEXT_DATA__):', {
          listingsFound: mappedAds.length,
          firstListing: mappedAds[0] ? {
            title: mappedAds[0].title,
            price: mappedAds[0].price_eur,
            url: mappedAds[0].url,
          } : null,
        })
        
        return mappedAds
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
 * STRATÉGIE PRINCIPALE : Extraire depuis HTML avec js_render (LaCentrale nécessite JS)
 */
async function extractFromJSRender(
  url: string,
  query?: ScrapeQuery,
  abortSignal?: AbortSignal
): Promise<ListingResponse[]> {
  log.info('[LACENTRALE] 📡 Requête ZenRows avec JS rendering activé...')
  
  // Paramètres ZenRows premium avec JS rendering pour charger la page complète
  // Comme LeBonCoin mais avec JS render pour LaCentrale
  const zenrowsParams = {
    js_render: 'true',
    premium_proxy: 'true',
    proxy_country: 'fr',
    wait: '8000', // ✅ 8s pour laisser le temps au JS de charger complètement (augmenté)
    block_resources: 'image,media,font',
    custom_headers: 'true', // Headers personnalisés pour éviter la détection
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
  
  // 🔍 DEBUG : Log HTML reçu
  console.log('[LACENTRALE DEBUG] HTML reçu (JS render):', {
    length: html.length,
    hasListing: html.includes('listing') || html.includes('annonce'),
    hasInitialState: html.includes('__INITIAL_STATE__'),
    hasNextData: html.includes('__NEXT_DATA__'),
    snippet: html.substring(0, 500),
  })

  // Chercher __INITIAL_STATE__ dans le HTML avec JS rendering
  const initialStateMatch = html.match(/window\.__INITIAL_STATE__\s*=\s*({[\s\S]+?});/)
  if (initialStateMatch) {
    try {
      const jsonStr = initialStateMatch[1]
      const jsonData = JSON.parse(jsonStr)
      
      // Recherche plus approfondie dans la structure JSON
      const ads = 
        jsonData?.ads ||
        jsonData?.listings ||
        jsonData?.vehicles ||
        jsonData?.data?.ads ||
        jsonData?.data?.listings ||
        jsonData?.search?.results ||
        jsonData?.search?.ads ||
        jsonData?.searchResults?.ads ||
        jsonData?.searchResults?.listings ||
        jsonData?.listing?.results ||
        jsonData?.listing?.ads ||
        findListingsInObject(jsonData) || // Recherche récursive
        []

      if (ads && Array.isArray(ads) && ads.length > 0) {
        log.info(`[LACENTRALE] ✅ ${ads.length} annonces dans __INITIAL_STATE__ (JS render)`)
        
        // 🔍 DEBUG : Log structure première annonce pour comprendre les propriétés disponibles
        if (ads[0]) {
          console.log('[LACENTRALE DEBUG] Structure première annonce (JS render):', {
            keys: Object.keys(ads[0]),
            hasTitle: !!ads[0].title,
            hasName: !!ads[0].name,
            hasBrand: !!ads[0].brand,
            hasMake: !!ads[0].make,
            hasModel: !!ads[0].model,
            hasMakeModel: !!ads[0].makeModel,
            sample: {
              title: ads[0].title,
              name: ads[0].name,
              brand: ads[0].brand,
              make: ads[0].make,
              model: ads[0].model,
              makeModel: ads[0].makeModel,
              year: ads[0].year,
              price: ads[0].price,
            }
          })
        }
        
        return ads.map(mapLaCentraleAdToUnified)
      }
    } catch (error) {
      log.warn('[LACENTRALE] Erreur parsing __INITIAL_STATE__ (JS render):', {
        error: error instanceof Error ? error.message : String(error)
      })
    }
  }

  // Chercher __NEXT_DATA__
  const nextDataMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/)
  if (!nextDataMatch) {
    log.warn('[LACENTRALE] ⚠️ __INITIAL_STATE__ et __NEXT_DATA__ non trouvés dans le HTML')
    log.info('[LACENTRALE] 🔄 Fallback vers extraction HTML directe...')
    // Fallback: essayer d'extraire depuis les attributs HTML
    return extractFromHTMLAttributes(html)
  }

  try {
    const jsonData = JSON.parse(nextDataMatch[1])
    
    // Recherche plus approfondie dans la structure JSON
    let ads = 
      jsonData?.props?.pageProps?.ads ||
      jsonData?.props?.pageProps?.listings ||
      jsonData?.props?.pageProps?.data?.ads ||
      jsonData?.props?.pageProps?.data?.listings ||
      jsonData?.props?.pageProps?.searchResults?.ads ||
      jsonData?.props?.pageProps?.search?.results ||
      jsonData?.props?.pageProps?.search?.ads ||
      jsonData?.props?.initialState?.ads ||
      jsonData?.props?.initialState?.listings ||
      null

    // Si pas trouvé, recherche récursive
    if (!ads || !Array.isArray(ads) || ads.length === 0) {
      ads = findListingsInObject(jsonData)
    }

    if (!ads || !Array.isArray(ads) || ads.length === 0) {
      log.warn('[LACENTRALE] ⚠️ Aucune annonce trouvée dans __NEXT_DATA__')
      // Fallback: essayer d'extraire depuis les attributs HTML
      log.info('[LACENTRALE] 🔄 Fallback vers extraction HTML directe...')
      return extractFromHTMLAttributes(html)
    }

    log.info(`[LACENTRALE] ✅ ${ads.length} annonces dans __NEXT_DATA__`)

    const mappedAds = ads.map(mapLaCentraleAdToUnified)
    
    // 🔍 DEBUG : Log résultats mapping
    console.log('[LACENTRALE DEBUG] Mapping terminé (JS render):', {
      listingsFound: mappedAds.length,
      firstListing: mappedAds[0] ? {
        title: mappedAds[0].title,
        price: mappedAds[0].price_eur,
        url: mappedAds[0].url,
        year: mappedAds[0].year,
      } : null,
    })
    
    return mappedAds

  } catch (error) {
    log.error('[LACENTRALE] ❌ Erreur parsing JSON:', {
      error: error instanceof Error ? error.message : String(error),
    })
    // Fallback: essayer d'extraire depuis les attributs HTML
    log.info('[LACENTRALE] 🔄 Fallback vers extraction HTML directe après erreur JSON...')
    return extractFromHTMLAttributes(html)
  }
}

/**
 * Parser les attributs HTML depuis le HTML brut
 * Stratégie multi-niveaux comme l'ancien parser pour maximiser les chances de trouver des annonces
 */
function extractFromHTMLAttributes(html: string, query?: ScrapeQuery): ListingResponse[] {
  const listings: ListingResponse[] = []
  
  if (html.length < 1000) {
    log.warn('[LACENTRALE] HTML trop court pour extraction', { htmlLength: html.length })
    return []
  }
  
  log.info('[LACENTRALE] 🔍 Début extraction HTML directe (regex/manuel)...', { htmlLength: html.length })
  
  // 🔍 DEBUG: Vérifier la présence de certains éléments clés
  const hasAdKeywords = html.includes('adLine') || html.includes('vehicle') || html.includes('annonce') || html.includes('listing')
  const adLinkCount = (html.match(/\/auto-occasion-annonce|\.html/g) || []).length
  
  log.debug('[LACENTRALE] Analyse HTML', {
    hasAdKeywords,
    adLinkCount,
  })
  
  // STRATÉGIE 0: Chercher dans les scripts JSON inline (comme __INITIAL_STATE__ mais autres formats)
  // LaCentrale peut avoir les données dans des scripts <script type="application/json">
  const scriptJsonMatches = html.match(/<script[^>]*type=["']application\/json["'][^>]*>([\s\S]*?)<\/script>/gi)
  if (scriptJsonMatches && scriptJsonMatches.length > 0) {
    for (const scriptMatch of scriptJsonMatches.slice(0, 10)) { // Augmenter à 10 scripts pour plus de chances
      try {
        const jsonContent = scriptMatch.replace(/<script[^>]*>|<\/script>/gi, '').trim()
        if (jsonContent.length > 100) { // Ignorer les scripts trop courts
          const jsonData = JSON.parse(jsonContent)
          // Chercher récursivement des listings dans ce JSON
          const foundListings = findListingsInObject(jsonData)
          if (foundListings && Array.isArray(foundListings) && foundListings.length > 0) {
            log.info(`[LACENTRALE] ✅ ${foundListings.length} annonces trouvées dans script JSON inline`)
            const mappedAds = foundListings.map(mapLaCentraleAdToUnified)
            // 🔍 DEBUG : Log des prix extraits
            console.log('[LACENTRALE DEBUG] Prix extraits depuis JSON inline:', {
              total: mappedAds.length,
              withPrice: mappedAds.filter(l => l.price_eur !== null && l.price_eur !== undefined).length,
              withoutPrice: mappedAds.filter(l => l.price_eur === null || l.price_eur === undefined).length,
              sample: mappedAds.slice(0, 3).map(l => ({ title: l.title, price: l.price_eur, url: l.url }))
            })
            if (mappedAds.length > 0) {
              return mappedAds
            }
          }
        }
      } catch (error) {
        // Ignorer les erreurs de parsing JSON
        continue
      }
    }
  }
  
  // STRATÉGIE 0.5: Chercher aussi dans les scripts JavaScript qui peuvent contenir des données JSON
  // Parfois les données sont dans des scripts JS avec des variables
  const jsDataMatches = html.match(/<script[^>]*>[\s\S]*?(?:window\.|var |const |let )[\w]*[Dd]ata[\w]*\s*=\s*(\{[\s\S]{100,50000}\});?[\s\S]*?<\/script>/gi)
  if (jsDataMatches && jsDataMatches.length > 0) {
    for (const jsMatch of jsDataMatches.slice(0, 5)) {
      try {
        const dataMatch = jsMatch.match(/(\{[\s\S]{100,50000}\})/)
        if (dataMatch) {
          const jsonData = JSON.parse(dataMatch[1])
          const foundListings = findListingsInObject(jsonData)
          if (foundListings && Array.isArray(foundListings) && foundListings.length > 0) {
            log.info(`[LACENTRALE] ✅ ${foundListings.length} annonces trouvées dans script JS avec données`)
            const mappedAds = foundListings.map(mapLaCentraleAdToUnified)
            if (mappedAds.length > 0) {
              return mappedAds
            }
          }
        }
      } catch (error) {
        // Ignorer les erreurs de parsing
        continue
      }
    }
  }
  
  // STRATÉGIE 1: Chercher les containers d'annonces par regex avec patterns spécifiques LaCentrale
  // Patterns pour LaCentrale : adLineContainer, vehicleCard, searchCard, adCard, etc.
  const containerPatterns = [
    /<div[^>]*class=["'][^"']*adLineContainer[^"']*["'][^>]*>[\s\S]*?<\/div>/gi,
    /<div[^>]*class=["'][^"']*vehicle[^"']*card[^"']*["'][^>]*>[\s\S]*?<\/div>/gi,
    /<div[^>]*class=["'][^"']*searchCard[^"']*["'][^>]*>[\s\S]*?<\/div>/gi,
    /<div[^>]*class=["'][^"']*adCard[^"']*["'][^>]*>[\s\S]*?<\/div>/gi,
    /<article[^>]*class=["'][^"']*vehicle[^"']*["'][^>]*>[\s\S]*?<\/article>/gi,
    /<article[^>]*class=["'][^"']*ad[^"']*["'][^>]*>[\s\S]*?<\/article>/gi,
    /<div[^>]*data-testid=["'][^"']*vehicle[^"']*["'][^>]*>[\s\S]*?<\/div>/gi,
    /<div[^>]*data-testid=["'][^"']*ad[^"']*["'][^>]*>[\s\S]*?<\/div>/gi,
  ]
  
  const allMatches: string[] = []
  for (const pattern of containerPatterns) {
    const matches = html.match(pattern) || []
    allMatches.push(...matches)
  }
  
  log.debug('[LACENTRALE] Containers HTML trouvés', {
    total: allMatches.length,
  })
  
  // Extraire depuis les containers HTML
  const foundUrls = new Set<string>()
  
  // D'abord, créer une map des URLs vers leurs prix potentiels dans tout le HTML
  // Chercher tous les prix dans le HTML et les associer aux URLs proches
  const priceUrlMap = new Map<string, number>()
  
  // Chercher tous les patterns de prix dans le HTML complet
  const allPriceMatches = [
    ...Array.from(html.matchAll(/(\d{1,3}(?:\s?\d{3})*)\s*€/gi)),
    ...Array.from(html.matchAll(/data-price=["']?(\d{1,3}(?:\s?\d{3})*)/gi)),
    ...Array.from(html.matchAll(/<[^>]*class=["'][^"']*price[^"']*["'][^>]*>([^<]*\d{1,3}(?:\s?\d{3})*[^<]*)<\/[^>]*>/gi)),
  ]
  
  // Pour chaque prix trouvé, chercher l'URL la plus proche
  for (const priceMatch of allPriceMatches.slice(0, 200)) {
    const priceStr = (priceMatch[1] || priceMatch[0]).replace(/[^\d]/g, '')
    if (priceStr.length > 0) {
      const priceValue = parseFloat(priceStr)
      if (!isNaN(priceValue) && priceValue > 100 && priceValue < 10000000) {
        const priceIndex = priceMatch.index || 0
        // Chercher l'URL la plus proche (dans un rayon de 2000 caractères)
        const contextAroundPrice = html.substring(
          Math.max(0, priceIndex - 2000),
          Math.min(html.length, priceIndex + 2000)
        )
        const urlMatch = contextAroundPrice.match(/href=["']([^"']*(?:\/auto-occasion-annonce[^"']*))["']/i)
        if (urlMatch && urlMatch[1]) {
          const urlPath = urlMatch[1]
          const fullUrl = urlPath.startsWith('http') 
            ? urlPath 
            : `https://www.lacentrale.fr${urlPath.startsWith('/') ? urlPath : `/${urlPath}`}`
          const cleanUrl = fullUrl.split('#')[0].split('?')[0]
          // Garder le prix le plus proche si plusieurs prix sont trouvés pour la même URL
          if (!priceUrlMap.has(cleanUrl) || Math.abs(priceIndex - (html.indexOf(cleanUrl) || 0)) < 1000) {
            priceUrlMap.set(cleanUrl, priceValue)
          }
        }
      }
    }
  }
  
  console.log('[LACENTRALE DEBUG] Prix trouvés dans HTML:', {
    totalPrices: allPriceMatches.length,
    priceUrlMapSize: priceUrlMap.size,
    samplePrices: Array.from(priceUrlMap.entries()).slice(0, 3)
  })
  
  for (const match of allMatches.slice(0, 300)) {
    try {
      const listing = extractListingFromHtmlMatch(match, html) // Passer le HTML complet
      if (listing && listing.url && !foundUrls.has(listing.url)) {
        foundUrls.add(listing.url)
        // Si on a un prix dans la map et que le listing n'en a pas, l'utiliser
        if (!listing.price_eur && priceUrlMap.has(listing.url)) {
          listing.price_eur = priceUrlMap.get(listing.url)!
          console.log('[LACENTRALE DEBUG] Prix associé depuis map:', { url: listing.url, price: listing.price_eur })
        }
        listings.push(listing)
      }
    } catch (error) {
      continue
    }
  }
  
  log.debug('[LACENTRALE] Annonces extraites depuis containers', { count: listings.length })
  
  // STRATÉGIE 2: Si pas de résultats, extraire par liens (comme l'ancien parser)
  if (listings.length === 0 && html.length > 50000) {
    log.info('[LACENTRALE] Aucun container trouvé, extraction par liens...')
    
    const adLinkRegex = /href=["']([^"']*(?:\/auto-occasion-annonce[^"']*|\/annonce[^"']*))["']/gi
    const links: string[] = []
    let linkMatch
    while ((linkMatch = adLinkRegex.exec(html)) !== null && links.length < 100) {
      const link = linkMatch[1]
      if (!links.includes(link)) {
        links.push(link)
      }
    }
    
    log.debug('[LACENTRALE] Liens trouvés', { linksCount: links.length })
    
    for (const linkPath of links) {
      try {
        const url = linkPath.startsWith('http') 
          ? linkPath 
          : `https://www.lacentrale.fr${linkPath.startsWith('/') ? linkPath : `/${linkPath}`}`
        
        // Nettoyer l'URL
        const cleanUrl = url.split('#')[0].split('?')[0]
        
        // Trouver le contexte autour du lien dans le HTML (contexte plus large pour trouver le prix)
        const linkIndex = html.indexOf(linkPath)
        if (linkIndex !== -1) {
          // Contexte encore plus large (8000 caractères) pour capturer le prix qui peut être dans un élément parent
          const context = html.substring(
            Math.max(0, linkIndex - 5000),
            Math.min(html.length, linkIndex + 5000)
          )
          
          const listing = extractListingFromContext(context, cleanUrl)
          if (listing && !listings.some(l => l.url === listing.url)) {
            listings.push(listing)
          }
        }
      } catch (error) {
        continue
      }
    }
  }
  
  // STRATÉGIE 3: Chercher directement les liens dans les balises <a>
  if (listings.length === 0) {
    log.info('[LACENTRALE] Extraction directe depuis balises <a>...')
    
    const anchorRegex = /<a[^>]*href=["']([^"']*(?:\/auto-occasion-annonce[^"']*|\/annonce[^"']*))["'][^>]*>([\s\S]*?)<\/a>/gi
    
    let match
    while ((match = anchorRegex.exec(html)) !== null && listings.length < 200) {
      try {
        const urlPath = match[1]
        const content = match[2]
        
        // Extraire prix - chercher dans un contexte plus large autour du lien
        let price: number | null = null
        const linkIndex = html.indexOf(urlPath)
        let searchContent = content
        
        // Si on trouve le lien dans le HTML, chercher dans un contexte plus large
        if (linkIndex !== -1) {
          const contextAroundLink = html.substring(
            Math.max(0, linkIndex - 2000),
            Math.min(html.length, linkIndex + 2000)
          )
          searchContent = contextAroundLink
        }
        
        const pricePatterns = [
          // Patterns data-* (prioritaires)
          /data-price=["']?(\d{1,3}(?:\s?\d{3})*)/i,
          /data-price-eur=["']?(\d{1,3}(?:\s?\d{3})*)/i,
          /data-amount=["']?(\d{1,3}(?:\s?\d{3})*)/i,
          // Patterns dans le texte avec €
          /(\d{1,3}(?:\s?\d{3})*)\s*€/i,
          /(\d{1,3}(?:\s?\d{3})*)\s*EUR/i,
          /(\d{1,3}(?:\s?\d{3})*)\s*euros?/i,
          // Patterns dans les attributs
          /price["']?\s*[:=]\s*["']?(\d{1,3}(?:\s?\d{3})*)/i,
          // Patterns dans les balises HTML
          /<span[^>]*class=["'][^"']*price[^"']*["'][^>]*>([^<]*\d{1,3}(?:\s?\d{3})*[^<]*)<\/span>/i,
          /<div[^>]*class=["'][^"']*price[^"']*["'][^>]*>([^<]*\d{1,3}(?:\s?\d{3})*[^<]*)<\/div>/i,
          /<p[^>]*class=["'][^"']*price[^"']*["'][^>]*>([^<]*\d{1,3}(?:\s?\d{3})*[^<]*)<\/p>/i,
        ]
        
        for (const pattern of pricePatterns) {
          const match = searchContent.match(pattern)
          if (match && match[1]) {
            const priceStr = match[1].replace(/[^\d]/g, '') // Nettoyer tous les caractères non numériques
            if (priceStr.length > 0) {
              const priceValue = parseFloat(priceStr)
              if (!isNaN(priceValue) && priceValue > 100 && priceValue < 10000000) {
                price = priceValue
                break
              }
            }
          }
        }
        
        // Extraire année
        let year: number | null = null
        const yearMatch = content.match(/\b(19[5-9]\d|20[0-3]\d)\b/)
        if (yearMatch) {
          const yearValue = parseInt(yearMatch[0])
          if (yearValue >= 1950 && yearValue <= 2030) {
            year = yearValue
          }
        }
        
        // Extraire kilométrage
        let mileage: number | null = null
        const mileageMatch = content.match(/(\d{1,3}(?:\s?\d{3})*)\s*km/i)
        if (mileageMatch) {
          mileage = parseInt(mileageMatch[1].replace(/\s/g, ''))
          if (mileage > 1000000) mileage = null // Validation
        }
        
        // Extraire titre - chercher dans un contexte plus large
        let title = ''
        const linkIndexForTitle = html.indexOf(urlPath)
        let searchContentForTitle = content
        
        if (linkIndexForTitle !== -1) {
          const contextAroundLinkForTitle = html.substring(
            Math.max(0, linkIndexForTitle - 2000),
            Math.min(html.length, linkIndexForTitle + 2000)
          )
          searchContentForTitle = contextAroundLinkForTitle
        }
        
        const titlePatterns = [
          { match: searchContentForTitle.match(/data-title=["']([^"']{5,200})["']/i), idx: 1 },
          { match: searchContentForTitle.match(/data-name=["']([^"']{5,200})["']/i), idx: 1 },
          { match: searchContentForTitle.match(/aria-label=["']([^"']{5,200})["']/i), idx: 1 },
          { match: searchContentForTitle.match(/<h[123][^>]*>([^<]{10,200})<\/h[123]>/i), idx: 1 },
          { match: searchContentForTitle.match(/<a[^>]*title=["']([^"']{5,200})["']/i), idx: 1 },
          { match: searchContentForTitle.match(/<strong[^>]*>([^<]{10,200})<\/strong>/i), idx: 1 },
          { match: searchContentForTitle.match(/<span[^>]*class=["'][^"']*title[^"']*["'][^>]*>([^<]{10,200})<\/span>/i), idx: 1 },
        ]
        
        for (const { match, idx } of titlePatterns) {
          if (match && match[idx]) {
            const candidate = cleanHtml(match[idx]).replace(/\s+/g, ' ').trim()
            // Valider que ce n'est pas un titre invalide
            if (candidate.length >= 5 && 
                !candidate.includes('champs de saisie') && 
                !candidate.match(/^\d+$/) &&
                candidate.length < 200 &&
                !candidate.toLowerCase().includes('lacentrale')) {
              title = candidate
              break
            }
          }
        }
        
        // Extraire image - chercher dans un contexte plus large
        let imageUrl: string | null = null
        const imagePatterns = [
          /<img[^>]+data-src=["']([^"']+)["']/i,
          /<img[^>]+src=["']([^"']+)["']/i,
          /data-image=["']([^"']+)["']/i,
          /data-thumbnail=["']([^"']+)["']/i,
          /data-photo=["']([^"']+)["']/i,
          /background-image:\s*url\(["']?([^"')]+)["']?\)/i,
        ]
        
        for (const pattern of imagePatterns) {
          const match = searchContentForTitle.match(pattern)
          if (match && match[1] && 
              !match[1].includes('placeholder') && 
              !match[1].includes('default') &&
              !match[1].includes('logo') &&
              !match[1].includes('icon')) {
            imageUrl = match[1]
            if (!imageUrl.startsWith('http')) {
              imageUrl = imageUrl.startsWith('//') ? `https:${imageUrl}` : `https://www.lacentrale.fr${imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`}`
            }
            break
          }
        }
        
        if (urlPath) {
          const fullUrl = urlPath.startsWith('http') 
            ? urlPath 
            : `https://www.lacentrale.fr${urlPath.startsWith('/') ? urlPath : `/${urlPath}`}`
          
          const cleanUrl = fullUrl.split('#')[0].split('?')[0]
          
          const adIdMatch = cleanUrl.match(/\/auto-occasion-annonce-([^\/\.\?]+)/) ||
                            cleanUrl.match(/\/annonce\/([^\/\?]+)/) ||
                            cleanUrl.match(/\/annonce-([^\/\.\?]+)\.html/)
          const adId = adIdMatch ? adIdMatch[1] : `${Date.now()}_${listings.length}`
          
          // Si pas de titre trouvé, générer un titre unique pour éviter la déduplication agressive
          let finalTitle = title
          if (!finalTitle || finalTitle.length < 5 || finalTitle.includes('champs de saisie') || finalTitle.match(/^\d+$/)) {
            const parts: string[] = []
            if (year) parts.push(year.toString())
            if (price) parts.push(`${price.toLocaleString('fr-FR')}€`)
            if (mileage) parts.push(`${mileage.toLocaleString('fr-FR')} km`)
            
            if (parts.length === 0) {
              finalTitle = `Annonce LaCentrale (${adId.substring(0, 8)})`
            } else {
              finalTitle = `Annonce LaCentrale ${parts.join(' - ')} (${adId.substring(0, 8)})`
            }
          }
          
          if (!listings.some(l => l.url === cleanUrl)) {
            listings.push({
              id: `lacentrale_${adId}`,
              title: finalTitle,
              price_eur: price,
              year,
              mileage_km: mileage,
              url: cleanUrl,
              imageUrl,
              source: 'LaCentrale',
              city: null,
              score_ia: 50,
              score_final: 50,
            })
          }
        }
      } catch (error) {
        continue
      }
    }
  }

  log.info(`[LACENTRALE] 📊 ${listings.length} annonces extraites depuis attributs HTML`)
  return listings
}


/**
 * Extraire une annonce depuis un match HTML (container) - Fallback si Cheerio échoue
 * @param htmlContainer Le container HTML de l'annonce
 * @param fullHtml Le HTML complet (optionnel, pour chercher les prix dans un contexte plus large)
 */
function extractListingFromHtmlMatch(htmlContainer: string, fullHtml?: string): ListingResponse | null {
  const html = htmlContainer
  // Extraire l'URL en premier (obligatoire)
  const urlMatch =
    html.match(/href=["']([^"']*(?:\/auto-occasion-annonce[^"']*|\/annonce[^"']*))["']/i) ||
    html.match(/data-url=["']([^"']+)["']/i) ||
    html.match(/data-link=["']([^"']+)["']/i) ||
    html.match(/data-href=["']([^"']+)["']/i)

  const urlPath = urlMatch ? urlMatch[1] : null
  if (!urlPath || !urlPath.includes('auto-occasion-annonce') && !urlPath.includes('annonce')) {
    return null
  }

  const fullUrl = urlPath.startsWith('http') ? urlPath : `https://www.lacentrale.fr${urlPath.startsWith('/') ? urlPath : `/${urlPath}`}`
  const cleanUrl = fullUrl.split('#')[0].split('?')[0]

  // Extraire l'ID depuis l'URL
  const adIdMatch = cleanUrl.match(/\/auto-occasion-annonce-([^\/\.\?]+)/) ||
                    cleanUrl.match(/\/annonce\/([^\/\?]+)/) ||
                    cleanUrl.match(/\/annonce-([^\/\.\?]+)\.html/)
  const adId = adIdMatch ? adIdMatch[1] : `${Date.now()}_${Math.random()}`

  // Extraire le titre - plusieurs patterns avec validation (comme LeBonCoin)
  let title: string | null = null
  
  // STRATÉGIE 1: Chercher dans le contexte autour de l'URL
  if (fullHtml && cleanUrl) {
    const urlIndex = fullHtml.indexOf(cleanUrl)
    if (urlIndex !== -1) {
      const contextAroundUrl = fullHtml.substring(
        Math.max(0, urlIndex - 2000),
        Math.min(fullHtml.length, urlIndex + 2000)
      )
      
      const titlePatterns = [
        { match: contextAroundUrl.match(/data-title=["']([^"']{5,200})["']/i), idx: 1 },
        { match: contextAroundUrl.match(/data-name=["']([^"']{5,200})["']/i), idx: 1 },
        { match: contextAroundUrl.match(/data-label=["']([^"']{5,200})["']/i), idx: 1 },
        { match: contextAroundUrl.match(/aria-label=["']([^"']{5,200})["']/i), idx: 1 },
        { match: contextAroundUrl.match(/<h[123][^>]*>([^<]{10,200})<\/h[123]>/i), idx: 1 },
        { match: contextAroundUrl.match(/<a[^>]*title=["']([^"']{5,200})["']/i), idx: 1 },
        { match: contextAroundUrl.match(/<strong[^>]*>([^<]{10,200})<\/strong>/i), idx: 1 },
        { match: contextAroundUrl.match(/<span[^>]*class=["'][^"']*title[^"']*["'][^>]*>([^<]{10,200})<\/span>/i), idx: 1 },
        { match: contextAroundUrl.match(/<div[^>]*class=["'][^"']*title[^"']*["'][^>]*>([^<]{10,200})<\/div>/i), idx: 1 },
        // Chercher des patterns spécifiques LaCentrale
        { match: contextAroundUrl.match(/<span[^>]*class=["'][^"']*vehicle[^"']*name[^"']*["'][^>]*>([^<]{10,200})<\/span>/i), idx: 1 },
        { match: contextAroundUrl.match(/<span[^>]*class=["'][^"']*ad[^"']*title[^"']*["'][^>]*>([^<]{10,200})<\/span>/i), idx: 1 },
      ]
      
      for (const { match, idx } of titlePatterns) {
        if (match && match[idx]) {
          const candidate = cleanHtml(match[idx]).replace(/\s+/g, ' ').trim()
          if (candidate.length >= 5 && 
              !candidate.includes('champs de saisie') && 
              !candidate.match(/^\d+$/) &&
              candidate.length < 200 &&
              !candidate.toLowerCase().includes('lacentrale')) {
            title = candidate
            console.log('[LACENTRALE DEBUG] Titre trouvé dans contexte:', { title, url: cleanUrl })
            break
          }
        }
      }
    }
  }
  
  // STRATÉGIE 2: Chercher dans le container HTML si pas trouvé
  if (!title) {
    const titlePatterns = [
      { match: html.match(/data-title=["']([^"']{5,200})["']/i), idx: 1 },
      { match: html.match(/data-name=["']([^"']{5,200})["']/i), idx: 1 },
      { match: html.match(/data-label=["']([^"']{5,200})["']/i), idx: 1 },
      { match: html.match(/aria-label=["']([^"']{5,200})["']/i), idx: 1 },
      { match: html.match(/<h[123][^>]*>([^<]{10,200})<\/h[123]>/i), idx: 1 },
      { match: html.match(/<a[^>]*title=["']([^"']{5,200})["']/i), idx: 1 },
      { match: html.match(/<strong[^>]*>([^<]{10,200})<\/strong>/i), idx: 1 },
      { match: html.match(/<span[^>]*class=["'][^"']*title[^"']*["'][^>]*>([^<]{10,200})<\/span>/i), idx: 1 },
    ]
    
    for (const { match, idx } of titlePatterns) {
      if (match && match[idx]) {
        const candidate = cleanHtml(match[idx]).replace(/\s+/g, ' ').trim()
        if (candidate.length >= 5 && 
            !candidate.includes('champs de saisie') && 
            !candidate.match(/^\d+$/) &&
            candidate.length < 200) {
          title = candidate
          break
        }
      }
    }
  }

  // Extraire le prix - plusieurs patterns avec validation (comme Leboncoin)
  // STRATÉGIE 1: Chercher dans le HTML complet si disponible (contexte plus large)
  let price: number | null = null
  const searchContext = fullHtml || html
  
  // Chercher des structures JSON inline dans le contexte
  const jsonMatches = searchContext.match(/\{[^{}]{0,200}"price"[^{}]{0,200}\}/g) || 
                      searchContext.match(/\{[^{}]{0,200}"priceEur"[^{}]{0,200}\}/g) ||
                      searchContext.match(/\{[^{}]{0,200}"amount"[^{}]{0,200}\}/g)
  
  if (jsonMatches && jsonMatches.length > 0) {
    for (const jsonStr of jsonMatches.slice(0, 10)) {
      try {
        const jsonData = JSON.parse(jsonStr)
        const foundPrice = jsonData.price || jsonData.priceEur || jsonData.amount || jsonData.value
        if (foundPrice && typeof foundPrice === 'number' && foundPrice > 100 && foundPrice < 10000000) {
          price = foundPrice
          break
        } else if (typeof foundPrice === 'string') {
          const cleaned = foundPrice.replace(/[^\d]/g, '')
          if (cleaned.length > 0) {
            const parsed = parseFloat(cleaned)
            if (!isNaN(parsed) && parsed > 100 && parsed < 10000000) {
              price = parsed
              break
            }
          }
        }
      } catch (error) {
        // Ignorer les erreurs de parsing JSON
        continue
      }
    }
  }
  
  // STRATÉGIE 2: Chercher avec des patterns regex dans le contexte (si JSON n'a pas fonctionné)
  if (!price) {
    const pricePatterns = [
      // Patterns data-* (prioritaires)
      /data-price=["']?(\d{1,3}(?:\s?\d{3})*)/i,
      /data-price-eur=["']?(\d{1,3}(?:\s?\d{3})*)/i,
      /data-amount=["']?(\d{1,3}(?:\s?\d{3})*)/i,
      /data-value=["']?(\d{1,3}(?:\s?\d{3})*)/i,
      // Patterns dans le texte avec €
      /(\d{1,3}(?:\s?\d{3})*)\s*€/i,
      /(\d{1,3}(?:\s?\d{3})*)\s*EUR/i,
      /(\d{1,3}(?:\s?\d{3})*)\s*euros?/i,
      // Patterns dans les attributs
      /price["']?\s*[:=]\s*["']?(\d{1,3}(?:\s?\d{3})*)/i,
      /amount["']?\s*[:=]\s*["']?(\d{1,3}(?:\s?\d{3})*)/i,
      // Patterns dans les balises HTML
      /<span[^>]*class=["'][^"']*price[^"']*["'][^>]*>([^<]*\d{1,3}(?:\s?\d{3})*[^<]*)<\/span>/i,
      /<div[^>]*class=["'][^"']*price[^"']*["'][^>]*>([^<]*\d{1,3}(?:\s?\d{3})*[^<]*)<\/div>/i,
      /<strong[^>]*class=["'][^"']*price[^"']*["'][^>]*>([^<]*\d{1,3}(?:\s?\d{3})*[^<]*)<\/strong>/i,
      /<p[^>]*class=["'][^"']*price[^"']*["'][^>]*>([^<]*\d{1,3}(?:\s?\d{3})*[^<]*)<\/p>/i,
      // Patterns JSON embarqués
      /"price"\s*:\s*(\d+)/i,
      /"priceEur"\s*:\s*(\d+)/i,
      /"amount"\s*:\s*(\d+)/i,
    ]
    
    // Si on a le HTML complet, chercher le prix dans un contexte autour de l'URL
    if (fullHtml && cleanUrl) {
      const urlIndex = fullHtml.indexOf(cleanUrl)
      if (urlIndex !== -1) {
        // Chercher dans un contexte de 3000 caractères autour de l'URL
        const contextAroundUrl = fullHtml.substring(
          Math.max(0, urlIndex - 1500),
          Math.min(fullHtml.length, urlIndex + 1500)
        )
        
        for (const pattern of pricePatterns) {
          const match = contextAroundUrl.match(pattern)
          if (match && match[1]) {
            const priceStr = match[1].replace(/[^\d]/g, '')
            if (priceStr.length > 0) {
              const priceValue = parseFloat(priceStr)
              if (!isNaN(priceValue) && priceValue > 100 && priceValue < 10000000) {
                price = priceValue
                console.log('[LACENTRALE DEBUG] Prix trouvé dans contexte autour URL:', { url: cleanUrl, price })
                break
              }
            }
          }
        }
      }
    }
    
    // Si toujours pas de prix, chercher dans le container HTML
    if (!price) {
      for (const pattern of pricePatterns) {
        const match = html.match(pattern)
        if (match && match[1]) {
          const priceStr = match[1].replace(/[^\d]/g, '') // Nettoyer tous les caractères non numériques
          if (priceStr.length > 0) {
            const priceValue = parseFloat(priceStr)
            if (!isNaN(priceValue) && priceValue > 100 && priceValue < 10000000) {
              price = priceValue
              break
            }
          }
        }
      }
    }
  }

  // Extraire l'année - validation stricte
  let year: number | null = null
  // Chercher toutes les années possibles dans le contexte
  const allYearMatches = html.match(/\b(19[5-9]\d|20[0-3]\d)\b/g) || []
  if (allYearMatches.length > 0) {
    // Si plusieurs années, prendre la plus récente (généralement l'année du véhicule)
    const years = allYearMatches.map(y => parseInt(y)).filter(y => y >= 1950 && y <= 2030)
    if (years.length > 0) {
      // Si toutes les années sont 2000, c'est probablement une valeur par défaut
      if (years.every(y => y === 2000)) {
        year = null
      } else {
        // Prendre l'année la plus récente qui n'est pas 2000
        const yearsNot2000 = years.filter(y => y !== 2000)
        if (yearsNot2000.length > 0) {
          year = Math.max(...yearsNot2000)
        } else {
          year = 2000 // Garder 2000 si c'est la seule option valide
        }
      }
    }
  }

  // Extraire le kilométrage
  let mileage: number | null = null
  const mileageMatch = html.match(/(\d{1,3}(?:\s?\d{3})*)\s*km/i)
  if (mileageMatch) {
    mileage = parseInt(mileageMatch[1].replace(/\s/g, ''))
    if (mileage > 1000000) mileage = null // Validation
  }

  // Extraire l'image - chercher dans un contexte plus large (comme LeBonCoin)
  let imageUrl: string | null = null
  
  // STRATÉGIE 1: Chercher dans le contexte autour de l'URL
  if (fullHtml && cleanUrl) {
    const urlIndex = fullHtml.indexOf(cleanUrl)
    if (urlIndex !== -1) {
      const contextAroundUrl = fullHtml.substring(
        Math.max(0, urlIndex - 2000),
        Math.min(fullHtml.length, urlIndex + 2000)
      )
      
      const imagePatterns = [
        /<img[^>]+data-src=["']([^"']+)["']/i,
        /<img[^>]+src=["']([^"']+)["']/i,
        /data-image=["']([^"']+)["']/i,
        /data-thumbnail=["']([^"']+)["']/i,
        /data-photo=["']([^"']+)["']/i,
        /data-img=["']([^"']+)["']/i,
        /data-picture=["']([^"']+)["']/i,
        /background-image:\s*url\(["']?([^"')]+)["']?\)/i,
        /<img[^>]+class=["'][^"']*vehicle[^"']*["'][^>]+src=["']([^"']+)["']/i,
        /<img[^>]+class=["'][^"']*ad[^"']*image[^"']*["'][^>]+src=["']([^"']+)["']/i,
      ]
      
      for (const pattern of imagePatterns) {
        const match = contextAroundUrl.match(pattern)
        if (match && match[1] && 
            !match[1].includes('placeholder') && 
            !match[1].includes('default') &&
            !match[1].includes('logo') &&
            !match[1].includes('icon')) {
          imageUrl = match[1]
          if (!imageUrl.startsWith('http')) {
            imageUrl = imageUrl.startsWith('//') 
              ? `https:${imageUrl}` 
              : `https://www.lacentrale.fr${imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`}`
          }
          console.log('[LACENTRALE DEBUG] Image trouvée dans contexte:', { imageUrl, url: cleanUrl })
          break
        }
      }
    }
  }
  
  // STRATÉGIE 2: Chercher dans le container HTML si pas trouvé
  if (!imageUrl) {
    const imagePatterns = [
      /<img[^>]+data-src=["']([^"']+)["']/i,
      /<img[^>]+src=["']([^"']+)["']/i,
      /data-image=["']([^"']+)["']/i,
      /data-thumbnail=["']([^"']+)["']/i,
      /data-photo=["']([^"']+)["']/i,
    ]
    
    for (const pattern of imagePatterns) {
      const match = html.match(pattern)
      if (match && match[1] && 
          !match[1].includes('placeholder') && 
          !match[1].includes('default')) {
        imageUrl = match[1]
        if (!imageUrl.startsWith('http')) {
          imageUrl = imageUrl.startsWith('//') 
            ? `https:${imageUrl}` 
            : `https://www.lacentrale.fr${imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`}`
        }
        break
      }
    }
  }

  // Si pas de titre valide trouvé, générer un titre basé sur les infos disponibles
  if (!title || title.length < 5 || title.includes('champs de saisie') || title.match(/^\d+$/)) {
    const parts: string[] = []
    if (year) parts.push(year.toString())
    if (price) parts.push(`${price.toLocaleString('fr-FR')}€`)
    if (mileage) parts.push(`${mileage.toLocaleString('fr-FR')} km`)
    
    if (parts.length === 0) {
      title = `Annonce LaCentrale (${adId.substring(0, 8)})`
    } else {
      title = `Annonce LaCentrale ${parts.join(' - ')} (${adId.substring(0, 8)})`
    }
  }
  
  return {
    id: `lacentrale_${adId}`,
    title,
    price_eur: price,
    year,
    mileage_km: mileage,
    url: cleanUrl,
    imageUrl,
    source: 'LaCentrale',
    city: null,
    score_ia: 50,
    score_final: 50,
  }
}

/**
 * Extraire une annonce depuis le contexte autour d'un lien
 */
function extractListingFromContext(context: string, url: string): ListingResponse | null {
  // Extraire l'ID depuis l'URL en premier
  const adIdMatch = url.match(/\/auto-occasion-annonce-([^\/\.\?]+)/) ||
                    url.match(/\/annonce\/([^\/\?]+)/) ||
                    url.match(/\/annonce-([^\/\.\?]+)\.html/)
  const adId = adIdMatch ? adIdMatch[1] : `${Date.now()}_${Math.random()}`

  // Chercher le titre dans plusieurs patterns spécifiques à LaCentrale
  let title: string | null = null
  
  // Pattern 1: data-title, data-name, data-label
  title = context.match(/data-title=["']([^"']{5,200})["']/i)?.[1]?.trim() ||
          context.match(/data-name=["']([^"']{5,200})["']/i)?.[1]?.trim() ||
          context.match(/data-label=["']([^"']{5,200})["']/i)?.[1]?.trim() ||
          null

  // Pattern 2: title attribute
  if (!title) {
    const titleAttr = context.match(/title=["']([^"']{5,200})["']/i)?.[1]
    if (titleAttr && !titleAttr.includes('champs de saisie') && !titleAttr.match(/^\d+$/)) {
      title = titleAttr.trim()
    }
  }

  // Pattern 3: aria-label
  if (!title) {
    const ariaLabel = context.match(/aria-label=["']([^"']{5,200})["']/i)?.[1]
    if (ariaLabel && !ariaLabel.includes('champs de saisie') && !ariaLabel.match(/^\d+$/)) {
      title = ariaLabel.trim()
    }
  }

  // Pattern 4: h2, h3 tags
  if (!title) {
    const hMatch = context.match(/<h[23][^>]*>([^<]{10,200})<\/h[23]>/i)?.[1]
    if (hMatch) {
      const cleaned = cleanHtml(hMatch)
      if (cleaned.length > 5 && !cleaned.includes('champs de saisie') && !cleaned.match(/^\d+$/)) {
        title = cleaned.trim()
      }
    }
  }

  // Pattern 5: Strong/bold text (souvent utilisé pour les titres)
  if (!title) {
    const strongMatch = context.match(/<strong[^>]*>([^<]{10,200})<\/strong>/i)?.[1]
    if (strongMatch) {
      const cleaned = cleanHtml(strongMatch)
      if (cleaned.length > 5 && !cleaned.includes('champs de saisie')) {
        title = cleaned.trim()
      }
    }
  }

  // Nettoyer le titre
  if (title) {
    title = cleanHtml(title)
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 150) // Limiter la longueur
  }
  
  // Extraire le prix - plusieurs patterns (comme Leboncoin)
  // STRATÉGIE 1: Chercher dans les structures JSON embarquées dans le contexte
  let price: number | null = null
  
  // Chercher des structures JSON inline dans le contexte (comme LeBonCoin avec __NEXT_DATA__)
  const jsonMatches = context.match(/\{[^{}]*"price"[^{}]*\}/g) || 
                      context.match(/\{[^{}]*"priceEur"[^{}]*\}/g) ||
                      context.match(/\{[^{}]*"amount"[^{}]*\}/g)
  
  if (jsonMatches && jsonMatches.length > 0) {
    for (const jsonStr of jsonMatches.slice(0, 5)) { // Limiter à 5 pour performance
      try {
        const jsonData = JSON.parse(jsonStr)
        const foundPrice = jsonData.price || jsonData.priceEur || jsonData.amount || jsonData.value
        if (foundPrice && typeof foundPrice === 'number' && foundPrice > 100 && foundPrice < 10000000) {
          price = foundPrice
          console.log('[LACENTRALE DEBUG] Prix trouvé dans JSON embarqué:', { price, url })
          break
        } else if (typeof foundPrice === 'string') {
          const cleaned = foundPrice.replace(/[^\d]/g, '')
          if (cleaned.length > 0) {
            const parsed = parseFloat(cleaned)
            if (!isNaN(parsed) && parsed > 100 && parsed < 10000000) {
              price = parsed
              console.log('[LACENTRALE DEBUG] Prix trouvé dans JSON embarqué (string):', { price, url })
              break
            }
          }
        }
      } catch (error) {
        // Ignorer les erreurs de parsing JSON
        continue
      }
    }
  }
  
  // STRATÉGIE 2: Chercher avec des patterns regex (si JSON n'a pas fonctionné)
  if (!price) {
    const pricePatterns = [
      // Patterns data-* (prioritaires)
      /data-price=["']?(\d{1,3}(?:\s?\d{3})*)/i,
      /data-price-eur=["']?(\d{1,3}(?:\s?\d{3})*)/i,
      /data-amount=["']?(\d{1,3}(?:\s?\d{3})*)/i,
      /data-value=["']?(\d{1,3}(?:\s?\d{3})*)/i,
      // Patterns dans le texte avec € (plus flexibles)
      /(\d{1,3}(?:\s?\d{3})*)\s*€/i,
      /(\d{1,3}(?:\s?\d{3})*)\s*EUR/i,
      /(\d{1,3}(?:\s?\d{3})*)\s*euros?/i,
      // Patterns dans les attributs
      /price["']?\s*[:=]\s*["']?(\d{1,3}(?:\s?\d{3})*)/i,
      /amount["']?\s*[:=]\s*["']?(\d{1,3}(?:\s?\d{3})*)/i,
      // Patterns dans les balises HTML (plus flexibles pour capturer les prix avec espaces)
      /<span[^>]*class=["'][^"']*price[^"']*["'][^>]*>([^<]*\d{1,3}(?:\s?\d{3})*[^<]*)<\/span>/i,
      /<div[^>]*class=["'][^"']*price[^"']*["'][^>]*>([^<]*\d{1,3}(?:\s?\d{3})*[^<]*)<\/div>/i,
      /<p[^>]*class=["'][^"']*price[^"']*["'][^>]*>([^<]*\d{1,3}(?:\s?\d{3})*[^<]*)<\/p>/i,
      /<strong[^>]*class=["'][^"']*price[^"']*["'][^>]*>([^<]*\d{1,3}(?:\s?\d{3})*[^<]*)<\/strong>/i,
      // Patterns pour les prix dans les attributs style ou data-*
      /style=["'][^"']*price[^"']*["'][^>]*>([^<]*\d{1,3}(?:\s?\d{3})*[^<]*)</i,
      // Patterns JSON-like dans le HTML
      /"price"\s*:\s*(\d+)/i,
      /"priceEur"\s*:\s*(\d+)/i,
      /"amount"\s*:\s*(\d+)/i,
    ]
    
    for (const pattern of pricePatterns) {
      const match = context.match(pattern)
      if (match && match[1]) {
        const priceStr = match[1].replace(/[^\d]/g, '') // Nettoyer tous les caractères non numériques
        if (priceStr.length > 0) {
          const priceValue = parseFloat(priceStr)
          if (!isNaN(priceValue) && priceValue > 100 && priceValue < 10000000) {
            price = priceValue
            break
          }
        }
      }
    }
  }
  
  // STRATÉGIE 3: Chercher dans les éléments parents (div, article, etc.) qui contiennent le lien
  if (!price) {
    // Chercher un élément parent qui pourrait contenir le prix
    const parentMatch = context.match(/<(div|article|section)[^>]*>[\s\S]*?href=["'][^"']*auto-occasion-annonce[^"']*["'][\s\S]*?<\/(div|article|section)>/i)
    if (parentMatch) {
      const parentContent = parentMatch[0]
      // Chercher le prix dans le contenu parent
      const parentPriceMatch = parentContent.match(/(\d{1,3}(?:\s?\d{3})*)\s*€/i)
      if (parentPriceMatch) {
        const priceStr = parentPriceMatch[1].replace(/[^\d]/g, '')
        if (priceStr.length > 0) {
          const priceValue = parseFloat(priceStr)
          if (!isNaN(priceValue) && priceValue > 100 && priceValue < 10000000) {
            price = priceValue
            console.log('[LACENTRALE DEBUG] Prix trouvé dans élément parent:', { price, url })
          }
        }
      }
    }
  }
  
  // 🔍 DEBUG : Log si aucun prix n'a été trouvé
  if (!price) {
    console.log('[LACENTRALE DEBUG] Aucun prix trouvé pour:', {
      url,
      contextLength: context.length,
      hasPriceKeywords: context.includes('price') || context.includes('€') || context.includes('EUR'),
      contextSnippet: context.substring(0, 500)
    })
  }

  // Extraire l'année - chercher après le prix ou dans le contexte
  let year: number | null = null
  const yearMatch = context.match(/\b(19[5-9]\d|20[0-3]\d)\b/)
  if (yearMatch) {
    const yearValue = parseInt(yearMatch[0])
    if (yearValue >= 1950 && yearValue <= 2030) {
      year = yearValue
    }
  }

  // Extraire le kilométrage
  let mileage: number | null = null
  const mileageMatch = context.match(/(\d{1,3}(?:\s?\d{3})*)\s*km/i)
  if (mileageMatch) {
    mileage = parseInt(mileageMatch[1].replace(/\s/g, ''))
    if (mileage > 1000000) mileage = null // Validation
  }

  // Extraire l'image
  let imageUrl: string | null = null
  const imagePatterns = [
    /<img[^>]+data-src=["']([^"']+)["']/i,
    /<img[^>]+src=["']([^"']+)["']/i,
    /data-image=["']([^"']+)["']/i,
    /data-thumbnail=["']([^"']+)["']/i,
  ]
  
  for (const pattern of imagePatterns) {
    const match = context.match(pattern)
    if (match && match[1] && !match[1].includes('placeholder') && !match[1].includes('default')) {
      imageUrl = match[1]
      if (!imageUrl.startsWith('http')) {
        imageUrl = imageUrl.startsWith('//') 
          ? `https:${imageUrl}` 
          : `https://www.lacentrale.fr${imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`}`
      }
      break
    }
  }
  
  // Si pas de titre valide trouvé, essayer d'extraire depuis l'URL (marque/modèle peuvent être dans l'URL)
  if (!title || title.length < 5 || title.includes('champs de saisie') || title.match(/^\d+$/)) {
    // Essayer d'extraire marque/modèle depuis l'URL si possible
    const urlParts = url.split('/').filter(p => p)
    const lastPart = urlParts[urlParts.length - 1] || ''
    const urlTitleMatch = lastPart.match(/([a-z]+)-([a-z]+)/i)
    
    if (urlTitleMatch && urlTitleMatch[1] && urlTitleMatch[2]) {
      const brand = urlTitleMatch[1].charAt(0).toUpperCase() + urlTitleMatch[1].slice(1)
      const model = urlTitleMatch[2].charAt(0).toUpperCase() + urlTitleMatch[2].slice(1)
      const parts: string[] = [brand, model]
      if (year) parts.push(year.toString())
      title = parts.join(' ')
    } else {
      // Fallback : générer un titre basé sur les infos disponibles
      const parts: string[] = []
      if (year) parts.push(year.toString())
      if (price) parts.push(`${price.toLocaleString('fr-FR')}€`)
      if (mileage) parts.push(`${mileage.toLocaleString('fr-FR')} km`)
      
      // Utiliser l'ID pour un titre unique si aucune info n'est disponible
      if (parts.length === 0) {
        title = `Annonce LaCentrale (${adId.substring(0, 8)})`
      } else {
        title = `Annonce LaCentrale ${parts.join(' - ')} (${adId.substring(0, 8)})`
      }
    }
  }

  return {
    id: `lacentrale_${adId}`,
    title,
    price_eur: price,
    year,
    mileage_km: mileage,
    url,
    imageUrl,
    source: 'LaCentrale',
    city: null,
    score_ia: 50,
    score_final: 50,
  }
}

/**
 * Rechercher récursivement des listings dans un objet JSON
 */
function findListingsInObject(obj: any, depth: number = 0, maxDepth: number = 5, visited: Set<any> = new Set()): any[] | null {
  if (depth > maxDepth || !obj || typeof obj !== 'object' || visited.has(obj)) {
    return null
  }
  
  visited.add(obj)
  
  // Clés qui indiquent souvent des listings
  const listingKeys = ['ads', 'listings', 'vehicles', 'results', 'items', 'data', 'vehiclesList', 'classifieds', 'products', 'offers']
  
  for (const key of listingKeys) {
    if (obj[key] && Array.isArray(obj[key]) && obj[key].length > 0) {
      // Vérifier si les éléments ressemblent à des listings
      const firstItem = obj[key][0]
      if (firstItem && typeof firstItem === 'object') {
        const hasListingProps = firstItem.id || firstItem.url || firstItem.price || firstItem.title || firstItem.adId
        if (hasListingProps) {
          return obj[key]
        }
      }
    }
  }
  
  // Recherche récursive dans les objets
  for (const key in obj) {
    if (obj.hasOwnProperty(key) && typeof obj[key] === 'object') {
      const found = findListingsInObject(obj[key], depth + 1, maxDepth, visited)
      if (found && Array.isArray(found) && found.length > 0) {
        return found
      }
    }
  }
  
  return null
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
  // ✅ RETOUR À L'ANCIENNE URL QUI MARCHAIT
  // Format: makesModels=BRAND-MODEL (avec tiret, pas deux-points)
  const brand = (query.brand || '').trim().toUpperCase().replace(/\s+/g, '')
  const model = (query.model || '').trim().toUpperCase().replace(/\s+/g, '')
  
  // Ajuster le prix selon la passe
  let priceMax = query.maxPrice
  if (pass === 'relaxed') {
    priceMax = Math.round(query.maxPrice * 1.1)
  } else if (pass === 'opportunity') {
    priceMax = Math.round(query.maxPrice * 1.2)
  }
  
  const makeModel = `${brand}-${model}`
  const url = `https://www.lacentrale.fr/listing?makesModels=${encodeURIComponent(makeModel)}&priceMax=${priceMax}`
  
  return url
}

/**
 * Mapper annonce LaCentrale vers format unifié
 */
function mapLaCentraleAdToUnified(ad: any): ListingResponse {
  // Extraire l'ID d'abord (nécessaire pour générer un titre unique si besoin)
  const adId = ad.id || ad.adId || ad.listId || ad.externalId || `${Date.now()}`
  
  // Extraire marque et modèle (chercher dans plusieurs propriétés possibles, y compris imbriquées)
  const brand = 
    ad.brand || 
    ad.make || 
    ad.marque || 
    ad.manufacturer || 
    ad.makeLabel ||
    ad.vehicle?.brand ||
    ad.vehicle?.make ||
    ad.car?.brand ||
    ad.car?.make ||
    ad.info?.brand ||
    ad.info?.make ||
    null
  
  const model = 
    ad.model || 
    ad.modelName || 
    ad.modelLabel ||
    ad.vehicle?.model ||
    ad.vehicle?.modelName ||
    ad.car?.model ||
    ad.car?.modelName ||
    ad.info?.model ||
    ad.info?.modelName ||
    null
  
  const makeModel = 
    ad.makeModel || 
    ad.brandModel ||
    ad.vehicle?.makeModel ||
    ad.car?.makeModel ||
    ad.info?.makeModel ||
    null
  
  // Extraire le titre (chercher dans plusieurs propriétés, y compris imbriquées)
  let title = 
    ad.title || 
    ad.name || 
    ad.label || 
    ad.subject || 
    ad.headline ||
    ad.vehicle?.title ||
    ad.vehicle?.name ||
    ad.car?.title ||
    ad.car?.name ||
    ad.info?.title ||
    ad.info?.name ||
    null
  
  // Si pas de titre mais qu'on a makeModel, l'utiliser
  if (!title && makeModel) {
    title = makeModel
  }
  
  // Construire l'URL - LaCentrale peut avoir différents formats
  let urlPath = ad.url || ad.link || ad.href || ad.path || `/auto-occasion-annonce-${adId}.html`
  
  // Nettoyer l'URL
  urlPath = String(urlPath).split('#')[0].split('?')[0]
  
  // Construire l'URL complète
  const url = urlPath.startsWith('http') 
    ? urlPath 
    : `https://www.lacentrale.fr${urlPath.startsWith('/') ? urlPath : `/${urlPath}`}`
  
  // Extraire le prix (chercher dans plusieurs propriétés, y compris imbriquées)
  // Comme Leboncoin, LaCentrale peut avoir le prix dans différentes structures
  let price: number | null = null
  
  // Chercher dans toutes les propriétés possibles (comme Leboncoin)
  const priceSources = [
    ad.price,
    ad.priceEur,
    ad.price_eur,
    ad.priceEurValue,
    ad.vehicle?.price,
    ad.vehicle?.priceEur,
    ad.vehicle?.price_eur,
    ad.car?.price,
    ad.car?.priceEur,
    ad.car?.price_eur,
    ad.info?.price,
    ad.info?.priceEur,
    ad.info?.price_eur,
    ad.details?.price,
    ad.details?.priceEur,
    ad.attributes?.price,
    ad.attributes?.priceEur,
    ad.pricing?.price,
    ad.pricing?.priceEur,
    ad.pricing?.amount,
  ]
  
  // Traiter chaque source possible
  for (const priceSource of priceSources) {
    if (priceSource === null || priceSource === undefined) continue
    
    // Si c'est un tableau (comme Leboncoin), prendre le premier élément
    if (Array.isArray(priceSource) && priceSource.length > 0) {
      const firstPrice = priceSource[0]
      if (typeof firstPrice === 'number' && firstPrice > 0) {
        price = firstPrice
        break
      } else if (typeof firstPrice === 'string') {
        const parsed = parseFloat(firstPrice.replace(/[^\d]/g, ''))
        if (!isNaN(parsed) && parsed > 0) {
          price = parsed
          break
        }
      }
    }
    // Si c'est un nombre
    else if (typeof priceSource === 'number' && priceSource > 0) {
      price = priceSource
      break
    }
    // Si c'est une chaîne
    else if (typeof priceSource === 'string') {
      // Nettoyer la chaîne et extraire le nombre
      const cleaned = priceSource.replace(/[^\d]/g, '')
      if (cleaned.length > 0) {
        const parsed = parseFloat(cleaned)
        if (!isNaN(parsed) && parsed > 0 && parsed < 10000000) { // Validation raisonnable
          price = parsed
          break
        }
      }
    }
  }
  
  // Extraire l'année (chercher dans plusieurs propriétés, y compris imbriquées)
  let year: number | null = null
  const yearSource = 
    ad.year || 
    ad.registrationYear ||
    ad.vehicle?.year ||
    ad.vehicle?.registrationYear ||
    ad.car?.year ||
    ad.car?.registrationYear ||
    ad.info?.year ||
    ad.info?.registrationYear ||
    null
  
  if (typeof yearSource === 'number') {
    year = yearSource
  } else if (typeof yearSource === 'string') {
    year = parseInt(yearSource)
  }
  
  // Extraire le kilométrage (chercher dans plusieurs propriétés, y compris imbriquées)
  let mileage: number | null = null
  const mileageSource = 
    ad.mileage || 
    ad.mileageKm ||
    ad.vehicle?.mileage ||
    ad.vehicle?.mileageKm ||
    ad.car?.mileage ||
    ad.car?.mileageKm ||
    ad.info?.mileage ||
    ad.info?.mileageKm ||
    null
  
  if (typeof mileageSource === 'number') {
    mileage = mileageSource
  } else if (typeof mileageSource === 'string') {
    mileage = parseFloat(mileageSource.replace(/\s/g, ''))
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

  // Construire un titre descriptif (comme Leboncoin)
  let finalTitle = String(title || '').trim()
  
  // Si pas de titre ou titre trop court, construire depuis marque/modèle/année
  if (!finalTitle || finalTitle.length < 5 || finalTitle === 'Annonce LaCentrale') {
    const titleParts: string[] = []
    
    // Ajouter marque et modèle si disponibles
    if (brand) titleParts.push(brand)
    if (model) titleParts.push(model)
    
    // Si on a makeModel, l'utiliser directement
    if (makeModel && !brand && !model) {
      titleParts.push(makeModel)
    }
    
    // Ajouter l'année si disponible
    if (year) {
      titleParts.push(year.toString())
    }
    
    // Construire le titre final
    if (titleParts.length > 0) {
      finalTitle = titleParts.join(' ')
    } else {
      // Fallback : utiliser année, prix, kilométrage si disponibles
      const fallbackParts: string[] = []
      if (year) fallbackParts.push(year.toString())
      if (price) fallbackParts.push(`${price.toLocaleString('fr-FR')}€`)
      if (mileage) fallbackParts.push(`${mileage.toLocaleString('fr-FR')} km`)
      
      if (fallbackParts.length > 0) {
        finalTitle = fallbackParts.join(' - ')
      } else {
        // Dernier recours : utiliser l'ID de l'annonce (comme dans l'image)
        const shortId = String(adId).substring(0, 8)
        finalTitle = `Annonce LaCentrale ${year ? year : ''} (${shortId})`.trim()
      }
    }
  }
  
  // Si le titre contient encore "Annonce LaCentrale" sans autres infos, améliorer avec l'ID
  if (finalTitle === 'Annonce LaCentrale' || (finalTitle.startsWith('Annonce LaCentrale') && !finalTitle.includes('('))) {
    const shortId = String(adId).substring(0, 8)
    if (year) {
      finalTitle = `Annonce LaCentrale ${year} (${shortId})`
    } else {
      finalTitle = `Annonce LaCentrale (${shortId})`
    }
  }
  
  return {
    id: `lacentrale_${adId}`,
    title: finalTitle,
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
 * Scrape LaCentrale avec ZenRows Scraping Browser (Playwright)
 * Utilise le SDK ZenRows pour obtenir l'URL de connexion correcte
 */
async function extractWithScrapingBrowser(
  url: string,
  abortSignal?: AbortSignal
): Promise<ListingResponse[]> {
  const ZENROWS_API_KEY = getZenRowsApiKey()
  
  if (!ZENROWS_API_KEY) {
    log.error('[LACENTRALE] ZENROWS_API_KEY manquant pour Scraping Browser')
    return []
  }
  
  log.info('[LACENTRALE] 🌐 Connexion au navigateur ZenRows...')
  
  let browser: any = null
  
  try {
    // Charger dynamiquement Playwright et le SDK ZenRows via le wrapper
    // Le wrapper utilise require() pour éviter l'analyse Next.js
    const { chromium, ScrapingBrowser, ProxyRegion } = await loadScrapingBrowserDeps()
    
    // Utiliser le SDK ZenRows pour obtenir l'URL de connexion correcte
    const scrapingBrowser = new ScrapingBrowser({ apiKey: ZENROWS_API_KEY })
    const connectionURL = scrapingBrowser.getConnectURL({ 
      proxy: { location: ProxyRegion.Europe }
    })
    
    log.info('[LACENTRALE] 🌐 URL de connexion obtenue via SDK ZenRows')
    
    // Se connecter au navigateur ZenRows via CDP (Chrome DevTools Protocol)
    browser = await chromium.connectOverCDP(connectionURL, { 
      timeout: 60000
    })
    
    // Créer une nouvelle page
    const page = await browser.newPage()
    
    // Attendre que la page charge complètement
    log.info(`[LACENTRALE] 🌐 Navigation vers: ${url}`)
    
    await page.goto(url, { 
      waitUntil: 'networkidle',
      timeout: 45000 
    })
    
    // Attendre encore un peu pour que le JavaScript charge les annonces
    await page.waitForTimeout(8000)
    
    // Récupérer le HTML de la page
    const html = await page.content()
    
    log.info(`[LACENTRALE] 📊 HTML récupéré via Scraping Browser: ${(html.length / 1024).toFixed(2)} KB`)
    
    // DEBUG: Logger un extrait du HTML pour diagnostiquer
    if (html.length < 5000) {
      log.warn(`[LACENTRALE] ⚠️ HTML très court (${html.length} bytes), probablement une erreur. Extrait:`, {
        htmlSnippet: html.substring(0, 500),
        url
      })
      // Ne pas continuer si le HTML est trop court (probablement une page d'erreur)
      return []
    }
    
    // Fermer la page et le navigateur
    try {
      await page.close()
      await browser.close()
    } catch (closeError) {
      // Ignorer les erreurs de fermeture
    }
    browser = null
    
    // Parser le HTML avec les mêmes fonctions que l'extraction normale
    // Essayer d'abord __INITIAL_STATE__ et __NEXT_DATA__
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
          log.info(`[LACENTRALE] ✅ ${ads.length} annonces dans __INITIAL_STATE__ (Scraping Browser)`)
          return ads.map(mapLaCentraleAdToUnified)
        }
      } catch (error) {
        log.warn('[LACENTRALE] Erreur parsing __INITIAL_STATE__ (Scraping Browser):', error)
      }
    }

    // Chercher __NEXT_DATA__
    const nextDataMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/)
    if (nextDataMatch) {
      try {
        const jsonData = JSON.parse(nextDataMatch[1])
        
        const ads = 
          jsonData?.props?.pageProps?.ads ||
          jsonData?.props?.pageProps?.listings ||
          jsonData?.props?.pageProps?.data?.ads ||
          jsonData?.props?.pageProps?.data?.listings ||
          jsonData?.props?.initialState?.ads ||
          []

        if (ads && Array.isArray(ads) && ads.length > 0) {
          log.info(`[LACENTRALE] ✅ ${ads.length} annonces dans __NEXT_DATA__ (Scraping Browser)`)
          return ads.map(mapLaCentraleAdToUnified)
        }
      } catch (error) {
        log.warn('[LACENTRALE] Erreur parsing __NEXT_DATA__ (Scraping Browser):', error)
      }
    }
    
    // Fallback vers extraction HTML directe
    log.info('[LACENTRALE] 🔄 Fallback vers extraction HTML directe (Scraping Browser)...')
    return extractFromHTMLAttributes(html)
    
  } catch (error) {
    log.error('[LACENTRALE] ❌ Erreur Scraping Browser:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    })
    
    // Fermer le navigateur en cas d'erreur
    if (browser) {
      try {
        await browser.close()
      } catch (closeError) {
        // Ignorer les erreurs de fermeture
      }
    }
    
    return []
  }
}

