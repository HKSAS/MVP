'use client'

import { useCallback } from 'react'
import { getSupabaseBrowserClient } from '@/lib/supabase/browser'

/**
 * Hook pour sauvegarder automatiquement les recherches dans l'historique
 */
export function useSaveSearch() {
  const saveSearch = useCallback(async (params: {
    query?: string
    brand?: string
    model?: string
    budget?: number
    max_price?: number
    location?: string
    filters?: any
    resultsCount?: number
  }) => {
    try {
      // Récupérer le token de session
      const supabase = getSupabaseBrowserClient()
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session?.access_token) {
        console.log('[SaveSearch] Pas de session, skip sauvegarde')
        return
      }

      console.log('[SaveSearch] 🚀 Début sauvegarde recherche:', {
        query: params.query || `${params.brand} ${params.model}`,
        brand: params.brand,
        model: params.model,
        max_price: params.max_price || params.budget,
        resultsCount: params.resultsCount
      })

      const requestBody = {
        query: params.query,
        brand: params.brand,
        model: params.model,
        max_price: params.max_price || params.budget,
        location: params.location,
        filters: params.filters || {},
        resultsCount: params.resultsCount || 0
      }
      
      console.log('[SaveSearch] 📤 Envoi requête POST /api/me/searches', requestBody)

      const response = await fetch('/api/me/searches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(requestBody)
      })

      console.log('[SaveSearch] 📥 Réponse reçue:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      })

      const data = await response.json()

      console.log('[SaveSearch] Réponse API:', {
        success: data.success,
        data: data.data,
        error: data.error
      })

      if (data.success) {
        console.log('[SaveSearch] ✅ Recherche sauvegardée avec succès:', data.data)
        // Retourner l'ID pour pouvoir sauvegarder les résultats avec cet ID
        return data.data?.id || null
      } else {
        console.error('[SaveSearch] ❌ Erreur API:', data.error || data.message)
        return null
      }

    } catch (error) {
      console.error('[SaveSearch] Erreur:', error)
      // Ne pas bloquer l'utilisateur si la sauvegarde échoue
      return null
    }
  }, [])

  return { saveSearch }
}

