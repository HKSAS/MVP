/**
 * Repository pour la table site_runs
 */

import { createClient } from '@/src/core/db/supabase'
import type { ScrapePass, ScrapingStrategy } from '@/src/core/types'

export type SiteRunStatus = 'ok' | 'failed'

export interface SiteRunRecord {
  id: string
  search_id: string
  site: string
  pass: ScrapePass
  status: SiteRunStatus
  items_count: number
  duration_ms: number
  error: string | null
  created_at: string
}

/**
 * Crée un enregistrement site_runs
 */
export async function createSiteRun(
  searchId: string,
  site: string,
  pass: ScrapePass,
  status: SiteRunStatus,
  itemsCount: number,
  durationMs: number,
  error: string | null = null
): Promise<SiteRunRecord> {
  const supabase = createClient()

  const { data, error: dbError } = await (supabase
    .from('site_runs') as any)
    .insert({
      search_id: searchId,
      site,
      pass,
      status,
      items_count: itemsCount,
      duration_ms: durationMs,
      error,
    })
    .select()
    .single()

  if (dbError) {
    throw new Error(`Erreur création site_run: ${dbError.message}`)
  }

  return data as SiteRunRecord
}

/**
 * Récupère les site_runs pour une recherche
 */
export async function getSiteRuns(
  searchId: string
): Promise<SiteRunRecord[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('site_runs')
    .select('*')
    .eq('search_id', searchId)
    .order('created_at', { ascending: true })

  if (error) {
    throw new Error(`Erreur récupération site_runs: ${error.message}`)
  }

  return (data || []) as SiteRunRecord[]
}

