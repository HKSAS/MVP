'use client'

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Calendar,
  Gauge,
  ExternalLink,
  Eye,
  Loader2,
  AlertCircle,
  Filter,
} from "lucide-react";
import { ImageWithFallback } from "@/components/figma/ImageWithFallback";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { toast } from "sonner";
import { motion } from 'framer-motion';

const FALLBACK_IMAGE = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%231f2937" width="400" height="300"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" fill="%236b7280" font-family="Arial" font-size="18"%3EImage non disponible%3C/text%3E%3C/svg%3E'

interface SearchResult {
  id: string;
  title: string;
  price: number | null;
  year: number | null;
  mileage: number | null;
  source: string;
  score: number;
  url: string;
  image_url: string | null;
  created_at: string;
}

interface SearchDetails {
  id: string;
  created_at: string;
  last_run_at: string;
  results_count: number;
  status: string;
  criteria: {
    brand: string;
    model: string;
    max_price?: number;
    fuel_type?: string;
    year_min?: number;
    year_max?: number;
    mileage_max?: number;
    transmission?: string;
    location?: string;
    radius_km?: number;
    platforms?: string[];
  };
  platforms: string[];
  results: SearchResult[];
}

export default function SearchDetailPage() {
  const router = useRouter();
  const params = useParams();
  const searchId = params.id as string;
  
  const [loading, setLoading] = useState(true);
  const [searchDetails, setSearchDetails] = useState<SearchDetails | null>(null);
  const [sortBy, setSortBy] = useState('score');

  useEffect(() => {
    if (searchId) {
      loadSearchDetails();
    }
  }, [searchId]);

  const loadSearchDetails = async () => {
    try {
      setLoading(true);
      
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Session expirée. Veuillez vous reconnecter.');
        router.push('/login');
        return;
      }

      if (!searchId) {
        toast.error('ID de recherche manquant');
        router.push('/dashboard/recherches');
        return;
      }

      console.log('🔍 [SEARCH DETAIL] Chargement recherche:', searchId);

      const response = await fetch(`/api/search/${searchId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      const data = await response.json();

      console.log('📋 [SEARCH DETAIL] Réponse API:', {
        ok: response.ok,
        status: response.status,
        success: data.success,
        hasData: !!data.data,
        error: data.error,
      });

      if (!response.ok) {
        if (response.status === 401) {
          toast.error('Session expirée. Veuillez vous reconnecter.');
          router.push('/login');
          return;
        }
        if (response.status === 404) {
          toast.error('Cette recherche n\'existe pas ou a été supprimée');
          // Ne pas définir searchDetails à null ici, laisser l'UI gérer
          setSearchDetails(null);
          return;
        }
        throw new Error(data.error || 'Erreur lors du chargement de la recherche');
      }

      if (data.success && data.data) {
        console.log('✅ [SEARCH DETAIL] Recherche chargée avec succès:', {
          id: data.data.id,
          resultsCount: data.data.results_count,
          resultsLength: data.data.results?.length || 0,
        });
        setSearchDetails(data.data);
      } else {
        console.error('❌ [SEARCH DETAIL] Réponse API invalide:', data);
        toast.error(data.error || 'Erreur lors du chargement de la recherche');
        setSearchDetails(null);
      }
    } catch (error: any) {
      console.error('❌ [SEARCH DETAIL] Erreur chargement recherche:', error);
      toast.error(error.message || 'Erreur lors du chargement de la recherche');
      setSearchDetails(null);
    } finally {
      setLoading(false);
    }
  };

  const sortedResults = searchDetails?.results ? [...searchDetails.results].sort((a, b) => {
    switch (sortBy) {
      case 'score':
        return b.score - a.score;
      case 'price-asc':
        return (a.price || 0) - (b.price || 0);
      case 'price-desc':
        return (b.price || 0) - (a.price || 0);
      case 'mileage':
        return (a.mileage || 0) - (b.mileage || 0);
      case 'year':
        return (b.year || 0) - (a.year || 0);
      default:
        return 0;
    }
  }) : [];

  const getScoreBadgeColor = (score: number) => {
    if (score >= 80) return "bg-gradient-to-r from-green-500 to-green-600 border-green-400/30";
    if (score >= 60) return "bg-gradient-to-r from-orange-500 to-orange-600 border-orange-400/30";
    return "bg-gradient-to-r from-red-500 to-red-600 border-red-400/30";
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="bg-[#0a0a0a] text-white min-h-screen pt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Skeleton className="h-10 w-64 mb-8 bg-white/10" />
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="bg-white/5 backdrop-blur-xl border-white/10">
                <CardContent className="p-6 space-y-4">
                  <Skeleton className="h-48 w-full rounded-lg bg-white/10" />
                  <Skeleton className="h-6 w-3/4 bg-white/10" />
                  <Skeleton className="h-4 w-1/2 bg-white/10" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!searchDetails) {
    return (
      <div className="bg-[#0a0a0a] text-white min-h-screen pt-20 flex items-center justify-center">
        <div className="max-w-md mx-auto px-4 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-500/20 border border-red-500/30 rounded-full mb-6">
            <AlertCircle className="size-8 text-red-400" />
          </div>
          <h1 className="text-white mb-4">Recherche non trouvée</h1>
          <p className="text-gray-400 mb-8">
            Cette recherche n&apos;existe pas ou vous n&apos;avez pas les droits pour y accéder.
          </p>
          <Button asChild className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white">
            <Link href="/dashboard/recherches">
              <ArrowLeft className="size-4 mr-2" />
              Retour aux recherches
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#0a0a0a] text-white min-h-screen pt-20">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/3 w-[400px] h-[400px] bg-purple-600/10 rounded-full blur-[100px]"></div>
      </div>
      
      {/* Header */}
      <section className="relative bg-gradient-to-br from-blue-600 to-purple-700 text-white py-12">
        <motion.div 
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex items-center justify-between">
            <div>
              <Button
                variant="ghost"
                size="sm"
                className="mb-4 text-white hover:bg-white/10"
                asChild
              >
                <Link href="/dashboard/recherches">
                  <ArrowLeft className="size-4 mr-2" />
                  Retour
                </Link>
              </Button>
              <h1 className="text-white mb-2">
                {searchDetails.criteria.brand} {searchDetails.criteria.model}
              </h1>
              <p className="text-blue-100">
                Recherche du {formatDate(searchDetails.created_at)} • {searchDetails.results_count} résultat{searchDetails.results_count > 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Main Content */}
      <section className="relative py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Barre de tri */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-lg p-4 mb-8">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="size-4 text-gray-400" />
                <span className="text-sm text-white">Trier par :</span>
              </div>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="score">Score IA</SelectItem>
                  <SelectItem value="price-asc">Prix croissant</SelectItem>
                  <SelectItem value="price-desc">Prix décroissant</SelectItem>
                  <SelectItem value="mileage">Kilométrage</SelectItem>
                  <SelectItem value="year">Année</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Liste des résultats */}
          {sortedResults.length === 0 ? (
            <Card className="bg-white/5 backdrop-blur-xl border-white/10">
              <CardContent className="p-12 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 border border-white/20 rounded-full mb-6">
                  <AlertCircle className="size-8 text-gray-400" />
                </div>
                <h2 className="text-white mb-2">Aucun résultat</h2>
                <p className="text-gray-400">
                  Cette recherche n&apos;a pas de résultats sauvegardés.
                </p>
              </CardContent>
            </Card>
          ) : (
            <motion.div 
              className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6 }}
            >
              {sortedResults.map((result, index) => {
                const score = result.score || 0;
                return (
                  <motion.div
                    key={result.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                  >
                    <Card className="bg-white/5 backdrop-blur-xl border-white/10 overflow-hidden hover:bg-white/10 hover:border-white/20 transition-all">
                    <div className="relative">
                      <ImageWithFallback
                        src={result.image_url || FALLBACK_IMAGE}
                        alt={result.title}
                        className="w-full h-48 object-cover"
                      />
                        <div className="absolute top-3 right-3 flex gap-2 items-center">
                          <Badge className={`${getScoreBadgeColor(score)} text-white border shadow-lg backdrop-blur-sm`}>
                          Score IA : {score}/100
                        </Badge>
                      </div>
                    </div>

                    <CardContent className="p-6 space-y-4">
                      {/* Titre */}
                      <div>
                          <h3 className="text-white mb-1">{result.title}</h3>
                        {result.year && (
                            <div className="flex items-center gap-2 text-sm text-gray-400">
                            <Calendar className="size-4" />
                            <span>{result.year}</span>
                          </div>
                        )}
                      </div>

                      {/* Prix */}
                        <div className="text-white text-lg font-semibold">
                        {result.price
                          ? new Intl.NumberFormat("fr-FR", {
                              style: "currency",
                              currency: "EUR",
                              maximumFractionDigits: 0,
                            }).format(result.price)
                          : "Prix non disponible"}
                      </div>

                      {/* Détails */}
                      <div className="space-y-2 text-sm">
                        {result.mileage && (
                            <div className="flex items-center gap-2 text-gray-400">
                            <Gauge className="size-4" />
                            <span>
                              {new Intl.NumberFormat("fr-FR").format(result.mileage)} km
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Source */}
                        <div className="pt-2 border-t border-white/10">
                          <span className="text-xs text-gray-400">Source : {result.source}</span>
                      </div>

                      {/* Boutons */}
                      <div className="flex gap-2 pt-2">
                        <Button
                            className="flex-1 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white shadow-lg shadow-purple-500/25"
                          size="sm"
                          onClick={() => {
                            // Tracking du clic sortant
                            if (typeof window !== 'undefined' && (window as any).gtag) {
                                (window as any).gtag('event', 'click_outbound', {
                                event_category: 'listing',
                                event_label: result.source,
                                value: result.price || 0,
                              });
                            }
                            // Ouvrir directement le site marchand
                              window.open(result.url, '_blank', 'noopener,noreferrer');
                          }}
                        >
                          <Eye className="size-4 mr-2" />
                          Voir les détails
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                            className="border-white/20 text-white hover:bg-white/10"
                          onClick={() => {
                            navigator.clipboard.writeText(result.url).then(() => {
                              toast.success('Lien copié dans le presse-papier');
                            }).catch(() => {
                              const textArea = document.createElement('textarea');
                              textArea.value = result.url;
                              document.body.appendChild(textArea);
                              textArea.select();
                              document.execCommand('copy');
                              document.body.removeChild(textArea);
                              toast.success('Lien copié');
                            });
                          }}
                          title="Copier le lien"
                        >
                          <ExternalLink className="size-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </div>
      </section>
    </div>
  );
}

