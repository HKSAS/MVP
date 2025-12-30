'use client'

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ImageWithFallback } from "@/components/figma/ImageWithFallback";
import { motion } from 'framer-motion';
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { toast } from "sonner";
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
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  Heart,
  Calendar,
  TrendingUp,
  Filter,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Eye,
  Trash2,
  Loader2,
  Clock,
  ChevronRight,
  X,
} from "lucide-react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

interface Favorite {
  id: string;
  listing_id: string;
  created_at: string;
  listing: {
    id: string;
    title: string;
    price_eur: number | null;
    mileage_km: number | null;
    year: number | null;
    source: string;
    url: string;
    imageUrl: string | null;
    image_url?: string | null; // Support both formats
    score_ia: number | null;
    score_final: number;
  };
}

// Type pour la réponse brute de l'API
interface ApiFavoriteResponse {
  success: boolean;
  data?: Favorite[];
  error?: string;
  message?: string;
}

export default function FavoritesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [clearingAll, setClearingAll] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    averagePrice: 0,
    excellentCount: 0,
  });

  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    try {
      setLoading(true);
      const supabase = getSupabaseBrowserClient();
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.access_token) {
        console.warn('Session non disponible pour charger les favoris');
        setFavorites([]);
        return;
      }
      
      const response = await fetch('/api/me/favorites?limit=100', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `Erreur ${response.status}: ${response.statusText}`;
        
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch {
          // Si ce n'est pas du JSON, utiliser le texte brut
        }
        
        console.error('[FavoritesPage] Erreur API:', {
          status: response.status,
          statusText: response.statusText,
          error: errorMessage,
        });
        
        if (response.status === 401) {
          console.warn('Non authentifié pour charger les favoris');
          toast.error('Session expirée. Veuillez vous reconnecter.');
          setFavorites([]);
          return;
        }
        
        toast.error(`Erreur: ${errorMessage}`);
        setFavorites([]);
        setStats({ total: 0, averagePrice: 0, excellentCount: 0 });
        return;
      }
      
      const data: ApiFavoriteResponse = await response.json();
      
      console.log('[FavoritesPage] Réponse API:', {
        success: data.success,
        hasData: !!data.data,
        dataLength: data.data?.length,
        firstItem: data.data?.[0],
        error: data.error,
        message: data.message,
      });
      
      if (!data.success) {
        const errorMsg = data.error || data.message || 'Erreur inconnue';
        console.error('[FavoritesPage] API retourne success=false:', errorMsg);
        toast.error(`Erreur: ${errorMsg}`);
        setFavorites([]);
        setStats({ total: 0, averagePrice: 0, excellentCount: 0 });
        return;
      }
      
      if (data.data && Array.isArray(data.data)) {
        console.log('[FavoritesPage] ✅ Données valides, traitement...', data.data.length, 'favoris');
        
        // Normaliser les données pour supporter les deux formats
        const normalizedFavorites: Favorite[] = data.data
          .map((fav: any): Favorite | null => {
            // S'assurer que listing existe
            if (!fav.listing) {
              console.warn('[FavoritesPage] Favori sans listing:', fav);
              return null;
            }
            
            const imageUrl = fav.listing.imageUrl || fav.listing.image_url || null;
            
            return {
              id: fav.id,
              listing_id: fav.listing_id || fav.listing.id,
              created_at: fav.created_at,
              listing: {
                id: fav.listing.id || '',
                title: fav.listing.title || '',
                price_eur: fav.listing.price_eur ? Number(fav.listing.price_eur) : null,
                mileage_km: fav.listing.mileage_km ? Number(fav.listing.mileage_km) : null,
                year: fav.listing.year || null,
                source: fav.listing.source || '',
                url: fav.listing.url || '',
                imageUrl: imageUrl,
                image_url: imageUrl, // Optionnel mais on le définit pour compatibilité
                score_ia: fav.listing.score_ia ? Number(fav.listing.score_ia) : null,
                score_final: fav.listing.score_final ? Number(fav.listing.score_final) : 0,
              }
            };
          })
          .filter((fav): fav is Favorite => fav !== null && fav !== undefined && fav.listing !== undefined);
        
        console.log('[FavoritesPage] Favoris normalisés:', normalizedFavorites.length);
        setFavorites(normalizedFavorites);
        
        // Calculer les statistiques
        const total = normalizedFavorites.length;
        const prices = normalizedFavorites
          .map((fav: Favorite) => fav.listing?.price_eur || 0)
          .filter((p: number) => p > 0);
        const averagePrice = prices.length > 0
          ? Math.round(prices.reduce((a: number, b: number) => a + b, 0) / prices.length)
          : 0;
        
        const excellentCount = normalizedFavorites.filter((fav: Favorite) => {
          const score = fav.listing?.score_final || fav.listing?.score_ia || 0;
          return score >= 85;
        }).length;

        setStats({ total, averagePrice, excellentCount });
        console.log('[FavoritesPage] Statistiques calculées:', { total, averagePrice, excellentCount });
      } else {
        console.warn('[FavoritesPage] Format de réponse invalide:', {
          success: data.success,
          hasData: !!data.data,
          isArray: Array.isArray(data.data),
          data: data,
        });
        setFavorites([]);
        setStats({ total: 0, averagePrice: 0, excellentCount: 0 });
      }
    } catch (error) {
      console.error('[FavoritesPage] Erreur lors du chargement des favoris:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      toast.error(`Erreur lors du chargement des favoris: ${errorMessage}`);
      setFavorites([]);
      setStats({ total: 0, averagePrice: 0, excellentCount: 0 });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFavorite = async (favorite: Favorite) => {
    try {
      setRemovingId(favorite.id);
      const supabase = getSupabaseBrowserClient();
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.access_token) {
        toast.error('Session expirée. Veuillez vous reconnecter.');
        return;
      }

      const response = await fetch('/api/favorites/toggle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          source: favorite.listing.source,
          listing_id: favorite.listing.id,
          listing_url: favorite.listing.url,
        }),
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la suppression du favori');
      }

      const data = await response.json();
      if (data.success) {
        // Retirer de la liste locale
        const remaining = favorites.filter(fav => fav.id !== favorite.id);
        setFavorites(remaining);
        toast.success('Favori retiré');
        
        // Recalculer les stats
        const total = remaining.length;
        const prices = remaining
          .map(fav => fav.listing?.price_eur || 0)
          .filter(p => p > 0);
        const averagePrice = prices.length > 0
          ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length)
          : 0;
        const excellentCount = remaining.filter(fav => {
          const score = fav.listing?.score_final || fav.listing?.score_ia || 0;
          return score >= 85;
        }).length;
        
        setStats({ total, averagePrice, excellentCount });
      }
    } catch (error) {
      console.error('Erreur lors de la suppression du favori:', error);
      toast.error('Erreur lors de la suppression du favori');
    } finally {
      setRemovingId(null);
    }
  };

  const handleClearAllFavorites = async () => {
    try {
      setClearingAll(true);
      const supabase = getSupabaseBrowserClient();
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.access_token) {
        toast.error('Session expirée. Veuillez vous reconnecter.');
        return;
      }

      // Supprimer tous les favoris un par un (ou implémenter un endpoint bulk delete)
      const deletePromises = favorites.map(fav => 
        fetch('/api/favorites/toggle', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            source: fav.listing.source,
            listing_id: fav.listing.id,
            listing_url: fav.listing.url,
          }),
        })
      );

      await Promise.all(deletePromises);

      setFavorites([]);
      setStats({ total: 0, averagePrice: 0, excellentCount: 0 });
      toast.success('Tous les favoris ont été supprimés');
    } catch (error) {
      console.error('Erreur lors de la suppression des favoris:', error);
      toast.error('Erreur lors de la suppression des favoris');
    } finally {
      setClearingAll(false);
    }
  };

  const handleViewListing = (favorite: Favorite) => {
    if (!favorite.listing.url) {
      toast.error('URL de l\'annonce non disponible');
      return;
    }

    // Normaliser l'URL
    let urlToOpen = favorite.listing.url;
    
    if (urlToOpen.startsWith('/')) {
      const domainMap: Record<string, string> = {
        'LeBonCoin': 'https://www.leboncoin.fr',
        'LaCentrale': 'https://www.lacentrale.fr',
        'ParuVendu': 'https://www.paruvendu.fr',
        'Autoscout24': 'https://www.autoscout24.fr',
        'LeParking': 'https://www.leparking.fr',
        'ProCarLease': 'https://procarlease.com',
        'TransakAuto': 'https://annonces.transakauto.com',
      };
      const baseDomain = domainMap[favorite.listing.source] || 'https://';
      urlToOpen = baseDomain + urlToOpen;
    } else if (!urlToOpen.startsWith('http://') && !urlToOpen.startsWith('https://')) {
      urlToOpen = 'https://' + urlToOpen;
    }
    
    window.open(urlToOpen, '_blank', 'noopener,noreferrer');
  };

  const getScoreBadgeColor = (score: number) => {
    if (score >= 85) return "bg-gradient-to-r from-green-500 to-green-600 border-green-400/30";
    if (score >= 70) return "bg-gradient-to-r from-orange-500 to-orange-600 border-orange-400/30";
    return "bg-gradient-to-r from-red-500 to-red-600 border-red-400/30";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 85) return "Excellent";
    if (score >= 70) return "Bon";
    if (score >= 50) return "À surveiller";
    return "Risque";
  };

  return (
    <ProtectedRoute>
      <div className="bg-[#0a0a0a] text-white min-h-screen pt-20">
        {/* Hero Section */}
        <section className="relative pt-32 pb-12 px-4">
          {/* Gradient Background Effects */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-10 left-1/4 w-[500px] h-[500px] bg-pink-600/20 rounded-full blur-[120px] animate-pulse"></div>
            <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-purple-600/10 rounded-full blur-[100px]"></div>
          </div>
          
          <div className="max-w-7xl mx-auto relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <Link href="/dashboard">
                <Button variant="ghost" className="text-gray-400 hover:text-white mb-6">
                  <ArrowLeft className="size-4 mr-2" />
                  Retour au dashboard
                </Button>
              </Link>
              <h1 className="text-5xl md:text-6xl font-medium text-white mb-4">
                Mes favoris
              </h1>
              <p className="text-xl text-gray-400">
                Retrouvez toutes vos annonces favorites
              </p>
            </motion.div>
          </div>
        </section>

        {/* Main Content */}
        <section className="py-12 px-4 relative">
          <div className="max-w-7xl mx-auto">
            {/* Stats Overview */}
            <div className="grid md:grid-cols-3 gap-6 mb-12">
              <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-400">Total favoris</span>
                    <Heart className="size-5 text-pink-400" />
                  </div>
                  <div className="text-4xl font-medium bg-gradient-to-r from-pink-400 to-pink-500 bg-clip-text text-transparent">
                    {loading ? '...' : stats.total}
                  </div>
                  <p className="text-sm text-gray-500 mt-1">Annonces sauvegardées</p>
                </CardContent>
              </Card>
              <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-400">Prix moyen</span>
                    <TrendingUp className="size-5 text-blue-400" />
                  </div>
                  <div className="text-4xl font-medium text-blue-400">
                    {loading ? '...' : stats.averagePrice.toLocaleString('fr-FR')} €
                  </div>
                  <p className="text-sm text-gray-500 mt-1">De vos favoris</p>
                </CardContent>
              </Card>
              <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-400">Excellents</span>
                    <CheckCircle className="size-5 text-green-400" />
                  </div>
                  <div className="text-4xl font-medium text-green-400">
                    {loading ? '...' : stats.excellentCount}
                  </div>
                  <p className="text-sm text-gray-500 mt-1">Score ≥ 85/100</p>
                </CardContent>
              </Card>
            </div>

            {/* Favorites List */}
            <Card className="bg-white/5 backdrop-blur-xl border-white/10">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-white text-xl">
                    <Heart className="size-5 text-pink-400" />
                    {loading ? (
                      'Chargement...'
                    ) : (
                      `${stats.total} favori${stats.total > 1 ? 's' : ''}`
                    )}
                  </CardTitle>
                  {favorites.length > 0 && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="bg-white/5 border-white/20 text-gray-400 hover:text-white hover:bg-white/10"
                          disabled={clearingAll}
                        >
                          <Trash2 className="size-4 mr-2" />
                          {clearingAll ? 'Suppression...' : 'Effacer tout'}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-[#0a0a0a] border-white/10">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="text-white">Effacer tous les favoris</AlertDialogTitle>
                          <AlertDialogDescription className="text-gray-400">
                            Êtes-vous sûr de vouloir supprimer tous vos favoris ? Cette action est irréversible.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="bg-white/5 border-white/20 text-white hover:bg-white/10">
                            Annuler
                          </AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleClearAllFavorites}
                            className="bg-red-600 hover:bg-red-700 text-white"
                            disabled={clearingAll}
                          >
                            {clearingAll ? 'Suppression...' : 'Supprimer'}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-4">
                    {[...Array(4)].map((_, i) => (
                      <Skeleton key={i} className="h-24 w-full bg-white/5" />
                    ))}
                  </div>
                ) : favorites.length === 0 ? (
                  <div className="text-center py-12">
                    <Heart className="size-16 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400 mb-4">Aucun favori pour le moment</p>
                    <Button 
                      onClick={() => router.push('/recherche')}
                      className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white"
                    >
                      Rechercher des annonces
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {favorites.map((favorite, index) => {
                      const score = favorite.listing?.score_final || favorite.listing?.score_ia || 0;
                      const isRemoving = removingId === favorite.id;
                      const favoriteDate = new Date(favorite.created_at);
                      
                      return (
                        <motion.div
                          key={favorite.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: index * 0.05 }}
                          className="flex items-center justify-between p-6 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 hover:border-white/20 transition-all group relative"
                        >
                          {/* Bouton supprimer individuel */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveFavorite(favorite);
                            }}
                            disabled={isRemoving}
                            className="absolute top-3 right-3 p-1.5 rounded-lg bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition opacity-0 group-hover:opacity-100 disabled:opacity-50"
                            aria-label="Supprimer ce favori"
                          >
                            {isRemoving ? (
                              <div className="size-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <X className="size-4" />
                            )}
                          </button>

                          <div className="flex-1 pr-12 flex gap-6">
                            {/* Image */}
                            <div className="w-32 h-32 rounded-lg overflow-hidden flex-shrink-0">
                              <ImageWithFallback
                                src={favorite.listing.imageUrl || favorite.listing.image_url || 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=400'}
                                alt={favorite.listing.title}
                                className="w-full h-full object-cover"
                              />
                            </div>

                            {/* Contenu */}
                            <div className="flex-1">
                              {/* Titre et prix */}
                              <div className="text-white text-lg font-medium mb-2">
                                {favorite.listing.title}
                              </div>
                              
                              {/* Détails */}
                              <div className="flex items-center gap-4 text-sm text-gray-400 flex-wrap mb-3">
                                {favorite.listing.price_eur && (
                                  <>
                                    <span>
                                      Prix: <span className="text-white font-medium">{favorite.listing.price_eur.toLocaleString('fr-FR')} €</span>
                                    </span>
                                    <span>•</span>
                                  </>
                                )}
                                <Badge className={`${getScoreBadgeColor(score)} text-white border shadow-lg backdrop-blur-sm`}>
                                  Score: {score}/100
                                </Badge>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <Clock className="size-4" />
                                  Ajouté le {favoriteDate.toLocaleDateString('fr-FR', {
                                    day: 'numeric',
                                    month: 'long',
                                    year: 'numeric'
                                  })}
                                </span>
                              </div>

                              {/* Source */}
                              <div className="text-xs text-gray-500">
                                Source : {favorite.listing.source}
                              </div>
                            </div>
                          </div>
                          
                          {/* Bouton voir l'annonce */}
                          <Button
                            onClick={() => handleViewListing(favorite)}
                            variant="outline"
                            size="icon"
                            className="bg-white/5 border-white/20 text-white hover:bg-gradient-to-r hover:from-blue-500 hover:to-purple-500 hover:border-none transition-all rounded-lg flex-shrink-0"
                          >
                            <ChevronRight className="size-5" />
                          </Button>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </ProtectedRoute>
  );
}
