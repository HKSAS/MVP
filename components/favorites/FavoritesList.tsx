'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ListingCard } from './ListingCard'
import { FavoriteButton } from './FavoriteButton'
import { Star, Trash2, ExternalLink, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import type { Favorite } from '@/lib/types/favorites'

interface FavoritesListProps {
  limit?: number
  showPagination?: boolean
}

/**
 * Liste des favoris de l'utilisateur
 * Avec tri, pagination et suppression
 */
export function FavoritesList({ limit = 20, showPagination = true }: FavoritesListProps) {
  const [favorites, setFavorites] = useState<Favorite[]>([])
  const [loading, setLoading] = useState(true)
  const [sort, setSort] = useState<'created_at' | 'price' | 'score'>('created_at')
  const [offset, setOffset] = useState(0)
  const [totalCount, setTotalCount] = useState(0)

  useEffect(() => {
    loadFavorites()
  }, [sort, offset])

  const loadFavorites = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/favorites?limit=${limit}&offset=${offset}&sort=${sort}`)
      
      if (!response.ok) {
        throw new Error('Erreur lors du chargement des favoris')
      }

      const data = await response.json()
      if (data.success) {
        setFavorites(data.data || [])
        setTotalCount(data.totalCount || 0)
      }
    } catch (error) {
      console.error('Erreur chargement favoris:', error)
      toast.error('Erreur lors du chargement des favoris')
    } finally {
      setLoading(false)
    }
  }

  const handleRemove = async (favorite: Favorite) => {
    try {
      // Optimistic update
      setFavorites(prev => prev.filter(f => f.id !== favorite.id))
      setTotalCount(prev => prev - 1)

      const response = await fetch('/api/favorites/toggle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          source: favorite.source,
          listing_id: favorite.listing_id,
          listing_url: favorite.listing_url,
        }),
      })

      if (!response.ok) {
        // Rollback
        loadFavorites()
        throw new Error('Erreur lors de la suppression')
      }

      toast.success('Favori retiré')
    } catch (error) {
      console.error('Erreur suppression favori:', error)
      toast.error('Erreur lors de la suppression du favori')
      loadFavorites() // Recharger en cas d'erreur
    }
  }

  if (loading && favorites.length === 0) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-48 w-full rounded-lg mb-4" />
              <Skeleton className="h-6 w-3/4 mb-2" />
              <Skeleton className="h-4 w-1/2" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (favorites.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Star className="size-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucun favori</h3>
          <p className="text-gray-600 mb-4">
            Ajoutez des annonces à vos favoris depuis les résultats de recherche
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Barre de tri */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">Trier par :</span>
          <Select value={sort} onValueChange={(v: any) => { setSort(v); setOffset(0) }}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created_at">Date d&apos;ajout</SelectItem>
              <SelectItem value="price">Prix</SelectItem>
              <SelectItem value="score">Score</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="text-sm text-gray-600">
          {totalCount} favori{totalCount > 1 ? 's' : ''}
        </div>
      </div>

      {/* Liste des favoris */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {favorites.map((favorite) => (
          <Card key={favorite.id} className="overflow-hidden hover:shadow-lg transition-shadow">
            <div className="relative">
              <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
                <span className="text-gray-400">Image non disponible</span>
              </div>
              <div className="absolute top-3 right-3">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleRemove(favorite)}
                  title="Retirer des favoris"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>

            <CardContent className="p-6 space-y-4">
              <div>
                <h3 className="text-gray-900 font-semibold mb-1">{favorite.title || 'Annonce'}</h3>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  {favorite.year && (
                    <span>{favorite.year}</span>
                  )}
                  {favorite.mileage && (
                    <span>{favorite.mileage.toLocaleString('fr-FR')} km</span>
                  )}
                  {favorite.city && (
                    <span>{favorite.city}</span>
                  )}
                </div>
              </div>

              <div className="text-gray-900 text-xl font-bold">
                {favorite.price
                  ? new Intl.NumberFormat('fr-FR', {
                      style: 'currency',
                      currency: 'EUR',
                      maximumFractionDigits: 0,
                    }).format(favorite.price)
                  : 'Prix non disponible'}
              </div>

              {favorite.score && (
                <div>
                  <span className="text-sm text-gray-600">Score Autoval IA : </span>
                  <span className="font-semibold">{favorite.score}/100</span>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button
                  className="flex-1"
                  size="sm"
                  onClick={() => window.open(favorite.listing_url, '_blank')}
                >
                  <ExternalLink className="size-4 mr-2" />
                  Voir sur le site
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pagination */}
      {showPagination && totalCount > limit && (
        <div className="flex items-center justify-center gap-4">
          <Button
            variant="outline"
            disabled={offset === 0}
            onClick={() => setOffset(prev => Math.max(0, prev - limit))}
          >
            Précédent
          </Button>
          <span className="text-sm text-gray-600">
            Page {Math.floor(offset / limit) + 1} sur {Math.ceil(totalCount / limit)}
          </span>
          <Button
            variant="outline"
            disabled={offset + limit >= totalCount}
            onClick={() => setOffset(prev => prev + limit)}
          >
            Suivant
          </Button>
        </div>
      )}
    </div>
  )
}



