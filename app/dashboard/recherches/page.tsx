'use client'

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from 'framer-motion';
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
  Search,
  Calendar,
  TrendingUp,
  ChevronRight,
  Clock,
  Trash2,
  X,
} from "lucide-react";
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';
import { toast } from 'sonner';

interface SearchHistoryItem {
  id: string;
  brand: string;
  model: string;
  max_price: number | null;
  total_results: number;
  created_at: string;
}

export default function MySearchesPage() {
  const router = useRouter();
  const [searches, setSearches] = useState<SearchHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [clearingAll, setClearingAll] = useState(false);

  useEffect(() => {
    loadHistory();
  }, []);

  async function loadHistory() {
    try {
      setLoading(true);

      const supabase = getSupabaseBrowserClient();
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.access_token) {
        console.warn('Session non disponible pour charger l\'historique');
        setSearches([]);
        return;
      }

      const response = await fetch('/api/me/searches', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          console.warn('Non authentifié pour charger l\'historique');
          setSearches([]);
          return;
        }
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success && data.data && Array.isArray(data.data)) {
        setSearches(data.data);
      } else {
        setSearches([]);
      }

    } catch (error) {
      console.error('[MySearchesPage] Load error:', error);
      setSearches([]);
    } finally {
      setLoading(false);
    }
  }

  async function deleteSearch(searchId: string) {
    try {
      setDeletingId(searchId);

      const supabase = getSupabaseBrowserClient();
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.access_token) {
        toast.error('Session expirée. Veuillez vous reconnecter.');
        return;
      }

      const response = await fetch(`/api/me/searches?id=${searchId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Erreur lors de la suppression');
      }

      setSearches(prev => prev.filter(s => s.id !== searchId));
      toast.success('Recherche supprimée');

    } catch (error) {
      console.error('[MySearchesPage] Delete error:', error);
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la suppression');
    } finally {
      setDeletingId(null);
    }
  }

  async function clearAllHistory() {
    try {
      setClearingAll(true);

      const supabase = getSupabaseBrowserClient();
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.access_token) {
        toast.error('Session expirée. Veuillez vous reconnecter.');
        return;
      }

      const response = await fetch('/api/me/searches', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Erreur lors de la suppression');
      }

      setSearches([]);
      toast.success('Historique supprimé');

    } catch (error) {
      console.error('[MySearchesPage] Clear all error:', error);
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la suppression');
    } finally {
      setClearingAll(false);
    }
  }

  function handleViewResults(search: SearchHistoryItem) {
    // Vérifier si on a des résultats en cache pour cette recherche
    const cacheKey = `searchResults_${search.id}`;
    const cachedResults = localStorage.getItem(cacheKey);
    
    if (cachedResults) {
      try {
        const parsedResults = JSON.parse(cachedResults);
        // Sauvegarder dans localStorage avec la clé standard pour la page de résultats
        localStorage.setItem('searchResults', JSON.stringify(parsedResults));
        localStorage.setItem('searchCriteria', JSON.stringify({
          brand: search.brand,
          model: search.model,
          max_price: search.max_price,
          resultsCount: search.total_results,
          platformsCount: 0,
        }));
        localStorage.setItem('fromHistory', 'true');
        
        // Rediriger vers la page de résultats avec les paramètres
        const params = new URLSearchParams();
        if (search.brand) params.set('brand', search.brand);
        if (search.model) params.set('model', search.model);
        if (search.max_price && search.max_price > 0) params.set('max_price', search.max_price.toString());
        params.set('fromHistory', 'true');
        
        router.push(`/resultats?${params.toString()}`);
        return;
      } catch (e) {
        console.error('[MySearchesPage] Erreur parsing cache:', e);
      }
    }
    
    // Si pas de cache, rediriger normalement (relancera le scraping)
    const params = new URLSearchParams();
    if (search.brand) params.set('brand', search.brand);
    if (search.model) params.set('model', search.model);
    if (search.max_price && search.max_price > 0) params.set('max_price', search.max_price.toString());
    
    router.push(`/resultats?${params.toString()}`);
  }

  // Calculer les statistiques
  const totalSearches = searches.length;
  const totalResults = searches.reduce((acc, search) => acc + (search.total_results || 0), 0);
  const recentSearches = searches.filter(s => {
    const searchDate = new Date(s.created_at);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return searchDate >= weekAgo;
  }).length;

  return (
    <div className="bg-[#0a0a0a] text-white min-h-screen pt-20">
      {/* Hero Section */}
      <section className="relative pt-32 pb-12 px-4">
        {/* Gradient Background Effects */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-10 left-1/4 w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px] animate-pulse"></div>
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
              Mes recherches
            </h1>
            <p className="text-xl text-gray-400">
              Retrouvez l&apos;historique complet de vos recherches IA
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
                  <span className="text-gray-400">Total recherches</span>
                  <Search className="size-5 text-blue-400" />
                </div>
                <div className="text-4xl font-medium bg-gradient-to-r from-blue-400 to-blue-500 bg-clip-text text-transparent">
                  {loading ? '...' : totalSearches}
                </div>
                <p className="text-sm text-gray-500 mt-1">Depuis le début</p>
              </CardContent>
            </Card>
            <Card className="bg-white/5 backdrop-blur-xl border-white/10">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400">Résultats trouvés</span>
                  <TrendingUp className="size-5 text-purple-400" />
                </div>
                <div className="text-4xl font-medium bg-gradient-to-r from-purple-400 to-purple-500 bg-clip-text text-transparent">
                  {loading ? '...' : totalResults.toLocaleString()}
                </div>
                <p className="text-sm text-gray-500 mt-1">Annonces analysées</p>
              </CardContent>
            </Card>
            <Card className="bg-white/5 backdrop-blur-xl border-white/10">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400">Cette semaine</span>
                  <Calendar className="size-5 text-green-400" />
                </div>
                <div className="text-4xl font-medium text-green-400">
                  {loading ? '...' : recentSearches}
                </div>
                <p className="text-sm text-gray-500 mt-1">Recherches récentes</p>
              </CardContent>
            </Card>
          </div>

          {/* Searches List */}
          <Card className="bg-white/5 backdrop-blur-xl border-white/10">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-white text-xl">
                  <Search className="size-5 text-blue-400" />
                  {loading ? (
                    'Chargement...'
                  ) : (
                    `${totalSearches} recherche${totalSearches > 1 ? 's' : ''} récente${totalSearches > 1 ? 's' : ''}`
                  )}
                </CardTitle>
                {searches.length > 0 && (
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
                        <AlertDialogTitle className="text-white">Effacer l&apos;historique</AlertDialogTitle>
                        <AlertDialogDescription className="text-gray-400">
                          Êtes-vous sûr de vouloir supprimer toutes vos recherches ? Cette action est irréversible.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="bg-white/5 border-white/20 text-white hover:bg-white/10">
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
              ) : searches.length === 0 ? (
                <div className="text-center py-12">
                  <Search className="mx-auto text-gray-600 mb-4" size={48} />
                  <p className="text-gray-400 mb-4">Aucune recherche récente</p>
                  <Button
                    onClick={() => router.push('/recherche')}
                    className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white"
                  >
                    Lancer une recherche
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {searches.map((search) => {
                    const queryText = `${search.brand} ${search.model}`.trim().toLowerCase() || 'Recherche';
                    const isDeleting = deletingId === search.id;
                    const searchDate = new Date(search.created_at);
                    
                    return (
                      <motion.div
                        key={search.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className="flex items-center justify-between p-6 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 hover:border-white/20 transition-all group relative"
                      >
                        {/* Bouton supprimer individuel */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteSearch(search.id);
                          }}
                          disabled={isDeleting}
                          className="absolute top-3 right-3 p-1.5 rounded-lg bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition opacity-0 group-hover:opacity-100 disabled:opacity-50"
                          aria-label="Supprimer cette recherche"
                        >
                          {isDeleting ? (
                            <div className="size-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <X className="size-4" />
                          )}
                        </button>

                        <div className="flex-1 pr-12">
                          {/* Nom du modèle */}
                          <div className="text-white text-lg font-medium mb-2">
                            {queryText}
                          </div>
                          
                          {/* Détails */}
                          <div className="flex items-center gap-4 text-sm text-gray-400 flex-wrap">
                            {search.max_price && search.max_price > 0 && (
                              <>
                                <span>
                                  Budget: <span className="text-white font-medium">{search.max_price.toLocaleString('fr-FR')} €</span>
                                </span>
                                <span>•</span>
                              </>
                            )}
                            <span className="flex items-center gap-1">
                              <Clock className="size-4" />
                              {searchDate.toLocaleDateString('fr-FR', {
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
                        
                        {/* Bouton voir les résultats */}
                        <Button
                          onClick={() => handleViewResults(search)}
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
  );
}
