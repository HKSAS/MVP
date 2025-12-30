'use client'

import { useEffect, useState, useRef } from 'react'
import { ChevronLeft, ChevronRight, Sparkles, ExternalLink, AlertCircle, Star } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/browser'
import { useFavorites } from '@/hooks/useFavorites'
import { toast } from 'sonner'
import type { Recommendation } from '@/lib/types/favorites'
import type { ListingResponse } from '@/lib/types'

/**
 * Slider horizontal pour les recommandations
 * Scroll fluide avec boutons de navigation
 */
export function RecommendationsSlider() {
  const { isFavorite, toggleFavorite } = useFavorites()
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadRecommendations()
  }, [])

  async function loadRecommendations() {
    try {
      setLoading(true)
      setError(null)

      // Récupérer le token de session pour l'authentification
      const supabase = getSupabaseBrowserClient()
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session?.access_token) {
        console.warn('Session non disponible pour les recommandations')
        setRecommendations([])
        setLoading(false)
        return
      }

      const response = await fetch('/api/recommendations', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.details || data.error || 'Erreur chargement')
      }

      if (data.success && data.data) {
        setRecommendations(data.data || [])
      } else {
        setRecommendations([])
      }

    } catch (err) {
      console.error('[RecommendationsSlider] Error:', err)
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  function scrollLeft() {
    scrollContainerRef.current?.scrollBy({
      left: -400,
      behavior: 'smooth'
    })
  }

  function scrollRight() {
    scrollContainerRef.current?.scrollBy({
      left: 400,
      behavior: 'smooth'
    })
  }

  if (loading) {
    return (
      <div className="bg-gray-900 rounded-xl p-12 text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-yellow-500 border-t-transparent"></div>
        <p className="mt-4 text-gray-400">L&apos;IA analyse vos favoris...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-8 text-center">
        <p className="text-red-400 font-medium mb-4">Erreur lors du chargement</p>
        <p className="text-sm text-red-300/70 mb-4">{error}</p>
        <button
          onClick={loadRecommendations}
          className="px-6 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition"
        >
          Réessayer
        </button>
      </div>
    )
  }

  if (recommendations.length === 0) {
    return (
      <div className="bg-gray-900 rounded-xl p-12 text-center">
        <Sparkles className="mx-auto text-gray-600 mb-4" size={48} />
        <p className="text-gray-400 mb-2">Aucune recommandation</p>
        <p className="text-sm text-gray-500">
          Ajoutez des annonces à vos favoris pour recevoir des suggestions
        </p>
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Info banner */}
      <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-xl p-4 mb-6">
        <p className="text-sm text-gray-300">
          <Sparkles className="inline mr-2" size={16} />
          {recommendations.length} véhicules similaires à vos favoris
        </p>
      </div>

      {/* Slider avec boutons */}
      <div className="relative group">
        {/* Bouton gauche */}
        <button
          onClick={scrollLeft}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-20 bg-gray-900/95 hover:bg-gray-800 backdrop-blur-sm p-3 rounded-full shadow-2xl transition-all opacity-0 group-hover:opacity-100 -translate-x-1/2"
          aria-label="Précédent"
        >
          <ChevronLeft size={24} className="text-white" />
        </button>

        {/* Bouton droit */}
        <button
          onClick={scrollRight}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-20 bg-gray-900/95 hover:bg-gray-800 backdrop-blur-sm p-3 rounded-full shadow-2xl transition-all opacity-0 group-hover:opacity-100 translate-x-1/2"
          aria-label="Suivant"
        >
          <ChevronRight size={24} className="text-white" />
        </button>

        {/* Container scrollable */}
        <div
          ref={scrollContainerRef}
          className="overflow-x-auto overflow-y-visible pb-4 scrollbar-hide snap-x snap-mandatory"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          {/* 🎯 Container horizontal fixé */}
          <div className="flex gap-6" style={{ width: 'max-content' }}>
            {recommendations.map((rec) => {
              // Créer un objet listing pour isFavorite et toggleFavorite
              const listingForFavorite: ListingResponse = {
                id: rec.listing.listing_id,
                source: rec.listing.source,
                url: rec.listing.listing_url,
                title: rec.listing.title || '',
                price_eur: rec.listing.price ?? undefined,
                year: rec.listing.year ?? undefined,
                mileage_km: rec.listing.mileage ?? undefined,
                city: rec.listing.city ?? undefined,
                score_ia: rec.listing.score ?? undefined,
                score_final: rec.listing.score ?? undefined,
              } as ListingResponse
              
              const isFav = isFavorite(listingForFavorite)
              
              return (
                <RecommendationCard
                  key={rec.listing.id || rec.listing.listing_id}
                  recommendation={rec}
                  isFavorite={isFav}
                  onToggleFavorite={async () => {
                    await toggleFavorite(listingForFavorite)
                  }}
                />
              )
            })}
          </div>
        </div>
      </div>

      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  )
}

/**
 * Card individuelle de recommandation
 */
interface CardProps {
  recommendation: Recommendation
  isFavorite: boolean
  onToggleFavorite: () => void
}

function RecommendationCard({ recommendation, isFavorite, onToggleFavorite }: CardProps) {
  const [imageError, setImageError] = useState(false)
  const listing = recommendation.listing

  function handleClick() {
    if (!listing.listing_url) {
      toast.error('URL non disponible')
      return
    }
    window.open(listing.listing_url, '_blank', 'noopener,noreferrer')
  }

  function handleFavorite(e: React.MouseEvent) {
    e.stopPropagation()
    onToggleFavorite()
  }

  // 🎯 Définir le badge couleur selon le score
  const getBadgeColor = (score: number) => {
    if (score >= 100) return 'bg-green-500'
    if (score >= 95) return 'bg-emerald-500'
    if (score >= 85) return 'bg-yellow-500'
    return 'bg-orange-500'
  }

  // Extraire l'image depuis extracted_features ou utiliser une image par défaut
  const imageUrl = listing.extracted_features?.image_url || 
                   listing.extracted_features?.thumbnail || 
                   '/placeholder-car.jpg'

  return (
    <div
      className="flex-shrink-0 w-[380px] sm:w-[360px] lg:w-[380px] bg-gray-900 rounded-xl overflow-hidden hover:ring-2 hover:ring-yellow-500 transition cursor-pointer snap-center"
      onClick={handleClick}
    >
      {/* Image + badges */}
      <div className="relative h-[224px] bg-gray-800">
        {!imageError ? (
          <img
            src={imageUrl}
            alt={listing.title || 'Véhicule'}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-gray-600">
            <AlertCircle size={48} />
            <span className="mt-2 text-sm">Image non disponible</span>
          </div>
        )}
        
        {/* Badge score */}
        <div className={`absolute top-3 left-3 ${getBadgeColor(recommendation.matchScore)} text-white px-3 py-1 rounded-full text-sm font-bold`}>
          {recommendation.matchScore}% match
        </div>

        {/* Bouton favori */}
        <button
          onClick={handleFavorite}
          className={`absolute top-3 right-3 p-2 rounded-full backdrop-blur-sm transition ${
            isFavorite 
              ? 'bg-yellow-500 text-white' 
              : 'bg-white/90 text-gray-800 hover:bg-yellow-500 hover:text-white'
          }`}
          aria-label={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
        >
          <Star size={20} fill={isFavorite ? 'currentColor' : 'none'} />
        </button>
      </div>

      {/* Contenu */}
      <div className="p-5">
        <h3 className="font-semibold text-lg mb-3 line-clamp-2 min-h-[56px]">
          {listing.title || 'Véhicule'}
        </h3>

        <div className="flex items-baseline justify-between mb-4">
          <span className="text-3xl font-bold text-blue-400">
            {listing.price ? `${listing.price.toLocaleString('fr-FR')} €` : 'Prix sur demande'}
          </span>
          <div className="text-sm text-gray-400 text-right">
            {listing.year && (
              <div>{listing.year}</div>
            )}
            {listing.mileage && (
              <div>{listing.mileage.toLocaleString('fr-FR')} km</div>
            )}
          </div>
        </div>

        {/* Raisons du match */}
        <div className="bg-gray-800/50 rounded-lg p-3 mb-4 min-h-[90px]">
          <p className="text-xs text-gray-500 font-medium mb-2">
            Pourquoi cette suggestion ?
          </p>
          <div className="space-y-1">
            {recommendation.reason.split(' + ').slice(0, 2).map((reason, i) => (
              <div key={i} className="text-xs text-gray-300 flex items-start gap-2">
                <span className="text-yellow-500 flex-shrink-0 mt-0.5">✓</span>
                <span className="line-clamp-2">{reason}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bouton */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            handleClick()
          }}
          className="w-full px-4 py-3 bg-yellow-600 hover:bg-yellow-700 rounded-lg transition font-medium flex items-center justify-center gap-2"
        >
          <ExternalLink size={18} />
          Voir l&apos;annonce
        </button>
      </div>
    </div>
  )
}
