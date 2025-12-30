/**
 * API /api/search/v2 - Version refactorisée avec SearchCriteria
 * Architecture PRO : orchestration multi-sites, filtres avancés, robustesse
 */

import { NextRequest, NextResponse } from 'next/server'
import type { SearchCriteria, SearchResponse, ClientProfile, MerchantAIResult } from '@/lib/search-types'
import { orchestrateSearch } from '@/lib/scrapers/orchestrator'
import { analyzeWithMerchantAI } from '@/lib/ai/merchant'
import { createRouteLogger } from '@/lib/logger'
import { createErrorResponse, ValidationError } from '@/lib/errors'
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { getAuthenticatedUser } from '@/lib/auth'
import { SCRAPING_CONFIG } from '@/lib/scrapers/config'
import crypto from 'crypto'

const log = createRouteLogger('api-search-v2')

// ============================================================================
// CACHE SERVEUR (in-memory, TTL 10 minutes)
// ============================================================================

interface CacheEntry {
  data: any
  timestamp: number
}

const searchCache = new Map<string, CacheEntry>()
const CACHE_TTL_MS = 10 * 60 * 1000 // 10 minutes

/**
 * Génère une clé de cache stable depuis SearchCriteria
 */
function getCacheKey(criteria: SearchCriteria): string {
  const normalized = {
    brand: criteria.brand.toLowerCase().trim(),
    model: (criteria.model || '').toLowerCase().trim(),
    maxPrice: criteria.maxPrice,
    minPrice: criteria.minPrice || 0,
    fuelType: criteria.fuelType || 'any',
    minYear: criteria.minYear || 0,
    maxYear: criteria.maxYear || 9999,
    maxMileage: criteria.maxMileage || 999999,
    gearbox: criteria.gearbox || 'any',
    sellerType: criteria.sellerType || 'any',
    zipCode: criteria.zipCode || '',
    radiusKm: criteria.radiusKm || 0,
    bodyType: criteria.bodyType || 'any',
  }
  
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(normalized))
    .digest('hex')
}

/**
 * Nettoie le cache (supprime les entrées expirées)
 */
function cleanupCache() {
  const now = Date.now()
  const entries = Array.from(searchCache.entries())
  for (const [key, entry] of entries) {
    if (now - entry.timestamp > CACHE_TTL_MS) {
      searchCache.delete(key)
    }
  }
}

/**
 * Valide et normalise SearchCriteria
 */
function validateAndNormalizeCriteria(body: any): { criteria: SearchCriteria; clientProfile?: ClientProfile } {
  // Validation de base
  if (!body.brand || typeof body.brand !== 'string' || body.brand.trim().length === 0) {
    throw new ValidationError('La marque est obligatoire')
  }

  if (!body.maxPrice || typeof body.maxPrice !== 'number' || body.maxPrice <= 0) {
    throw new ValidationError('Le budget maximum est obligatoire et doit être positif')
  }

  // Normalisation
  const criteria: SearchCriteria = {
    brand: body.brand.trim(),
    model: body.model ? body.model.trim() : '', // Peut être vide pour recherche large
    maxPrice: Math.min(body.maxPrice, SCRAPING_CONFIG.limits.maxPrice), // Clamp sécurité

    // Optionnels - Budget
    minPrice: body.minPrice ? Math.max(0, Math.min(body.minPrice, body.maxPrice)) : undefined,

    // Optionnels - Caractéristiques
    fuelType: body.fuelType || 'any',
    minYear: body.minYear ? Math.max(1990, body.minYear) : undefined,
    maxYear: body.maxYear ? Math.min(new Date().getFullYear() + 1, body.maxYear) : undefined,
    maxMileage: body.maxMileage ? Math.min(body.maxMileage, SCRAPING_CONFIG.limits.maxMileage) : undefined,
    gearbox: body.gearbox || 'any',
    bodyType: body.bodyType || 'any',

    // Optionnels - Vendeur
    sellerType: body.sellerType || 'any',

    // Optionnels - Localisation
    zipCode: body.zipCode ? String(body.zipCode).trim() : undefined,
    radiusKm: body.radiusKm ? Math.min(Math.max(1, body.radiusKm), 500) : undefined,

    // Optionnels - Contexte
    // userId est stocké séparément, pas dans SearchCriteria
  }
  
  // Validation croisée
  if (criteria.minYear && criteria.maxYear && criteria.minYear > criteria.maxYear) {
    throw new ValidationError('L\'année minimum doit être inférieure ou égale à l\'année maximum')
  }

  if (criteria.minPrice && criteria.minPrice >= criteria.maxPrice) {
    throw new ValidationError('Le prix minimum doit être inférieur au prix maximum')
  }

  // Profil client (optionnel) - stocké séparément
  // Note: ClientProfile simplifié - utiliser seulement les champs définis dans le type
  let clientProfile: ClientProfile | undefined
  if (body.clientProfile) {
    const profile = body.clientProfile as any
    clientProfile = {
      budget: criteria.maxPrice,
      preferences: {
        fuelType: criteria.fuelType,
        gearbox: criteria.gearbox,
        bodyType: criteria.bodyType,
      },
      location: criteria.zipCode && criteria.radiusKm ? {
        zipCode: criteria.zipCode,
        radiusKm: criteria.radiusKm,
      } : undefined,
    }
  }

  // Retourner criteria + clientProfile séparés
  return { criteria, clientProfile }
}

/**
 * POST /api/search/v2
 * Recherche multi-sites avec critères avancés
 */
export async function POST(request: NextRequest) {
  const searchStartTime = Date.now()

  try {
    // Rate limiting
    try {
      checkRateLimit(request, RATE_LIMITS.SEARCH)
    } catch (rateLimitError) {
      // Rate limit dépassé
      if (rateLimitError instanceof Error && rateLimitError.name === 'RateLimitError') {
        return NextResponse.json(
          { error: rateLimitError.message || 'Trop de requêtes. Veuillez patienter.' },
          { status: 429 }
        )
      }
      // Autre erreur de rate limiting
      log.warn('[SEARCH-V2] Erreur rate limiting', {
        error: rateLimitError instanceof Error ? rateLimitError.message : String(rateLimitError),
      })
    }

    // Récupérer l'utilisateur (optionnel)
    const user = await getAuthenticatedUser(request)

    // Parser le body
    let body: any
    try {
      body = await request.json()
    } catch (error) {
      throw new ValidationError('Body JSON invalide')
    }

    // Valider et normaliser les critères
    const { criteria, clientProfile } = validateAndNormalizeCriteria(body)
    
    // userId séparé pour usage interne (pas dans SearchCriteria)
    const userId = user?.id || null

    // Nettoyer le cache avant de vérifier (une fois toutes les 10 requêtes environ)
    if (Math.random() < 0.1) {
      cleanupCache()
    }
    
    // Vérifier le cache
    const cacheKey = getCacheKey(criteria)
    const cached = searchCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      log.info('[SEARCH-V2] Cache HIT', {
        cacheKey: cacheKey.substring(0, 8),
        criteria: {
          brand: criteria.brand,
          model: criteria.model,
          maxPrice: criteria.maxPrice,
        },
      })
      return NextResponse.json(cached.data)
    }

    log.info('[SEARCH-V2] Recherche démarrée', {
      criteria: {
        brand: criteria.brand,
        model: criteria.model,
        maxPrice: criteria.maxPrice,
        fuelType: criteria.fuelType,
        minYear: criteria.minYear,
        maxYear: criteria.maxYear,
        maxMileage: criteria.maxMileage,
        gearbox: criteria.gearbox,
        sellerType: criteria.sellerType,
        zipCode: criteria.zipCode,
        radiusKm: criteria.radiusKm,
      },
      userId: userId,
      cacheKey: cacheKey.substring(0, 8),
    })

    // Orchestrer la recherche
    const searchResponse = await orchestrateSearch(criteria, log)

    // Analyser avec le marchand IA si profil client fourni
    let merchantAI: MerchantAIResult | null = null
    if (clientProfile && searchResponse.items.length > 0) {
      log.info('[SEARCH-V2] Analyse marchand IA démarrée', {
        listingsCount: searchResponse.items.length,
      })
      
      try {
        const aiResult = await analyzeWithMerchantAI(clientProfile, searchResponse.items)
        if (aiResult) {
          merchantAI = aiResult
          log.info('[SEARCH-V2] Analyse marchand IA terminée', {
            recommendationsCount: aiResult.recommendations.length,
            insightsCount: aiResult.insights.length,
            riskLevel: aiResult.riskLevel,
          })
        }
      } catch (error) {
        log.error('[SEARCH-V2] Erreur analyse marchand IA', {
          error: error instanceof Error ? error.message : String(error),
        })
        // Continue sans l'analyse IA
      }
    }

    const totalMs = Date.now() - searchStartTime

    // Construire la réponse finale
    const finalResponse = {
      ...searchResponse,
      stats: {
        ...searchResponse.stats,
        totalMs,
      },
      merchantAI,
    }

    // Stocker dans le cache
    searchCache.set(cacheKey, {
      data: finalResponse,
      timestamp: Date.now(),
    })

    log.info('[SEARCH-V2] Recherche terminée', {
      totalItems: searchResponse.items.length,
      sitesScraped: searchResponse.stats.sitesScraped,
      totalMs,
      hasMerchantAI: merchantAI !== null,
      cacheKey: cacheKey.substring(0, 8),
    })

    // Retourner la réponse
    return NextResponse.json(finalResponse)
  } catch (error) {
    log.error('[SEARCH-V2] Erreur', {
      error: error instanceof Error ? error.message : String(error),
    })
    return createErrorResponse(error)
  }
}
