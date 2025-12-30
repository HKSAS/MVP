'use client'

import { useEffect, useState } from 'react'
import { FileSearch, ChevronRight, Trash2, X, Calendar, AlertTriangle, CheckCircle, Clock } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { getSupabaseBrowserClient } from '@/lib/supabase/browser'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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

interface AnalyzedListing {
  id: string
  url: string | null
  title?: string | null
  price?: number | null
  year?: number | null
  mileage?: number | null
  risk_score: number
  risk_level: 'low' | 'medium' | 'high'
  summary: string
  created_at: string
  hasFullResult?: boolean
}

export function AnalyzedListingsHistoryList() {
  const router = useRouter()
  const [analyses, setAnalyses] = useState<AnalyzedListing[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [clearingAll, setClearingAll] = useState(false)

  useEffect(() => {
    loadHistory()
  }, [])

  async function loadHistory(showLoading = true) {
    try {
      if (showLoading) {
        setLoading(true)
      }

      // Récupérer le token de session
      const supabase = getSupabaseBrowserClient()
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session?.access_token) {
        console.warn('Session non disponible pour charger l\'historique des analyses')
        setAnalyses([])
        return
      }

      // Ajouter un timestamp pour éviter le cache
      const cacheBuster = `?limit=20&_t=${Date.now()}`
      const response = await fetch(`/api/me/analyzed-listings${cacheBuster}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Cache-Control': 'no-cache'
        }
      })

      if (!response.ok) {
        if (response.status === 401) {
          console.warn('Non authentifié pour charger l\'historique des analyses')
          setAnalyses([])
          return
        }
        throw new Error(`Erreur ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()

      console.log('[AnalyzedListingsHistoryList] 📥 Données reçues de l\'API:', {
        success: data.success,
        count: data.data?.length || 0,
        data: data.data,
      })

      if (data.success && data.data && Array.isArray(data.data)) {
        console.log('[AnalyzedListingsHistoryList] ✅ Analyses chargées:', data.data.length, 'analyses')
        setAnalyses(data.data)
      } else {
        console.warn('[AnalyzedListingsHistoryList] ⚠️ Aucune analyse trouvée ou format invalide')
        setAnalyses([])
      }

    } catch (error) {
      console.error('[AnalyzedListingsHistoryList] Load error:', error)
      setAnalyses([])
    } finally {
      if (showLoading) {
        setLoading(false)
      }
    }
  }

  async function deleteAnalysis(analysisId: string) {
    try {
      setDeletingId(analysisId)

      const supabase = getSupabaseBrowserClient()
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session?.access_token) {
        toast.error('Session expirée. Veuillez vous reconnecter.')
        return
      }

      console.log('[AnalyzedListingsHistoryList] Tentative suppression analyse:', analysisId)

      const response = await fetch(`/api/me/analyzed-listings?id=${analysisId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      const responseData = await response.json().catch(() => ({}))

      if (!response.ok) {
        console.error('[AnalyzedListingsHistoryList] Erreur réponse API:', {
          status: response.status,
          statusText: response.statusText,
          data: responseData
        })
        throw new Error(responseData.error || responseData.message || 'Erreur lors de la suppression')
      }

      if (!responseData.success) {
        console.error('[AnalyzedListingsHistoryList] Suppression échouée:', responseData)
        throw new Error(responseData.error || 'La suppression a échoué')
      }

      console.log('[AnalyzedListingsHistoryList] Analyse supprimée avec succès:', responseData)

      // Supprimer de la liste locale immédiatement (optimistic update)
      setAnalyses(prev => {
        const filtered = prev.filter(a => a.id !== analysisId)
        console.log('[AnalyzedListingsHistoryList] Liste locale mise à jour:', {
          avant: prev.length,
          apres: filtered.length,
          analysisId,
          idsAvant: prev.map(a => a.id),
          idsApres: filtered.map(a => a.id)
        })
        return filtered
      })
      
      toast.success('Analyse supprimée')

      // Recharger la liste depuis le serveur pour s'assurer que les données sont synchronisées
      // Ne pas afficher le loader pour éviter un flash
      setTimeout(async () => {
        console.log('[AnalyzedListingsHistoryList] Rechargement de la liste après suppression...')
        await loadHistory(false) // false = ne pas afficher le loader
      }, 500)

    } catch (error) {
      console.error('[AnalyzedListingsHistoryList] Delete error:', error)
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

      console.log('[AnalyzedListingsHistoryList] Tentative suppression de tout l\'historique')

      const response = await fetch('/api/me/analyzed-listings', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      const responseData = await response.json().catch(() => ({}))

      if (!response.ok) {
        console.error('[AnalyzedListingsHistoryList] Erreur réponse API:', {
          status: response.status,
          statusText: response.statusText,
          data: responseData
        })
        throw new Error(responseData.error || responseData.message || 'Erreur lors de la suppression')
      }

      if (!responseData.success) {
        console.error('[AnalyzedListingsHistoryList] Suppression échouée:', responseData)
        throw new Error(responseData.error || 'La suppression a échoué')
      }

      console.log('[AnalyzedListingsHistoryList] Historique supprimé avec succès:', responseData)

      // Vider la liste locale immédiatement
      setAnalyses([])
      toast.success(`Historique supprimé (${responseData.deletedCount || 0} analyses)`)

      // Recharger la liste depuis le serveur pour s'assurer que les données sont synchronisées
      // Ne pas afficher le loader pour éviter un flash
      setTimeout(async () => {
        console.log('[AnalyzedListingsHistoryList] Rechargement de la liste après suppression totale...')
        await loadHistory(false) // false = ne pas afficher le loader
      }, 500)

    } catch (error) {
      console.error('[AnalyzedListingsHistoryList] Clear all error:', error)
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la suppression')
    } finally {
      setClearingAll(false)
    }
  }

  function getRiskBadge(riskLevel: 'low' | 'medium' | 'high', riskScore: number) {
    const reliabilityScore = 100 - riskScore
    
    if (riskLevel === 'low' || reliabilityScore >= 85) {
      return <Badge className="bg-green-500 border-none">Excellent</Badge>
    } else if (riskLevel === 'medium' || reliabilityScore >= 70) {
      return <Badge className="bg-blue-500 border-none">Bon</Badge>
    } else {
      return <Badge className="bg-yellow-500 border-none">À surveiller</Badge>
    }
  }

  function getRiskIcon(riskLevel: 'low' | 'medium' | 'high') {
    if (riskLevel === 'low') {
      return <CheckCircle className="size-4 text-green-400" />
    } else if (riskLevel === 'medium') {
      return <Clock className="size-4 text-blue-400" />
    } else {
      return <AlertTriangle className="size-4 text-yellow-400" />
    }
  }

  async function handleClick(analysis: AnalyzedListing) {
    try {
      // Récupérer le token de session
      const supabase = getSupabaseBrowserClient()
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session?.access_token) {
        toast.error('Session expirée. Veuillez vous reconnecter.')
        return
      }

      // Récupérer les résultats complets de l'analyse
      const response = await fetch(`/api/me/analyzed-listings?id=${analysis.id}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (!response.ok) {
        throw new Error('Erreur lors de la récupération de l\'analyse')
      }

      const data = await response.json()
      
      if (data.success && data.data) {
        // Si on a des résultats complets, les utiliser
        if (data.data.analysis_result) {
          localStorage.setItem('analysisResult', JSON.stringify(data.data.analysis_result))
          localStorage.setItem('analysisId', analysis.id)
          localStorage.setItem('analysisUrl', analysis.url || '')
          router.push('/analyser?fromHistory=true')
        } else {
          // Si pas de résultats complets mais qu'on a les données de base, reconstruire un résultat minimal
          // Ou simplement rediriger vers la page d'analyse avec l'URL
          if (analysis.url) {
            // Ouvrir l'URL directement
            window.open(analysis.url, '_blank', 'noopener,noreferrer')
          } else {
            router.push('/analyser')
          }
        }
      } else {
        // Si pas de résultats complets, rediriger vers la page d'analyse normale
        router.push('/analyser')
      }
    } catch (error) {
      console.error('[AnalyzedListingsHistoryList] Erreur:', error)
      toast.error('Erreur lors du chargement de l\'analyse')
      // Fallback : rediriger vers la page d'analyse normale
      router.push('/analyser')
    }
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

  if (analyses.length === 0) {
    return (
      <div className="bg-gray-900 rounded-xl p-8 text-center">
        <FileSearch className="mx-auto text-gray-600 mb-3" size={40} />
        <p className="text-gray-400 mb-4">Aucune analyse récente</p>
        <Button 
          onClick={() => router.push('/analyser')}
          className="bg-blue-600 hover:bg-blue-700"
        >
          Analyser une annonce
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header avec bouton effacer tout */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-400">
          {analyses.length} analyse{analyses.length > 1 ? 's' : ''} récente{analyses.length > 1 ? 's' : ''}
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
                Êtes-vous sûr de vouloir supprimer toutes vos analyses ? Cette action est irréversible.
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

      {/* Liste des analyses */}
      <div className="space-y-3">
        {analyses.map((analysis) => {
          const reliabilityScore = 100 - analysis.risk_score
          const isDeleting = deletingId === analysis.id
          const displayTitle = analysis.title || (analysis.url 
            ? (analysis.url.length > 60 ? `${analysis.url.substring(0, 60)}...` : analysis.url)
            : 'Annonce analysée')
          
          return (
            <div
              key={analysis.id}
              className="bg-gray-900 rounded-xl p-6 hover:bg-gray-800 transition group border border-blue-600/10 hover:border-blue-600/20 relative"
            >
              {/* Bouton supprimer individuel */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  deleteAnalysis(analysis.id)
                }}
                disabled={isDeleting}
                className="absolute top-3 right-3 p-1.5 rounded-lg bg-gray-800/50 hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition opacity-0 group-hover:opacity-100 disabled:opacity-50"
                aria-label="Supprimer cette analyse"
              >
                {isDeleting ? (
                  <div className="size-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <X className="size-4" />
                )}
              </button>

              {/* Contenu cliquable */}
              <div
                onClick={() => handleClick(analysis)}
                className="cursor-pointer pr-8"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      {getRiskIcon(analysis.risk_level)}
                      <h3 className="text-lg font-semibold group-hover:text-blue-400 transition text-white truncate">
                        {displayTitle}
                      </h3>
                    </div>
                    
                    {/* Informations du véhicule si disponibles */}
                    {(analysis.price || analysis.year || analysis.mileage) && (
                      <div className="flex items-center gap-3 text-sm text-gray-300 mb-2 flex-wrap">
                        {analysis.price && (
                          <span className="font-semibold text-blue-400">
                            {new Intl.NumberFormat('fr-FR', {
                              style: 'currency',
                              currency: 'EUR',
                              maximumFractionDigits: 0,
                            }).format(analysis.price)}
                          </span>
                        )}
                        {analysis.year && (
                          <>
                            {analysis.price && <span className="text-gray-500">•</span>}
                            <span>{analysis.year}</span>
                          </>
                        )}
                        {analysis.mileage && (
                          <>
                            {(analysis.price || analysis.year) && <span className="text-gray-500">•</span>}
                            <span>{analysis.mileage.toLocaleString('fr-FR')} km</span>
                          </>
                        )}
                      </div>
                    )}
                    
                    {analysis.summary && (
                      <p className="text-gray-400 text-sm mb-3 line-clamp-2">
                        {analysis.summary}
                      </p>
                    )}

                    <div className="flex items-center gap-4 text-sm text-gray-400 flex-wrap">
                      <span className="text-blue-400 font-medium">
                        Score: {reliabilityScore}/100
                      </span>
                      <span>•</span>
                      <span>Risque: {analysis.risk_score}%</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="size-4" />
                        {new Date(analysis.created_at).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {getRiskBadge(analysis.risk_level, analysis.risk_score)}
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
            </div>
          )
        })}
      </div>
    </div>
  )
}

