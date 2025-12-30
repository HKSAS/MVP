/**
 * Repository pour les tables listings_raw et listings
 */

import { createClient } from '@/src/core/db/supabase'
import type { ListingNormalized } from '@/src/core/types'

export interface ListingRawRecord {
  id: string
  search_id: string
  site: string
  url: string
  raw: any // JSONB
  created_at: string
}

export interface ListingRecord {
  id: string
  search_id: string
  canonical_id: string
  site: string
  title: string
  price: number | null
  year: number | null
  mileage: number | null
  fuel: string | null
  city: string | null
  url: string
  score: number | null
  risk: number | null
  created_at: string
}

/**
 * Crée un enregistrement listings_raw
 */
export async function createListingRaw(
  searchId: string,
  site: string,
  url: string,
  raw: any
): Promise<ListingRawRecord> {
  const supabase = createClient()

  const { data, error } = await (supabase
    .from('listings_raw') as any)
    .insert({
      search_id: searchId,
      site,
      url,
      raw,
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Erreur création listing_raw: ${error.message}`)
  }

  return data as ListingRawRecord
}

/**
 * Crée un listing normalisé
 */
export async function createListing(
  searchId: string,
  listing: ListingNormalized
): Promise<ListingRecord> {
  const supabase = createClient()

  const { data, error } = await (supabase
    .from('listings') as any)
    .insert({
      search_id: searchId,
      canonical_id: listing.canonical_id || listing.id,
      site: listing.source,
      title: listing.title,
      price: listing.price,
      year: listing.year,
      mileage: listing.mileage,
      fuel: listing.fuel,
      city: listing.city,
      url: listing.url,
      score: listing.score || listing.score_final || null,
      risk: listing.risk || null,
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Erreur création listing: ${error.message}`)
  }

  return data as ListingRecord
}

/**
 * Crée plusieurs listings en batch
 */
export async function createListingsBatch(
  searchId: string,
  listings: ListingNormalized[]
): Promise<ListingRecord[]> {
  const supabase = createClient()

  const records = listings.map((listing) => ({
    search_id: searchId,
    canonical_id: listing.canonical_id || listing.id,
    site: listing.source,
    title: listing.title,
    price: listing.price,
    year: listing.year,
    mileage: listing.mileage,
    fuel: listing.fuel,
    city: listing.city,
    url: listing.url,
    score: listing.score || listing.score_final || null,
    risk: listing.risk || null,
  }))

  const { data, error } = await (supabase
    .from('listings') as any)
    .insert(records)
    .select()

  if (error) {
    throw new Error(`Erreur création listings batch: ${error.message}`)
  }

  return (data || []) as ListingRecord[]
}

/**
 * Récupère les listings pour une recherche (paginés, triés par score desc)
 */
export async function getListings(
  searchId: string,
  page: number = 1,
  limit: number = 50
): Promise<{ listings: ListingRecord[]; total: number }> {
  const supabase = createClient()

  // Compter le total
  const { count, error: countError } = await supabase
    .from('listings')
    .select('*', { count: 'exact', head: true })
    .eq('search_id', searchId)

  if (countError) {
    throw new Error(`Erreur comptage listings: ${countError.message}`)
  }

  // Récupérer paginés
  const from = (page - 1) * limit
  const to = from + limit - 1

  const { data, error } = await supabase
    .from('listings')
    .select('*')
    .eq('search_id', searchId)
      .order('score', { ascending: false })
    .range(from, to)

  if (error) {
    throw new Error(`Erreur récupération listings: ${error.message}`)
  }

  return {
    listings: (data || []) as ListingRecord[],
    total: count || 0,
  }
}

/**
 * Compte les listings pour une recherche
 */
export async function countListings(searchId: string): Promise<number> {
  const supabase = createClient()

  const { count, error } = await supabase
    .from('listings')
    .select('*', { count: 'exact', head: true })
    .eq('search_id', searchId)

  if (error) {
    throw new Error(`Erreur comptage: ${error.message}`)
  }

  return count || 0
}

