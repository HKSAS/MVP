'use client'

import { Button } from '@/components/ui/button'
import { Heart } from 'lucide-react'
import { useFavorites } from '@/hooks/useFavorites'
import type { ListingResponse } from '@/lib/types'

interface FavoriteButtonProps {
  listing: ListingResponse
  className?: string
  size?: 'default' | 'sm' | 'lg' | 'icon'
  variant?: 'default' | 'outline' | 'ghost'
}

/**
 * Bouton favori avec toggle
 * Utilise le hook useFavorites pour gérer l'état
 */
export function FavoriteButton({ 
  listing, 
  className = '',
  size = 'sm',
  variant = 'outline'
}: FavoriteButtonProps) {
  const { isFavorite, toggleFavorite, loading } = useFavorites()

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    
    // Empêcher les clics multiples
    if (loading) {
      return
    }
    
    try {
      console.log('[FavoriteButton] Clic sur cœur', { 
        source: listing.source, 
        listingId: listing.id 
      })
      const result = await toggleFavorite(listing)
      console.log('[FavoriteButton] Résultat toggle:', result)
    } catch (error) {
      console.error('[FavoriteButton] Erreur lors du toggle:', error)
      // L'erreur est déjà gérée dans le hook avec un toast
      // Ne pas re-throw pour éviter les erreurs non gérées
    }
  }

  const favorited = isFavorite(listing)

  return (
    <Button
      variant={variant}
      size={size}
      className={`${className} ${favorited ? 'bg-red-500/20 hover:bg-red-500/30 border-red-500/50' : ''}`}
      onClick={handleClick}
      disabled={loading}
      title={favorited ? 'Retirer des favoris' : 'Ajouter aux favoris'}
    >
      <Heart 
        className={`size-5 transition-all ${
          favorited 
            ? 'fill-red-500 text-red-500' 
            : 'text-gray-400 hover:text-red-400 hover:fill-red-400/20'
        }`}
      />
    </Button>
  )
}
