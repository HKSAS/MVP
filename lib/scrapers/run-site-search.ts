import type { ScrapeQuery, SiteResult, ListingResponse } from '@/lib/types'
import type { SearchPass, ScrapingStrategy, PassAttempt } from './base'
import { buildRelaxedQuery } from './base'
import { scrapeLeBonCoin, convertToListingResponse } from './leboncoin'
import { createRouteLogger } from '@/lib/logger'
import { scrapeWithZenRows } from '@/lib/zenrows'
import { getOpenAIApiKey } from '@/lib/env'
import { deduplicateListings } from '@/lib/dedupe'
import { scoreAllListings } from '@/lib/scoring'
import { SCRAPING_CONFIG, getTimeoutForSite, clampPrice } from './config'
import { normalizeListingUrl } from './url-normalizer'
import OpenAI from 'openai'
import { parseParuVenduHtml, convertParuVenduToListingResponse } from './paruvendu-parser'
import { parseAutoScout24Html, convertAutoScout24ToListingResponse } from './autoscout24-parser'
import { parseLeParkingHtml, convertLeParkingToListingResponse } from './leparking-parser'
import { parseProCarLeaseHtml, convertProCarLeaseToListingResponse } from './procarlease-parser'
import { parseLaCentraleHtml, convertLaCentraleToListingResponse } from './lacentrale-parser'

const log = createRouteLogger('run-site-search')

const openai = new OpenAI({
  apiKey: getOpenAIApiKey(),
})

/**
 * Parse les listings depuis HTML avec l'IA (fallback)
 */
async function parseListingsWithAI(
  siteName: string,
  html: string,
  brand: string,
  model: string,
  maxPrice: number,
  log: ReturnType<typeof createRouteLogger>
): Promise<ListingResponse[]> {
  // Construire un snippet HTML pertinent
  const relevantSnippet = buildRelevantHtmlSnippet(html, brand, model)
  
  const prompt = `Tu es un expert en extraction de données d'annonces automobiles.

Extrais TOUTES les annonces de véhicules depuis ce HTML. Chaque annonce doit avoir :
- title (obligatoire)
- price (nombre en euros, ou null)
- year (année, ou null)
- mileage (kilométrage en km, ou null)
- url (URL ABSOLUE https://, obligatoire)
- imageUrl (URL absolue, ou null)
- city (ville, ou null)

Critères de filtrage :
- Marque: ${brand}
- Modèle: ${model}
- Prix max: ${maxPrice}€

Retourne UNIQUEMENT un JSON valide avec ce format :
[
  {
    "title": "Titre complet de l'annonce",
    "price": 25000,
    "year": 2020,
    "mileage": 50000,
    "url": "https://www.site.fr/ad/123456",
    "imageUrl": "https://www.site.fr/image.jpg",
    "city": "Paris"
  }
]

Si une info manque, mets null. MAIS l'URL et le titre sont OBLIGATOIRES.
Si tu ne trouves AUCUNE annonce, retourne [].

HTML à analyser :
${relevantSnippet.substring(0, 50000)}`

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'Tu es un expert en extraction de données structurées depuis HTML. Tu retournes UNIQUEMENT du JSON valide, sans texte avant/après.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: SCRAPING_CONFIG.ai.temperature,
      max_tokens: SCRAPING_CONFIG.ai.maxTokens,
    })

    const content = response.choices[0]?.message?.content?.trim() || '[]'
    
    // Nettoyer le JSON (enlever markdown si présent)
    let jsonStr = content
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.replace(/^```json\s*/, '').replace(/\s*```$/, '')
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```\s*/, '').replace(/\s*```$/, '')
    }

    const rawListings = JSON.parse(jsonStr) as any[]

    // Normaliser les listings
    const listings: ListingResponse[] = []
    for (const raw of rawListings) {
      if (!raw.title || !raw.url) continue

      // Normaliser l'URL avec le normalizer centralisé
      const url = normalizeListingUrl(raw.url, siteName)
      if (!url) {
        // URL invalide, skip cette annonce
        continue
      }

      // Valider et limiter le prix
      const price = raw.price ? clampPrice(Number(raw.price)) : null
      
      listings.push({
        id: `${siteName.toLowerCase()}_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        title: String(raw.title).trim(),
        price_eur: price,
        year: raw.year ? Number(raw.year) : null,
        mileage_km: raw.mileage ? Number(raw.mileage) : null,
        url,
        imageUrl: raw.imageUrl ? normalizeListingUrl(raw.imageUrl, siteName) : null,
        source: siteName,
        score_ia: 50,
        score_final: 50,
      })
    }

    return listings
  } catch (error) {
    log.error(`[${siteName}] Erreur parsing IA`, {
      error: error instanceof Error ? error.message : String(error),
    })
    return []
  }
}

/**
 * Construit un snippet HTML pertinent pour l'IA
 */
function buildRelevantHtmlSnippet(html: string, brand: string, model: string): string {
  const brandLower = brand.toLowerCase()
  const modelLower = model.toLowerCase()
  
  // Chercher les sections contenant la marque/modèle
  const lines = html.split('\n')
  const relevantLines: string[] = []
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toLowerCase()
    if (line.includes(brandLower) || line.includes(modelLower)) {
      // Prendre 20 lignes avant et après
      const start = Math.max(0, i - 20)
      const end = Math.min(lines.length, i + 20)
      relevantLines.push(...lines.slice(start, end))
    }
  }
  
  if (relevantLines.length === 0) {
    // Fallback : prendre les 50000 premiers caractères
    return html.substring(0, 50000)
  }
  
  return relevantLines.join('\n')
}

/**
 * Scrape un site non-LeBonCoin avec une passe donnée
 */
async function scrapeOtherSite(
  siteName: string,
  query: ScrapeQuery,
  pass: SearchPass,
  abortSignal?: AbortSignal
): Promise<{
  listings: ListingResponse[]
  strategy: ScrapingStrategy
  ms: number
}> {
  const startTime = Date.now()
  
  // Construire l'URL selon le site
  let searchUrl = ''
  switch (siteName) {
    case 'LaCentrale':
      searchUrl = `https://www.lacentrale.fr/listing?makesModels=${encodeURIComponent(query.brand)}-${encodeURIComponent(query.model || '')}&priceMax=${query.maxPrice}`
      break
    case 'ParuVendu':
      const brandSlug = query.brand.toLowerCase().trim().replace(/\s+/g, '-')
      const modelSlug = (query.model || '').toLowerCase().trim().replace(/\s+/g, '-')
      searchUrl = `https://www.paruvendu.fr/a/voiture-occasion/${encodeURIComponent(brandSlug)}/${encodeURIComponent(modelSlug)}/`
      break
    case 'AutoScout24':
      const baseModel = (query.model || '').toLowerCase().replace(/\s+/g, ' ').replace(/\s+\d+[a-zA-Z]*$/, '').trim()
      const brandSlug2 = query.brand.toLowerCase().replace(/\s+/g, '-')
      const modelSlug2 = baseModel.replace(/\s+/g, '-')
      searchUrl = `https://www.autoscout24.fr/lst/${brandSlug2}/${modelSlug2}?price=${query.maxPrice}`
      break
    case 'LeParking':
      const searchTerm = `${query.brand} ${query.model || ''}`.toLowerCase().trim().replace(/\s+/g, '-')
      searchUrl = `https://www.leparking.fr/voiture/${encodeURIComponent(searchTerm)}/prix-max-${query.maxPrice}`
      break
    case 'ProCarLease':
      const params = new URLSearchParams({
        marque: query.brand,
        modele: query.model || '',
        prix_max: query.maxPrice.toString(),
      })
      searchUrl = `https://procarlease.com/fr/vehicules?${params.toString()}`
      break
    default:
      throw new Error(`Site non supporté: ${siteName}`)
  }
  
      try {
        // Paramètres ZenRows spécifiques selon le site
        let zenrowsParams: Record<string, any> = SCRAPING_CONFIG.zenrows.default
        let retryConfig: { maxAttempts: number; retryableStatuses: number[]; backoffMs: number } | undefined
        
        if (siteName === 'LaCentrale') {
          zenrowsParams = { ...SCRAPING_CONFIG.zenrows.lacentrale } as Record<string, any>
          retryConfig = {
            maxAttempts: 2,
            retryableStatuses: [422, 403, 429],
            backoffMs: 2000,
          }
        }
        
        const html = await scrapeWithZenRows(searchUrl, zenrowsParams, abortSignal, retryConfig)
    const htmlMs = Date.now() - startTime
    
    // Logs debug pour extraction (cette fonction est uniquement pour les sites non-LeBonCoin)
    // Compter les cards/annonces potentielles
    const cardMatches = html.match(/class=["'][^"']*(?:card|item|listing|ad|vehicule|annonce)[^"']*["']/gi)
    const linkMatches = html.match(/href=["']([^"']*(?:\/ad\/|\/detail\/|\/voiture\/|\/a\/voiture|\/lst\/)[^"']*)["']/gi)
    
    // Extraire un snippet autour d'une card (300 chars)
    let snippet = ''
    if (cardMatches && cardMatches.length > 0) {
      const cardIndex = html.indexOf(cardMatches[0])
      if (cardIndex !== -1) {
        snippet = html.substring(
          Math.max(0, cardIndex - 150),
          Math.min(html.length, cardIndex + 150)
        )
      }
    }
    
    log.info(`[${siteName}][PARSER_DEBUG] Extraction debug`, {
      pass,
      cardsFound: cardMatches?.length || 0,
      linksFound: linkMatches?.length || 0,
      htmlLength: html.length,
      snippet: snippet.substring(0, 300),
    })
    
    // Appeler les parsers selon le site
    let parsedListings: ListingResponse[] = []
    
    try {
      if (siteName === 'ParuVendu') {
        const rawListings = parseParuVenduHtml(html, query.brand, query.model || '', query.maxPrice)
        parsedListings = rawListings.map((raw, index) => 
          convertParuVenduToListingResponse(raw, index)
        )
      } else if (siteName === 'AutoScout24') {
        const rawListings = parseAutoScout24Html(html, query.brand, query.model || '', query.maxPrice)
        parsedListings = rawListings.map((raw, index) => 
          convertAutoScout24ToListingResponse(raw, index)
        )
      } else if (siteName === 'LeParking') {
        const rawListings = parseLeParkingHtml(html, query.brand, query.model || '', query.maxPrice)
        parsedListings = rawListings.map((raw, index) => 
          convertLeParkingToListingResponse(raw, index)
        )
      } else if (siteName === 'ProCarLease') {
        const rawListings = parseProCarLeaseHtml(html, query.brand, query.model || '', query.maxPrice)
        parsedListings = rawListings.map((raw, index) => 
          convertProCarLeaseToListingResponse(raw, index)
        )
      } else if (siteName === 'LaCentrale') {
        const rawListings = parseLaCentraleHtml(html, query.brand, query.model || '', query.maxPrice)
        parsedListings = rawListings.map((raw, index) => 
          convertLaCentraleToListingResponse(raw, index)
        )
      }
      
      if (parsedListings.length > 0) {
        log.info(`[${siteName}] Parser a extrait ${parsedListings.length} annonces`, { pass })
        return {
          listings: parsedListings,
          strategy: 'http-html',
          ms: Date.now() - startTime,
        }
      }
    } catch (parseError) {
      log.error(`[${siteName}] Erreur parsing HTML`, {
        pass,
        error: parseError instanceof Error ? parseError.message : String(parseError),
        htmlLength: html.length,
      })
    }
    
    // Si aucun parser n'a réussi ou aucun résultat
    log.warn(`[${siteName}] Aucun résultat extrait`, {
      pass,
      htmlLength: html.length,
      parsedCount: parsedListings.length,
    })
    
    return {
      listings: [],
      strategy: 'http-html',
      ms: Date.now() - startTime,
    }
  } catch (error) {
    const ms = Date.now() - startTime
    const errorMsg = error instanceof Error ? error.message : String(error)
    
    // Gestion spéciale pour LaCentrale : erreur claire si bloquée après retry
    if (siteName === 'LaCentrale' && (errorMsg.includes('422') || errorMsg.includes('403') || errorMsg.includes('429'))) {
      log.error(`[${siteName}] LaCentrale bloquée après retry`, {
        pass,
        error: errorMsg,
        ms,
      })
      throw new Error('LaCentrale bloquée (anti-bot)')
    }
    
    log.error(`[${siteName}] Erreur scraping`, {
      pass,
      error: errorMsg,
      ms,
    })
    throw error // Propager l'erreur pour qu'elle soit gérée au niveau supérieur
  }
}

/**
 * Exécute une recherche sur un site avec système de 3 passes
 */
export async function runSiteSearch(
  siteName: string,
  originalQuery: ScrapeQuery,
  allListings: ListingResponse[] // Pour le scoring
): Promise<SiteResult> {
  const siteStartTime = Date.now()
  const attempts: PassAttempt[] = []
  let allSiteListings: ListingResponse[] = []
  let finalStrategy: ScrapingStrategy = 'ai-fallback'
  
  // Timeout global de 25s par site
  const globalAbortController = new AbortController()
  const globalTimeoutMs = 25000
  const globalTimeoutId = setTimeout(() => {
    globalAbortController.abort()
  }, globalTimeoutMs)
  
  log.info(`[SITE] ${siteName} démarrage recherche 3 passes (timeout global: ${globalTimeoutMs}ms)`, {
    brand: originalQuery.brand,
    model: originalQuery.model,
    maxPrice: originalQuery.maxPrice,
  })
  
  try {
  
  // PASS 1 : STRICT
  try {
    const pass1Start = Date.now()
    const pass1Query = buildRelaxedQuery(originalQuery, 'strict')
    
      let pass1Result: { listings: ListingResponse[]; strategy: ScrapingStrategy; ms: number }
      
      if (siteName === 'LeBonCoin') {
        const abortController = new AbortController()
        const timeoutMs = getTimeoutForSite('LeBonCoin')
        const timeoutId = setTimeout(() => abortController.abort(), timeoutMs)
        try {
          const leboncoinResult = await scrapeLeBonCoin(pass1Query, 'strict', abortController.signal)
          pass1Result = {
            listings: leboncoinResult.listings.map(convertToListingResponse),
            strategy: leboncoinResult.strategy,
            ms: leboncoinResult.ms,
          }
          clearTimeout(timeoutId)
        } catch (error) {
          clearTimeout(timeoutId)
          pass1Result = { listings: [], strategy: 'ai-fallback', ms: Date.now() - pass1Start }
        }
      } else {
        const abortController = new AbortController()
        const timeoutMs = getTimeoutForSite(siteName)
        const timeoutId = setTimeout(() => abortController.abort(), timeoutMs)
      try {
        pass1Result = await scrapeOtherSite(siteName, pass1Query, 'strict', abortController.signal)
        clearTimeout(timeoutId)
      } catch (error) {
        clearTimeout(timeoutId)
        pass1Result = { listings: [], strategy: 'ai-fallback', ms: Date.now() - pass1Start }
      }
    }
    
    const pass1Ms = Date.now() - pass1Start
    allSiteListings.push(...pass1Result.listings)
    finalStrategy = pass1Result.strategy
    
    attempts.push({
      pass: 'strict',
      ok: pass1Result.listings.length > 0,
      items: pass1Result.listings.length,
      ms: pass1Ms,
      note: pass1Result.listings.length > 0 ? 'Résultats trouvés' : 'Aucun résultat',
    })
    
    log.info(`[SITE] ${siteName} pass=strict`, {
      items: pass1Result.listings.length,
      ms: pass1Ms,
      strategy: pass1Result.strategy,
    })
  } catch (error) {
    attempts.push({
      pass: 'strict',
      ok: false,
      items: 0,
      ms: Date.now() - siteStartTime,
      note: error instanceof Error ? error.message : 'Erreur inconnue',
    })
  }
  
  // PASS 2 : RELAXED (si pass 1 a peu ou 0 résultats)
  if (allSiteListings.length < 10) {
    try {
      const pass2Start = Date.now()
      const pass2Query = buildRelaxedQuery(originalQuery, 'relaxed')
      
      let pass2Result: { listings: ListingResponse[]; strategy: ScrapingStrategy; ms: number }
      
      if (siteName === 'LeBonCoin') {
        const abortController = new AbortController()
        const timeoutMs = getTimeoutForSite('LeBonCoin')
        const timeoutId = setTimeout(() => abortController.abort(), timeoutMs)
        try {
          const leboncoinResult = await scrapeLeBonCoin(pass2Query, 'relaxed', abortController.signal)
          pass2Result = {
            listings: leboncoinResult.listings.map(convertToListingResponse),
            strategy: leboncoinResult.strategy,
            ms: leboncoinResult.ms,
          }
          clearTimeout(timeoutId)
        } catch (error) {
          clearTimeout(timeoutId)
          pass2Result = { listings: [], strategy: 'ai-fallback', ms: Date.now() - pass2Start }
        }
      } else {
        const abortController = new AbortController()
        const timeoutMs = getTimeoutForSite(siteName)
        const timeoutId = setTimeout(() => abortController.abort(), timeoutMs)
        try {
          pass2Result = await scrapeOtherSite(siteName, pass2Query, 'relaxed', abortController.signal)
          clearTimeout(timeoutId)
        } catch (error) {
          clearTimeout(timeoutId)
          pass2Result = { listings: [], strategy: 'ai-fallback', ms: Date.now() - pass2Start }
        }
      }
      
      const pass2Ms = Date.now() - pass2Start
      allSiteListings.push(...pass2Result.listings)
      if (pass2Result.strategy !== 'ai-fallback') {
        finalStrategy = pass2Result.strategy
      }
      
      attempts.push({
        pass: 'relaxed',
        ok: pass2Result.listings.length > 0,
        items: pass2Result.listings.length,
        ms: pass2Ms,
        note: pass2Result.listings.length > 0 ? 'Résultats trouvés avec critères assouplis' : 'Aucun résultat même avec critères assouplis',
      })
      
      log.info(`[SITE] ${siteName} pass=relaxed`, {
        items: pass2Result.listings.length,
        ms: pass2Ms,
        strategy: pass2Result.strategy,
      })
    } catch (error) {
      attempts.push({
        pass: 'relaxed',
        ok: false,
        items: 0,
        ms: Date.now() - siteStartTime,
        note: error instanceof Error ? error.message : 'Erreur inconnue',
      })
    }
  }
  
  // PASS 3 : OPPORTUNITY (si encore peu de résultats, surtout pour LeBonCoin)
  if (allSiteListings.length < 5 && siteName === 'LeBonCoin') {
    try {
      const pass3Start = Date.now()
      const pass3Query = buildRelaxedQuery(originalQuery, 'opportunity')
      
      const abortController = new AbortController()
      const timeoutMs = getTimeoutForSite('LeBonCoin')
      const timeoutId = setTimeout(() => abortController.abort(), timeoutMs)
      let pass3Result: { listings: ListingResponse[]; strategy: ScrapingStrategy; ms: number }
      try {
        const leboncoinResult = await scrapeLeBonCoin(pass3Query, 'opportunity', abortController.signal)
        pass3Result = {
          listings: leboncoinResult.listings.map(convertToListingResponse),
          strategy: leboncoinResult.strategy,
          ms: leboncoinResult.ms,
        }
        clearTimeout(timeoutId)
      } catch (error) {
        clearTimeout(timeoutId)
        pass3Result = { listings: [], strategy: 'ai-fallback', ms: Date.now() - pass3Start }
      }
      
      const pass3Ms = Date.now() - pass3Start
      allSiteListings.push(...pass3Result.listings)
      if (pass3Result.strategy !== 'ai-fallback') {
        finalStrategy = pass3Result.strategy
      }
      
      attempts.push({
        pass: 'opportunity',
        ok: pass3Result.listings.length > 0,
        items: pass3Result.listings.length,
        ms: pass3Ms,
        note: pass3Result.listings.length > 0 ? 'Opportunités trouvées' : 'Aucune opportunité',
      })
      
      log.info(`[SITE] ${siteName} pass=opportunity`, {
        items: pass3Result.listings.length,
        ms: pass3Ms,
        strategy: pass3Result.strategy,
      })
    } catch (error) {
      attempts.push({
        pass: 'opportunity',
        ok: false,
        items: 0,
        ms: Date.now() - siteStartTime,
        note: error instanceof Error ? error.message : 'Erreur inconnue',
      })
    }
  }
  
  // Dédupliquer les résultats
  allSiteListings = deduplicateListings(allSiteListings)
  
  // Scorer les listings
  allSiteListings = scoreAllListings(allSiteListings, originalQuery)
  
  // Trier par score décroissant
  allSiteListings.sort((a, b) => {
    const scoreA = a.score_final ?? a.score_ia ?? 0
    const scoreB = b.score_final ?? b.score_ia ?? 0
    return scoreB - scoreA
  })
  
  // Limiter à MAX_RESULTS_PER_PASS * 2 (on a fait plusieurs passes)
  allSiteListings = allSiteListings.slice(0, SCRAPING_CONFIG.limits.maxResultsPerPass * 2)
  
  const totalMs = Date.now() - siteStartTime
  // Distinguer "ok mais 0 résultats" vs "erreur technique"
  // ok: true si au moins une passe a réussi (même avec 0 résultats) OU si items > 0
  // ok: false uniquement si erreur technique (timeout, exception)
  const hasSuccessfulAttempt = attempts.some(a => a.ok)
  const ok = allSiteListings.length > 0 || hasSuccessfulAttempt
  
  // Nettoyer le timeout global
  clearTimeout(globalTimeoutId)
  
  log.info(`[SITE] ${siteName} terminé`, {
    ok,
    totalItems: allSiteListings.length,
    totalMs,
    strategy: finalStrategy,
    attempts: attempts.length,
    hasSuccessfulAttempt,
  })
  
  return {
    site: siteName,
    ok,
    items: allSiteListings,
    ms: totalMs,
    strategyUsed: finalStrategy,
    attempts,
    // Ne pas mettre d'error si ok=true (c'est juste "0 résultats", pas une erreur)
    error: !ok ? (allSiteListings.length === 0 ? 'Aucun résultat trouvé après toutes les passes' : undefined) : undefined,
  }
  } catch (error) {
    // Nettoyer le timeout global en cas d'erreur
    clearTimeout(globalTimeoutId)
    
    const totalMs = Date.now() - siteStartTime
    const errorMsg = error instanceof Error ? error.message : String(error)
    
    // Vérifier si c'est un timeout global
    const isTimeout = errorMsg.includes('aborted') || errorMsg.includes('AbortError') || totalMs >= globalTimeoutMs
    
    log.error(`[SITE] ${siteName} erreur technique`, {
      error: errorMsg,
      totalMs,
      isTimeout,
    })
    
    return {
      site: siteName,
      ok: false, // Erreur technique
      items: [],
      ms: totalMs,
      error: isTimeout ? `Timeout après ${globalTimeoutMs}ms` : errorMsg,
      attempts,
    }
  }
}

