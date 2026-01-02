// ═══════════════════════════════════════════════════════════════
// MARKET SERVICE - Analyse du marché et statistiques
// ═══════════════════════════════════════════════════════════════

import { getSupabaseAdminClient } from '@/lib/supabase/server'
import type { MarketData } from '@/lib/scoring/premium-scorer'
import type { ListingResponse } from '@/lib/types'

export class MarketService {
  
  /**
   * Récupère ou calcule les stats marché pour un véhicule
   */
  async getMarketData(
    brand: string, 
    model: string, 
    year?: number,
    listings?: ListingResponse[] // Si on passe les listings directement depuis la recherche
  ): Promise<MarketData | null> {
    const supabase = getSupabaseAdminClient()
    
    // Si listings fournis, utiliser ceux-ci (plus rapide)
    if (listings && listings.length > 0) {
      const prices = listings
        .filter(l => l.price_eur && l.price_eur > 0)
        .map(l => l.price_eur!)
        .sort((a, b) => a - b)
      
      if (prices.length === 0) return null
      
      const analytics = {
        brand,
        model,
        year: year || null,
        averagePrice: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length),
        medianPrice: prices[Math.floor(prices.length / 2)],
        minPrice: prices[0],
        maxPrice: prices[prices.length - 1],
        totalListings: prices.length,
        calculatedAt: new Date()
      }
      
      // Sauvegarder en cache (optionnel, peut être async)
      this.saveMarketData(analytics).catch(console.error)
      
      return {
        brand,
        model,
        averagePrice: analytics.averagePrice,
        medianPrice: analytics.medianPrice,
        minPrice: analytics.minPrice,
        maxPrice: analytics.maxPrice,
        totalListings: analytics.totalListings
      }
    }
    
    // Sinon, chercher dans le cache (table market_analytics)
    const { data: cached } = await supabase
      .from('market_analytics')
      .select('*')
      .eq('brand', brand)
      .eq('model', model)
      .eq('year', year || null)
      .single()
    
    // Si cache récent (<24h), le retourner
    if (cached && this.isCacheValid(cached.calculated_at)) {
      return {
        brand: cached.brand,
        model: cached.model,
        averagePrice: cached.average_price,
        medianPrice: cached.median_price,
        minPrice: cached.min_price,
        maxPrice: cached.max_price,
        totalListings: cached.total_listings
      }
    }
    
    // Sinon, chercher dans la DB (si listings sauvegardés)
    const { data: dbListings } = await supabase
      .from('listings')
      .select('price')
      .eq('brand', brand)
      .eq('model', model)
      .eq('is_active', true)
      .gt('price', 0)
      .limit(100)
    
    if (!dbListings || dbListings.length === 0) return null
    
    const prices = dbListings.map(l => l.price).sort((a, b) => a - b)
    
    const analytics = {
      brand,
      model,
      year: year || null,
      averagePrice: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length),
      medianPrice: prices[Math.floor(prices.length / 2)],
      minPrice: prices[0],
      maxPrice: prices[prices.length - 1],
      totalListings: prices.length,
      calculatedAt: new Date()
    }
    
    // Sauvegarder en cache
    await this.saveMarketData(analytics)
    
    return {
      brand,
      model,
      averagePrice: analytics.averagePrice,
      medianPrice: analytics.medianPrice,
      minPrice: analytics.minPrice,
      maxPrice: analytics.maxPrice,
      totalListings: analytics.totalListings
    }
  }
  
  /**
   * Sauvegarde les stats marché en cache
   */
  private async saveMarketData(analytics: any) {
    const supabase = getSupabaseAdminClient()
    
    await supabase
      .from('market_analytics')
      .upsert({
        brand: analytics.brand,
        model: analytics.model,
        year: analytics.year,
        average_price: analytics.averagePrice,
        median_price: analytics.medianPrice,
        min_price: analytics.minPrice,
        max_price: analytics.maxPrice,
        total_listings: analytics.totalListings,
        calculated_at: analytics.calculatedAt
      }, {
        onConflict: 'brand,model,year'
      })
  }
  
  /**
   * Vérifie si le cache est valide (<24h)
   */
  private isCacheValid(calculatedAt: string | Date): boolean {
    const ageInHours = (Date.now() - new Date(calculatedAt).getTime()) / (1000 * 60 * 60)
    return ageInHours < 24
  }
}

export default new MarketService()

