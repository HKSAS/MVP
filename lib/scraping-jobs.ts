/**
 * Utilitaires pour gérer les jobs de scraping
 * Permet de créer, vérifier et annuler des jobs de scraping
 */

import { createClient } from '@supabase/supabase-js'
import { NEXT_PUBLIC_SUPABASE_URL } from '@/lib/env'

// Client Supabase avec service role pour les opérations serveur
const supabaseAdmin = createClient(
  NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)

export interface ScrapingJob {
  id: string
  user_id: string | null
  status: 'running' | 'cancelled' | 'done' | 'failed'
  search_params: Record<string, any>
  created_at: string
  updated_at: string
  cancelled_at: string | null
  completed_at: string | null
}

/**
 * Crée un nouveau job de scraping
 */
export async function createScrapingJob(
  userId: string | null,
  searchParams: Record<string, any>
): Promise<string> {
  const { data, error } = await supabaseAdmin
    .from('scraping_jobs')
    .insert({
      user_id: userId,
      status: 'running',
      search_params: searchParams,
    })
    .select('id')
    .single()

  if (error || !data) {
    throw new Error(`Erreur création job: ${error?.message || 'Données manquantes'}`)
  }

  return data.id
}

/**
 * Vérifie le statut d'un job
 * Retourne le statut actuel ou null si le job n'existe pas
 */
export async function getJobStatus(jobId: string): Promise<'running' | 'cancelled' | 'done' | 'failed' | null> {
  const { data, error } = await supabaseAdmin
    .from('scraping_jobs')
    .select('status')
    .eq('id', jobId)
    .single()

  if (error || !data) {
    return null
  }

  return data.status as 'running' | 'cancelled' | 'done' | 'failed'
}

/**
 * Vérifie si un job a été annulé
 * Utilisé dans les boucles de scraping pour arrêter immédiatement
 */
export async function isJobCancelled(jobId: string): Promise<boolean> {
  const status = await getJobStatus(jobId)
  return status === 'cancelled'
}

/**
 * Met à jour le statut d'un job
 */
export async function updateJobStatus(
  jobId: string,
  status: 'running' | 'cancelled' | 'done' | 'failed'
): Promise<void> {
  const updateData: any = {
    status,
    updated_at: new Date().toISOString(),
  }

  if (status === 'done' || status === 'failed') {
    updateData.completed_at = new Date().toISOString()
  }

  const { error } = await supabaseAdmin
    .from('scraping_jobs')
    .update(updateData)
    .eq('id', jobId)

  if (error) {
    throw new Error(`Erreur mise à jour job: ${error.message}`)
  }
}

/**
 * Classe d'erreur pour signaler qu'un job a été annulé
 */
export class JobCancelledError extends Error {
  constructor(public jobId: string) {
    super(`Job ${jobId} a été annulé`)
    this.name = 'JobCancelledError'
  }
}

