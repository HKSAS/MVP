'use client'

import { useState, useEffect, useImperativeHandle, forwardRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ImageWithFallback } from '@/components/figma/ImageWithFallback'
import { FavoriteButton } from './FavoriteButton'
import { CheckCircle, ExternalLink, Sparkles, Loader2, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import type { Recommendation } from '@/lib/types/favorites'
import type { ListingResponse } from '@/lib/types'

export interface RecommendationsListRef {
  refresh: () => void
}

/**
 * Liste des recommandations pour l'utilisateur
 * Affiche les suggestions avec raison et score de match
 */
export const RecommendationsList = forwardRef<RecommendationsListRef, {}>((props, ref) => {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    loadRecommendations()
  }, [])

  // Exposer la méthode refresh pour permettre le rafraîchissement depuis l'extérieur
  useImperativeHandle(ref, () => ({
    refresh: () => {
      loadRecommendations(true)
    }
  }))

  const loadRecommendations = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }
      
      // Récupérer le token de session pour l'authentification
      const { getSupabaseBrowserClient } = await import('@/lib/supabase/browser')
      const supabase = getSupabaseBrowserClient()
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session?.access_token) {
        console.warn('Session non disponible pour les recommandations')
        setRecommendations([])
        return
      }
      
      const response = await fetch('/api/recommendations', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })
      
      if (!response.ok) {
        if (response.status === 401) {
          console.warn('Non authentifié pour les recommandations')
          setRecommendations([])
          return
        }
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Erreur lors du chargement des recommandations')
      }

      const data = await response.json()
      if (data.success) {
        setRecommendations(data.data || [])
      } else {
        setRecommendations([])
      }
    } catch (error) {
      console.error('Erreur chargement recommandations:', error)
      // Ne pas afficher d'erreur toast si c'est juste une session manquante
      if (error instanceof Error && !error.message.includes('session') && !error.message.includes('401')) {
        toast.error('Erreur lors du chargement des recommandations')
      }
      setRecommendations([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const convertListingCacheToResponse = (listing: any): ListingResponse => {
    // Le listing vient de l'API recommendations et a listing_url (format ListingCache)
    const url = listing.listing_url || listing.url || ''
    
    // Log pour debug (peut être retiré en production)
    if (!url) {
      console.warn('[RecommendationsList] Pas d\'URL trouvée pour le listing:', {
        id: listing.id || listing.listing_id || listing.external_id,
        title: listing.title,
        availableKeys: Object.keys(listing),
        url: listing.url,
        listing_url: listing.listing_url
      })
    }
    
    return {
      id: listing.listing_id || listing.id || listing.external_id || '',
      title: listing.title || 'Annonce',
      price_eur: listing.price || listing.price_eur || null,
      year: listing.year || null,
      mileage_km: listing.mileage || listing.mileage_km || null,
      url: url, // Utiliser listing_url (format ListingCache) ou url en fallback
      imageUrl: listing.image_url || listing.imageUrl || null,
      source: listing.source || '',
      city: listing.city || null,
      score_ia: listing.score || listing.score_ia || null,
      score_final: listing.score || listing.score_final || listing.score_ia || null,
    }
  }

  if (loading) {
    return (
      <div className="grid md:grid-cols-2 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-40 w-full rounded-lg mb-4" />
              <Skeleton className="h-6 w-3/4 mb-2" />
              <Skeleton className="h-4 w-1/2" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (recommendations.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600/10 rounded-full mb-4">
          <Sparkles className="size-8 text-blue-400" />
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">Aucune recommandation</h3>
        <p className="text-gray-400 mb-4">
          Ajoutez des annonces à vos favoris depuis les résultats de recherche pour recevoir des suggestions personnalisées
        </p>
        <p className="text-sm text-gray-500">
          Nos suggestions sont basées sur vos préférences : marques, budget, kilométrage, etc.
        </p>
      </div>
    )
  }

  return (
    <div>
      <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-xl p-4 mb-6">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-300 flex items-center gap-2">
            <Sparkles className="size-4 text-yellow-400" />
            Basé sur vos favoris, nous avons trouvé {recommendations.length} véhicule{recommendations.length > 1 ? 's' : ''} qui pourraient vous intéresser
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => loadRecommendations(true)}
            disabled={refreshing || loading}
            className="text-gray-400 hover:text-yellow-400"
          >
            <RefreshCw className={`size-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {recommendations.map((rec, index) => {
          const listing = convertListingCacheToResponse(rec.listing)
          const matchScore = Math.round(rec.matchScore)
          
          // Debug: vérifier que l'URL est présente
          if (!listing.url) {
            console.error('[RecommendationsList] Listing sans URL:', {
              listing: rec.listing,
              converted: listing,
              index
            })
          }
          
          return (
            <Card
              key={`${rec.listing.source}-${rec.listing.listing_id || rec.listing.id}-${index}`}
              className="border border-blue-600/20 bg-blue-950/20 rounded-xl overflow-hidden hover:ring-2 hover:ring-yellow-500/50 hover:shadow-lg hover:shadow-yellow-500/10 transition-all cursor-pointer"
              onClick={() => {
                if (listing.url) {
                  console.log('[RecommendationsList] Ouverture URL:', listing.url)
                  window.open(listing.url, '_blank', 'noopener,noreferrer')
                } else {
                  console.error('[RecommendationsList] Pas d\'URL pour le listing:', listing)
                  toast.error('URL de l\'annonce non disponible')
                }
              }}
            >
              <div className="relative">
                <div className="w-full h-48 bg-gradient-to-br from-blue-900/50 to-blue-950/50 flex items-center justify-center">
                  <span className="text-gray-500 text-sm">Image non disponible</span>
                </div>
                <div className="absolute top-3 right-3 flex gap-2 items-center">
                  <Badge className={`${
                    matchScore >= 80 ? 'bg-green-600' : 
                    matchScore >= 60 ? 'bg-orange-600' : 
                    'bg-red-600'
                  } text-white font-bold px-3 py-1`}>
                    {matchScore}% match
                  </Badge>
                  <div 
                    onClick={(e) => e.stopPropagation()}
                    className="bg-white/90 backdrop-blur-sm rounded-full p-1 shadow-lg hover:shadow-xl transition-shadow"
                  >
                    <FavoriteButton listing={listing} size="sm" variant="ghost" className="p-0 h-auto" />
                  </div>
                </div>
              </div>
              
              <CardContent className="p-6 space-y-4">
                <div>
                  <h3 className="text-white font-semibold text-lg mb-2 line-clamp-2">
                    {listing.title}
                  </h3>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-2xl font-bold text-blue-400">
                      {listing.price_eur
                        ? new Intl.NumberFormat('fr-FR', {
                            style: 'currency',
                            currency: 'EUR',
                            maximumFractionDigits: 0,
                          }).format(listing.price_eur)
                        : 'Prix non disponible'}
                    </span>
                    <div className="text-sm text-gray-400 flex items-center gap-2">
                      {listing.year && <span>{listing.year}</span>}
                      {listing.mileage_km && (
                        <>
                          {listing.year && <span>•</span>}
                          <span>{listing.mileage_km.toLocaleString('fr-FR')} km</span>
                        </>
                      )}
                    </div>
                  </div>
                  
                  {listing.city && (
                    <div className="text-sm text-gray-400 mb-3">
                      📍 {listing.city}
                    </div>
                  )}
                </div>

                {/* Raison de la recommandation */}
                <div className="space-y-2">
                  <p className="text-xs text-gray-500 font-medium">Pourquoi cette suggestion ?</p>
                  <div className="flex items-start gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                    <CheckCircle className="size-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-gray-300 leading-relaxed">
                      {rec.reason}
                    </div>
                  </div>
                </div>

                <Button
                  className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-medium"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (listing.url) {
                      // Valider l'URL avant d'ouvrir
                      try {
                        new URL(listing.url)
                        console.log('[RecommendationsList] Bouton - Ouverture URL:', listing.url)
                        window.open(listing.url, '_blank', 'noopener,noreferrer')
                      } catch (urlError) {
                        console.error('[RecommendationsList] URL invalide:', listing.url)
                        toast.error('URL de l\'annonce invalide')
                      }
                    } else {
                      console.error('[RecommendationsList] Bouton - Pas d\'URL:', listing)
                      toast.error('URL de l\'annonce non disponible')
                    }
                  }}
                >
                  <ExternalLink className="size-4 mr-2" />
                  Voir l&apos;annonce
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
})

RecommendationsList.displayName = 'RecommendationsList'

