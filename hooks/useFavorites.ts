/**
 * Hook React pour gérer les favoris
 * Utilise Supabase pour la persistance
 */

import { useState, useEffect, useCallback } from 'react'
import { getSupabaseBrowserClient } from '@/lib/supabase/browser'
import { toast } from 'sonner'
import type { ListingResponse } from '@/lib/types'
import type { Favorite, ToggleFavoriteBody } from '@/lib/types/favorites'

interface UseFavoritesOptions {
  userId?: string // Optionnel, sera récupéré depuis la session si non fourni
}

// Cache global pour éviter les appels répétés
let globalFavoritesCache: {
  favorites: Favorite[]
  favoriteIds: Set<string>
  timestamp: number
  loading: boolean
} | null = null

const CACHE_DURATION = 5000 // 5 secondes
let loadingPromise: Promise<void> | null = null

export function useFavorites({ userId: providedUserId }: UseFavoritesOptions = {}) {
  const [favorites, setFavorites] = useState<Favorite[]>([])
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set()) // Set pour lookup rapide
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Charger les favoris au montage - UNE SEULE FOIS
  useEffect(() => {
    loadFavorites()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Dépendances vides = exécuté une seule fois au montage

  const loadFavorites = useCallback(async () => {
    // Utiliser le cache si disponible et récent
    const now = Date.now()
    if (globalFavoritesCache && (now - globalFavoritesCache.timestamp) < CACHE_DURATION && !globalFavoritesCache.loading) {
      setFavorites(globalFavoritesCache.favorites)
      setFavoriteIds(globalFavoritesCache.favoriteIds)
      setLoading(false)
      return
    }

    // Si un chargement est déjà en cours, attendre qu'il se termine
    if (loadingPromise) {
      try {
        await loadingPromise
        if (globalFavoritesCache) {
          setFavorites(globalFavoritesCache.favorites)
          setFavoriteIds(globalFavoritesCache.favoriteIds)
          setLoading(false)
        }
      } catch (err) {
        console.error('Erreur lors de l\'attente du chargement:', err)
        setLoading(false)
      }
      return
    }

    // Créer une nouvelle promesse de chargement
    loadingPromise = (async () => {
      try {
        setLoading(true)
        setError(null)

        // Marquer le cache comme en chargement
        if (globalFavoritesCache) {
          globalFavoritesCache.loading = true
        }

        const supabase = getSupabaseBrowserClient()
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()

        if (sessionError || !session?.user) {
          const emptyCache = {
            favorites: [],
            favoriteIds: new Set<string>(),
            timestamp: Date.now(),
            loading: false
          }
          globalFavoritesCache = emptyCache
          setFavorites([])
          setFavoriteIds(new Set())
          return
        }

        const userId = providedUserId || session.user.id
        const token = session.access_token

        const response = await fetch('/api/favorites', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        })

        if (!response.ok) {
          if (response.status === 401) {
            const emptyCache = {
              favorites: [],
              favoriteIds: new Set<string>(),
              timestamp: Date.now(),
              loading: false
            }
            globalFavoritesCache = emptyCache
            setFavorites([])
            setFavoriteIds(new Set())
            return
          }
          throw new Error(`Erreur ${response.status}`)
        }

        const data = await response.json()

        if (data.success && data.data) {
          // Créer un Set pour lookup rapide : "source:listing_id"
          const ids = new Set<string>(data.data.map((fav: Favorite) => `${fav.source}:${fav.listing_id}`))
          
          // Mettre à jour le cache global
          globalFavoritesCache = {
            favorites: data.data,
            favoriteIds: ids,
            timestamp: Date.now(),
            loading: false
          }
          
          setFavorites(data.data)
          setFavoriteIds(ids)
        } else {
          const emptyCache = {
            favorites: [],
            favoriteIds: new Set<string>(),
            timestamp: Date.now(),
            loading: false
          }
          globalFavoritesCache = emptyCache
          setFavorites([])
          setFavoriteIds(new Set())
        }
      } catch (err) {
        console.error('Erreur chargement favoris:', err)
        setError('Erreur lors du chargement des favoris')
        const emptyCache = {
          favorites: [],
          favoriteIds: new Set<string>(),
          timestamp: Date.now(),
          loading: false
        }
        globalFavoritesCache = emptyCache
        setFavorites([])
        setFavoriteIds(new Set())
      } finally {
        setLoading(false)
        loadingPromise = null
      }
    })()
    
    await loadingPromise
  }, [providedUserId])

  const addFavorite = useCallback(async (listing: ListingResponse): Promise<boolean> => {
    try {
      console.log('[useFavorites] addFavorite appelé', { 
        source: listing.source, 
        listingId: listing.id 
      })
      
      const supabase = getSupabaseBrowserClient()
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      if (sessionError) {
        console.error('[useFavorites] Erreur session:', sessionError)
        toast.error('Erreur de session. Veuillez vous reconnecter.')
        return false
      }

      if (!session?.user) {
        console.warn('[useFavorites] Pas de session utilisateur')
        toast.error('Vous devez être connecté pour ajouter aux favoris')
        return false
      }

      if (!session.access_token) {
        console.error('[useFavorites] Pas de token d\'accès')
        toast.error('Session invalide. Veuillez vous reconnecter.')
        return false
      }

      const token = session.access_token
      console.log('[useFavorites] Session valide', { userId: session.user.id })

      // Préparer les données
      const favoriteData: ToggleFavoriteBody = {
        source: listing.source,
        listing_id: listing.id,
        listing_url: listing.url,
        title: listing.title,
        price: listing.price_eur || null,
        year: listing.year || null,
        mileage: listing.mileage_km || null,
        fuel: null,
        transmission: null,
        city: listing.city || null,
        score: listing.score_ia || listing.score_final || null,
        risk_score: null,
        extracted_features: {
          title: listing.title,
        },
      }

      // Optimistic update
      const favoriteKey = `${listing.source}:${listing.id}`
      setFavoriteIds(prev => {
        const newSet = new Set<string>(prev)
        newSet.add(favoriteKey)
        return newSet
      })

      const response = await fetch('/api/favorites/toggle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(favoriteData),
      })

      if (!response.ok) {
        // Rollback
        setFavoriteIds(prev => {
          const newSet = new Set(prev)
          newSet.delete(favoriteKey)
          return newSet
        })
        
        let errorMessage = 'Erreur lors de l\'ajout du favori'
        
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorData.message || errorMessage
          console.error('[useFavorites] Erreur API:', {
            status: response.status,
            statusText: response.statusText,
            error: errorData,
          })
        } catch (parseError) {
          console.error('[useFavorites] Erreur parsing réponse:', parseError)
          errorMessage = `Erreur ${response.status}: ${response.statusText}`
        }
        
        if (response.status === 401) {
          toast.error('Session expirée. Veuillez vous reconnecter.')
        } else if (response.status === 500) {
          toast.error('Erreur serveur. Vérifiez les logs ou contactez le support.')
        } else {
          toast.error(errorMessage)
        }
        
        return false
      }

      let data
      try {
        data = await response.json()
      } catch (parseError) {
        console.error('[useFavorites] Erreur parsing JSON:', parseError)
        toast.error('Erreur lors de la lecture de la réponse du serveur')
        return false
      }

      if (data.success) {
        // Invalider le cache pour forcer un rechargement
        globalFavoritesCache = null
        loadingPromise = null
        
        if (data.data) {
          setFavorites(prev => [...prev, data.data])
        }
        // Recharger les favoris pour synchroniser avec le serveur (sans utiliser le cache)
        // Appeler directement la logique de chargement sans passer par le cache
        const supabase2 = getSupabaseBrowserClient()
        const { data: { session: session2 } } = await supabase2.auth.getSession()
        if (session2?.access_token) {
          const response2 = await fetch('/api/favorites', {
            headers: { 'Authorization': `Bearer ${session2.access_token}` },
          })
          if (response2.ok) {
            const data2 = await response2.json()
            if (data2.success && data2.data) {
              const ids2 = new Set<string>(data2.data.map((fav: Favorite) => `${fav.source}:${fav.listing_id}`))
              globalFavoritesCache = { favorites: data2.data, favoriteIds: ids2, timestamp: Date.now(), loading: false }
              setFavorites(data2.data)
              setFavoriteIds(ids2)
            }
          }
        }
        toast.success('Annonce ajoutée aux favoris')
        return true
      } else {
        console.error('[useFavorites] Réponse non réussie:', data)
        const errorMessage = data.error || data.message || 'Erreur lors de l\'ajout du favori'
        toast.error(errorMessage)
        return false
      }
    } catch (err) {
      console.error('Erreur ajout favori:', err)
      toast.error(err instanceof Error ? err.message : 'Erreur lors de l\'ajout du favori')
      return false
    }
  }, [])

  const removeFavorite = useCallback(async (listing: ListingResponse): Promise<boolean> => {
    try {
      console.log('[useFavorites] removeFavorite appelé', { 
        source: listing.source, 
        listingId: listing.id 
      })
      
      const supabase = getSupabaseBrowserClient()
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      if (sessionError) {
        console.error('[useFavorites] Erreur session:', sessionError)
        toast.error('Erreur de session. Veuillez vous reconnecter.')
        return false
      }

      if (!session?.user) {
        console.warn('[useFavorites] Pas de session utilisateur')
        toast.error('Vous devez être connecté')
        return false
      }

      if (!session.access_token) {
        console.error('[useFavorites] Pas de token d\'accès')
        toast.error('Session invalide. Veuillez vous reconnecter.')
        return false
      }

      const token = session.access_token
      console.log('[useFavorites] Session valide', { userId: session.user.id })

      // Optimistic update
      const favoriteKey = `${listing.source}:${listing.id}`
      setFavoriteIds(prev => {
        const newSet = new Set<string>(prev)
        newSet.delete(favoriteKey)
        return newSet
      })

      const favoriteData: ToggleFavoriteBody = {
        source: listing.source,
        listing_id: listing.id,
        listing_url: listing.url,
      }

      const response = await fetch('/api/favorites/toggle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(favoriteData),
      })

      if (!response.ok) {
        // Rollback
        setFavoriteIds(prev => {
          const newSet = new Set<string>(prev)
          newSet.add(favoriteKey)
          return newSet
        })
        
        let errorMessage = 'Erreur lors de la suppression du favori'
        
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorData.message || errorMessage
          console.error('[useFavorites] Erreur API:', {
            status: response.status,
            statusText: response.statusText,
            error: errorData,
          })
        } catch (parseError) {
          console.error('[useFavorites] Erreur parsing réponse:', parseError)
          errorMessage = `Erreur ${response.status}: ${response.statusText}`
        }
        
        if (response.status === 401) {
          toast.error('Session expirée. Veuillez vous reconnecter.')
        } else if (response.status === 500) {
          toast.error('Erreur serveur. Vérifiez les logs ou contactez le support.')
        } else {
          toast.error(errorMessage)
        }
        
        return false
      }

      let data
      try {
        data = await response.json()
      } catch (parseError) {
        console.error('[useFavorites] Erreur parsing JSON:', parseError)
        toast.error('Erreur lors de la lecture de la réponse du serveur')
        return false
      }

      if (data.success) {
        // Invalider le cache pour forcer un rechargement
        globalFavoritesCache = null
        loadingPromise = null
        
        setFavorites(prev => prev.filter(fav => 
          !(fav.source === listing.source && fav.listing_id === listing.id)
        ))
        // Recharger les favoris pour synchroniser avec le serveur (sans utiliser le cache)
        // Appeler directement la logique de chargement sans passer par le cache
        const supabase2 = getSupabaseBrowserClient()
        const { data: { session: session2 } } = await supabase2.auth.getSession()
        if (session2?.access_token) {
          const response2 = await fetch('/api/favorites', {
            headers: { 'Authorization': `Bearer ${session2.access_token}` },
          })
          if (response2.ok) {
            const data2 = await response2.json()
            if (data2.success && data2.data) {
              const ids2 = new Set<string>(data2.data.map((fav: Favorite) => `${fav.source}:${fav.listing_id}`))
              globalFavoritesCache = { favorites: data2.data, favoriteIds: ids2, timestamp: Date.now(), loading: false }
              setFavorites(data2.data)
              setFavoriteIds(ids2)
            }
          }
        }
        toast.success('Annonce retirée des favoris')
        return true
      } else {
        console.error('[useFavorites] Réponse non réussie:', data)
        const errorMessage = data.error || data.message || 'Erreur lors de la suppression du favori'
        toast.error(errorMessage)
        return false
      }
    } catch (err) {
      console.error('Erreur retrait favori:', err)
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la suppression du favori')
      return false
    }
  }, [])

  const isFavorite = useCallback((listing: ListingResponse | { source: string; id: string }): boolean => {
    const key = `${listing.source}:${listing.id}`
    return favoriteIds.has(key)
  }, [favoriteIds])

  const toggleFavorite = useCallback(async (listing: ListingResponse): Promise<boolean> => {
    try {
      console.log('[useFavorites] toggleFavorite appelé', { 
        source: listing.source, 
        listingId: listing.id,
        isFavorite: isFavorite(listing)
      })
      
      if (isFavorite(listing)) {
        const result = await removeFavorite(listing)
        console.log('[useFavorites] removeFavorite résultat:', result)
        return result
      } else {
        const result = await addFavorite(listing)
        console.log('[useFavorites] addFavorite résultat:', result)
        return result
      }
    } catch (error) {
      console.error('[useFavorites] Erreur toggleFavorite:', error)
      // Ne pas afficher de toast ici, les fonctions addFavorite/removeFavorite le font déjà
      return false
    }
  }, [isFavorite, addFavorite, removeFavorite])

  return {
    favorites,
    favoriteIds,
    loading,
    error,
    addFavorite,
    removeFavorite,
    isFavorite,
    toggleFavorite,
    refresh: loadFavorites,
  }
}

