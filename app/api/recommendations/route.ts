// app/api/recommendations/route.ts
// VERSION ULTRA-SIMPLE - Fonctionne avec n'importe quelle structure de table

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '@/lib/auth'
import { createRouteLogger } from '@/lib/logger'
import { createErrorResponse, AuthenticationError } from '@/lib/errors'
import type { GetRecommendationsResponse, Recommendation } from '@/lib/types/favorites'

const log = createRouteLogger('/api/recommendations')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey

/**
 * Crée un client Supabase avec le token de session de l'utilisateur
 * Nécessaire pour que RLS fonctionne correctement
 */
function createSupabaseClientWithToken(accessToken: string) {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

export async function GET(request: NextRequest) {
  try {
    // 1. Vérifier l'authentification
    const user = await requireAuth(request)
    const userId = user.id
    
    log.info('Génération recommandations', { userId })

    // Récupérer le token depuis les headers pour RLS
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.startsWith('Bearer ') ? authHeader.replace('Bearer ', '') : null
    
    // Utiliser le client avec token si disponible, sinon service role
    const supabase = token 
      ? createSupabaseClientWithToken(token)
      : createClient(supabaseUrl, supabaseServiceKey)

    // 2. Récupérer les favoris (avec title pour extraction marque)
    const { data: favorites, error: favError } = await supabase
      .from('favorites')
      .select('listing_id, source, title, price')
      .eq('user_id', userId)

    if (favError) {
      log.error('Erreur récupération favoris', { error: favError.message })
      throw favError
    }

    log.info('Favoris trouvés', { count: favorites?.length || 0 })

    if (!favorites || favorites.length === 0) {
      return NextResponse.json<GetRecommendationsResponse>({
        success: true,
        data: [],
      })
    }

    const favoriteIds = favorites.map(f => f.listing_id).filter(Boolean)

    // 3. Utiliser directement les données des favoris (qui contiennent déjà price)
    // Pas besoin de chercher dans listings si les favoris ont déjà les infos nécessaires
    log.info('Utilisation des données des favoris directement', { 
      count: favorites.length,
      sampleFavorite: favorites[0] ? {
        listing_id: favorites[0].listing_id,
        price: favorites[0].price,
        title: favorites[0].title
      } : null
    })

    // 4. Calculer prix moyen directement depuis les favoris
    const prices = favorites
      .map(f => f.price)
      .filter((p): p is number => p !== null && p !== undefined && p > 0)
    
    // Extraire marques préférées depuis les titres des favoris
    const extractBrandFromTitle = (title: string | null): string | null => {
      if (!title) return null
      
      const brands = [
        'peugeot', 'renault', 'citroen', 'volkswagen', 'audi', 'bmw', 
        'mercedes', 'ford', 'opel', 'fiat', 'seat', 'skoda', 'toyota',
        'nissan', 'honda', 'mazda', 'hyundai', 'kia', 'volvo', 'jaguar',
        'land rover', 'mini', 'porsche', 'tesla', 'dacia', 'alfa romeo'
      ]
      
      const lowerTitle = title.toLowerCase()
      
      for (const brand of brands) {
        if (lowerTitle.includes(brand)) {
          return brand.charAt(0).toUpperCase() + brand.slice(1)
        }
      }
      
      return null
    }
    
    const brands = favorites
      .map(f => extractBrandFromTitle(f.title))
      .filter(Boolean) as string[]
    
    const brandCounts: Record<string, number> = {}
    brands.forEach(brand => {
      if (brand) brandCounts[brand] = (brandCounts[brand] || 0) + 1
    })
    
    const topBrands = Object.entries(brandCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([brand]) => brand)
    
    log.info('Prix extraits des favoris', { 
      count: prices.length,
      prices: prices.slice(0, 5), // Log les 5 premiers pour debug
      topBrands
    })

    const avgPrice = prices.length > 0
      ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length)
      : 15000

    const minPrice = Math.max(1000, Math.round(avgPrice * 0.7))
    const maxPrice = Math.round(avgPrice * 1.3)

    log.info('Prix moyen calculé', { avgPrice, minPrice, maxPrice })

    // 5. Chercher des listings similaires (COLONNES DE BASE UNIQUEMENT)
    // Exclure les favoris déjà ajoutés (utiliser external_id, pas id)
    // Note: La table listings a seulement: id, external_id, title, price_eur, mileage_km, year, source, url, image_url, score_ia, score_final, created_at
    // ⚠️ IMPORTANT : Filtrer les annonces récentes (< 7 jours) et avec URL valide
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    
    log.info('Filtrage annonces', {
      minPrice,
      maxPrice,
      sevenDaysAgo: sevenDaysAgo.toISOString(),
      favoriteIdsCount: favoriteIds.length
    })
    
    let query = supabase
      .from('listings')
      .select('id, external_id, title, price_eur, year, mileage_km, url, image_url, source, score_ia, score_final, created_at')
      .gte('price_eur', minPrice)
      .lte('price_eur', maxPrice)
      .not('price_eur', 'is', null)
      .not('url', 'is', null) // ⚠️ URL obligatoire
      .gte('created_at', sevenDaysAgo.toISOString()) // ⚠️ Seulement annonces < 7 jours
    
    // Exclure les favoris (utiliser external_id)
    // Supabase ne supporte pas directement .not('external_id', 'in', array)
    // On filtre après la requête si nécessaire, ou on utilise une approche différente
    // Pour l'instant, on récupère tout et on filtre après
    
    const { data: similarListingsRaw, error: similarError } = await query
      .order('created_at', { ascending: false })
      .limit(100) // Récupérer plus pour compenser le filtrage
    
    if (similarError) {
      log.error('Erreur récupération listings similaires', { error: similarError.message })
      throw similarError
    }
    
    // Filtrer les favoris après la requête
    const favoriteIdsSet = new Set(favoriteIds)
    const similarListings = (similarListingsRaw || []).filter(
      listing => !favoriteIdsSet.has(listing.external_id || '')
    ).slice(0, 50) // Limiter à 50 après filtrage

    log.info('Listings similaires trouvés', { count: similarListings?.length || 0 })

    if (!similarListings || similarListings.length === 0) {
      return NextResponse.json<GetRecommendationsResponse>({
        success: true,
        data: [],
      })
    }

    // 6. Valider les URLs avant de scorer
    const validateUrl = (url: string | null): boolean => {
      if (!url) return false
      try {
        new URL(url)
        return true
      } catch {
        return false
      }
    }
    
    // 7. Scorer et formater selon le format attendu par RecommendationsList
    const recommendations: Recommendation[] = similarListings
      .map(listing => {
        // Valider l'URL
        if (!validateUrl(listing.url)) {
          return null
        }
        
        let score = 50 // Score de base
        
        // Score basé sur proximité du prix (+30 max)
        const priceDiff = Math.abs((listing.price_eur || 0) - avgPrice)
        if (priceDiff < avgPrice * 0.1) {
          score += 30
        } else if (priceDiff < avgPrice * 0.2) {
          score += 20
        } else if (priceDiff < avgPrice * 0.3) {
          score += 10
        }
        
        // Score marque (+20 max)
        const extractBrandFromTitle = (title: string | null): string | null => {
          if (!title) return null
          const brands = [
            'peugeot', 'renault', 'citroen', 'volkswagen', 'audi', 'bmw', 
            'mercedes', 'ford', 'opel', 'fiat', 'seat', 'skoda', 'toyota',
            'nissan', 'honda', 'mazda', 'hyundai', 'kia', 'volvo', 'jaguar',
            'land rover', 'mini', 'porsche', 'tesla', 'dacia', 'alfa romeo'
          ]
          const lowerTitle = title.toLowerCase()
          for (const brand of brands) {
            if (lowerTitle.includes(brand)) {
              return brand.charAt(0).toUpperCase() + brand.slice(1)
            }
          }
          return null
        }
        
        const listingBrand = extractBrandFromTitle(listing.title)
        if (listingBrand && topBrands.includes(listingBrand)) {
          score += 20
        }
        
        // Score récence (+15 max)
        const daysSinceCreated = listing.created_at 
          ? (Date.now() - new Date(listing.created_at).getTime()) / (1000 * 60 * 60 * 24)
          : 7
        if (daysSinceCreated < 1) {
          score += 15
        } else if (daysSinceCreated < 3) {
          score += 10
        } else if (daysSinceCreated < 7) {
          score += 5
        }
        
        // Construire la raison
        const reasons: string[] = []
        
        if (listingBrand && topBrands.includes(listingBrand)) {
          reasons.push(`Marque ${listingBrand} (vos favoris)`)
        }
        
        if (priceDiff < avgPrice * 0.15) {
          reasons.push(`Budget parfait (${avgPrice.toLocaleString('fr-FR')}€)`)
        } else if (priceDiff < avgPrice * 0.3) {
          reasons.push(`Budget proche (${avgPrice.toLocaleString('fr-FR')}€)`)
        }
        
        if (daysSinceCreated < 2) {
          reasons.push('Annonce très récente')
        } else if (daysSinceCreated < 7) {
          reasons.push('Annonce récente')
        }
        
        if (reasons.length === 0) {
          reasons.push('Annonce active et disponible')
        }
        
        // Formater selon le type ListingCache attendu
        const listingId = listing.external_id || listing.id || ''
        const listingUrl = listing.url || ''
        
        return {
          listing: {
            id: listing.id || '',
            source: listing.source || '',
            listing_id: listingId,
            listing_url: listingUrl, // IMPORTANT: URL pour le clic
            title: listing.title || 'Véhicule',
            price: listing.price_eur || null,
            year: listing.year || null,
            mileage: listing.mileage_km || null,
            fuel: null, // La table listings n'a pas cette colonne
            transmission: null, // La table listings n'a pas cette colonne
            city: null, // La table listings n'a pas cette colonne
            score: listing.score_ia || listing.score_final || null,
            risk_score: null,
            extracted_features: null,
            created_at: listing.created_at || new Date().toISOString(),
          } as any, // Type assertion car structure légèrement différente
          reason: reasons.join(' + '),
          matchScore: Math.round(score),
        }
      })
      .filter((r): r is Recommendation => r !== null && r.matchScore > 50 && r.listing.listing_url) // Filtrer ceux sans URL ou score trop bas
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 10)

    log.info('Recommandations finales générées', { 
      count: recommendations.length,
      topScore: recommendations[0]?.matchScore || 0 
    })

    return NextResponse.json<GetRecommendationsResponse>({
      success: true,
      data: recommendations,
    })

  } catch (error) {
    if (error instanceof AuthenticationError) {
      return createErrorResponse(error)
    }
    
    log.error('Erreur serveur', {
      error: error instanceof Error ? error.message : String(error),
    })
    
    return NextResponse.json({
      success: false,
      error: 'Erreur génération recommandations',
      details: error instanceof Error ? error.message : 'Unknown'
    }, { status: 500 })
  }
}

