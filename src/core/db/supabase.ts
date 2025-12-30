/**
 * Client Supabase côté serveur (pour les routes API)
 */

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { requireEnv } from '../config/env'

let serverClient: ReturnType<typeof createSupabaseClient> | null = null

/**
 * Crée ou retourne le client Supabase côté serveur
 */
export function createClient() {
  if (serverClient) {
    return serverClient
  }

  const supabaseUrl = requireEnv('NEXT_PUBLIC_SUPABASE_URL')
  const supabaseKey = requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY')

  serverClient = createSupabaseClient(supabaseUrl, supabaseKey)

  return serverClient
}

