/**
 * Fonction pour alimenter listings_cache lors des recherches
 * Appelée après chaque recherche réussie
 */

import { createClient } from '@supabase/supabase-js'
import type { ListingResponse } from '@/lib/types'
import { createRouteLogger } from '@/lib/logger'

const log = createRouteLogger('cache-listings')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseAnonKey)

/**
 * Alimente listings_cache avec les résultats d'une recherche
 * Utilise UPSERT pour éviter les doublons
 */
export async function cacheSearchResults(listings: ListingResponse[]): Promise<void> {
  if (!listings || listings.length === 0) {
    return
  }

  try {
    // Préparer les données pour listings_cache
    const cacheEntries = listings.map(listing => ({
      source: listing.source,
      listing_id: listing.id,
      listing_url: listing.url,
      title: listing.title,
      price: listing.price_eur || null,
      year: listing.year || null,
      mileage: listing.mileage_km || null,
      fuel: null, // À extraire si disponible dans listing
      transmission: null, // À extraire si disponible dans listing
      city: listing.city || null,
      score: listing.score_ia || listing.score_final || null,
      risk_score: null, // À calculer si disponible
      extracted_features: {
        title: listing.title,
        // Extraire marque/modèle depuis le titre si possible
        ...(listing.title ? extractBrandModel(listing.title) : {}),
      },
    }))

    // UPSERT (insert ou update si existe déjà)
    // Utiliser ON CONFLICT pour gérer les doublons
    const { error } = await supabase
      .from('listings_cache')
      .upsert(cacheEntries, {
        onConflict: 'source,listing_id',
        ignoreDuplicates: false, // Mettre à jour si existe
      })

    if (error) {
      log.warn('Erreur cache listings', {
        error: error.message,
        count: cacheEntries.length,
      })
      // Ne pas throw - c'est non-critique
    } else {
      log.info('Listings mis en cache', { count: cacheEntries.length })
    }
  } catch (error) {
    log.warn('Erreur lors du cache des listings', {
      error: error instanceof Error ? error.message : String(error),
    })
    // Ne pas throw - le cache est optionnel
  }
}

/**
 * Extrait marque et modèle depuis un titre
 */
function extractBrandModel(title: string): Record<string, string> {
  const titleLower = title.toLowerCase()
  const commonBrands = [
    'peugeot', 'renault', 'citroen', 'volkswagen', 'ford', 'opel',
    'bmw', 'mercedes', 'audi', 'volvo', 'fiat', 'seat', 'skoda',
    'toyota', 'nissan', 'honda', 'mazda', 'hyundai', 'kia',
    'tesla', 'dacia', 'ds', 'alfa romeo', 'mini', 'smart'
  ]

  for (const brand of commonBrands) {
    if (titleLower.includes(brand)) {
      const words = titleLower.split(/\s+/)
      const brandIndex = words.findIndex(w => w.includes(brand))
      if (brandIndex >= 0 && brandIndex < words.length - 1) {
        return {
          brand,
          model: words[brandIndex + 1] || '',
        }
      }
      return { brand }
    }
  }

  // Fallback: premier mot comme marque
  const firstWord = titleLower.split(/\s+/)[0]
  if (firstWord && firstWord.length > 2) {
    return { brand: firstWord }
  }

  return {}
}



