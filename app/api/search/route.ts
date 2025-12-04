import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { scrapeWithZenRows } from '@/lib/zenrows'
import { openai } from '@/lib/openai'
import { getAuthenticatedUser } from '@/lib/auth'
import { searchSchema, type SearchInput } from '@/lib/validation'
import type { ListingResponse, SearchResponse } from '@/lib/types'
import { computeListingScore, type NormalizedListing } from '@/lib/scoring'

// ============================================================================
// CONFIGURATION
// ============================================================================

// Initialisation des clients
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Vérification OpenAI (déjà initialisé dans lib/openai.ts)

// Configuration ZenRows standardisée
const ZENROWS_DEFAULT_PARAMS = {
  js_render: 'true',
  premium_proxy: 'true',
  wait: '5000',
}

// Interface interne pour le traitement
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
}

// Interface pour la configuration d'un site
interface SiteConfig {
  name: string
  getUrl: (brand: string, model: string, maxPrice: number) => string
  active: boolean
}

// ============================================================================
// CONFIGURATION DES SITES
// ============================================================================

const SITE_CONFIGS: SiteConfig[] = [
  {
    name: 'LeBonCoin',
    getUrl: (brand, model, maxPrice) => {
      const params = new URLSearchParams({
        text: `${brand} ${model}`,
        price: `0-${maxPrice}`,
        sort: 'time',
        order: 'desc',
      })
      return `https://www.leboncoin.fr/recherche?${params.toString()}`
    },
    active: true,
  },
  {
    name: 'LaCentrale',
    getUrl: (brand, model, maxPrice) => {
      return `https://www.lacentrale.fr/listing?makesModels=${encodeURIComponent(brand)}-${encodeURIComponent(model)}&priceMax=${maxPrice}`
    },
    active: true,
  },
  {
    name: 'ParuVendu',
    getUrl: (brand, model) => {
      // Format correct: /a/voiture-occasion/[marque]/[modele]/
      // ParuVendu accepte les modèles avec chiffres comme "clio-4"
      const brandSlug = brand.toLowerCase().trim().replace(/\s+/g, '-')
      const modelSlug = model.toLowerCase().trim().replace(/\s+/g, '-')
      return `https://www.paruvendu.fr/a/voiture-occasion/${encodeURIComponent(brandSlug)}/${encodeURIComponent(modelSlug)}/`
    },
    active: true,
  },
  {
    name: 'AutoScout24',
    getUrl: (brand, model, maxPrice) => {
      // AutoScout24 : format de recherche avec paramètres de requête
      // Les modèles avec chiffres (ex: "clio 4") ne fonctionnent pas dans le chemin URL
      // Utiliser le format de recherche avec make et model en paramètres
      const brandSlug = brand.toLowerCase().trim()
      const modelSlug = model.toLowerCase().trim()
      // Format alternatif : recherche par paramètres si le chemin ne fonctionne pas
      // Note: AutoScout24 peut nécessiter un format différent selon le modèle
      // Pour l'instant, on essaie le format standard mais on accepte que certains modèles échouent
      return `https://www.autoscout24.fr/lst/${brandSlug}/${modelSlug.replace(/\s+/g, '-')}?price=${maxPrice}`
    },
    active: true,
  },
  {
    name: 'LeParking',
    getUrl: (brand, model, maxPrice) => {
      // LeParking peut avoir des problèmes avec certains formats
      // Simplifier le format de recherche
      const searchTerm = `${brand} ${model}`.toLowerCase().trim().replace(/\s+/g, '-')
      return `https://www.leparking.fr/voiture/${encodeURIComponent(searchTerm)}/prix-max-${maxPrice}`
    },
    active: true,
  },
]

// ============================================================================
// FONCTIONS UTILITAIRES
// ============================================================================

/**
 * Convertit une valeur en nombre, en gérant les strings numériques
 */
function toNumber(value: any): number | null {
  if (typeof value === 'number') return isNaN(value) ? null : value
  if (typeof value === 'string') {
    // Enlever espaces, points, virgules, €, etc.
    const cleaned = value.replace(/[\s.,€]/g, '')
    const num = Number(cleaned)
    return isNaN(num) ? null : num
  }
  return null
}

/**
 * Parse la réponse de l'IA de manière robuste
 * Gère les cas où l'IA ajoute du texte avant/après le JSON
 */
function parseAIResponse(rawResponse: string, siteName: string): { listings: any[] } {
  if (!rawResponse || typeof rawResponse !== 'string') {
    console.error(`❌ [${siteName}] Réponse IA vide ou invalide`)
    return { listings: [] }
  }

  try {
    // Essayer de parser directement
    const parsed = JSON.parse(rawResponse)
    
    if (!parsed || !Array.isArray(parsed.listings)) {
      console.error(`❌ [${siteName}] JSON parsé mais "listings" n'est pas un array`, {
        hasListings: !!parsed?.listings,
        listingsType: typeof parsed?.listings,
      })
      return { listings: [] }
    }
    
    return parsed
  } catch (e) {
    // Si échec, chercher le JSON dans la réponse
    try {
      const jsonStart = rawResponse.indexOf('{')
      const jsonEnd = rawResponse.lastIndexOf('}')
      
      if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) {
        console.error(`❌ [${siteName}] Impossible de trouver de JSON dans la réponse IA`)
        console.error(`📄 Réponse (premiers 400 chars):`, rawResponse.slice(0, 400))
        return { listings: [] }
      }
      
      const jsonString = rawResponse.slice(jsonStart, jsonEnd + 1)
      const parsed = JSON.parse(jsonString)
      
      if (!parsed || !Array.isArray(parsed.listings)) {
        console.error(`❌ [${siteName}] JSON extrait mais "listings" n'est pas un array`, parsed)
        return { listings: [] }
      }
      
      console.warn(`⚠️ [${siteName}] JSON extrait du texte (l'IA a ajouté du texte avant/après)`)
      return parsed
    } catch (parseError) {
      console.error(`❌ [${siteName}] Erreur JSON.parse:`, parseError)
      console.error(`📄 Réponse IA (début):`, rawResponse.slice(0, 400))
      return { listings: [] }
    }
  }
}

/**
 * Scrape un site unique via ZenRows
 */
async function scrapeSiteWithUrl(
  siteConfig: SiteConfig,
  searchUrl: string
): Promise<{ site: string; html: string; success: boolean; error?: string }> {
  try {
    console.log(`🔗 [${siteConfig.name}] URL: ${searchUrl}`)

    if (!searchUrl || searchUrl.trim() === '') {
      throw new Error(`URL vide pour ${siteConfig.name}`)
    }

    const html = await scrapeWithZenRows(searchUrl, ZENROWS_DEFAULT_PARAMS)

    console.log(`✅ [${siteConfig.name}] ${html.length.toLocaleString()} caractères reçus`)

    // Sauvegarde debug
    try {
      const debugPath = path.join(process.cwd(), `debug_${siteConfig.name.toLowerCase().replace(/\s+/g, '_')}.html`)
      fs.writeFileSync(debugPath, html, 'utf-8')
    } catch (fsError) {
      // Ignore les erreurs de sauvegarde
    }

    return {
      site: siteConfig.name,
      html,
      success: true,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error(`❌ [${siteConfig.name}] Erreur scraping:`, errorMessage)
    return {
      site: siteConfig.name,
      html: '',
      success: false,
      error: errorMessage,
    }
  }
}

/**
 * Filtre le HTML pour ne garder que les lignes pertinentes
 * Réduit drastiquement la taille en gardant uniquement les lignes contenant des indices d'annonces
 */
function buildRelevantHtmlSnippet(html: string, brand: string, model: string): string {
  const lowerBrand = brand.toLowerCase()
  const lowerModel = model.toLowerCase()

  // Diviser le HTML en lignes
  const lines = html.split('\n')

  // Filtrer les lignes pertinentes
  const filtered = lines.filter((line) => {
    const l = line.toLowerCase()
    return (
      l.includes(lowerBrand) ||
      l.includes(lowerModel) ||
      l.includes('€') ||
      l.includes('eur') ||
      l.includes('km') ||
      l.includes('kilometre') ||
      l.includes('price') ||
      l.includes('prix') ||
      l.includes('aditem') ||
      l.includes('ad-item') ||
      l.includes('listing') ||
      l.includes('annonce') ||
      l.includes('voiture') ||
      l.includes('href="/ad/') ||
      l.includes('href="/voiture/') ||
      l.includes('data-test-id="adcard') ||
      l.includes('data-test-id="price')
    )
  })

  const snippet = filtered.join('\n')

  // Limiter à 40k caractères max pour rester dans les limites du modèle
  return snippet.slice(0, 40000)
}

/**
 * Parse le HTML avec l'IA pour extraire les annonces
 */
async function parseListingsWithAI(
  siteName: string,
  html: string,
  brand: string,
  model: string,
  maxPrice: number
): Promise<ListingData[]> {
  if (!openai) {
    throw new Error('OPENAI_API_KEY manquante')
  }

  // Filtrer le HTML pour ne garder que les lignes pertinentes
  const relevantHtml = buildRelevantHtmlSnippet(html, brand, model)
  console.log(`🤖 [${siteName}] HTML filtré pour l'IA: ${relevantHtml.length.toLocaleString()} caractères (sur ${html.length.toLocaleString()} initiaux)`)

  // ========================================================================
  // PROMPT IA - Version durcie pour éviter la sortie "facile"
  // ========================================================================
  const systemPrompt = `Tu es un extracteur d'annonces automobiles.

Ta mission :
- Identifier les blocs d'annonces automobiles dans du HTML de sites comme LeBonCoin, LaCentrale, ParuVendu, AutoScout24, LeParking.
- Extraire un maximum d'annonces correctes, même si certaines informations sont manquantes.

CONTRAINTES ABSOLUMENT STRICTES :
- Tu dois TOUJOURS renvoyer du JSON STRICTEMENT VALIDE.
- Tu peux renvoyer { "listings": [] } UNIQUEMENT si tu es **100% CERTAIN** que la page ne contient AUCUNE annonce (ex: message "aucune annonce", page d'erreur 404, page de login, HTML complètement vide).
- Si le HTML filtré contient plusieurs prix, plusieurs liens, plusieurs mentions de marque/modèle → il y a FORCÉMENT des annonces. Tu DOIS en extraire plusieurs.
- Si tu hésites entre extraire des annonces ou renvoyer { "listings": [] }, tu DOIS extraire les annonces.
- Ne choisis JAMAIS la solution de facilité { "listings": [] } par défaut ou par paresse.
- Si tu vois au moins 2-3 prix différents dans le HTML → il y a au moins 2-3 annonces à extraire.`

  const userPrompt = `Analyse ce HTML filtré provenant du site "${siteName}" et extrais TOUTES les annonces de véhicules correspondant à "${brand} ${model}" avec un budget maximum de ${maxPrice}€.

Le HTML filtré contient uniquement les lignes pertinentes avec :
- des titres d'annonces,
- des prix (format: "X XXX €", "X.XXX €", etc.),
- des kilométrages ("km"),
- des mentions de "${brand}" et "${model}",
- des liens vers des annonces.

INSTRUCTIONS CRITIQUES (À RESPECTER ABSOLUMENT) :
1. Si ce HTML filtré contient plusieurs prix, plusieurs titres, plusieurs liens → c'est FORCÉMENT une page de résultats avec des annonces. Tu DOIS en extraire plusieurs, même si certaines données sont incomplètes.
2. Tu ne renvoies { "listings": [] } QUE si le HTML filtré est vraiment vide ou ne contient aucun indice d'annonce (aucun prix, aucun titre, aucun lien).
3. Si tu vois au moins 2-3 prix différents dans le HTML → il y a au moins 2-3 annonces. Extrais-les.
4. Si certaines informations manquent (prix, km, année), utilise null mais garde l'annonce si tu as au minimum un titre et une URL.
5. Ne choisis JAMAIS la solution facile { "listings": [] } par défaut. Si tu hésites, extrais quand même les annonces que tu peux identifier.

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
      "source": "${siteName}"
    }
  ]
}

RÈGLES :
- title et url sont OBLIGATOIRES (sans eux, l'annonce est invalide)
- price_eur : nombre pur (enlève espaces, points, virgules, "€") ou null si absent
- mileage_km : nombre ou null
- year : nombre (4 chiffres) ou null
- url : URL absolue (complète avec https:// si relatif)
- imageUrl : URL de l'image ou null
- score_ia : 0-100 (80-100: excellente, 60-79: bonne, 40-59: moyenne, 0-39: à éviter) ou null
- source : "${siteName}"

Tu n'as PAS le droit d'ajouter du texte en dehors du JSON.

HTML filtré (${relevantHtml.length.toLocaleString()} caractères) :
"""${relevantHtml}""`

  try {
    // Utiliser un modèle plus costaud pour l'extraction (optionnel mais recommandé)
    // Par défaut: gpt-4o-mini (économique)
    // Pour meilleure extraction: gpt-4o ou gpt-4-turbo
    // Peut être overridé via .env.local : OPENAI_MODEL=gpt-4o
    const modelToUse = process.env.OPENAI_MODEL || 'gpt-4o-mini'
    
    if (modelToUse !== 'gpt-4o-mini') {
      console.log(`🚀 [${siteName}] Utilisation du modèle ${modelToUse} (plus costaud)`)
    }
    
    const completion = await openai.chat.completions.create({
      model: modelToUse,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0, // 0 pour maximum de cohérence et éviter les sorties vides
      max_tokens: 6000,
    })

    const responseContent = completion.choices[0]?.message?.content
    if (!responseContent) {
      throw new Error('OpenAI n\'a pas retourné de contenu')
    }

    // Log de la réponse brute (utile pour debugging)
    console.log(`📄 [${siteName}] Réponse IA (${responseContent.length} chars):`, responseContent.substring(0, 300))

    // Parsing robuste
    const analysisResult = parseAIResponse(responseContent, siteName)
    const rawListings = analysisResult.listings || []
    
    console.log(`📊 [${siteName}] ${rawListings.length} annonce(s) brute(s) extraite(s) par l'IA`)

    // ========================================================================
    // NORMALISATION ET VALIDATION (ASSOUPLIE)
    // ========================================================================
    const normalizedListings: ListingData[] = []

    for (const listing of rawListings) {
      // Validation minimale : title et url sont OBLIGATOIRES
      if (!listing || !listing.title || !listing.url) {
        console.warn(`⚠️ [${siteName}] Annonce ignorée (manque title ou url)`, {
          hasTitle: !!listing?.title,
          hasUrl: !!listing?.url,
        })
        continue
      }

      // Conversion des types (tolérante)
      const price_eur = toNumber(listing.price_eur)
      const mileage_km = toNumber(listing.mileage_km)
      const year = toNumber(listing.year)
      const score_ia = toNumber(listing.score_ia) ?? 50

      // Génération d'un external_id unique
      const titleHash = String(listing.title).substring(0, 50).replace(/\s+/g, '_').toLowerCase()
      const priceStr = price_eur ? String(price_eur) : '0'
      const externalId = `${siteName.toLowerCase().replace(/\s+/g, '_')}_${titleHash}_${priceStr}`

      // Normalisation de l'URL (s'assurer qu'elle est absolue)
      let normalizedUrl = String(listing.url).trim()
      if (normalizedUrl.startsWith('/')) {
        // URL relative, compléter avec le domaine du site
        const domainMap: Record<string, string> = {
          'LeBonCoin': 'https://www.leboncoin.fr',
          'LaCentrale': 'https://www.lacentrale.fr',
          'ParuVendu': 'https://www.paruvendu.fr',
          'AutoScout24': 'https://www.autoscout24.fr',
          'LeParking': 'https://www.leparking.fr',
        }
        normalizedUrl = (domainMap[siteName] || 'https://') + normalizedUrl
      } else if (!normalizedUrl.startsWith('http')) {
        // URL mal formée, essayer de la compléter
        normalizedUrl = `https://${normalizedUrl}`
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
      }

      normalizedListings.push(normalized)
    }

    console.log(`✅ [${siteName}] ${normalizedListings.length} annonce(s) normalisée(s)`)

    // ========================================================================
    // FILTRAGE PAR PRIX (POST-NORMALISATION)
    // ========================================================================
    const filteredListings = normalizedListings.filter(listing => {
      // Garder si :
      // - Le prix est null (on ne peut pas filtrer, donc on garde)
      // - Le prix est <= maxPrice
      if (listing.price === null) {
        return true // Garder les annonces sans prix
      }
      return listing.price <= maxPrice
    })

    console.log(`📦 [${siteName}] ${filteredListings.length} annonce(s) après filtrage par prix (max ${maxPrice}€)`)

    return filteredListings
  } catch (error) {
    console.error(`❌ [${siteName}] Erreur parsing IA:`, error)
    throw error
  }
}

/**
 * Supprime les doublons basés sur l'URL normalisée
 */
function removeDuplicates(listings: ListingData[]): ListingData[] {
  const seen = new Set<string>()
  const unique: ListingData[] = []

  for (const listing of listings) {
    // Normaliser l'URL pour la comparaison
    const normalizedUrl = listing.url.toLowerCase().replace(/\/$/, '').replace(/^https?:\/\//, '')
    
    if (!seen.has(normalizedUrl)) {
      seen.add(normalizedUrl)
      unique.push(listing)
    }
  }

  return unique
}

// ============================================================================
// ROUTE API PRINCIPALE
// ============================================================================

export async function POST(request: NextRequest) {
  const routePrefix = '[API /api/search]'
  
  try {
    const body = await request.json()
    
    // Validation avec Zod
    const validationResult = searchSchema.safeParse({
      brand: body.brand,
      model: body.model,
      max_price: body.max_price,
      fuelType: body.fuelType,
      page: body.page || 1,
      limit: body.limit || 30,
    })

    if (!validationResult.success) {
      console.error(`${routePrefix} ❌ Validation échouée:`, validationResult.error.errors)
      return NextResponse.json(
        { 
          success: false,
          error: 'Validation échouée',
          details: validationResult.error.errors,
        },
        { status: 400 }
      )
    }

    const { brand, model, max_price, fuelType, page, limit } = validationResult.data

    // Récupération de l'utilisateur (optionnel)
    const user = await getAuthenticatedUser(request)

    if (!openai) {
      console.error(`${routePrefix} ❌ OPENAI_API_KEY manquante`)
      return NextResponse.json(
        { 
          success: false,
          error: 'Configuration serveur manquante' 
        },
        { status: 500 }
      )
    }

    console.log(`\n${'='.repeat(60)}`)
    console.log(`${routePrefix} 🔍 RECHERCHE: ${brand} ${model} (max ${max_price}€)`)
    if (fuelType) {
      console.log(`${routePrefix} ⛽ Carburant: ${fuelType}`)
    }
    console.log(`${'='.repeat(60)}\n`)

    // ========================================================================
    // ÉTAPE 1: Filtrer les sites actifs
    // ========================================================================
    const activeSites = SITE_CONFIGS.filter(site => site.active)
    
    if (activeSites.length === 0) {
      return NextResponse.json(
        { error: 'Aucun site actif configuré' },
        { status: 400 }
      )
    }

    // ========================================================================
    // ÉTAPE 2: Scraping parallèle (Promise.allSettled pour robustesse)
    // ========================================================================
    const scrapingPromises = activeSites.map((siteConfig) => {
      const searchUrl = siteConfig.getUrl(brand, model, max_price)
      return scrapeSiteWithUrl(siteConfig, searchUrl)
    })

    const scrapingResults = await Promise.allSettled(scrapingPromises)
    
    const successfulScrapes = scrapingResults
      .filter((result): result is PromiseFulfilledResult<Awaited<ReturnType<typeof scrapeSiteWithUrl>>> => 
        result.status === 'fulfilled' && result.value.success
      )
      .map(result => result.value)

    const failedScrapes = scrapingResults.filter(result => 
      result.status === 'rejected' || (result.status === 'fulfilled' && !result.value.success)
    )
    
    if (failedScrapes.length > 0) {
      console.warn(`⚠️ ${failedScrapes.length} site(s) ont échoué au scraping\n`)
    }

    console.log(`✅ ${successfulScrapes.length}/${activeSites.length} sites scrapés avec succès\n`)

    if (successfulScrapes.length === 0) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Aucun site n\'a pu être scrapé avec succès',
          query: { brand, model, max_price },
          sites: {},
          listings: [],
        },
        { status: 500 }
      )
    }

    // ========================================================================
    // ÉTAPE 3: Parsing IA en parallèle
    // ========================================================================
    const parsingPromises = successfulScrapes.map((scrapeResult) =>
      parseListingsWithAI(scrapeResult.site, scrapeResult.html, brand, model, max_price)
        .catch((error) => {
          console.error(`❌ [${scrapeResult.site}] Erreur parsing:`, error)
          return [] // Retourner un tableau vide en cas d'erreur
        })
    )

    const parsingResults = await Promise.all(parsingPromises)
    
    // Combiner tous les résultats avec tracking par site
    const allListings: ListingData[] = []
    const siteStats: Record<string, { count: number }> = {}

    successfulScrapes.forEach((scrapeResult, index) => {
      const listings = parsingResults[index] || []
      allListings.push(...listings)
      siteStats[scrapeResult.site] = { count: listings.length }
    })

    console.log(`📦 Total: ${allListings.length} annonce(s) avant déduplication`)

    // ========================================================================
    // ÉTAPE 4: Déduplication
    // ========================================================================
    const uniqueListings = removeDuplicates(allListings)
    console.log(`✨ ${uniqueListings.length} annonce(s) unique(s) après déduplication\n`)

    // ========================================================================
    // ÉTAPE 5: Enregistrement de la recherche (si user authentifié)
    // ========================================================================
    let searchId: string | null = null
    
    if (user) {
      try {
        const { data: searchData, error: searchError } = await supabase
          .from('searches')
          .insert({
            user_id: user.id,
            brand,
            model,
            max_price: max_price,
            total_results: uniqueListings.length,
          })
          .select()
          .single()

        if (searchError) {
          console.error('❌ Erreur enregistrement recherche:', searchError)
        } else {
          searchId = searchData.id
          console.log(`💾 Recherche enregistrée (ID: ${searchId})`)
        }
      } catch (error) {
        console.error('❌ Erreur création recherche:', error)
      }
    }

    // ========================================================================
    // ÉTAPE 6: Normalisation et calcul des scores
    // ========================================================================
    const normalizedListings: NormalizedListing[] = uniqueListings.map(listing => ({
      external_id: listing.external_id,
      title: listing.title,
      price_eur: listing.price,
      mileage_km: listing.mileage,
      year: listing.year,
      source: listing.source || 'unknown',
      url: listing.url,
      imageUrl: listing.image_url,
      score_ia: listing.score_ia,
      fuelType: null, // TODO: Extraire depuis l'IA si disponible
    }))

    // Calcul des scores de pertinence pour toutes les annonces
    const scoringContext = { allListings: normalizedListings }
    const listingsWithScores = normalizedListings.map(listing => ({
      ...listing,
      score_final: computeListingScore(listing, scoringContext),
    }))

    // Tri par score décroissant (les meilleures annonces en premier)
    listingsWithScores.sort((a, b) => b.score_final - a.score_final)

    console.log(`📊 Scores calculés - Top 3: ${listingsWithScores.slice(0, 3).map(l => `${l.score_final}/100`).join(', ')}\n`)

    // ========================================================================
    // ÉTAPE 7: Insertion des listings dans Supabase (avec scores)
    // ========================================================================
    const insertedListings: ListingData[] = []

    for (const listing of listingsWithScores) {
      try {
        const originalListing = uniqueListings.find(l => l.external_id === listing.external_id)
        if (!originalListing) continue

        const { data, error } = await supabase
          .from('listings')
          .upsert(
            {
              external_id: listing.external_id,
              title: listing.title,
              price_eur: listing.price_eur,
              mileage_km: listing.mileage_km,
              year: listing.year,
              source: listing.source,
              url: listing.url,
              image_url: listing.imageUrl,
              score_ia: listing.score_ia,
              score_final: listing.score_final,
              search_id: searchId,
              user_id: user?.id || null,
            },
            {
              onConflict: 'external_id',
              ignoreDuplicates: false,
            }
          )
          .select()

        if (error) {
          console.error(`❌ [Supabase] Erreur pour ${listing.external_id}:`, error.message)
        } else if (data && data.length > 0) {
          insertedListings.push(data[0] as ListingData)
        }
      } catch (error) {
        console.error(`❌ [Supabase] Erreur insertion ${listing.external_id}:`, error)
      }
    }

    console.log(`💾 ${insertedListings.length} annonce(s) insérée(s) dans Supabase\n`)

    // ========================================================================
    // ÉTAPE 8: Conversion en format de réponse (déjà trié par score)
    // ========================================================================
    const responseListings: ListingResponse[] = listingsWithScores.map(listing => ({
      id: listing.external_id,
      title: listing.title,
      price_eur: listing.price_eur,
      mileage_km: listing.mileage_km,
      year: listing.year,
      source: listing.source,
      url: listing.url,
      imageUrl: listing.imageUrl,
      score_ia: listing.score_ia,
      score_final: listing.score_final,
    }))

    // Pagination
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const paginatedListings = responseListings.slice(startIndex, endIndex)
    const totalPages = Math.ceil(responseListings.length / limit)

    // ========================================================================
    // RETOUR DE LA RÉPONSE (STRUCTURE MVP PROPRE)
    // ========================================================================
    const response: SearchResponse = {
      success: true,
      query: {
        brand,
        model,
        maxPrice: max_price,
        fuelType: fuelType || undefined,
      },
      sites: siteStats,
      listings: paginatedListings,
      stats: {
        total: responseListings.length,
        sites_scraped: successfulScrapes.length,
        sites_failed: failedScrapes.length,
      },
      pagination: {
        page,
        limit,
        total: responseListings.length,
        totalPages,
      },
    }

    console.log(`${routePrefix} ✅ Réponse: ${paginatedListings.length} annonce(s) sur ${responseListings.length} total\n`)
    return NextResponse.json(response)
  } catch (error: any) {
    console.error(`${routePrefix} ❌ Erreur serveur:`, error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Erreur serveur lors de la recherche',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        listings: [],
      },
      { status: 500 }
    )
  }
}
