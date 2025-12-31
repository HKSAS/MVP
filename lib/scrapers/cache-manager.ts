/**
 * Système de cache pour les résultats de recherche
 * Cache les résultats pendant 5 minutes pour éviter de surcharger les sites
 */

import { createHash } from 'crypto'

interface CacheEntry {
  data: any
  timestamp: number
}

class SearchCache {
  private cache: Map<string, CacheEntry> = new Map()
  private TTL = 5 * 60 * 1000 // 5 minutes
  
  /**
   * Génère une clé unique pour un cache entry
   */
  private generateKey(
    site: string,
    brand: string,
    model: string | null,
    maxPrice: number | null,
    pass?: string
  ): string {
    const normalized = {
      site: site.toUpperCase(),
      brand: brand?.toUpperCase().trim(),
      model: model?.toUpperCase().trim() || '',
      maxPrice: maxPrice || 0,
      pass: pass || 'strict',
    }
    return createHash('md5').update(JSON.stringify(normalized)).digest('hex')
  }
  
  /**
   * Récupère une entrée du cache
   */
  get(
    site: string,
    brand: string,
    model: string | null,
    maxPrice: number | null,
    pass?: string
  ): any | null {
    const key = this.generateKey(site, brand, model, maxPrice, pass)
    const entry = this.cache.get(key)
    
    if (!entry) {
      return null
    }
    
    const age = Date.now() - entry.timestamp
    
    if (age > this.TTL) {
      this.cache.delete(key)
      return null
    }
    
    return entry.data
  }
  
  /**
   * Sauvegarde une entrée dans le cache
   */
  set(
    site: string,
    brand: string,
    model: string | null,
    maxPrice: number | null,
    data: any,
    pass?: string
  ): void {
    const key = this.generateKey(site, brand, model, maxPrice, pass)
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    })
  }
  
  /**
   * Vide le cache
   */
  clear(): void {
    this.cache.clear()
  }
  
  /**
   * Nettoie les entrées expirées
   */
  cleanup(): void {
    const now = Date.now()
    let cleaned = 0
    
    // Convertir en tableau pour compatibilité TypeScript
    const entries = Array.from(this.cache.entries())
    for (const [key, entry] of entries) {
      if (now - entry.timestamp > this.TTL) {
        this.cache.delete(key)
        cleaned++
      }
    }
    
    if (cleaned > 0) {
      console.log(`[CACHE] 🧹 Nettoyage: ${cleaned} entrées expirées supprimées`)
    }
  }
  
  /**
   * Démarre le nettoyage automatique toutes les minutes
   */
  startCleanup(): void {
    if (typeof setInterval !== 'undefined') {
      setInterval(() => {
        this.cleanup()
      }, 60000) // Toutes les minutes
    }
  }
}

export const searchCache = new SearchCache()

// Démarrer le nettoyage automatique
if (typeof setInterval !== 'undefined') {
  searchCache.startCleanup()
}

