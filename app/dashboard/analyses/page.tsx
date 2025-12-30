'use client'

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ImageWithFallback } from "@/components/figma/ImageWithFallback";
import { motion } from 'framer-motion';
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import {
  ArrowLeft,
  FileSearch,
  Calendar,
  TrendingUp,
  Filter,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Eye,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

interface AnalyzedAd {
  id: string;
  title: string;
  score: number;
  status: string;
  price: number;
  date: string;
  image?: string;
  url?: string;
  year?: number;
  mileage?: number;
  risk_score?: number;
  risk_level?: 'low' | 'medium' | 'high';
}

export default function AnalyzedAdsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [analyzedAds, setAnalyzedAds] = useState<AnalyzedAd[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    averageScore: 0,
    excellentCount: 0,
  });

  useEffect(() => {
    loadAnalyzedAds();
  }, []);

  const loadAnalyzedAds = async () => {
    try {
      setLoading(true);
      
      const supabase = getSupabaseBrowserClient();
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.access_token) {
        console.warn('Session non disponible pour charger les analyses');
        setAnalyzedAds([]);
        return;
      }
      
      const response = await fetch('/api/me/analyzed-listings?limit=100', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          console.warn('Non authentifié pour charger les analyses');
          setAnalyzedAds([]);
          return;
        }
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      if (data.success && data.data && Array.isArray(data.data)) {
        // Transformer les données de l'API en format AnalyzedAd
        const ads: AnalyzedAd[] = data.data.map((item: any) => {
          const score = Math.max(0, 100 - (item.risk_score || 0));
          let status = 'À surveiller';
          if (score >= 85) {
            status = 'Excellent';
          } else if (score >= 70) {
            status = 'Bon';
          } else if (score >= 50) {
            status = 'À surveiller';
          } else {
            status = 'Risque';
          }

          // Construire le titre
          const titleParts: string[] = [];
          if (item.brand || item.model) {
            titleParts.push(`${item.brand || ''} ${item.model || ''}`.trim());
          }
          if (item.year) {
            titleParts.push(`${item.year}`);
          }
          if (item.mileage_km || item.mileage) {
            titleParts.push(`${(item.mileage_km || item.mileage).toLocaleString('fr-FR')} km`);
          }
          
          const title = titleParts.length > 0 
            ? titleParts.join(' - ')
            : item.title || 'Annonce analysée';

          return {
            id: item.id,
            title,
            score,
            status,
            price: item.price_eur || item.price || 0,
            date: item.created_at || new Date().toISOString(),
            image: item.image_url || item.image,
            url: item.url || item.listing_url,
            year: item.year,
            mileage: item.mileage_km || item.mileage,
            risk_score: item.risk_score,
            risk_level: item.risk_level,
          };
        });

        // Calculer les statistiques
        const total = ads.length;
        const scores = ads.map(ad => ad.score).filter(s => s > 0);
        const averageScore = scores.length > 0
          ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
          : 0;
        const excellentCount = ads.filter(ad => ad.score >= 85).length;

        setAnalyzedAds(ads);
        setStats({ total, averageScore, excellentCount });
      } else {
        setAnalyzedAds([]);
        setStats({ total: 0, averageScore: 0, excellentCount: 0 });
      }
    } catch (error) {
      console.error('Erreur lors du chargement des analyses:', error);
      toast.error('Erreur lors du chargement des analyses');
      setAnalyzedAds([]);
      setStats({ total: 0, averageScore: 0, excellentCount: 0 });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string, score: number) => {
    if (score >= 85) {
      return (
        <Badge className="bg-green-500/20 text-green-400 border-green-500/30 flex items-center gap-1">
          <CheckCircle className="size-3" />
          Excellent
        </Badge>
      );
    } else if (score >= 70) {
      return (
        <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 flex items-center gap-1">
          <CheckCircle className="size-3" />
          Bon
        </Badge>
      );
    } else if (score >= 50) {
      return (
        <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 flex items-center gap-1">
          <AlertTriangle className="size-3" />
          À surveiller
        </Badge>
      );
    } else {
      return (
        <Badge className="bg-red-500/20 text-red-400 border-red-500/30 flex items-center gap-1">
          <XCircle className="size-3" />
          Risque
        </Badge>
      );
    }
  };

  const handleViewReport = async (ad: AnalyzedAd) => {
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.access_token) {
        toast.error('Session expirée. Veuillez vous reconnecter.');
        router.push('/login');
        return;
      }

      if (!ad.id) {
        toast.error('ID d\'analyse manquant');
        console.error('❌ [VIEW REPORT] ID manquant:', ad);
        return;
      }

      console.log('🔍 [VIEW REPORT] Chargement analyse:', {
        id: ad.id,
        title: ad.title,
        url: ad.url,
      });

      // Récupérer les résultats complets de l'analyse
      const response = await fetch(`/api/me/analyzed-listings?id=${ad.id}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      const data = await response.json();

      console.log('📋 [VIEW REPORT] Réponse API:', {
        ok: response.ok,
        status: response.status,
        success: data.success,
        hasData: !!data.data,
        hasAnalysisResult: !!data.data?.analysis_result,
        error: data.error,
      });

      if (!response.ok) {
        if (response.status === 401) {
          toast.error('Session expirée. Veuillez vous reconnecter.');
          router.push('/login');
          return;
        }
        if (response.status === 404) {
          toast.error('Cette analyse n\'existe pas ou a été supprimée');
          // Recharger la liste des analyses
          loadAnalyses();
          return;
        }
        toast.error(data.error || 'Erreur lors de la récupération de l\'analyse');
        console.error('❌ [VIEW REPORT] Erreur API:', {
          status: response.status,
          error: data.error,
        });
        return;
      }

      if (data.success && data.data) {
        // Si on a des résultats complets, les utiliser
        if (data.data.analysis_result) {
          console.log('✅ [VIEW REPORT] Analyse trouvée avec résultats complets');
          localStorage.setItem('analysisResult', JSON.stringify(data.data.analysis_result));
          localStorage.setItem('analysisId', ad.id);
          localStorage.setItem('analysisUrl', ad.url || data.data.url || '');
          router.push('/analyser?fromHistory=true');
          return;
        } else if (ad.url) {
          // Si pas de résultats complets mais qu'on a l'URL, ouvrir l'URL
          console.log('⚠️ [VIEW REPORT] Pas de résultats complets, ouverture de l\'URL');
          window.open(ad.url, '_blank', 'noopener,noreferrer');
          return;
        }
      }

      // Si pas de résultats complets, rediriger vers la page d'analyse normale
      console.warn('⚠️ [VIEW REPORT] Aucune donnée disponible, fallback');
      if (ad.url) {
        window.open(ad.url, '_blank', 'noopener,noreferrer');
      } else {
        toast.info('Redirection vers la page d\'analyse');
        router.push('/analyser');
      }
    } catch (error: any) {
      console.error('❌ [VIEW REPORT] Erreur lors du chargement du rapport:', error);
      toast.error(error.message || 'Erreur lors du chargement du rapport');
      // Fallback : rediriger vers la page d'analyse normale
      router.push('/analyser');
    }
  };

  return (
    <div className="bg-[#0a0a0a] text-white min-h-screen pt-20">
      {/* Hero Section */}
      <section className="relative pt-32 pb-12 px-4">
        {/* Gradient Background Effects */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-10 left-1/4 w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[120px] animate-pulse"></div>
          <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-blue-600/10 rounded-full blur-[100px]"></div>
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
              Annonces analysées
            </h1>
            <p className="text-xl text-gray-400">
              Consultez tous les rapports d&apos;analyse de vos annonces
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
                  <span className="text-gray-400">Total analyses</span>
                  <FileSearch className="size-5 text-purple-400" />
                </div>
                <div className="text-4xl font-medium bg-gradient-to-r from-purple-400 to-purple-500 bg-clip-text text-transparent">
                  {loading ? <Loader2 className="size-8 animate-spin text-purple-400" /> : stats.total}
                </div>
                <p className="text-sm text-gray-500 mt-1">Annonces vérifiées</p>
              </CardContent>
            </Card>
            <Card className="bg-white/5 backdrop-blur-xl border-white/10">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400">Score moyen</span>
                  <TrendingUp className="size-5 text-blue-400" />
                </div>
                <div className="text-4xl font-medium text-blue-400">
                  {loading ? <Loader2 className="size-8 animate-spin text-blue-400" /> : stats.averageScore}
                </div>
                <p className="text-sm text-gray-500 mt-1">Sur 100 points</p>
              </CardContent>
            </Card>
            <Card className="bg-white/5 backdrop-blur-xl border-white/10">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400">Excellentes</span>
                  <CheckCircle className="size-5 text-green-400" />
                </div>
                <div className="text-4xl font-medium text-green-400">
                  {loading ? <Loader2 className="size-8 animate-spin text-green-400" /> : stats.excellentCount}
                </div>
                <p className="text-sm text-gray-500 mt-1">Score ≥ 85/100</p>
              </CardContent>
            </Card>
          </div>

          {/* Analyzed Ads List */}
          <Card className="bg-white/5 backdrop-blur-xl border-white/10">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-white">
                  <FileSearch className="size-5 text-purple-400" />
                  Historique des analyses
                </CardTitle>
                <Button variant="outline" size="sm" className="bg-white/5 border-white/20 text-white hover:bg-white/10">
                  <Filter className="size-4 mr-2" />
                  Filtrer
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex gap-4 p-6 bg-white/5 border border-white/10 rounded-lg animate-pulse">
                      <div className="w-32 h-32 bg-white/10 rounded-lg"></div>
                      <div className="flex-1 space-y-3">
                        <div className="h-6 bg-white/10 rounded w-2/3"></div>
                        <div className="h-4 bg-white/10 rounded w-1/2"></div>
                        <div className="h-4 bg-white/10 rounded w-1/3"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : analyzedAds.length === 0 ? (
                <div className="text-center py-12">
                  <FileSearch className="size-16 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400 mb-4">Aucune analyse disponible</p>
                  <Button 
                    onClick={() => router.push('/analyser')}
                    className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white"
                  >
                    Analyser une annonce
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {analyzedAds.map((ad, index) => (
                    <motion.div
                      key={ad.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      className="flex gap-4 p-6 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 hover:border-white/20 transition-all group"
                    >
                      <div className="w-32 h-32 rounded-lg overflow-hidden flex-shrink-0">
                        <ImageWithFallback
                          src={ad.image || 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=400'}
                          alt={ad.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="text-white text-lg mb-1">{ad.title}</div>
                            <div className="text-2xl font-medium bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                              {ad.price.toLocaleString('fr-FR')} €
                            </div>
                          </div>
                          {getStatusBadge(ad.status, ad.score)}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-400 mb-4">
                          <span className="flex items-center gap-1">
                            Score de confiance: <span className="text-white font-medium">{ad.score}/100</span>
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Calendar className="size-4" />
                            {new Date(ad.date).toLocaleDateString('fr-FR')}
                          </span>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="bg-white/5 border-white/20 text-white hover:bg-white/10 group-hover:bg-gradient-to-r group-hover:from-purple-500 group-hover:to-blue-500 group-hover:border-none transition-all"
                          onClick={() => handleViewReport(ad)}
                        >
                          <Eye className="size-4 mr-2" />
                          Voir le rapport complet
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
