'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ImageWithFallback } from '@/components/figma/ImageWithFallback'
import { FavoriteButton } from './FavoriteButton'
import { Calendar, Gauge, MapPin, ExternalLink } from 'lucide-react'
import type { ListingResponse } from '@/lib/types'

interface ListingCardProps {
  listing: ListingResponse
  showFavorite?: boolean
  onClick?: () => void
  className?: string
}

/**
 * Carte d'affichage d'une annonce
 * Réutilisable dans les résultats de recherche, favoris, recommandations
 */
export function ListingCard({ 
  listing, 
  showFavorite = true,
  onClick,
  className = ''
}: ListingCardProps) {
  const score = listing.score_final ?? listing.score_ia ?? 0

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'bg-green-600'
    if (score >= 60) return 'bg-orange-600'
    return 'bg-red-600'
  }

  const handleCardClick = () => {
    if (onClick) {
      onClick()
    } else {
      // Ouvrir l'URL par défaut
      if (listing.url) {
        window.open(listing.url, '_blank', 'noopener,noreferrer')
      }
    }
  }

  return (
    <Card 
      className={`overflow-hidden hover:shadow-xl transition-shadow cursor-pointer ${className}`}
      onClick={handleCardClick}
    >
      <div className="relative">
        <ImageWithFallback
          src={listing.imageUrl || '/image.png'}
          alt={listing.title}
          className="w-full h-48 object-cover"
        />
        <div className="absolute top-3 right-3 flex gap-2">
          <Badge className={`${getScoreColor(score)} text-white`}>
            Score: {score}/100
          </Badge>
          {showFavorite && (
            <div onClick={(e) => e.stopPropagation()}>
              <FavoriteButton listing={listing} variant="outline" />
            </div>
          )}
        </div>
      </div>

      <CardContent className="p-6 space-y-4">
        {/* Titre */}
        <div>
          <h3 className="text-gray-900 font-semibold mb-1 line-clamp-2">{listing.title}</h3>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            {listing.year && (
              <div className="flex items-center gap-1">
                <Calendar className="size-4" />
                <span>{listing.year}</span>
              </div>
            )}
            {listing.mileage_km && (
              <div className="flex items-center gap-1">
                <Gauge className="size-4" />
                <span>{listing.mileage_km.toLocaleString('fr-FR')} km</span>
              </div>
            )}
            {listing.city && (
              <div className="flex items-center gap-1">
                <MapPin className="size-4" />
                <span>{listing.city}</span>
              </div>
            )}
          </div>
        </div>

        {/* Prix */}
        <div className="text-gray-900 text-xl font-bold">
          {listing.price_eur
            ? new Intl.NumberFormat('fr-FR', {
                style: 'currency',
                currency: 'EUR',
                maximumFractionDigits: 0,
              }).format(listing.price_eur)
            : 'Prix non disponible'}
        </div>

        {/* Source */}
        <div className="pt-2 border-t border-gray-100">
          <span className="text-xs text-gray-500">Source : {listing.source}</span>
        </div>

        {/* Boutons */}
        <div className="flex gap-2 pt-2" onClick={(e) => e.stopPropagation()}>
          <Button
            className="flex-1 bg-blue-600 hover:bg-blue-700"
            size="sm"
            onClick={() => {
              if (listing.url) {
                window.open(listing.url, '_blank', 'noopener,noreferrer')
              }
            }}
          >
            <ExternalLink className="size-4 mr-2" />
            Voir l&apos;annonce
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}



