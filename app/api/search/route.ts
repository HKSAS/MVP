import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { getAuthenticatedUser } from '@/lib/auth'
import { searchSchema, type SearchInput } from '@/lib/validation'
import type { ListingResponse, SearchResponse, ScrapeQuery } from '@/lib/types'
import { runSiteSearch } from '@/lib/scrapers/run-site-search'
import { deduplicateListings as dedupeListings } from '@/lib/dedupe'
import { scoreAllListings } from '@/lib/scoring'
import { createRouteLogger } from '@/lib/logger'
import { createErrorResponse, ValidationError, ExternalServiceError, InternalServerError } from '@/lib/errors'
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY } from '@/lib/env'
import { SCRAPING_CONFIG, clampPrice } from '@/lib/scrapers/config'
import { isSiteEnabled, getEnabledSites } from '@/lib/scrapers/scraper-config'
import { openai } from '@/lib/openai'
import { scrapeWithZenRows } from '@/lib/zenrows'
import { logAiSearch } from '@/lib/tracking'
import { createScrapingJob, updateJobStatus, isJobCancelled, JobCancelledError } from '@/lib/scraping-jobs'

export const dynamic = 'force-dynamic'

// ============================================================================
// CONFIGURATION
// ============================================================================

// Initialisation des clients
const supabase = createClient(
  NEXT_PUBLIC_SUPABASE_URL!,
  NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Cache in-memory
interface CacheEntry {
  data: SiteResultWithListings[]
  allItems: ListingResponse[]
  timestamp: number
}

const cache = new Map<string, CacheEntry>()
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

// ============================================================================
// TYPES
// ============================================================================

interface ListingData {
  external_id: string
  title: string
  price: number | null
  year: number | null
  mileage: number | null
  url: string
  image_url: string | null
  score_ia: number
  source?: string
  city?: string | null
}

interface SiteConfig {
  name: string
  getUrl: (query: ScrapeQuery, relaxed?: boolean) => string
  active: boolean
}

// Type local pour usage interne (avec listings complets)
interface SiteResultWithListings {
  site: string
  ok: boolean
  items: ListingResponse[]
  error?: string
  ms: number
  retryUsed?: boolean
  strategy?: string
}

// ScrapeQuery est maintenant exporté depuis lib/types.ts

// ============================================================================
// UTILITAIRES POUR CONSTRUCTION D'URLS
// ============================================================================

function buildAutoScout24Url(brand: string, model: string, maxPrice: number, relaxed = false): string {
  const baseModel = model
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/\s+\d+[a-zA-Z]*$/, '')
    .trim()

  const brandSlug = brand.toLowerCase().replace(/\s+/g, '-')
  const modelSlug = baseModel.replace(/\s+/g, '-')

  // En mode relaxed, on peut élargir le prix
  const priceParam = relaxed ? Math.min(maxPrice * 1.2, maxPrice + 10000) : maxPrice
  const url = `https://www.autoscout24.fr/lst/${brandSlug}/${modelSlug}?price=${priceParam}`
  
  return url
}

// ============================================================================
// CONFIGURATION DES SITES
// ============================================================================

const SITE_CONFIGS: SiteConfig[] = [
  {
    name: 'LeBonCoin',
    getUrl: (query, relaxed = false) => {
      // LeBonCoin - URL optimisée pour les voitures avec critères personnalisés
      const { brand, model, maxPrice, minPrice, fuelType, minYear, maxYear, maxMileage } = query
      // Gérer les variantes de noms pour location et radius
      const location = (query as any).location || (query as any).zipCode || undefined
      const radiusKm = (query as any).radiusKm || (query as any).radius_km || undefined
      
      const params = new URLSearchParams({
        text: `${brand} ${model || ''}`.trim(),
        price: `${relaxed ? Math.max(0, (minPrice || 0) - 10000) : (minPrice || 0)}-${relaxed ? Math.min(maxPrice * 1.2, maxPrice + 10000) : maxPrice}`,
        sort: 'time',
        order: 'desc',
        category: '2', // Catégorie voitures
      })
      
      // Ajouter les critères personnalisés si disponibles
      if (fuelType && fuelType !== 'any' && fuelType !== 'all') {
        // Mapping des types de carburant pour Leboncoin
        const fuelMap: Record<string, string> = {
          'essence': '1',
          'diesel': '2',
          'electrique': '3',
          'hybride': '4',
          'gpl': '5',
        }
        const fuelCode = fuelMap[fuelType.toLowerCase()]
        if (fuelCode) {
          params.set('fuel', fuelCode)
        }
      }
      
      // Années
      if (minYear) {
        params.set('regdate', minYear.toString())
      }
      if (maxYear && minYear) {
        // Leboncoin utilise un seul champ regdate, on prend la plage
        params.set('regdate', `${minYear}-${maxYear}`)
      }
      
      // Kilométrage maximum
      if (maxMileage) {
        params.set('mileage', `0-${maxMileage}`)
      }
      
      // Localisation (code postal ou ville)
      if (location) {
        // Si c'est un code postal (5 chiffres), utiliser locations
        if (/^\d{5}$/.test(location)) {
          params.set('locations', location)
        } else {
          // Sinon, chercher par texte
          params.set('locations', location)
        }
        
        // Rayon en km (Leboncoin utilise parfois un paramètre radius)
        if (radiusKm) {
          params.set('radius', radiusKm.toString())
        }
      } else {
        // Par défaut, toutes les localisations
        params.set('locations', '')
      }
      
      return `https://www.leboncoin.fr/recherche?${params.toString()}`
    },
    active: true,
  },
  {
    name: 'LaCentrale',
    getUrl: (query, relaxed = false) => {
      const { brand, model, maxPrice } = query
      const priceMax = relaxed ? Math.min(maxPrice * 1.2, maxPrice + 10000) : maxPrice
      return `https://www.lacentrale.fr/listing?makesModels=${encodeURIComponent(brand)}-${encodeURIComponent(model || '')}&priceMax=${priceMax}`
    },
    active: true,
  },
  {
    name: 'ParuVendu',
    getUrl: (query) => {
      const { brand, model } = query
      const brandSlug = brand.toLowerCase().trim().replace(/\s+/g, '-')
      const modelSlug = (model || '').toLowerCase().trim().replace(/\s+/g, '-')
      return `https://www.paruvendu.fr/a/voiture-occasion/${encodeURIComponent(brandSlug)}/${encodeURIComponent(modelSlug)}/`
    },
    active: true,
  },
  {
    name: 'AutoScout24',
    getUrl: (query, relaxed = false) => {
      return buildAutoScout24Url(query.brand, query.model || '', query.maxPrice, relaxed)
    },
    active: true,
  },
  {
    name: 'LeParking',
    getUrl: (query, relaxed = false) => {
      const { brand, model, maxPrice } = query
      const searchTerm = `${brand} ${model || ''}`.toLowerCase().trim().replace(/\s+/g, '-')
      const priceMax = relaxed ? Math.min(maxPrice * 1.2, maxPrice + 10000) : maxPrice
      return `https://www.leparking.fr/voiture/${encodeURIComponent(searchTerm)}/prix-max-${priceMax}`
    },
    active: true,
  },
  {
    name: 'ProCarLease',
    getUrl: (query, relaxed = false) => {
      const { brand, model, maxPrice } = query
      const params = new URLSearchParams({
        marque: brand,
        modele: model || '',
        prix_max: (relaxed ? Math.min(maxPrice * 1.2, maxPrice + 10000) : maxPrice).toString(),
      })
      return `https://procarlease.com/fr/vehicules?${params.toString()}`
    },
    active: true,
  },
  {
    name: 'Aramisauto',
    getUrl: (query, relaxed = false) => {
      const { brand, model, maxPrice } = query
      const priceMax = relaxed ? Math.min(maxPrice * 1.2, maxPrice + 10000) : maxPrice
      return `https://www.aramisauto.com/acheter/recherche?makes[]=${encodeURIComponent(brand.toUpperCase())}&models[]=${encodeURIComponent((model || '').toUpperCase())}&priceMax=${priceMax}`
    },
    active: true,
  },
  {
    name: 'Kyump',
    getUrl: (query, relaxed = false) => {
      const { brand, model, maxPrice } = query
      const priceMax = relaxed ? Math.min(maxPrice * 1.2, maxPrice + 10000) : maxPrice
      return `https://www.kyump.com/voiture-occasion?marque=${encodeURIComponent(brand.toUpperCase())}&modele=${encodeURIComponent((model || '').toUpperCase())}&prixMax=${priceMax}`
    },
    active: true,
  },
  {
    name: 'TransakAuto',
    getUrl: (query, relaxed = false) => {
      const { brand, model, maxPrice } = query
      const params = new URLSearchParams({
        marque: brand.toLowerCase().trim(),
        modele: (model || '').toLowerCase().trim(),
        prix_max: (relaxed ? Math.min(maxPrice * 1.2, maxPrice + 10000) : maxPrice).toString(),
      })
      return `https://annonces.transakauto.com/?${params.toString()}`
    },
    active: true,
  },
]

// ============================================================================
// CACHE
// ============================================================================

function getCacheKey(query: ScrapeQuery, site: string): string {
  const queryStr = JSON.stringify({
    brand: query.brand.toLowerCase().trim(),
    model: (query.model || '').toLowerCase().trim(),
    maxPrice: query.maxPrice,
    site,
  })
  return crypto.createHash('sha256').update(queryStr).digest('hex')
}

function getFromCache(key: string): { data: SiteResultWithListings[]; allItems: ListingResponse[] } | null {
  const entry = cache.get(key)
  if (!entry) return null
  
  const age = Date.now() - entry.timestamp
  if (age > CACHE_TTL_MS) {
    cache.delete(key)
    return null
  }
  
  return { data: entry.data, allItems: entry.allItems }
}

function setCache(key: string, data: SiteResultWithListings[], allItems: ListingResponse[]): void {
  cache.set(key, {
    data,
    allItems,
    timestamp: Date.now(),
  })
  
  // Nettoyer le cache si trop volumineux (garder max 100 entrées)
  if (cache.size > 100) {
    const entries = Array.from(cache.entries())
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp)
    const toDelete = entries.slice(0, entries.length - 100)
    toDelete.forEach(([key]) => cache.delete(key))
  }
}

// ============================================================================
// UTILITAIRES
// ============================================================================

function toNumber(value: any): number | null {
  if (typeof value === 'number') return isNaN(value) ? null : value
  if (typeof value === 'string') {
    const cleaned = value.replace(/[\s.,€]/g, '')
    const num = Number(cleaned)
    return isNaN(num) ? null : num
  }
  return null
}

function parseAIResponse(rawResponse: string, siteName: string, log: ReturnType<typeof createRouteLogger>): { listings: any[] } {
  if (!rawResponse || typeof rawResponse !== 'string') {
    log.error('Réponse IA vide ou invalide', { site: siteName })
    return { listings: [] }
  }

  try {
    const parsed = JSON.parse(rawResponse)
    if (!parsed || !Array.isArray(parsed.listings)) {
      log.error('JSON parsé mais "listings" n\'est pas un array', { site: siteName })
      return { listings: [] }
    }
    return parsed
  } catch (e) {
    try {
      const jsonStart = rawResponse.indexOf('{')
      const jsonEnd = rawResponse.lastIndexOf('}')
      
      if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) {
        log.error('Impossible de trouver de JSON dans la réponse IA', {
          site: siteName,
          responsePreview: rawResponse.slice(0, 200),
        })
        return { listings: [] }
      }
      
      const jsonString = rawResponse.slice(jsonStart, jsonEnd + 1)
      const parsed = JSON.parse(jsonString)
      
      if (!parsed || !Array.isArray(parsed.listings)) {
        log.error('JSON extrait mais "listings" n\'est pas un array', { site: siteName })
        return { listings: [] }
      }
      
      log.warn('JSON extrait du texte', { site: siteName })
      return parsed
    } catch (parseError) {
      log.error('Erreur JSON.parse', {
        site: siteName,
        error: parseError instanceof Error ? parseError.message : String(parseError),
        responsePreview: rawResponse.slice(0, 200),
      })
      return { listings: [] }
    }
  }
}

function buildRelevantHtmlSnippet(html: string, brand: string, model: string, siteName?: string): string {
  const lowerBrand = brand.toLowerCase()
  const lowerModel = model.toLowerCase()
  const lines = html.split('\n')

  // Filtre spécialisé pour LeBonCoin
  const isLeBonCoin = siteName === 'LeBonCoin'
  
  // Filtre plus large pour capturer plus de contenu
  const filtered = lines.filter((line) => {
    const l = line.toLowerCase()
    
    // Critères spécifiques LeBonCoin
    if (isLeBonCoin) {
      // LeBonCoin utilise des patterns spécifiques
      if (
        l.includes('data-qa-id="aditem') ||
        l.includes('data-qa-id="aditemcontainer') ||
        l.includes('aditemcontainer') ||
        l.includes('aditem') ||
        l.includes('ad-listitem') ||
        l.includes('_aditem') ||
        l.includes('aditem_') ||
        l.includes('href="/ad/') ||
        l.includes('href="/recherche') ||
        l.includes('data-test-id="adcard') ||
        l.includes('data-test-id="aditem') ||
        l.includes('class="aditem') ||
        l.includes('class="ad-item') ||
        l.includes('class="ad_listitem') ||
        l.includes('itemprop="price') ||
        l.includes('itemprop="name') ||
        l.includes('data-testid="aditem') ||
        // Patterns JSON dans le HTML (LeBonCoin charge les données en JSON)
        l.includes('"adlist"') ||
        l.includes('"ads"') ||
        l.includes('"aditem"') ||
        l.includes('"adId"') ||
        l.includes('"price"') ||
        l.includes('"subject"') ||
        l.includes('"images"') ||
        // Images LeBonCoin
        (l.includes('src="') && (l.includes('leboncoin.fr') || l.includes('ad-image') || l.includes('adimage')))
      ) {
        return true
      }
    }
    
    // Critères de filtrage généraux
    return (
      // Marque/modèle
      l.includes(lowerBrand) ||
      l.includes(lowerModel) ||
      // Prix et monnaie
      l.includes('€') ||
      l.includes('eur') ||
      l.includes('euro') ||
      l.includes('price') ||
      l.includes('prix') ||
      // Kilométrage
      l.includes('km') ||
      l.includes('kilometre') ||
      l.includes('kilomètre') ||
      // Mots-clés d'annonces
      l.includes('aditem') ||
      l.includes('ad-item') ||
      l.includes('ad_') ||
      l.includes('listing') ||
      l.includes('annonce') ||
      l.includes('voiture') ||
      l.includes('vehicule') ||
      l.includes('véhicule') ||
      l.includes('automobile') ||
      // Liens vers annonces
      l.includes('href="/ad/') ||
      l.includes('href="/voiture/') ||
      l.includes('href="/a/voiture') ||
      l.includes('href="/lst/') ||
      l.includes('href="/detail/') ||
      l.includes('data-href') ||
      l.includes('data-url') ||
      // Attributs de test
      l.includes('data-test-id="adcard') ||
      l.includes('data-test-id="price') ||
      l.includes('data-testid') ||
      // Classes CSS communes
      l.includes('class="ad') ||
      l.includes('class="listing') ||
      l.includes('class="card') ||
      l.includes('class="item') ||
      // Images de véhicules
      (l.includes('src="') && (l.includes('image') || l.includes('photo') || l.includes('img'))) ||
      // Années
      /\b(19|20)\d{2}\b/.test(l) ||
      // Nombres (prix potentiels)
      /\d{4,}/.test(l)
    )
  })

  const snippet = filtered.join('\n')

  // Pour LeBonCoin, augmenter encore plus la limite car il y a beaucoup de données JSON
  const maxLength = isLeBonCoin ? 80000 : 60000
  return snippet.slice(0, maxLength)
}

async function parseListingsWithAI(
  siteName: string,
  html: string,
  brand: string,
  model: string,
  maxPrice: number,
  log: ReturnType<typeof createRouteLogger>
): Promise<ListingData[]> {
  if (!openai) {
    throw new ExternalServiceError('OpenAI', 'OPENAI_API_KEY manquante')
  }

  const relevantHtml = buildRelevantHtmlSnippet(html, brand, model, siteName)
  log.debug('HTML filtré pour l\'IA', {
    site: siteName,
    originalLength: html.length,
    filteredLength: relevantHtml.length,
  })

  // Prompt spécialisé pour LeBonCoin
  const isLeBonCoin = siteName === 'LeBonCoin'
  
  const systemPrompt = isLeBonCoin 
    ? `Tu es un extracteur d'annonces automobiles EXPERT spécialisé dans LeBonCoin.

Ta mission :
- Analyser le HTML de LeBonCoin et identifier TOUTES les annonces de véhicules présentes
- LeBonCoin charge souvent les annonces en JSON dans le HTML (cherche les objets avec "adlist", "ads", "aditem")
- Extraire les informations de chaque annonce : titre, prix, kilométrage, année, URL, image

PATTERNS SPÉCIFIQUES LEBONCOIN :
1. Liens d'annonces : href="/ad/[ID]" où ID est un nombre (ex: /ad/1234567890)
2. Données JSON : cherche des objets JSON avec des champs comme :
   - "adId" ou "ad_id" : ID de l'annonce
   - "subject" ou "title" : titre de l'annonce
   - "price" : prix en centimes ou euros
   - "images" : tableau d'images
   - "url" : URL de l'annonce
3. Classes CSS : "aditem", "ad-item", "ad_listitem", "aditemcontainer"
4. Attributs data : data-qa-id="aditem", data-test-id="adcard", data-testid="aditem"
5. Images : src contenant "leboncoin.fr" ou "ad-image" ou "adimage"

RÈGLES D'EXTRACTION LEBONCOIN :
- Si tu vois un href="/ad/[NOMBRE]" → c'est FORCÉMENT une annonce → extrais-la
- Si tu vois des données JSON avec "adId" ou "ad_id" → ce sont des annonces → extrais-les
- Si tu vois plusieurs href="/ad/" différents → il y a plusieurs annonces → extrais-les TOUTES
- Même si certaines infos manquent, extrais l'annonce si tu as au minimum l'ID ou l'URL

CONTRAINTES ABSOLUMENT STRICTES :
- Tu dois TOUJOURS renvoyer du JSON STRICTEMENT VALIDE.
- Tu peux renvoyer { "listings": [] } UNIQUEMENT si le HTML ne contient AUCUN href="/ad/", AUCUN "adId" dans du JSON, AUCUNE mention d'annonce.
- Si tu vois au moins UN href="/ad/" → il y a FORCÉMENT au moins une annonce → extrais-la.
- Ne choisis JAMAIS { "listings": [] } par défaut.`
    : `Tu es un extracteur d'annonces automobiles EXPERT.

Ta mission :
- Analyser le HTML et identifier TOUTES les annonces de véhicules présentes
- Extraire les informations de chaque annonce : titre, prix, kilométrage, année, URL, image
- Même si certaines informations manquent, extraire l'annonce si tu as au minimum un titre ET une URL

RÈGLES D'EXTRACTION :
1. Cherche les patterns suivants dans le HTML :
   - Liens vers annonces : href="/ad/", href="/voiture/", href="/detail/", href="/a/voiture", href="/lst/"
   - Prix : nombres suivis de "€", "eur", "euro" ou dans des balises avec "prix", "price"
   - Images : balises <img> avec src contenant "image", "photo", "annonce", "vehicule"
   - Titres : texte dans des balises <h>, <a>, <div> avec classes "title", "name", "ad", "vehicule", "listing"
   - Kilométrage : nombres suivis de "km", "kilomètre", "kilometre"
   - Année : nombres à 4 chiffres entre 1990 et 2025

2. ASSOCIATION DES DONNÉES :
   - Si tu vois un lien (ex: href="/fr/detail/?id=111861") → c'est une annonce
   - Regroupe les éléments proches dans le HTML (même parent, même section)
   - Un lien + un titre + un prix proches = une annonce complète
   - Si tu vois 5 liens différents, il y a au moins 5 annonces

3. EXEMPLES DE PATTERNS À RECONNAÎTRE :
   - ProCarLease : <div class="vehicule"><a href="/fr/detail/?id=111861"> → annonce avec ID 111861
   - LaCentrale : href="/voiture-occasion/..." → annonce
   - AutoScout24 : href="/lst/..." → annonce

CONTRAINTES ABSOLUMENT STRICTES :
- Tu dois TOUJOURS renvoyer du JSON STRICTEMENT VALIDE.
- Tu peux renvoyer { "listings": [] } UNIQUEMENT si le HTML ne contient AUCUN lien vers une annonce, AUCUN prix, AUCUNE image de véhicule.
- Si tu vois au moins UN lien vers une annonce (href="/detail/", href="/ad/", etc.) → il y a FORCÉMENT au moins une annonce à extraire.
- Si tu vois plusieurs liens différents → il y a plusieurs annonces → extrais-les TOUTES.
- Ne choisis JAMAIS { "listings": [] } par défaut. Si tu hésites, extrais quand même les annonces que tu peux identifier.`

  const userPrompt = isLeBonCoin
    ? `Analyse ce HTML filtré provenant de LeBonCoin et extrais TOUTES les annonces de véhicules correspondant à "${brand} ${model}" avec un budget maximum de ${maxPrice}€.

LeBonCoin est ESSENTIEL - tu DOIS extraire TOUTES les annonces que tu trouves.

ÉTAPES D'EXTRACTION SPÉCIFIQUES LEBONCOIN :

ÉTAPE 1 - IDENTIFIER LES ANNONCES :
   a) Cherche TOUS les href="/ad/[NOMBRE]" dans le HTML (ex: href="/ad/1234567890")
   b) Cherche les données JSON avec "adId", "ad_id", "subject", "price"
   c) Cherche les balises avec classes "aditem", "ad-item", "ad_listitem"
   d) Cherche les attributs data-qa-id="aditem", data-test-id="adcard"

ÉTAPE 2 - POUR CHAQUE ANNONCE TROUVÉE :
   a) Si tu vois href="/ad/1234567890" → URL = https://www.leboncoin.fr/ad/1234567890
   b) Cherche un titre dans les balises proches ou dans les données JSON ("subject" ou "title")
   c) Cherche un prix dans les balises proches ou dans les données JSON ("price" - peut être en centimes)
   d) Cherche un kilométrage (nombre + "km")
   e) Cherche une année (4 chiffres entre 1990-2025)
   f) Cherche une image (src contenant "leboncoin.fr" ou dans "images" du JSON)

ÉTAPE 3 - CONSTRUIRE L'ANNONCE :
   - Si tu as href="/ad/[ID]" → c'est FORCÉMENT une annonce → extrais-la même si d'autres infos manquent
   - Si tu as des données JSON avec "adId" → extrais TOUTES les annonces du JSON
   - Associe les éléments qui sont dans la même section/div du HTML

EXEMPLE CONCRET LEBONCOIN :
Si tu vois : href="/ad/1234567890" → extrais une annonce avec :
- url: "https://www.leboncoin.fr/ad/1234567890"
- title: le titre trouvé dans les balises proches ou "Véhicule ${brand} ${model}" si absent
- price_eur: le prix trouvé (convertir centimes en euros si nécessaire)
- mileage_km, year, imageUrl: si trouvés, sinon null

IMPORTANT : Même si le budget est très élevé (${maxPrice}€), extrais TOUTES les annonces que tu trouves. Le filtrage par prix se fera après.

FORMAT JSON STRICT (OBLIGATOIRE) :
{
  "listings": [
    {
      "title": "string",
      "price_eur": number | null,
      "mileage_km": number | null,
      "year": number | null,
      "url": "string",
      "imageUrl": "string | null",
      "score_ia": number | null,
      "source": "LeBonCoin",
      "city": "string | null"
    }
  ]
}

Tu n'as PAS le droit d'ajouter du texte en dehors du JSON.

HTML filtré (${relevantHtml.length.toLocaleString()} caractères) :
"""${relevantHtml}""`
    : `Analyse ce HTML filtré provenant du site "${siteName}" et extrais TOUTES les annonces de véhicules correspondant à "${brand} ${model}" avec un budget maximum de ${maxPrice}€.

Le HTML filtré contient uniquement les lignes pertinentes avec :
- des titres d'annonces,
- des prix (format: "X XXX €", "X.XXX €", etc.),
- des kilométrages ("km"),
- des mentions de "${brand}" et "${model}",
- des liens vers des annonces.

ÉTAPES D'EXTRACTION DÉTAILLÉES :

ÉTAPE 1 - IDENTIFIER LES ANNONCES :
   Scanne le HTML ligne par ligne et cherche :
   a) TOUS les liens contenant : "/ad/", "/detail/", "/voiture/", "/a/voiture", "/lst/"
   b) TOUTES les balises avec classes : "vehicule", "ad", "listing", "card", "item"
   c) TOUTES les images dans des contextes d'annonces (proches de liens ou prix)

ÉTAPE 2 - POUR CHAQUE ANNONCE IDENTIFIÉE :
   a) Extrais l'URL complète (convertis les URLs relatives en absolues)
   b) Cherche un titre dans les balises proches (<h>, <a>, <div> avec texte)
   c) Cherche un prix (nombre + "€" ou "eur" dans les balises proches)
   d) Cherche un kilométrage (nombre + "km" dans les balises proches)
   e) Cherche une année (4 chiffres entre 1990-2025)
   f) Cherche une image (<img src="..."> proche de l'annonce)

ÉTAPE 3 - CONSTRUIRE L'ANNONCE :
   - Si tu as un lien → c'est une annonce (même sans titre/prix, crée un titre basique)
   - Si tu as un titre + un prix → c'est une annonce (même sans lien, crée une URL basique)
   - Associe les éléments qui sont dans la même section/div du HTML

INSTRUCTIONS CRITIQUES (À RESPECTER ABSOLUMENT) :
1. Si ce HTML filtré contient plusieurs prix, plusieurs titres, plusieurs liens → c'est FORCÉMENT une page de résultats avec des annonces. Tu DOIS en extraire plusieurs, même si certaines données sont incomplètes.
2. Tu ne renvoies { "listings": [] } QUE si le HTML filtré est vraiment vide ou ne contient aucun indice d'annonce (aucun prix, aucun titre, aucun lien).
3. Si tu vois au moins 2-3 prix différents dans le HTML → il y a au moins 2-3 annonces. Extrais-les.
4. Si certaines informations manquent (prix, km, année), utilise null mais garde l'annonce si tu as au minimum un titre et une URL.
5. Ne choisis JAMAIS la solution facile { "listings": [] } par défaut. Si tu hésites, extrais quand même les annonces que tu peux identifier.
6. IMPORTANT : Même si le budget est très élevé (${maxPrice}€), extrais TOUTES les annonces que tu trouves. Le filtrage par prix se fera après.

FORMAT JSON STRICT (OBLIGATOIRE) :
{
  "listings": [
    {
      "title": "string",
      "price_eur": number | null,
      "mileage_km": number | null,
      "year": number | null,
      "url": "string",
      "imageUrl": "string | null",
      "score_ia": number | null,
      "source": "${siteName}",
      "city": "string | null"
    }
  ]
}

RÈGLES :
- title et url sont OBLIGATOIRES (sans eux, l'annonce est invalide)
- price_eur : nombre pur (enlève espaces, points, virgules, "€") ou null si absent
- mileage_km : nombre ou null
- year : nombre (4 chiffres) ou null
- url : URL ABSOLUE COMPLÈTE OBLIGATOIRE (ex: https://www.leboncoin.fr/ad/1234567890 ou https://www.lacentrale.fr/voiture-occasion/...). Si tu trouves une URL relative (ex: /ad/1234567890), tu DOIS la convertir en URL absolue avec le domaine complet du site.
- imageUrl : URL de l'image ou null
- score_ia : 0-100 (80-100: excellente, 60-79: bonne, 40-59: moyenne, 0-39: à éviter) ou null
- source : "${siteName}"
- city : ville de l'annonce ou null

IMPORTANT pour les URLs :
- Pour LeBonCoin : format https://www.leboncoin.fr/ad/[ID] ou https://www.leboncoin.fr/voitures/[ID]
- Pour LaCentrale : format https://www.lacentrale.fr/voiture-occasion/...
- Pour ParuVendu : format https://www.paruvendu.fr/a/voiture-occasion/...
- Pour AutoScout24 : format https://www.autoscout24.fr/...
- Pour LeParking : format https://www.leparking.fr/...
- JAMAIS d'URL relative seule (ex: /ad/123). TOUJOURS une URL complète avec https://

EXEMPLE CONCRET D'EXTRACTION :

Si tu vois dans le HTML un bloc comme :
- Une balise avec href="/fr/detail/?id=111861" ou href="/ad/123456"
- Un titre proche (ex: "Renault Clio 5 1.0 TCe 100ch")
- Un prix proche (ex: "15 500 €" ou "15500€")
- Un kilométrage proche (ex: "45 000 km")
- Une année proche (ex: "2020")
- Une image proche (ex: src="...annonces...jpg")

Tu DOIS extraire une annonce avec :
- title: le titre trouvé (ou "Véhicule ${brand} ${model}" si absent)
- price_eur: le nombre extrait du prix (15500 pour "15 500 €")
- mileage_km: le nombre extrait (45000 pour "45 000 km")
- year: l'année trouvée (2020)
- url: l'URL complète (convertir /fr/detail/?id=111861 en https://procarlease.com/fr/detail/?id=111861)
- imageUrl: l'URL de l'image si trouvée
- score_ia: null (sera calculé après)
- source: "${siteName}"
- city: null ou la ville si trouvée

MÊME SI CERTAINES INFOS MANQUENT :
Si tu vois juste un lien (ex: href="/fr/detail/?id=111861") → extrais quand même avec un titre basique comme "Véhicule ${brand} ${model}"

Tu n'as PAS le droit d'ajouter du texte en dehors du JSON.

HTML filtré (${relevantHtml.length.toLocaleString()} caractères) :
"""${relevantHtml}""`

  try {
    // Utiliser un modèle plus puissant pour LeBonCoin (ESSENTIEL - qualité professionnelle)
    // Pour LeBonCoin, utiliser gpt-4o si disponible (meilleure qualité), sinon gpt-4o-mini
    // Pour les autres sites, utiliser gpt-4o-mini (plus économique)
    const modelToUse = isLeBonCoin 
      ? (process.env.OPENAI_MODEL || 'gpt-4o') // gpt-4o pour LeBonCoin (meilleure qualité)
      : (process.env.OPENAI_MODEL || 'gpt-4o-mini')
    
    log.info(`[SEARCH] ${siteName} utilisation modèle ${modelToUse}`, {
      site: siteName,
      model: modelToUse,
      htmlLength: relevantHtml.length,
      isLeBonCoin,
    })
    
    // En développement, logger un extrait du HTML filtré pour debug
    if (process.env.NODE_ENV === 'development') {
      const htmlPreview = relevantHtml.slice(0, 5000) // Augmenté pour LeBonCoin
      log.debug('Extrait HTML filtré (premiers 5000 caractères)', {
        site: siteName,
        preview: htmlPreview,
        totalLength: relevantHtml.length,
      })
      
      // Compter les liens potentiels dans le HTML (spécial LeBonCoin)
      if (isLeBonCoin) {
        const adLinks = relevantHtml.match(/href=["']\/ad\/\d+["']/gi)
        const adIds = relevantHtml.match(/"adId"|"ad_id"|adId["\s]*:/gi)
        const adSubjects = relevantHtml.match(/"subject"|"title"/gi)
        const adItems = relevantHtml.match(/aditem|ad-item|ad_listitem/gi)
        log.info('Indices LeBonCoin dans le HTML', {
          site: siteName,
          adLinks: adLinks?.length || 0,
          adIds: adIds?.length || 0,
          adSubjects: adSubjects?.length || 0,
          adItems: adItems?.length || 0,
        })
      } else {
        const linkMatches = relevantHtml.match(/href=["']([^"']*(?:\/ad\/|\/detail\/|\/voiture\/|\/a\/voiture|\/lst\/)[^"']*)["']/gi)
        const vehiculeMatches = relevantHtml.match(/class=["'][^"']*vehicule[^"']*["']/gi)
        log.debug('Indices d\'annonces dans le HTML', {
          site: siteName,
          linkMatches: linkMatches?.length || 0,
          vehiculeMatches: vehiculeMatches?.length || 0,
        })
      }
    }
    
    // Pour LeBonCoin, analyse approfondie avec plusieurs passes si nécessaire
    let completion
    if (isLeBonCoin) {
      // Analyse approfondie professionnelle pour LeBonCoin
      log.info(`[SEARCH] LeBonCoin analyse approfondie professionnelle en cours...`)
      completion = await openai.chat.completions.create({
      model: modelToUse,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
        temperature: 0.05, // Très précis pour LeBonCoin (analyse professionnelle)
        max_tokens: SCRAPING_CONFIG.ai.maxTokens, // Limite maximale pour gpt-4o-mini
      })
    } else {
      completion = await openai.chat.completions.create({
        model: modelToUse,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
        max_tokens: SCRAPING_CONFIG.ai.maxTokens,
      })
    }

    const responseContent = completion.choices[0]?.message?.content
    if (!responseContent) {
      throw new ExternalServiceError('OpenAI', 'Aucun contenu retourné')
    }

    // Log de la réponse brute en développement pour debug
    if (process.env.NODE_ENV === 'development') {
      log.debug('Réponse brute de l\'IA', {
        site: siteName,
        responseLength: responseContent.length,
        responsePreview: responseContent.slice(0, 500),
      })
    }

    const analysisResult = parseAIResponse(responseContent, siteName, log)
    const rawListings = analysisResult.listings || []
    
    log.debug('Annonces extraites par l\'IA', {
      site: siteName,
      count: rawListings.length,
      firstListing: rawListings[0] || null,
    })
    
    // Si 0 résultat mais que le HTML est volumineux, logger un warning
    if (rawListings.length === 0 && relevantHtml.length > 1000) {
      log.warn('Aucune annonce extraite malgré un HTML volumineux', {
        site: siteName,
        htmlLength: relevantHtml.length,
        htmlPreview: relevantHtml.slice(0, 1000),
      })
    }

    const normalizedListings: ListingData[] = []

    for (const listing of rawListings) {
      if (!listing || !listing.title || !listing.url) {
        log.debug('Annonce ignorée (manque title ou url)', {
          site: siteName,
          hasTitle: !!listing?.title,
          hasUrl: !!listing?.url,
        })
        continue
      }

      const price_eur = toNumber(listing.price_eur)
      const mileage_km = toNumber(listing.mileage_km)
      const year = toNumber(listing.year)
      const score_ia = toNumber(listing.score_ia) ?? 50

      const titleHash = String(listing.title).substring(0, 50).replace(/\s+/g, '_').toLowerCase()
      const priceStr = price_eur ? String(price_eur) : '0'
      const externalId = `${siteName.toLowerCase().replace(/\s+/g, '_')}_${titleHash}_${priceStr}`

      let normalizedUrl = String(listing.url).trim()
      
      // Normalisation des URLs selon le site
        const domainMap: Record<string, string> = {
          'LeBonCoin': 'https://www.leboncoin.fr',
          'LaCentrale': 'https://www.lacentrale.fr',
          'ParuVendu': 'https://www.paruvendu.fr',
          'AutoScout24': 'https://www.autoscout24.fr',
          'LeParking': 'https://www.leparking.fr',
          'ProCarLease': 'https://procarlease.com',
          'TransakAuto': 'https://annonces.transakauto.com',
        }
      
      const baseDomain = domainMap[siteName] || 'https://'
      
      // Si l'URL est déjà complète et valide, la garder
      if (normalizedUrl.startsWith('http://') || normalizedUrl.startsWith('https://')) {
        // Vérifier si c'est une URL valide du bon domaine
        try {
          const urlObj = new URL(normalizedUrl)
          // Si le domaine ne correspond pas au site, corriger
          const expectedDomain = new URL(baseDomain).hostname
          if (urlObj.hostname !== expectedDomain && !urlObj.hostname.includes(expectedDomain.replace('www.', ''))) {
            // Extraire le chemin et reconstruire avec le bon domaine
            normalizedUrl = baseDomain + urlObj.pathname + urlObj.search + urlObj.hash
          }
        } catch (e) {
          // URL mal formée, on la reconstruit
          if (normalizedUrl.startsWith('/')) {
            normalizedUrl = baseDomain + normalizedUrl
          } else {
            normalizedUrl = baseDomain + '/' + normalizedUrl
          }
        }
      } else if (normalizedUrl.startsWith('/')) {
        // URL relative, ajouter le domaine
        normalizedUrl = baseDomain + normalizedUrl
      } else if (normalizedUrl.includes('leboncoin.fr') || normalizedUrl.includes('lacentrale.fr') || 
                 normalizedUrl.includes('paruvendu.fr') || normalizedUrl.includes('autoscout24.fr') ||
                 normalizedUrl.includes('leparking.fr') || normalizedUrl.includes('procarlease.com') ||
                 normalizedUrl.includes('transakauto.com')) {
        // URL contient le domaine mais sans https://
        normalizedUrl = 'https://' + normalizedUrl.replace(/^https?:\/\//, '')
      } else {
        // URL relative sans /, ajouter le domaine et /
        normalizedUrl = baseDomain + '/' + normalizedUrl
      }
      
      // Nettoyer l'URL (supprimer les doubles slashes sauf après https:)
      normalizedUrl = normalizedUrl.replace(/([^:]\/)\/+/g, '$1')
      
      // Validation finale : vérifier que l'URL est valide
      try {
        const urlObj = new URL(normalizedUrl)
        // Pour LeBonCoin, s'assurer que le chemin commence par /ad/ ou /voitures/
        if (siteName === 'LeBonCoin') {
          if (!urlObj.pathname.startsWith('/ad/') && !urlObj.pathname.startsWith('/voitures/') && !urlObj.pathname.startsWith('/recherche')) {
            log.warn('URL LeBonCoin suspecte', {
              url: normalizedUrl,
              pathname: urlObj.pathname,
            })
            // Essayer de corriger si c'est juste un ID
            const pathParts = urlObj.pathname.split('/').filter(p => p)
            if (pathParts.length === 1 && /^\d+$/.test(pathParts[0])) {
              normalizedUrl = `https://www.leboncoin.fr/ad/${pathParts[0]}`
            }
          }
        }
      } catch (e) {
        log.error('URL invalide après normalisation', {
          site: siteName,
          url: normalizedUrl,
          error: e instanceof Error ? e.message : String(e),
        })
        // Si l'URL est vraiment invalide, on essaie de la reconstruire
        if (normalizedUrl.includes('/ad/')) {
          const adMatch = normalizedUrl.match(/\/ad\/(\d+)/)
          if (adMatch) {
            normalizedUrl = `https://www.leboncoin.fr/ad/${adMatch[1]}`
          }
        }
      }

      const normalized: ListingData = {
        external_id: externalId,
        title: String(listing.title).trim(),
        price: price_eur,
        year: year,
        mileage: mileage_km,
        url: normalizedUrl,
        image_url: listing.imageUrl ? String(listing.imageUrl) : null,
        score_ia: Math.max(0, Math.min(100, score_ia)),
        source: listing.source || siteName,
        city: listing.city ? String(listing.city) : null,
      }

      normalizedListings.push(normalized)
    }

    const filteredListings = normalizedListings.filter(listing => {
      if (listing.price === null) {
        return true
      }
      return listing.price <= maxPrice
    })

    log.info('Annonces normalisées et filtrées', {
      site: siteName,
      normalized: normalizedListings.length,
      filtered: filteredListings.length,
      maxPrice,
    })

    return filteredListings
  } catch (error) {
    if (error instanceof ExternalServiceError) {
      throw error
    }
    log.error('Erreur parsing IA', {
      site: siteName,
      error: error instanceof Error ? error.message : String(error),
    })
    throw new ExternalServiceError('OpenAI', 'Erreur lors du parsing des annonces', {
      site: siteName,
      originalError: error instanceof Error ? error.message : String(error),
    })
  }
}

/**
 * Génère une clé de déduplication basée sur (title + price + year + mileage + city)
 */
function generateDedupeKey(listing: ListingData): string {
  const title = (listing.title || '').toLowerCase().trim().replace(/\s+/g, ' ')
  const price = listing.price || 0
  const year = listing.year || 0
  const mileage = listing.mileage || 0
  const city = (listing.city || '').toLowerCase().trim()
  
  const key = `${title}|${price}|${year}|${mileage}|${city}`
  return crypto.createHash('md5').update(key).digest('hex')
}

/**
 * Déduplique les résultats basés sur (title + price + year + mileage + city)
 */
function deduplicateListings(listings: ListingData[]): ListingData[] {
  const seen = new Map<string, ListingData>()

  for (const listing of listings) {
    const dedupeKey = generateDedupeKey(listing)
    
    if (!seen.has(dedupeKey)) {
      seen.set(dedupeKey, listing)
    } else {
      // Si doublon, garder celui avec le meilleur score_ia
      const existing = seen.get(dedupeKey)!
      if ((listing.score_ia || 0) > (existing.score_ia || 0)) {
        seen.set(dedupeKey, listing)
      }
    }
  }
  
  return Array.from(seen.values())
}

// ============================================================================
// FONCTION PRINCIPALE : runSiteScraper
// ============================================================================

/**
 * Scrape un site avec timeout, retry et fallback automatique
 */
async function runSiteScraper(
  siteConfig: SiteConfig,
  query: ScrapeQuery,
  log: ReturnType<typeof createRouteLogger>
): Promise<SiteResultWithListings> {
  const startTime = Date.now()
  const siteName = siteConfig.name
  
  try {
    // Scraping avec timeout via AbortController
    const searchUrl = siteConfig.getUrl(query, false)
    
    // Utiliser des paramètres spécifiques pour LeBonCoin (ESSENTIEL - qualité professionnelle)
    const zenRowsParams = siteName === 'LeBonCoin' 
      ? SCRAPING_CONFIG.zenrows.leboncoin 
      : SCRAPING_CONFIG.zenrows.default
    
    // Timeout beaucoup plus long pour LeBonCoin (qualité professionnelle)
    const siteTimeout = siteName === 'LeBonCoin' 
      ? SCRAPING_CONFIG.timeouts.leboncoinMs 
      : SCRAPING_CONFIG.timeouts.defaultMs
    
    log.info(`[SEARCH] ${siteName} scraping démarré (timeout: ${siteTimeout}ms)`, {
      site: siteName,
      timeout: siteTimeout,
      params: siteName === 'LeBonCoin' ? 'LEBONCOIN_SPECIAL' : 'DEFAULT',
    })
    
    const abortController = new AbortController()
    const timeoutId = setTimeout(() => {
      abortController.abort()
    }, siteTimeout)
    
    let html: string
    try {
      html = await scrapeWithZenRows(searchUrl, zenRowsParams, abortController.signal)
      clearTimeout(timeoutId)
    } catch (error) {
      clearTimeout(timeoutId)
      const ms = Date.now() - startTime
      
      // Vérifier si c'est un timeout (AbortError)
      if (error instanceof Error && (error.name === 'AbortError' || error.message.includes('Timeout') || error.message.includes('aborted'))) {
        log.warn(`[SEARCH] ${siteName} timeout après ${ms}ms`)
        return {
          site: siteName,
          ok: false,
          items: [],
          error: 'timeout',
          ms,
        }
      }
      
      // Autre erreur
      throw error
    }

    // Sauvegarde debug (développement uniquement)
    if (process.env.NODE_ENV === 'development') {
      try {
        const debugPath = path.join(process.cwd(), `debug_${siteName.toLowerCase().replace(/\s+/g, '_')}.html`)
        fs.writeFileSync(debugPath, html, 'utf-8')
      } catch (fsError) {
        // Ignore
      }
    }

    // Parsing avec l'IA
    let listings = await parseListingsWithAI(
      siteName,
      html,
      query.brand,
      query.model ?? '',
      query.maxPrice,
      log
    )

    // Limiter à SCRAPING_CONFIG.limits.maxResultsPerSite
    listings = listings.slice(0, SCRAPING_CONFIG.limits.maxResultsPerSite)

    const ms = Date.now() - startTime

    // Si 0 résultat, faire un fallback avec requête assouplie
    // Pour LeBonCoin, on fait un retry avec plus de temps si nécessaire
    if (listings.length === 0) {
      log.warn(`[SEARCH] ${siteName} 0 résultat, tentative fallback...`)
      
      // Pour LeBonCoin, retry approfondi MULTIPLE (RECHERCHE PROFESSIONNELLE SANS LIMITE)
      if (siteName === 'LeBonCoin') {
        log.info(`[SEARCH] LeBonCoin retry approfondi professionnel (recherche sans limite de temps)...`)
        
        // RETRY 1 : Avec paramètres renforcés
        try {
          const retry1Params = {
            ...SCRAPING_CONFIG.zenrows.leboncoin,
            wait: '40000', // 40 secondes pour le retry 1
          }
          
          const retry1AbortController = new AbortController()
          const retry1TimeoutId = setTimeout(() => {
            retry1AbortController.abort()
          }, SCRAPING_CONFIG.timeouts.leboncoinMs)
          
          let retry1Html: string
          try {
            retry1Html = await scrapeWithZenRows(searchUrl, retry1Params, retry1AbortController.signal)
            clearTimeout(retry1TimeoutId)
            
            // Réanalyser avec l'IA
            const retry1Listings = await parseListingsWithAI(
              siteName,
              retry1Html,
              query.brand,
              query.model ?? '',
              query.maxPrice,
              log
            )
            
            if (retry1Listings.length > 0) {
              listings = retry1Listings.slice(0, SCRAPING_CONFIG.limits.maxResultsPerSite)
              log.info(`[SEARCH] LeBonCoin retry 1 réussi: ${listings.length} résultats`)
            } else {
              log.warn(`[SEARCH] LeBonCoin retry 1: 0 résultat, passage au retry 2...`)
            }
          } catch (retry1Error) {
            clearTimeout(retry1TimeoutId)
            log.warn(`[SEARCH] LeBonCoin retry 1 échoué, passage au retry 2:`, {
              error: retry1Error instanceof Error ? retry1Error.message : String(retry1Error),
            })
          }
        } catch (retry1Error) {
          log.warn(`[SEARCH] LeBonCoin retry 1 erreur:`, {
            error: retry1Error instanceof Error ? retry1Error.message : String(retry1Error),
          })
        }
        
        // RETRY 2 : Si toujours 0, avec URL assouplie et temps encore plus long
        if (listings.length === 0) {
          log.info(`[SEARCH] LeBonCoin retry 2 avec URL assouplie (recherche approfondie)...`)
          try {
            const relaxedUrl = siteConfig.getUrl(query, true)
            const retry2Params = {
              ...SCRAPING_CONFIG.zenrows.leboncoin,
              wait: '50000', // 50 secondes pour le retry 2 approfondi
            }
            
            const retry2AbortController = new AbortController()
            const retry2TimeoutId = setTimeout(() => {
              retry2AbortController.abort()
            }, SCRAPING_CONFIG.timeouts.leboncoinMs)
            
            try {
              const retry2Html = await scrapeWithZenRows(relaxedUrl, retry2Params, retry2AbortController.signal)
              clearTimeout(retry2TimeoutId)
              
              const retry2Listings = await parseListingsWithAI(
                siteName,
                retry2Html,
                query.brand,
                query.model ?? '',
                query.maxPrice,
                log
              )
              
              if (retry2Listings.length > 0) {
                listings = retry2Listings.slice(0, SCRAPING_CONFIG.limits.maxResultsPerSite)
                log.info(`[SEARCH] LeBonCoin retry 2 réussi: ${listings.length} résultats`)
              } else {
                log.warn(`[SEARCH] LeBonCoin retry 2: 0 résultat, passage au retry 3 final...`)
              }
            } catch (retry2Error) {
              clearTimeout(retry2TimeoutId)
              log.warn(`[SEARCH] LeBonCoin retry 2 échoué, passage au retry 3:`, {
                error: retry2Error instanceof Error ? retry2Error.message : String(retry2Error),
              })
            }
          } catch (retry2Error) {
            log.warn(`[SEARCH] LeBonCoin retry 2 erreur:`, {
              error: retry2Error instanceof Error ? retry2Error.message : String(retry2Error),
            })
          }
        }
        
        // RETRY 3 FINAL : Dernière tentative avec recherche très large
        if (listings.length === 0) {
          log.info(`[SEARCH] LeBonCoin retry 3 FINAL avec recherche très large (recherche professionnelle maximale)...`)
          try {
            // Recherche très large : juste la marque, sans modèle strict
            const veryRelaxedUrl = `https://www.leboncoin.fr/recherche?text=${encodeURIComponent(query.brand)}&price=0-${Math.floor(query.maxPrice * 1.5)}&sort=time&order=desc&category=2`
            const retry3Params = {
              ...SCRAPING_CONFIG.zenrows.leboncoin,
              wait: '60000', // 60 secondes pour le retry 3 final (recherche maximale)
            }
            
            const retry3AbortController = new AbortController()
            const retry3TimeoutId = setTimeout(() => {
              retry3AbortController.abort()
            }, SCRAPING_CONFIG.timeouts.leboncoinMs)
            
            try {
              const retry3Html = await scrapeWithZenRows(veryRelaxedUrl, retry3Params, retry3AbortController.signal)
              clearTimeout(retry3TimeoutId)
              
              // Filtrer ensuite par modèle dans l'IA
              const retry3Listings = await parseListingsWithAI(
                siteName,
                retry3Html,
                query.brand,
                query.model ?? '',
                query.maxPrice,
                log
              )
              
              listings = retry3Listings.slice(0, SCRAPING_CONFIG.limits.maxResultsPerSite)
              log.info(`[SEARCH] LeBonCoin retry 3 FINAL: ${listings.length} résultats`)
            } catch (retry3Error) {
              clearTimeout(retry3TimeoutId)
              log.error(`[SEARCH] LeBonCoin retry 3 FINAL échoué:`, {
                error: retry3Error instanceof Error ? retry3Error.message : String(retry3Error),
              })
            }
          } catch (retry3Error) {
            log.error(`[SEARCH] LeBonCoin retry 3 FINAL erreur:`, {
              error: retry3Error instanceof Error ? retry3Error.message : String(retry3Error),
            })
          }
        }
      }
      
      // Fallback standard avec requête assouplie (pour les autres sites)
      if (listings.length === 0 && siteName !== 'LeBonCoin') {
        try {
          const relaxedUrl = siteConfig.getUrl(query, true)
          const fallbackAbortController = new AbortController()
          const fallbackTimeoutId = setTimeout(() => {
            fallbackAbortController.abort()
          }, SCRAPING_CONFIG.timeouts.defaultMs)
          
          let relaxedHtml: string
          try {
            relaxedHtml = await scrapeWithZenRows(relaxedUrl, SCRAPING_CONFIG.zenrows.default, fallbackAbortController.signal)
            clearTimeout(fallbackTimeoutId)
          } catch (fallbackError) {
            clearTimeout(fallbackTimeoutId)
            throw fallbackError
          }
          
          listings = await parseListingsWithAI(
            siteName,
            relaxedHtml,
            query.brand,
            query.model ?? '',
            query.maxPrice,
            log
          )
          listings = listings.slice(0, SCRAPING_CONFIG.limits.maxResultsPerSite)
          
          log.debug(`[SEARCH] ${siteName} fallback: ${listings.length} résultats`)
        } catch (fallbackError) {
          log.error(`[SEARCH] ${siteName} fallback échoué:`, {
            error: fallbackError instanceof Error ? fallbackError.message : String(fallbackError),
          })
        }
      }
    }

    // Convertir en ListingResponse
    const items: ListingResponse[] = listings.map(listing => ({
      id: listing.external_id,
      title: listing.title,
      price_eur: listing.price,
      mileage_km: listing.mileage,
      year: listing.year,
      source: listing.source || siteName,
      url: listing.url,
      imageUrl: listing.image_url,
      score_ia: listing.score_ia,
      score_final: 0, // Sera calculé plus tard
    }))

    const finalMs = Date.now() - startTime

    return {
      site: siteName,
      ok: true,
      items,
      ms: finalMs,
      retryUsed: listings.length === 0 && items.length > 0,
    }
  } catch (error) {
    const ms = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : String(error)
    
    log.error(`[SEARCH] ${siteName} erreur après ${ms}ms:`, {
      error: errorMessage,
      site: siteName,
      ms,
    })
    
    return {
      site: siteName,
      ok: false,
      items: [],
      error: errorMessage,
      ms,
    }
  }
}

// ============================================================================
// ROUTE API PRINCIPALE
// ============================================================================

export async function POST(request: NextRequest) {
  const log = createRouteLogger('/api/search')
  const searchStartTime = Date.now()
  
  // Déclarer jobId en haut pour qu'il soit accessible dans le catch
  let jobId: string | null = null
  
  try {
    // Récupérer l'utilisateur (peut être null si non authentifié)
    // On utilise getAuthenticatedUser au lieu de requireAuth pour permettre les recherches anonymes
    const user = await getAuthenticatedUser(request)
    
    // Log de diagnostic tracking (AU DÉBUT de la requête)
    console.log('[Tracking] Route /api/search appelée', {
      userId: user?.id || 'anonymous',
      timestamp: new Date().toISOString(),
    })
    
    if (user) {
      log.info('Recherche avec utilisateur authentifié', { userId: user.id })
    } else {
      log.info('Recherche anonyme (non sauvegardée)')
      console.log('[Tracking] Utilisateur non authentifié, skip logAiSearch (userId: null)')
    }
    try {
      checkRateLimit(request, RATE_LIMITS.SEARCH, user?.id)
    } catch (rateLimitError) {
      log.warn('Rate limit dépassé', { userId: user?.id })
      return createErrorResponse(rateLimitError)
    }

    // Validation
    const body = await request.json()
    
    const validationResult = searchSchema.safeParse({
      brand: body.brand,
      model: body.model,
      max_price: body.max_price,
      fuelType: body.fuelType || body.fuel_type,
      fuel_type: body.fuel_type || body.fuelType,
      year_min: body.year_min,
      year_max: body.year_max,
      mileage_max: body.mileage_max,
      transmission: body.transmission,
      power_min: body.power_min,
      critair: body.critair,
      specific_requirements: body.specific_requirements,
      has_rear_camera: body.has_rear_camera,
      has_carplay: body.has_carplay,
      location: body.location,
      radius_km: body.radius_km,
      platforms: body.platforms ? (Array.isArray(body.platforms) ? body.platforms : body.platforms.split(',')) : undefined,
      hide_no_photo: body.hide_no_photo,
      hide_no_phone: body.hide_no_phone,
      sort_by: body.sort_by,
      page: body.page || 1,
      limit: body.limit || 30,
    })

    if (!validationResult.success) {
      log.error('Validation échouée', { errors: validationResult.error.errors })
      throw new ValidationError('Données de recherche invalides', validationResult.error.errors)
    }

    const { brand, model, max_price, fuelType, page, limit, ...otherCriteria } = validationResult.data
    
    const maxPriceForSearch = max_price || 100000
    
    const allCriteria = {
      brand,
      model,
      max_price: maxPriceForSearch,
      fuel_type: fuelType || otherCriteria.fuel_type,
      year_min: otherCriteria.year_min,
      year_max: otherCriteria.year_max,
      mileage_max: otherCriteria.mileage_max,
      transmission: otherCriteria.transmission,
      power_min: otherCriteria.power_min,
      critair: otherCriteria.critair,
      specific_requirements: otherCriteria.specific_requirements,
      has_rear_camera: otherCriteria.has_rear_camera,
      has_carplay: otherCriteria.has_carplay,
      location: otherCriteria.location,
      radius_km: otherCriteria.radius_km,
      platforms: otherCriteria.platforms,
      hide_no_photo: otherCriteria.hide_no_photo,
      hide_no_phone: otherCriteria.hide_no_phone,
      sort_by: otherCriteria.sort_by || 'score',
    }

    // Vérification configuration
    if (!openai) {
      log.error('OPENAI_API_KEY manquante')
      throw new InternalServerError('Configuration serveur manquante (OpenAI)')
    }

    // Log unique avec ID pour éviter les doublons
    const searchId = crypto.randomUUID()
    
    // Créer un job de scraping pour permettre l'annulation
    try {
      jobId = await createScrapingJob(user?.id || null, {
        brand,
        model,
        max_price: maxPriceForSearch,
        fuelType: fuelType || null,
        ...otherCriteria,
      })
      log.info('Job de scraping créé', { jobId, userId: user?.id || null })
    } catch (jobError) {
      log.warn('Erreur création job (non-bloquant)', {
        error: jobError instanceof Error ? jobError.message : String(jobError),
      })
      // Continuer même si la création du job échoue
    }
    
    log.info('Recherche démarrée', {
      searchId,
      jobId,
      brand,
      model,
      maxPrice: max_price,
      fuelType: fuelType || null,
      userId: user?.id || null,
    })

    // Vérifier le cache
    const cacheKey = getCacheKey({ brand, model, maxPrice: maxPriceForSearch }, 'all')
    const cached = getFromCache(cacheKey)
    if (cached) {
      log.info(`[SEARCH] Cache hit pour ${brand} ${model}`, {
        total: cached.allItems.length,
        sites: cached.data.length,
      })
      
      // Pagination
      const startIndex = (page - 1) * limit
      const endIndex = startIndex + limit
      const paginatedListings = cached.allItems.slice(startIndex, endIndex)
      const totalPages = Math.ceil(cached.allItems.length / limit)

      return NextResponse.json({
        success: true,
        criteria: {
          brand,
          model: model || '',
          maxPrice: maxPriceForSearch,
          fuelType: fuelType || undefined,
        },
        query: {
          brand,
          model,
          maxPrice: maxPriceForSearch,
          fuelType: fuelType || undefined,
        },
        sites: cached.data.reduce((acc, site) => {
          acc[site.site] = { count: site.items.length }
          return acc
        }, {} as Record<string, { count: number }>),
        items: paginatedListings,
        listings: paginatedListings,
        stats: {
          totalItems: cached.allItems.length,
          sitesScraped: cached.data.filter(s => s.ok).length,
          totalMs: 0,
        },
        pagination: {
          page,
          limit,
          total: cached.allItems.length,
          totalPages,
        },
        siteResults: cached.data.map(site => ({
          site: site.site,
          ok: site.ok,
          items: Array.isArray(site.items) ? site.items.length : (typeof site.items === 'number' ? site.items : 0),
          ms: site.ms,
          strategy: (site as any).strategy || 'http-html',
          error: site.error,
        })) as SearchResponse['siteResults'],
      } as SearchResponse & { success?: boolean; query?: any; sites?: any; listings?: ListingResponse[]; pagination?: any })
    }

    // Filtrer les sites actifs selon la nouvelle configuration
    const activeSites = SITE_CONFIGS.filter(site => {
      // Vérifier d'abord si le site est activé dans la nouvelle configuration
      const enabledInConfig = isSiteEnabled(site.name)
      // Ensuite vérifier si le site est actif dans l'ancienne config (pour compatibilité)
      return enabledInConfig && site.active
    })
    
    if (activeSites.length === 0) {
      throw new InternalServerError('Aucun site actif configuré')
    }

    // Construire la query pour runSiteScraper
    const scrapeQuery: ScrapeQuery = {
      brand,
      model,
      maxPrice: maxPriceForSearch,
      // minPrice n'existe pas dans le schéma, on ne l'utilise pas
      fuelType: fuelType || otherCriteria.fuel_type,
      minYear: otherCriteria.year_min,
      maxYear: otherCriteria.year_max,
      maxMileage: otherCriteria.mileage_max,
      zipCode: otherCriteria.location,
      radiusKm: otherCriteria.radius_km,
      ...otherCriteria,
    }

    // Exécution parallèle avec Promise.allSettled (nouveau système 3 passes)
    log.info(`[SEARCH] Démarrage scraping parallèle pour ${activeSites.length} sites (système 3 passes)`)
    
    // Fonction pour vérifier si le job a été annulé
    const checkJobCancelled = async () => {
      if (jobId) {
        const cancelled = await isJobCancelled(jobId)
        if (cancelled) {
          log.info('Job annulé, arrêt du scraping', { jobId })
          throw new JobCancelledError(jobId)
        }
      }
    }
    
    // Pour chaque site, on lance runSiteSearch qui gère les 3 passes
    // On vérifie le statut du job avant de lancer chaque site
    const tasks = activeSites.map(async (site) => {
      // Vérifier si le job a été annulé avant de lancer le scraping du site
      await checkJobCancelled()
      return runSiteSearch(site.name, scrapeQuery, [])
    })
    
    const results = await Promise.allSettled(tasks)

    // Transformer en SiteResultWithListings[] (usage interne)
    // Note: runSiteSearch retourne items: number et listings: ListingResponse[] (propriété supplémentaire)
    const siteResults: SiteResultWithListings[] = results.map((result, index) => {
      if (result.status === 'fulfilled') {
        const siteResult = result.value as any // Cast pour accéder à listings
        // Utiliser listings si disponible, sinon items (pour compatibilité)
        const listings = (siteResult.listings && Array.isArray(siteResult.listings)) 
          ? siteResult.listings 
          : (Array.isArray(siteResult.items) ? siteResult.items : [])
        // Distinguer "ok mais 0 résultats" vs "erreur technique"
        // ok: true si le scraping a fonctionné (même avec 0 résultats)
        // ok: false uniquement si erreur technique (timeout, exception, etc.)
        return {
          ...siteResult,
          items: listings,
          // Si items.length === 0 mais pas d'erreur explicite, c'est "ok mais 0 résultats"
          ok: siteResult.ok !== false && listings.length === 0
            ? true 
            : siteResult.ok,
        }
      } else {
        const siteName = activeSites[index].name
        const errorMsg = result.reason instanceof Error ? result.reason.message : String(result.reason)
        log.error(`[SEARCH] ${siteName} rejeté:`, {
          error: errorMsg,
          site: siteName,
        })
        return {
          site: siteName,
          ok: false, // Erreur technique
          items: [],
          error: errorMsg,
          ms: 0,
        }
      }
    })

    // Logs détaillés par site
    log.info(`[SEARCH] Résultats par site:`, {
      sites: siteResults.map(site => ({
        site: site.site,
        ok: site.ok,
        items: site.items.length,
        ms: site.ms,
        error: site.error,
      })),
    })

    // Garantir au moins 1 réponse par site (même si vide)
    const finalSiteResults = siteResults.map(site => {
      if (!site.ok && site.items.length === 0) {
        return {
          ...site,
          ok: true,
          items: [],
          error: site.error || 'Aucun résultat trouvé',
        }
      }
      return site
    })

    // Combiner tous les items depuis les SiteResultWithListings
    const allItemsRaw: ListingResponse[] = []
    finalSiteResults.forEach(siteResult => {
      allItemsRaw.push(...siteResult.items)
    })

    // Déduplication avec le nouveau système
    const allItemsDeduped = dedupeListings(allItemsRaw)
    
    log.info('Déduplication terminée', {
      before: allItemsRaw.length,
      after: allItemsDeduped.length,
    })

    // Scoring avec le nouveau système professionnel
    const listingsWithScores = scoreAllListings(allItemsDeduped, scrapeQuery)

    // Tri par score décroissant (déjà fait dans scoreAllListings, mais on s'assure)
    listingsWithScores.sort((a, b) => {
      const scoreA = a.score_final ?? a.score_ia ?? 0
      const scoreB = b.score_final ?? b.score_ia ?? 0
      return scoreB - scoreA
    })

    log.info('Scores calculés', {
      total: listingsWithScores.length,
      top3: listingsWithScores.slice(0, 3).map(l => l.score_final),
    })

    // Enregistrement dans Supabase (si user authentifié)
    let searchQueryId: string | null = null
    
    if (user) {
      try {
        const platformsArray = finalSiteResults.map(s => s.site)
        log.info('Sauvegarde recherche dans search_queries', {
          userId: user.id,
          brand: allCriteria.brand,
          model: allCriteria.model,
          resultsCount: listingsWithScores.length,
        })
        
        const { data: searchQueryData, error: searchQueryError } = await supabase
          .from('search_queries')
          .insert({
            user_id: user.id,
            criteria_json: allCriteria,
            results_count: listingsWithScores.length,
            platforms_json: platformsArray,
            status: 'completed',
            last_run_at: new Date().toISOString(),
          })
          .select()
          .single()

        if (searchQueryError) {
          log.error('Erreur enregistrement search_queries', {
            error: searchQueryError.message,
            code: searchQueryError.code,
            details: searchQueryError.details,
            hint: searchQueryError.hint,
            userId: user.id,
            // Aide au debug
            tableExists: 'Vérifiez que la table search_queries existe dans Supabase',
            rlsEnabled: 'Vérifiez que RLS est correctement configuré',
          })
          // Ne pas throw - la recherche peut continuer même si la sauvegarde échoue
        } else {
          searchQueryId = searchQueryData.id
          log.info('✅ Recherche sauvegardée avec succès', {
            searchQueryId,
            userId: user.id,
            brand: allCriteria.brand,
            model: allCriteria.model,
            resultsCount: listingsWithScores.length,
          })
        }
      } catch (error) {
        log.error('Erreur création search query', {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          userId: user.id,
        })
      }
    } else {
      log.warn('Utilisateur non authentifié, recherche non sauvegardée')
    }

    // Les listings sont déjà au bon format ListingResponse
    const responseListings: ListingResponse[] = listingsWithScores

    // Mettre à jour les scores dans siteResults
    const updatedSiteResults = finalSiteResults.map(siteResult => ({
      ...siteResult,
      items: siteResult.items.map(item => {
        const withScore = responseListings.find(l => l.id === item.id)
        return withScore || item
      }),
    }))

    // Mettre en cache
    setCache(cacheKey, updatedSiteResults, responseListings)

    // Pagination
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const paginatedListings = responseListings.slice(startIndex, endIndex)
    const totalPages = Math.ceil(responseListings.length / limit)

    const totalMs = Date.now() - searchStartTime
    log.info(`[SEARCH] Recherche terminée en ${totalMs}ms - ${responseListings.length} résultats totaux`)

    // Mettre à jour le statut du job à 'done'
    if (jobId) {
      try {
        await updateJobStatus(jobId, 'done')
        log.info('Job marqué comme terminé', { jobId })
      } catch (jobError) {
        log.warn('Erreur mise à jour job (non-bloquant)', {
          jobId,
          error: jobError instanceof Error ? jobError.message : String(jobError),
        })
      }
    }

    // Retour de la réponse
    const response = {
      success: true,
      criteria: {
        brand,
        model: model || null,
        maxPrice: maxPriceForSearch,
        fuelType: fuelType || null,
      },
      query: {
        brand,
        model,
        maxPrice: maxPriceForSearch,
        fuelType: fuelType || undefined,
      },
      items: paginatedListings,
      sites: updatedSiteResults.reduce((acc, site) => {
        acc[site.site] = { count: site.items.length }
        return acc
      }, {} as Record<string, { count: number }>),
      listings: paginatedListings,
      stats: {
        totalItems: responseListings.length,
        sitesScraped: updatedSiteResults.filter(s => s.ok).length,
        totalMs: Date.now() - searchStartTime,
      },
      allItems: responseListings,
      pagination: {
        page,
        limit,
        total: responseListings.length,
        totalPages,
      },
      siteResults: updatedSiteResults.map(site => ({
        site: site.site,
        ok: site.ok,
        items: Array.isArray(site.items) ? site.items.length : 0,
        ms: site.ms,
        strategy: (site as any).strategy || (site as any).strategyUsed || 'http-html',
        error: site.error,
      })),
      jobId, // Inclure le jobId dans la réponse pour permettre l'annulation côté frontend
    }

    log.info('Recherche terminée avec succès', {
      total: responseListings.length,
      returned: paginatedListings.length,
      page,
      limit,
      totalMs,
    })

    // Logging automatique dans ai_searches (non-bloquant)
    if (user) {
      const queryText = `${brand} ${model || ''}`.trim() || 'Recherche véhicule'
      console.log('[Tracking] Appel logAiSearch', {
        userId: user.id,
        queryText,
        filtersKeys: Object.keys(allCriteria),
      })
      
      logAiSearch(
        {
          userId: user.id,
          queryText,
          filters: allCriteria,
        },
        { useServiceRole: true }
      ).catch(err => {
        log.warn('Erreur tracking recherche (non-bloquant)', { error: err })
        console.error('[Tracking] Exception dans logAiSearch:', err)
      })
    } else {
      console.log('[Tracking] Utilisateur non authentifié, skip logAiSearch')
    }

    // Alimenter listings_cache pour les recommandations (en arrière-plan, non-bloquant)
    if (responseListings.length > 0) {
      import('@/lib/cache-listings').then(({ cacheSearchResults }) => {
        cacheSearchResults(responseListings).catch(err => {
          log.warn('Erreur cache listings (non-bloquant)', { error: err })
        })
      }).catch(() => {
        // Ignore si le module ne peut pas être chargé
      })
    }

    return NextResponse.json(response as SearchResponse & { success?: boolean; query?: any; sites?: any; listings?: ListingResponse[]; pagination?: any; allItems?: ListingResponse[]; jobId?: string | null })
  } catch (error) {
    // Si le job a été annulé, mettre à jour le statut et retourner une réponse appropriée
    if (error instanceof JobCancelledError) {
      const cancelledJobId = error.jobId
      log.info('Scraping annulé par l\'utilisateur', { jobId: cancelledJobId })
      
      if (cancelledJobId) {
        try {
          await updateJobStatus(cancelledJobId, 'cancelled')
        } catch (jobError) {
          log.warn('Erreur mise à jour job annulé (non-bloquant)', {
            jobId: cancelledJobId,
            error: jobError instanceof Error ? jobError.message : String(jobError),
          })
        }
      }
      
      return NextResponse.json(
        {
          success: false,
          error: 'Recherche annulée',
          message: 'La recherche a été annulée par l\'utilisateur',
          cancelled: true,
          jobId: cancelledJobId,
        },
        { status: 200 } // 200 car c'est une action volontaire, pas une erreur
      )
    }
    
    // Mettre à jour le statut du job à 'failed' en cas d'erreur
    if (jobId) {
      try {
        await updateJobStatus(jobId, 'failed')
      } catch (jobError) {
        log.warn('Erreur mise à jour job failed (non-bloquant)', {
          jobId,
          error: jobError instanceof Error ? jobError.message : String(jobError),
        })
      }
    }
    
    log.error('Erreur serveur', {
      error: error instanceof Error ? error.message : String(error),
    })
    return createErrorResponse(error)
  }
}
