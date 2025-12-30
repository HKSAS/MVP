'use client'

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from 'framer-motion';
import { ImageWithFallback } from "@/components/figma/ImageWithFallback";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import {
  LayoutDashboard,
  Search,
  FileSearch,
  User,
  LogOut,
  Clock,
  TrendingUp,
  CheckCircle,
  AlertTriangle,
  Star,
  MessageCircle,
  Calendar,
  Heart,
} from "lucide-react";
import { RecommendationsList } from "@/components/favorites/RecommendationsList";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Menu } from "lucide-react";

interface UserSearch {
  id: string;
  brand: string;
  model: string;
  max_price: number;
  total_results: number;
  created_at: string;
}

interface AnalyzedAd {
  id: string;
  title: string;
  score: number;
  status: string;
  price: number;
  date: string;
  image?: string;
}


export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [recentSearches, setRecentSearches] = useState<UserSearch[]>([]);
  const [searchesLoading, setSearchesLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [analysesStats, setAnalysesStats] = useState<{
    count: number;
    averageScore: number;
  }>({ count: 0, averageScore: 0 });
  const [analysesStatsLoading, setAnalysesStatsLoading] = useState(true);
  const [analyzedAds, setAnalyzedAds] = useState<AnalyzedAd[]>([]);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    let mounted = true;
    
    const checkUser = async () => {
      try {
        // Vérifier la session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (!mounted) return;
        
        // Si on a une session, continuer
        if (session?.user) {
          setUser(session.user);
          setIsAuthenticated(true);
          setLoading(false);
          
          // Charger les données
          loadRecentSearches();
          loadAnalysesStats();
          loadAnalyzedAds();
          return;
        }
        
        // Pas de session, essayer getUser
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (!mounted) return;
        
        if (user && !userError) {
          setUser(user);
          setIsAuthenticated(true);
          setLoading(false);
          
          // Charger les données
          loadRecentSearches();
          loadAnalysesStats();
          loadAnalyzedAds();
          return;
        }
        
        // Aucune session trouvée
        console.log('Aucune session, redirection vers /login');
        setIsAuthenticated(false);
        setLoading(false);
        router.replace('/login');
      } catch (error) {
        console.error('Erreur lors de la vérification de la session:', error);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    // Vérifier immédiatement
    checkUser();
    
    // Écouter les changements d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      
      if (event === 'SIGNED_OUT' || !session) {
        setIsAuthenticated(false);
        router.replace('/login');
      } else if (session?.user) {
        setUser(session.user);
        setIsAuthenticated(true);
        setLoading(false);
        loadRecentSearches();
        loadAnalysesStats();
        loadAnalyzedAds();
      }
    });
    
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [router]);

  const loadRecentSearches = async () => {
    try {
      setSearchesLoading(true);
      
      const supabase = getSupabaseBrowserClient();
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.access_token) {
        console.warn('Session non disponible pour charger les recherches');
        setRecentSearches([]);
        return;
      }
      
      const response = await fetch('/api/me/searches?limit=10', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          console.warn('Non authentifié pour charger les recherches');
          setRecentSearches([]);
          return;
        }
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      if (data.success && data.data) {
        console.log('✅ Recherches chargées:', data.data.length);
        setRecentSearches(data.data);
      } else {
        setRecentSearches([]);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des recherches:', error);
      setRecentSearches([]);
    } finally {
      setSearchesLoading(false);
    }
  };

  const loadAnalysesStats = async () => {
    try {
      setAnalysesStatsLoading(true);
      
      const supabase = getSupabaseBrowserClient();
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.access_token) {
        setAnalysesStats({ count: 0, averageScore: 0 });
        return;
      }
      
      const response = await fetch('/api/me/analyzed-listings?limit=100', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          setAnalysesStats({ count: 0, averageScore: 0 });
          return;
        }
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      if (data.success && data.data && Array.isArray(data.data)) {
        const count = data.data.length;
        const scores = data.data
          .map((a: any) => 100 - (a.risk_score || 0))
          .filter((s: number) => s > 0);
        const averageScore = scores.length > 0
          ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length)
          : 0;
        
        setAnalysesStats({ count, averageScore });
      } else {
        setAnalysesStats({ count: 0, averageScore: 0 });
      }
    } catch (error) {
      console.error('Erreur lors du chargement des statistiques d\'analyses:', error);
      setAnalysesStats({ count: 0, averageScore: 0 });
    } finally {
      setAnalysesStatsLoading(false);
    }
  };

  const loadAnalyzedAds = async () => {
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.access_token) {
        setAnalyzedAds([]);
        return;
      }
      
      const response = await fetch('/api/me/analyzed-listings?limit=3', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });
      
      if (!response.ok) {
        setAnalyzedAds([]);
        return;
      }
      
      const data = await response.json();
      if (data.success && data.data && Array.isArray(data.data)) {
        const ads: AnalyzedAd[] = data.data.slice(0, 3).map((item: any) => ({
          id: item.id,
          title: item.title || `${item.brand || ''} ${item.model || ''} ${item.year || ''}`.trim() || 'Annonce analysée',
          score: Math.max(0, 100 - (item.risk_score || 0)),
          status: (100 - (item.risk_score || 0)) >= 85 ? 'OK' : (100 - (item.risk_score || 0)) >= 70 ? 'OK' : 'À surveiller',
          price: item.price_eur || item.price || 0,
          date: item.created_at || new Date().toISOString(),
          image: item.image_url || item.image,
        }));
        setAnalyzedAds(ads);
      } else {
        setAnalyzedAds([]);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des annonces analysées:', error);
      setAnalyzedAds([]);
    }
  };

  const handleReviewResults = (search: UserSearch) => {
    router.push(`/dashboard/recherches/${search.id}`);
  };

  const handleLogout = async () => {
    try {
      const supabase = getSupabaseBrowserClient();
      await supabase.auth.signOut();
      router.push('/');
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    }
  };

  const getStatusBadge = (status: string, score: number) => {
    if (score >= 85) {
      return <Badge className="bg-green-500 border-none">Excellent</Badge>;
    } else if (score >= 70) {
      return <Badge className="bg-blue-500 border-none">Bon</Badge>;
    } else {
      return <Badge className="bg-yellow-500 border-none">À surveiller</Badge>;
    }
  };

  return (
    <ProtectedRoute>
      <div className="bg-[#0a0a0a] text-white min-h-screen pt-20">
        {/* Hero Section */}
        <section className="relative pt-32 pb-12 px-4">
          {/* Gradient Background Effects */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-10 left-1/4 w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px] animate-pulse"></div>
            <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-purple-600/10 rounded-full blur-[100px]"></div>
          </div>
          
          <div className="max-w-7xl mx-auto relative z-10">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <h1 className="text-5xl md:text-6xl font-medium text-white mb-2">
                  Tableau de bord
                </h1>
                <p className="text-xl text-gray-400">Bienvenue, {user?.email?.split('@')[0] || 'Utilisateur'}</p>
              </motion.div>
              <div className="flex gap-3">
                <Link href="/profil">
                  <Button className="bg-white/10 border-white/20 text-white hover:bg-white/20" variant="outline">
                    <User className="size-4 mr-2" />
                    Mon profil
                  </Button>
                </Link>
                <Link href="/contact">
                  <Button className="bg-white/10 border-white/20 text-white hover:bg-white/20" variant="outline">
                    <MessageCircle className="size-4 mr-2" />
                    Contact
                  </Button>
                </Link>
                {/* Bouton menu mobile */}
                <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
                  <SheetTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="lg:hidden text-white hover:bg-white/10"
                    >
                      <Menu className="size-6" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent 
                    side="right" 
                    className="w-[320px] sm:w-[380px] bg-[#1a1a1a] border-white/10 p-0 overflow-y-auto"
                  >
                    <SheetHeader className="p-6 border-b border-white/10 sticky top-0 bg-[#1a1a1a] backdrop-blur-sm z-10">
                      <SheetTitle className="text-white text-xl flex items-center gap-2">
                        <LayoutDashboard className="size-5" />
                        Menu
                      </SheetTitle>
                    </SheetHeader>
                    <nav className="p-6 space-y-2">
                      <button 
                        onClick={() => setSidebarOpen(false)}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg"
                      >
                        <LayoutDashboard className="size-5" />
                        <span>Dashboard</span>
                      </button>
                      <Link 
                        href="/dashboard/recherches" 
                        onClick={() => setSidebarOpen(false)}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
                      >
                        <Search className="size-5" />
                        <span>Mes recherches</span>
                      </Link>
                      <Link
                        href="/dashboard/analyses"
                        onClick={() => setSidebarOpen(false)}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
                      >
                        <FileSearch className="size-5" />
                        <span>Annonces analysées</span>
                      </Link>
                      <Link 
                        href="/favoris"
                        onClick={() => setSidebarOpen(false)}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
                      >
                        <Heart className="size-5" />
                        <span>Favoris</span>
                      </Link>
                      <div className="pt-4 border-t border-white/10 mt-4">
                        <button 
                          onClick={() => {
                            setSidebarOpen(false);
                            handleLogout();
                          }}
                          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
                        >
                          <LogOut className="size-5" />
                          <span>Déconnexion</span>
                        </button>
                      </div>
                    </nav>
                  </SheetContent>
                </Sheet>
              </div>
            </div>
          </div>
        </section>

        {/* Main Content */}
        <section className="py-12 px-4 relative">
          <div className="max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-4 gap-6">
              {/* Sidebar */}
              <div className="lg:col-span-1">
                <Card className="bg-white/5 backdrop-blur-xl border-white/10 sticky top-24">
                  <CardContent className="p-4">
                    <nav className="space-y-2">
                      <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg">
                        <LayoutDashboard className="size-5" />
                        <span>Dashboard</span>
                      </button>
                      <Link href="/dashboard/recherches" className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-white/5 hover:text-white transition-colors">
                        <Search className="size-5" />
                        <span>Mes recherches</span>
                      </Link>
                      <Link href="/dashboard/analyses" className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-white/5 hover:text-white transition-colors">
                        <FileSearch className="size-5" />
                        <span>Annonces analysées</span>
                      </Link>
                      <Link href="/favoris" className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-white/5 hover:text-white transition-colors">
                        <Heart className="size-5" />
                        <span>Favoris</span>
                      </Link>
                      <div className="pt-4 border-t border-white/10">
                        <button 
                          onClick={handleLogout}
                          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
                        >
                          <LogOut className="size-5" />
                          <span>Déconnexion</span>
                        </button>
                      </div>
                    </nav>
                  </CardContent>
                </Card>
              </div>

              {/* Main Dashboard Content */}
              <div className="lg:col-span-3 space-y-6">
                {/* Stats Cards */}
                <div className="grid md:grid-cols-3 gap-6">
                  <Card className="bg-white/5 backdrop-blur-xl border-white/10 hover:bg-white/10 transition-all">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-gray-400">Recherches</span>
                        <Search className="size-5 text-blue-400" />
                      </div>
                      <div className="text-4xl font-medium bg-gradient-to-r from-blue-400 to-blue-500 bg-clip-text text-transparent">{recentSearches.length}</div>
                      <p className="text-sm text-gray-500 mt-1">Cette semaine</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-white/5 backdrop-blur-xl border-white/10 hover:bg-white/10 transition-all">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-gray-400">Analyses</span>
                        <FileSearch className="size-5 text-purple-400" />
                      </div>
                      <div className="text-4xl font-medium bg-gradient-to-r from-purple-400 to-purple-500 bg-clip-text text-transparent">{analysesStats.count}</div>
                      <p className="text-sm text-gray-500 mt-1">Ce mois-ci</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-white/5 backdrop-blur-xl border-white/10 hover:bg-white/10 transition-all">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-gray-400">Score moyen</span>
                        <TrendingUp className="size-5 text-green-400" />
                      </div>
                      <div className="text-4xl font-medium text-green-400">{analysesStats.count > 0 ? analysesStats.averageScore : '-'}</div>
                      <p className="text-sm text-gray-500 mt-1">Sur vos analyses</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Recent Searches */}
                <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-white">
                      <Clock className="size-5 text-blue-400" />
                      Mes recherches récentes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {searchesLoading ? (
                        <div className="text-center py-8 text-gray-400">Chargement...</div>
                      ) : recentSearches.length === 0 ? (
                        <div className="text-center py-8 text-gray-400">Aucune recherche récente</div>
                      ) : (
                        recentSearches.slice(0, 3).map((search) => (
                          <div
                            key={search.id}
                            className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 hover:border-white/20 transition-colors"
                          >
                            <div className="flex-1">
                              <div className="text-white mb-1">
                                {search.brand} {search.model}
                              </div>
                              <div className="flex items-center gap-4 text-sm text-gray-400">
                                {search.max_price && (
                                  <>
                                    <span>Budget: {search.max_price.toLocaleString()} €</span>
                                    <span>•</span>
                                  </>
                                )}
                                <span className="flex items-center gap-1">
                                  <Calendar className="size-4" />
                                  {new Date(search.created_at).toLocaleDateString('fr-FR')}
                                </span>
                                {search.total_results !== undefined && (
                                  <>
                                    <span>•</span>
                                    <span>{search.total_results} résultats</span>
                                  </>
                                )}
                              </div>
                            </div>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="bg-white/5 border-white/20 text-white hover:bg-white/10"
                              onClick={() => handleReviewResults(search)}
                            >
                              Revoir les résultats
                            </Button>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Analyzed Ads */}
                <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-white">
                      <FileSearch className="size-5 text-purple-400" />
                      Mes annonces analysées
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {analyzedAds.length === 0 ? (
                        <div className="text-center py-8 text-gray-400">Aucune annonce analysée</div>
                      ) : (
                        analyzedAds.map((ad) => (
                          <div
                            key={ad.id}
                            className="flex gap-4 p-4 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 hover:border-white/20 transition-colors"
                          >
                            <div className="w-24 h-24 rounded-lg overflow-hidden flex-shrink-0">
                              <ImageWithFallback
                                src={ad.image || 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=400'}
                                alt={ad.title}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-start justify-between mb-2">
                                <div>
                                  <div className="text-white mb-1">{ad.title}</div>
                                  <div className="text-xl font-medium bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">{ad.price.toLocaleString()} €</div>
                                </div>
                                {getStatusBadge(ad.status, ad.score)}
                              </div>
                              <div className="flex items-center gap-4 text-sm text-gray-400">
                                <span>Score: {ad.score}/100</span>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <Calendar className="size-4" />
                                  {new Date(ad.date).toLocaleDateString('fr-FR')}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="bg-white/5 border-white/20 text-white hover:bg-white/10"
                                onClick={() => router.push(`/dashboard/analyses/${ad.id}`)}
                              >
                                Voir le rapport
                              </Button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Recommendations */}
                <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-white">
                      <Star className="size-5 text-yellow-500" />
                      Recommandations pour vous
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <RecommendationsList />
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>
      </div>
    </ProtectedRoute>
  );
}
