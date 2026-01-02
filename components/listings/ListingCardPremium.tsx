'use client'

import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Card } from '@/components/ui/card'
import { 
  TrendingDown, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2,
  Star,
  Zap,
  Heart,
  ExternalLink
} from 'lucide-react'
import type { ListingResponse } from '@/lib/types'
import type { PremiumScore } from '@/lib/scoring/premium-scorer'
import { Badge as BadgeType } from '@/lib/scoring/premium-scorer'
import { FavoriteButton } from '@/components/favorites/FavoriteButton'
import { ImageWithFallback } from '@/components/figma/ImageWithFallback'

interface Props {
  listing: ListingResponse & { premiumScore?: PremiumScore }
  onCompare?: (listing: ListingResponse) => void
  showComparison?: boolean
}

const FALLBACK_IMAGE = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%231f2937" width="400" height="300"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" fill="%236b7280" font-family="Arial" font-size="18"%3EImage non disponible%3C/text%3E%3C/svg%3E'

export function ListingCardPremium({ listing, onCompare, showComparison }: Props) {
  const { premiumScore } = listing
  const hasPremiumScore = !!premiumScore
  
  // Utiliser le score premium si disponible, sinon fallback sur score_final/score_ia
  const overallScore = premiumScore?.overall ?? listing.score_final ?? listing.score_ia ?? 50
  const dealType = premiumScore?.dealType
  
  return (
    <Card className="p-4 hover:shadow-lg transition-all duration-300 overflow-hidden border border-gray-100">
      {/* Badges Deal Type */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex gap-2 flex-wrap">
          {dealType === 'EXCELLENT' && (
            <Badge className="bg-gradient-to-r from-green-600 to-emerald-600 text-white">
              <Zap className="w-3 h-3 mr-1" />
              Affaire Exceptionnelle
            </Badge>
          )}
          {dealType === 'GOOD' && (
            <Badge className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white">
              <TrendingDown className="w-3 h-3 mr-1" />
              Bon Prix
            </Badge>
          )}
          {dealType === 'OVERPRICED' && (
            <Badge variant="destructive">
              <TrendingUp className="w-3 h-3 mr-1" />
              Prix Élevé
            </Badge>
          )}
          
          {/* Badges supplémentaires */}
          {premiumScore?.badges.map(badge => (
            <BadgeComponent key={badge} badge={badge} />
          ))}
        </div>
        
        {/* Score Global */}
        <div className="flex items-center gap-2 bg-gradient-to-br from-purple-500 to-blue-600 text-white px-3 py-1.5 rounded-full font-bold text-sm shadow-lg">
          <Star className="w-4 h-4 fill-white" />
          {overallScore}/100
        </div>
      </div>
      
      {/* Image et infos principales */}
      <div className="flex gap-4 mb-3">
        <div className="w-32 h-24 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0">
          <ImageWithFallback
            src={listing.imageUrl || FALLBACK_IMAGE}
            alt={listing.title}
            className="w-full h-full object-cover"
          />
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-lg mb-1 line-clamp-2">{listing.title}</h3>
          <div className="flex gap-4 text-sm text-gray-600 mb-2">
            {listing.year && <span>{listing.year}</span>}
            {listing.mileage_km && (
              <>
                <span>•</span>
                <span>{listing.mileage_km.toLocaleString()} km</span>
              </>
            )}
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold text-blue-600">
              {listing.price_eur?.toLocaleString()} €
            </span>
            {premiumScore && premiumScore.priceVsMarket < 0 && (
              <span className="ml-2 text-sm text-green-600 font-medium">
                {Math.abs(Math.round(premiumScore.priceVsMarket))}% sous le marché
              </span>
            )}
          </div>
        </div>
      </div>
      
      {/* Scores détaillés (si premium score disponible) */}
      {hasPremiumScore && (
        <div className="grid grid-cols-2 gap-3 mb-3">
          <ScoreBar label="Prix" score={premiumScore.priceScore} />
          <ScoreBar label="Kilométrage" score={premiumScore.kmScore} />
          <ScoreBar label="Âge" score={premiumScore.ageScore} />
          <ScoreBar label="Qualité" score={premiumScore.qualityScore} />
        </div>
      )}
      
      {/* Insights */}
      {premiumScore && premiumScore.insights.length > 0 && (
        <div className="mb-3 space-y-1.5">
          {premiumScore.insights.slice(0, 2).map((insight, i) => (
            <div key={i} className="flex items-start gap-2 text-sm text-green-700">
              <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{insight}</span>
            </div>
          ))}
        </div>
      )}
      
      {/* Warnings */}
      {premiumScore && premiumScore.warnings.length > 0 && (
        <div className="mb-3 space-y-1.5">
          {premiumScore.warnings.slice(0, 2).map((warning, i) => (
            <div key={i} className="flex items-start gap-2 text-sm text-orange-600">
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{warning}</span>
            </div>
          ))}
        </div>
      )}
      
      {/* Marge de négociation */}
      {premiumScore && premiumScore.negotiationMargin > 0 && (
        <div className="bg-blue-50 p-3 rounded mb-3">
          <div className="text-sm font-medium text-blue-900 mb-1">
            Marge de négociation estimée
          </div>
          <div className="text-lg font-bold text-blue-600">
            - {premiumScore.negotiationMargin.toLocaleString()} €
          </div>
          <div className="text-xs text-blue-700">
            Prix cible : {(listing.price_eur || 0) - premiumScore.negotiationMargin} €
          </div>
        </div>
      )}
      
      {/* Actions */}
      <div className="flex gap-2">
        <a
          href={listing.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white shadow-lg shadow-purple-500/25 py-2 rounded transition-colors text-center text-sm font-medium flex items-center justify-center gap-2"
        >
          Voir l'annonce
          <ExternalLink className="w-4 h-4" />
        </a>
        <FavoriteButton listing={listing} />
        {showComparison && onCompare && (
          <button 
            onClick={() => onCompare(listing)}
            className="px-4 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
            title="Ajouter à la comparaison"
          >
            ⚡
          </button>
        )}
      </div>
      
      {/* Source */}
      <div className="mt-3 pt-3 border-t border-gray-100">
        <span className="text-xs text-gray-500">
          Source: {listing.source}
        </span>
      </div>
    </Card>
  )
}

function ScoreBar({ label, score }: { label: string; score: number }) {
  const getColor = (score: number) => {
    if (score >= 80) return 'bg-green-600'
    if (score >= 60) return 'bg-blue-600'
    if (score >= 40) return 'bg-orange-600'
    return 'bg-red-600'
  }
  
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-600">{label}</span>
        <span className="font-medium">{score}/100</span>
      </div>
      <Progress value={score} className={`h-2 ${getColor(score)}`} />
    </div>
  )
}

function BadgeComponent({ badge }: { badge: BadgeType }) {
  const config = {
    [BadgeType.EXCELLENT_DEAL]: {
      label: '🔥 Excellente affaire',
      className: 'bg-gradient-to-r from-orange-500 to-red-500 text-white'
    },
    [BadgeType.GOOD_DEAL]: {
      label: '✨ Bonne affaire',
      className: 'bg-gradient-to-r from-green-500 to-emerald-600 text-white'
    },
    [BadgeType.LOW_MILEAGE]: {
      label: '🚗 Faible km',
      className: 'bg-blue-500 text-white'
    },
    [BadgeType.RECENT]: {
      label: '🆕 Récent',
      className: 'bg-purple-500 text-white'
    },
    [BadgeType.VERIFIED_SELLER]: {
      label: '✓ Vendeur vérifié',
      className: 'bg-indigo-500 text-white'
    },
    [BadgeType.PRICE_DROP]: {
      label: '💰 Prix baissé',
      className: 'bg-yellow-500 text-white'
    },
    [BadgeType.NEGOTIABLE]: {
      label: '💬 Négociable',
      className: 'bg-teal-500 text-white'
    },
    [BadgeType.HIGH_DEMAND]: {
      label: '⚡ Forte demande',
      className: 'bg-pink-500 text-white'
    }
  }
  
  const badgeConfig = config[badge]
  if (!badgeConfig) return null
  
  return (
    <Badge className={`text-xs ${badgeConfig.className}`}>
      {badgeConfig.label}
    </Badge>
  )
}

