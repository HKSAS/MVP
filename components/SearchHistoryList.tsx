'use client'

import { useEffect, useState } from 'react'
import { Clock, ChevronRight, Trash2, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { getSupabaseBrowserClient } from '@/lib/supabase/browser'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'

interface SearchHistoryItem {
  id: string
  brand: string
  model: string
  max_price: number
  total_results: number
  created_at: string
}

export function SearchHistoryList() {
  const router = useRouter()
  const [searches, setSearches] = useState<SearchHistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [clearingAll, setClearingAll] = useState(false)

  useEffect(() => {
    loadHistory()
  }, [])

  async function loadHistory() {
    try {
      setLoading(true)

      // Récupérer le token de session
      const supabase = getSupabaseBrowserClient()
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session?.access_token) {
        console.warn('Session non disponible pour charger l\'historique')
        setSearches([])
        return
      }

      const response = await fetch('/api/me/searches?limit=10', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (!response.ok) {
        if (response.status === 401) {
          console.warn('Non authentifié pour charger l\'historique')
          setSearches([])
          return
        }
        throw new Error(`Erreur ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()

      console.log('[SearchHistoryList] 📥 Données reçues de l\'API:', {
        success: data.success,
        count: data.data?.length || 0,
        totalCount: data.totalCount,
        data: data.data,
        rawResponse: data
      })

      if (data.success && data.data && Array.isArray(data.data)) {
        console.log('[SearchHistoryList] ✅ Recherches chargées:', data.data.length, 'recherches')
        if (data.data.length > 0) {
          console.log('[SearchHistoryList] Première recherche:', data.data[0])
        }
        setSearches(data.data)
      } else {
        console.warn('[SearchHistoryList] ⚠️ Aucune recherche trouvée ou format invalide:', {
          success: data.success,
          hasData: !!data.data,
          isArray: Array.isArray(data.data),
          dataType: typeof data.data,
          fullData: data
        })
        setSearches([])
      }

    } catch (error) {
      console.error('[SearchHistory] Load error:', error)
      setSearches([])
    } finally {
      setLoading(false)
    }
  }

  async function deleteSearch(searchId: string) {
    try {
      setDeletingId(searchId)

      const supabase = getSupabaseBrowserClient()
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session?.access_token) {
        toast.error('Session expirée. Veuillez vous reconnecter.')
        return
      }

      const response = await fetch(`/api/me/searches?id=${searchId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Erreur lors de la suppression')
      }

      // Supprimer de la liste locale
      setSearches(prev => prev.filter(s => s.id !== searchId))
      toast.success('Recherche supprimée')

    } catch (error) {
      console.error('[SearchHistory] Delete error:', error)
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la suppression')
    } finally {
      setDeletingId(null)
    }
  }

  async function clearAllHistory() {
    try {
      setClearingAll(true)

      const supabase = getSupabaseBrowserClient()
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session?.access_token) {
        toast.error('Session expirée. Veuillez vous reconnecter.')
        return
      }

      const response = await fetch('/api/me/searches', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Erreur lors de la suppression')
      }

      // Vider la liste locale
      setSearches([])
      toast.success('Historique supprimé')

    } catch (error) {
      console.error('[SearchHistory] Clear all error:', error)
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la suppression')
    } finally {
      setClearingAll(false)
    }
  }

  function handleClick(search: SearchHistoryItem) {
    // 🎯 Vérifier si on a des résultats en cache pour cette recherche
    const cacheKey = `searchResults_${search.id}`
    const cachedResults = localStorage.getItem(cacheKey)
    
    if (cachedResults) {
      try {
        const parsedResults = JSON.parse(cachedResults)
        // Sauvegarder dans localStorage avec la clé standard pour la page de résultats
        localStorage.setItem('searchResults', JSON.stringify(parsedResults))
        localStorage.setItem('searchCriteria', JSON.stringify({
          brand: search.brand,
          model: search.model,
          max_price: search.max_price,
          resultsCount: search.total_results,
          platformsCount: 0,
        }))
        localStorage.setItem('fromHistory', 'true')
        
        // Rediriger vers la page de résultats avec les paramètres
        const params = new URLSearchParams()
        if (search.brand) params.set('brand', search.brand)
        if (search.model) params.set('model', search.model)
        if (search.max_price > 0) params.set('max_price', search.max_price.toString())
        params.set('fromHistory', 'true')
        
        console.log('[SearchHistoryList] Redirection vers /resultats avec cache:', params.toString())
        router.push(`/resultats?${params.toString()}`)
        return
      } catch (e) {
        console.error('[SearchHistoryList] Erreur parsing cache:', e)
      }
    }
    
    // Si pas de cache, rediriger normalement (relancera le scraping)
    const params = new URLSearchParams()
    if (search.brand) params.set('brand', search.brand)
    if (search.model) params.set('model', search.model)
    if (search.max_price > 0) params.set('max_price', search.max_price.toString())
    
    console.log('[SearchHistoryList] Redirection vers /resultats sans cache:', params.toString())
    router.push(`/resultats?${params.toString()}`)
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-gray-900 rounded-xl p-6">
            <Skeleton className="h-6 w-2/3 mb-2" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ))}
      </div>
    )
  }

  if (searches.length === 0) {
    return (
      <div className="bg-gray-900 rounded-xl p-8 text-center">
        <Clock className="mx-auto text-gray-600 mb-3" size={40} />
        <p className="text-gray-400 mb-4">Aucune recherche récente</p>
        <Button 
          onClick={() => router.push('/recherche')}
          className="bg-blue-600 hover:bg-blue-700"
        >
          Lancer une recherche
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header avec bouton effacer tout */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-400">
          {searches.length} recherche{searches.length > 1 ? 's' : ''} récente{searches.length > 1 ? 's' : ''}
        </p>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-red-400 hover:bg-red-500/10"
              disabled={clearingAll}
            >
              <Trash2 className="size-4 mr-2" />
              {clearingAll ? 'Suppression...' : 'Effacer tout'}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="bg-gray-900 border-gray-700">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white">Effacer l&apos;historique</AlertDialogTitle>
              <AlertDialogDescription className="text-gray-400">
                Êtes-vous sûr de vouloir supprimer toutes vos recherches ? Cette action est irréversible.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-gray-800 text-white border-gray-700 hover:bg-gray-700">
                Annuler
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={clearAllHistory}
                className="bg-red-600 hover:bg-red-700 text-white"
                disabled={clearingAll}
              >
                {clearingAll ? 'Suppression...' : 'Supprimer'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Liste des recherches */}
      <div className="space-y-3">
        {searches.map((search) => {
          const queryText = `${search.brand} ${search.model}`.trim() || 'Recherche'
          const isDeleting = deletingId === search.id
          
          return (
            <div
              key={search.id}
              className="bg-gray-900 rounded-xl p-6 hover:bg-gray-800 transition group border border-blue-600/10 hover:border-blue-600/20 relative"
            >
              {/* Bouton supprimer individuel */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  deleteSearch(search.id)
                }}
                disabled={isDeleting}
                className="absolute top-3 right-3 p-1.5 rounded-lg bg-gray-800/50 hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition opacity-0 group-hover:opacity-100 disabled:opacity-50"
                aria-label="Supprimer cette recherche"
              >
                {isDeleting ? (
                  <div className="size-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <X className="size-4" />
                )}
              </button>

              {/* Contenu cliquable */}
              <div
                onClick={() => handleClick(search)}
                className="cursor-pointer pr-8"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold mb-2 group-hover:text-blue-400 transition text-white">
                      {queryText}
                    </h3>
                    <div className="flex items-center gap-4 text-sm text-gray-400 flex-wrap">
                      {search.max_price > 0 && (
                        <>
                          <span>Budget: {search.max_price.toLocaleString('fr-FR')} €</span>
                          <span>•</span>
                        </>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="size-4" />
                        {new Date(search.created_at).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </span>
                      <span>•</span>
                      <span className="text-blue-400 font-medium">
                        {search.total_results || 0} résultat{(search.total_results || 0) > 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                  
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="p-2 bg-gray-800 group-hover:bg-blue-600 rounded-lg transition"
                  >
                    <ChevronRight size={20} className="text-gray-400 group-hover:text-white" />
                  </Button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
