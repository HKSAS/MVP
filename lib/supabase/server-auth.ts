/**
 * Helper pour obtenir le client Supabase avec la session utilisateur
 * Utilise les cookies HTTP pour récupérer la session
 */

import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

/**
 * Obtient le client Supabase avec la session de l'utilisateur
 * Pour les API routes Next.js
 */
export async function getSupabaseWithSession() {
  const cookieStore = await cookies()
  
  // Créer le client avec gestion des cookies
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    // @ts-ignore - cookies option exists but not in types
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
      set(name: string, value: string, options: any) {
        cookieStore.set(name, value, options)
      },
      remove(name: string, options: any) {
        cookieStore.delete(name)
      },
    },
  })
  
  return supabase
}

/**
 * Obtient l'utilisateur depuis la session Supabase
 */
export async function getUserFromSession() {
  const supabase = await getSupabaseWithSession()
  const { data: { session }, error } = await supabase.auth.getSession()
  
  if (error || !session?.user) {
    return null
  }
  
  return {
    id: session.user.id,
    email: session.user.email || '',
  }
}

