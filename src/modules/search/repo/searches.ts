/**
 * Repository pour la table searches
 */

import { createClient } from '@/src/core/db/supabase'
import type { SearchParams } from '@/src/core/types'

export type SearchStatus = 'queued' | 'running' | 'done' | 'failed'

export interface SearchRecord {
  id: string
  user_id: string | null
  brand: string
  model: string | null
  max_price: number
  fuel_type: string | null
  status: SearchStatus
  created_at: string
  updated_at: string
}

/**
 * Crée une nouvelle recherche en statut 'queued'
 */
export async function createSearch(
  params: SearchParams & { userId?: string | null }
): Promise<SearchRecord> {
  const supabase = createClient()

  const { data, error } = await (supabase
    .from('searches') as any)
    .insert({
      user_id: params.userId || null,
      brand: params.brand,
      model: params.model || null,
      max_price: params.maxPrice,
      fuel_type: params.fuelType || null,
      status: 'queued',
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Erreur création recherche: ${error.message}`)
  }

  return data as SearchRecord
}

/**
 * Met à jour le statut d'une recherche
 */
export async function updateSearchStatus(
  searchId: string,
  status: SearchStatus
): Promise<void> {
  const supabase = createClient()

  const { error } = await (supabase
    .from('searches') as any)
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', searchId)

  if (error) {
    throw new Error(`Erreur mise à jour statut: ${error.message}`)
  }
}

/**
 * Récupère une recherche par ID
 */
export async function getSearch(searchId: string): Promise<SearchRecord | null> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('searches')
    .select('*')
    .eq('id', searchId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null // Not found
    }
    throw new Error(`Erreur récupération recherche: ${error.message}`)
  }

  return data as SearchRecord
}

