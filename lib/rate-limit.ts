/**
 * Rate limiting simple pour protéger les endpoints API
 * 
 * Note: Pour la production, utilisez @upstash/ratelimit ou un service dédié
 * Ceci est une implémentation basique en mémoire (ne persiste pas entre redémarrages)
 */

import { NextRequest } from 'next/server'
import { RateLimitError } from './errors'

interface RateLimitConfig {
  maxRequests: number
  windowMs: number // Fenêtre en millisecondes
}

interface RequestRecord {
  count: number
  resetAt: number
}

// Store en mémoire (à remplacer par Redis en production)
const requestStore = new Map<string, RequestRecord>()

/**
 * Nettoie les entrées expirées du store
 */
function cleanupExpiredEntries() {
  const now = Date.now()
  const keysToDelete: string[] = []
  requestStore.forEach((record, key) => {
    if (record.resetAt < now) {
      keysToDelete.push(key)
    }
  })
  keysToDelete.forEach(key => requestStore.delete(key))
}

/**
 * Récupère l'identifiant unique pour le rate limiting
 * Utilise l'IP ou l'user_id si authentifié
 */
function getRateLimitKey(request: NextRequest, userId?: string): string {
  if (userId) {
    return `user:${userId}`
  }
  
  // Récupérer l'IP depuis les headers (Vercel, Cloudflare, etc.)
  const forwardedFor = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const ip = forwardedFor?.split(',')[0] || realIp || 'unknown'
  
  return `ip:${ip}`
}

/**
 * Vérifie si la requête dépasse la limite de taux
 * @throws RateLimitError si la limite est dépassée
 */
export function checkRateLimit(
  request: NextRequest,
  config: RateLimitConfig,
  userId?: string
): void {
  const key = getRateLimitKey(request, userId)
  const now = Date.now()
  
  // Nettoyer les entrées expirées périodiquement
  if (Math.random() < 0.1) {
    cleanupExpiredEntries()
  }
  
  const record = requestStore.get(key)
  
  // Nouvelle fenêtre ou première requête
  if (!record || record.resetAt < now) {
    requestStore.set(key, {
      count: 1,
      resetAt: now + config.windowMs,
    })
    return
  }
  
  // Vérifier la limite
  if (record.count >= config.maxRequests) {
    const retryAfter = Math.ceil((record.resetAt - now) / 1000)
    throw new RateLimitError(
      `Rate limit exceeded. Try again in ${retryAfter} seconds.`
    )
  }
  
  // Incrémenter le compteur
  record.count++
  requestStore.set(key, record)
}

/**
 * Configuration par défaut pour les endpoints
 */
export const RATE_LIMITS = {
  SEARCH: { maxRequests: 10, windowMs: 60 * 1000 }, // 10 req/min
  ANALYZE: { maxRequests: 5, windowMs: 60 * 1000 }, // 5 req/min
  CONTACT: { maxRequests: 3, windowMs: 60 * 60 * 1000 }, // 3 req/heure
  GENERAL: { maxRequests: 100, windowMs: 60 * 1000 }, // 100 req/min
} as const

/**
 * Middleware helper pour les routes API
 */
export function withRateLimit(
  config: RateLimitConfig,
  handler: (request: NextRequest, userId?: string) => Promise<Response>
) {
  return async (request: NextRequest, userId?: string) => {
    checkRateLimit(request, config, userId)
    return handler(request, userId)
  }
}

