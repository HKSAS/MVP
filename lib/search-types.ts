/**
 * Types pour le système de recherche v2
 * @deprecated Migrer vers @/src/core/types à terme
 */

export type FuelType = 'essence' | 'diesel' | 'hybride' | 'electrique' | 'gpl' | 'any'
export type GearboxType = 'manual' | 'auto' | 'any'
export type SellerType = 'private' | 'pro' | 'any'
export type BodyType = 'berline' | 'suv' | 'break' | 'coupe' | 'cabriolet' | 'monospace' | 'utilitaire' | 'any'

export interface SearchCriteria {
  brand: string
  model?: string
  maxPrice: number
  minPrice?: number
  fuelType?: FuelType
  minYear?: number
  maxYear?: number
  maxMileage?: number
  gearbox?: GearboxType
  sellerType?: SellerType
  zipCode?: string
  radiusKm?: number
  bodyType?: BodyType
}

export interface Listing {
  id: string
  sourceSite: string
  url: string
  title: string
  price: number
  year: number | null
  mileage: number | null
  fuelType?: FuelType
  gearbox?: GearboxType
  city?: string | null
  imageUrl?: string | null
  score_ia?: number | null
  matchScore?: number
  scrapedAt: string
  sellerType?: SellerType
}

export interface SiteResult {
  site: string
  ok: boolean
  items: Listing[]
  error?: string
  ms: number
  strategy?: string
}

export interface SearchResponse {
  criteria: SearchCriteria
  items: Listing[]
  siteResults: SiteResult[]
  stats: {
    totalItems: number
    sitesScraped: number
    totalMs: number
  }
}

export interface ClientProfile {
  budget: number
  preferences: {
    fuelType?: FuelType
    gearbox?: GearboxType
    bodyType?: BodyType
  }
  location?: {
    zipCode: string
    radiusKm: number
  }
}

export interface MerchantAIResult {
  recommendations: string[]
  insights: string[]
  riskLevel: 'low' | 'medium' | 'high'
}

// ============================================================================
// HELPERS DE NORMALISATION
// ============================================================================

export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

export function normalizeFuelType(fuel: string | null | undefined): FuelType {
  if (!fuel) return 'any'
  const normalized = normalizeText(fuel)
  if (normalized.includes('essence') || normalized.includes('petrol')) return 'essence'
  if (normalized.includes('diesel')) return 'diesel'
  if (normalized.includes('hybride') || normalized.includes('hybrid')) return 'hybride'
  if (normalized.includes('electrique') || normalized.includes('electric')) return 'electrique'
  if (normalized.includes('gpl')) return 'gpl'
  return 'any'
}

export function normalizeGearboxType(gearbox: string | null | undefined): GearboxType {
  if (!gearbox) return 'any'
  const normalized = normalizeText(gearbox)
  if (normalized.includes('manuelle') || normalized.includes('manual') || normalized.includes('manuel')) return 'manual'
  if (normalized.includes('automatique') || normalized.includes('auto')) return 'auto'
  return 'any'
}

// ============================================================================
// HELPERS DE PARSING
// ============================================================================

export function parsePrice(str: string | null | undefined): number | null {
  if (!str) return null
  const cleaned = str.replace(/[\s.,€]/g, '')
  const num = Number(cleaned)
  return isNaN(num) ? null : num
}

export function parseMileage(str: string | null | undefined): number | null {
  if (!str) return null
  const cleaned = str.replace(/[\s.,km]/gi, '')
  const num = Number(cleaned)
  return isNaN(num) ? null : num
}

export function parseYear(str: string | null | undefined): number | null {
  if (!str) return null
  const match = str.match(/\b(19|20)\d{2}\b/)
  if (match) {
    const year = Number(match[0])
    if (year >= 1990 && year <= new Date().getFullYear() + 1) {
      return year
    }
  }
  return null
}
