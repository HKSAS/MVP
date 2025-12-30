'use client'

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { motion } from 'framer-motion';
import { 
  FileSearch, 
  Sparkles, 
  CheckCircle, 
  AlertTriangle, 
  TrendingUp,
  Shield,
  XCircle,
  Info,
  BarChart3
} from "lucide-react";
import type { AnalyzeListingResponse } from "@/lib/types";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useQuotaCheck } from "@/lib/auth/with-quota-check";

interface PriceAdjustment {
  factor: string;
  impact: number;
}

interface MarketPriceEstimate {
  min: number;
  max: number;
  vehiclePrice: number;
  position: 'basse_fourchette' | 'moyenne' | 'haute_fourchette' | 'hors_fourchette';
  negotiationAdvice: string;
  explanation: PriceAdjustment[];
}

interface ScoreCriterion {
  criterion: string;
  points: number;
  details: string;
}

interface KnownIssue {
  category: string;
  items: string[];
}

interface RedFlag {
  type: 'mileage_inconsistent' | 'price_too_low' | 'missing_ct' | 'inconsistent_listing' | 'suspicious_seller';
  severity: 'high' | 'critical';
  message: string;
  details: string;
}

interface AnalysisResult {
  score: number;
  reliabilityScore: number;
  riskLevel: 'low' | 'medium' | 'high';
  recommendation: string;
  marketPrice: MarketPriceEstimate;
  scoreBreakdown: ScoreCriterion[];
  positives: string[];
  watchouts: string[];
  knownIssues: KnownIssue[];
  redFlags?: RedFlag[];
  buyerChecklist: string[];
  finalVerdict: string;
  // Compatibilité
  summary?: string;
  risk_score?: number;
  warnings?: string[];
  known_issues?: string[];
  advice?: string;
  final_recommendation?: string;
}

export default function AnalyzePage() {
  const router = useRouter();
  const { checkAndTrack, PaywallModal } = useQuotaCheck('analyse');
  
  // Vérifier l'authentification au chargement
  useEffect(() => {
    const checkAuth = async () => {
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/signup?redirect=/analyser');
      }
    };
    checkAuth();
  }, [router]);
  
  const [analyzing, setAnalyzing] = useState(false);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [mileage, setMileage] = useState("");
  const [year, setYear] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [announcedPrice, setAnnouncedPrice] = useState<number | null>(null);
  const [extractedData, setExtractedData] = useState<any>(null);

  // Vérifier si on vient de l'historique
  useEffect(() => {
    const fromHistory = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('fromHistory') === 'true';
    
    if (fromHistory) {
      const savedResult = localStorage.getItem('analysisResult');
      const savedUrl = localStorage.getItem('analysisUrl');
      
      if (savedResult) {
        try {
          const parsedResult = JSON.parse(savedResult);
          
          // Mapper les résultats vers AnalysisResult
          setAnalysisResult({
            score: parsedResult.score || 0,
            reliabilityScore: parsedResult.reliabilityScore || 0,
            riskLevel: parsedResult.riskLevel || 'medium',
            recommendation: parsedResult.recommendation || parsedResult.final_recommendation || 'À vérifier',
            marketPrice: parsedResult.marketPrice || {
              min: 0,
              max: 0,
              vehiclePrice: 0,
              position: 'moyenne',
              negotiationAdvice: '',
              explanation: [],
            },
            scoreBreakdown: Array.isArray(parsedResult.scoreBreakdown)
              ? parsedResult.scoreBreakdown
              : parsedResult.scoreBreakdown?.factors?.map((f: any) => ({
                  criterion: f.name || f.factor || '',
                  points: f.score || 0,
                  details: f.message || f.details || '',
                })) || [],
            positives: parsedResult.positives || [],
            watchouts: parsedResult.watchouts || parsedResult.warnings || [],
            knownIssues: parsedResult.knownIssues || [],
            redFlags: (parsedResult.redFlags as RedFlag[]) || [],
            buyerChecklist: parsedResult.buyerChecklist || [],
            finalVerdict: parsedResult.finalVerdict || parsedResult.summary || '',
            summary: parsedResult.summary,
            risk_score: parsedResult.risk_score || parsedResult.riskScore || 0,
            warnings: parsedResult.warnings || parsedResult.watchouts || [],
            advice: parsedResult.advice,
            final_recommendation: parsedResult.final_recommendation || parsedResult.recommendation,
          });
          
          if (parsedResult.extractedData?.price_eur) {
            setAnnouncedPrice(parsedResult.extractedData.price_eur);
          }
          if (parsedResult.extractedData) {
            setExtractedData(parsedResult.extractedData);
          }
          if (savedUrl) {
            setUrl(savedUrl);
          }
          
          setHasAnalyzed(true);
          
          // Nettoyer localStorage
          localStorage.removeItem('analysisResult');
          localStorage.removeItem('analysisId');
          localStorage.removeItem('analysisUrl');
        } catch (e) {
          console.error('Erreur restauration analyse depuis historique:', e);
        }
      }
    }
  }, []);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation minimale
    if (!url.trim() && !description.trim()) {
      setError("Veuillez fournir soit une URL, soit un texte de description");
      return;
    }

    setAnalyzing(true);
    setError(null);
    setHasAnalyzed(false);

    // Vérifier et tracker le quota AVANT d'exécuter l'analyse
    const quotaCheck = await checkAndTrack(
      async () => {
      // Récupérer le token de session pour l'authentification
      const supabase = getSupabaseBrowserClient();
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      // Préparer les headers avec le token si disponible
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch('/api/analyze-listing', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          url: url.trim() || undefined,
          description: description.trim() || undefined,
          content: description.trim() || undefined, // Support des deux noms
          price: price ? parseInt(price) : undefined,
          price_eur: price ? parseInt(price) : undefined,
          mileage: mileage ? parseInt(mileage) : undefined,
          mileage_km: mileage ? parseInt(mileage) : undefined,
          year: year ? parseInt(year) : undefined,
        }),
      });

      const data: AnalyzeListingResponse = await response.json();
        
        return data;
      },
      {
        url: url.trim(),
        hasDescription: !!description.trim(),
        price: price ? parseInt(price) : undefined,
        mileage: mileage ? parseInt(mileage) : undefined,
        year: year ? parseInt(year) : undefined
      }
    );

    // Si quota épuisé, le modal s'affiche automatiquement
    if (!quotaCheck.success) {
      setError(quotaCheck.error || "Quota épuisé");
      setAnalyzing(false);
      return;
    }

    try {
      const data = quotaCheck.result as AnalyzeListingResponse;

      if (!data.success || !data.data) {
        throw new Error(data.error || 'Erreur lors de l\'analyse');
      }

      // Mapper data.data vers AnalysisResult
      const resultData = data.data
      setAnalysisResult({
        score: resultData.score || 0,
        reliabilityScore: resultData.reliabilityScore || 0,
        riskLevel: resultData.riskLevel || 'medium',
        recommendation: resultData.recommendation || resultData.final_recommendation || 'À vérifier',
        marketPrice: resultData.marketPrice || {
          min: 0,
          max: 0,
          vehiclePrice: 0,
          position: 'moyenne',
          negotiationAdvice: '',
          explanation: [],
        },
        scoreBreakdown: Array.isArray(resultData.scoreBreakdown)
          ? resultData.scoreBreakdown
          : resultData.scoreBreakdown?.factors?.map((f: any) => ({
              criterion: f.name || f.factor || '',
              points: f.score || 0,
              details: f.message || f.details || '',
            })) || [],
        positives: resultData.positives || [],
        watchouts: resultData.watchouts || resultData.warnings || [],
        knownIssues: resultData.knownIssues || [],
        redFlags: (resultData.redFlags as RedFlag[]) || [],
        buyerChecklist: resultData.buyerChecklist || [],
        finalVerdict: resultData.finalVerdict || resultData.summary || '',
        // Compatibilité
        summary: resultData.summary,
        risk_score: resultData.risk_score || resultData.riskScore || 0,
        warnings: resultData.warnings || resultData.watchouts || [],
        advice: resultData.advice,
        final_recommendation: resultData.final_recommendation || resultData.recommendation,
      });
      // Sauvegarder le prix annoncé et les données extraites
      if (price) {
        setAnnouncedPrice(parseInt(price));
      } else if (data.data?.extractedData?.price_eur) {
        setAnnouncedPrice(data.data.extractedData.price_eur);
      }
      if (data.data?.extractedData) {
        setExtractedData(data.data.extractedData);
      }
      setHasAnalyzed(true);
    } catch (err) {
      console.error('Erreur analyse:', err);
      setError(err instanceof Error ? err.message : 'Une erreur est survenue lors de l\'analyse');
      setHasAnalyzed(false);
    } finally {
      setAnalyzing(false);
    }
  };

  const getRecommendationColor = (rec: string) => {
    const recLower = rec.toLowerCase();
    if (recLower.includes("ok") || recLower.includes("acheter") || recLower === "ok pour acheter") {
      return "bg-green-500";
    }
    if (recLower.includes("négocier") || recLower.includes("vérifier") || recLower === "à négocier / vérifier avant achat") {
      return "bg-yellow-500";
    }
    return "bg-red-500";
  };

  const getRecommendationIcon = (rec: string) => {
    const recLower = rec.toLowerCase();
    if (recLower.includes("ok") || recLower.includes("acheter") || recLower === "ok pour acheter") {
      return <CheckCircle className="size-5" />;
    }
    if (recLower.includes("négocier") || recLower.includes("vérifier") || recLower === "à négocier / vérifier avant achat") {
      return <AlertTriangle className="size-5" />;
    }
    return <XCircle className="size-5" />;
  };

  // Calculer le score de fiabilité
  const getReliabilityScore = () => {
    if (!analysisResult) return 0;
    return analysisResult.reliabilityScore || (analysisResult.risk_score ? 100 - analysisResult.risk_score : 0);
  };

  // Obtenir le niveau de risque
  const getRiskLevel = () => {
    if (!analysisResult) return 'medium';
    return analysisResult.riskLevel || 'medium';
  };

  // Obtenir les watchouts (compatibilité)
  const getWatchouts = () => {
    if (!analysisResult) return [];
    return analysisResult.watchouts || analysisResult.warnings || [];
  };

  // Obtenir les known issues (compatibilité)
  const getKnownIssues = () => {
    if (!analysisResult) return [];
    return analysisResult.knownIssues || (analysisResult.known_issues ? analysisResult.known_issues.map((item: string) => ({ category: 'Général', items: [item] })) : []);
  };

  return (
    <div className="bg-[#0a0a0a] text-white min-h-screen pt-20">
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4">
        {/* Gradient Background Effects */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-1/3 w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px] animate-pulse"></div>
          <div className="absolute bottom-0 right-1/3 w-[400px] h-[400px] bg-purple-600/10 rounded-full blur-[100px]"></div>
        </div>
        
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-6"
          >
            <Badge variant="secondary" className="bg-white/10 text-white border-white/20 rounded-full px-4 py-1">
              <Shield className="size-4 mr-2 inline" />
              Détection anti-arnaque
            </Badge>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-medium text-white">
              Analyser une annonce
              <br />
              <span className="bg-gradient-to-r from-blue-400 via-blue-500 to-purple-500 bg-clip-text text-transparent">
                avec l&apos;IA
              </span>
            </h1>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Obtenez une analyse détaillée et un score de fiabilité pour sécuriser votre achat
            </p>
          </motion.div>
        </div>
      </section>

      {/* Form Section */}
      <section className="py-12 px-4 relative">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Card className="bg-white/5 backdrop-blur-xl border-white/10 shadow-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <FileSearch className="size-6 text-blue-400" />
                  Informations de l&apos;annonce
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAnalyze} className="space-y-6">
                  <Tabs defaultValue="url" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 bg-white/5">
                       <TabsTrigger value="url" className="data-[state=active]:bg-white/10">Lien de l&apos;annonce</TabsTrigger>
                       <TabsTrigger value="text" className="data-[state=active]:bg-white/10">Texte de l&apos;annonce</TabsTrigger>
                    </TabsList>
                    <TabsContent value="url" className="space-y-4 mt-6">
                      <div className="space-y-2">
                        <Label htmlFor="url" className="text-white">URL de l'annonce</Label>
                        <Input
                          id="url"
                          placeholder="https://www.leboncoin.fr/..."
                          value={url}
                          onChange={(e) => setUrl(e.target.value)}
                          className="bg-white/5 border-white/20 text-white placeholder:text-gray-500 focus:border-blue-500"
                          disabled={analyzing}
                        />
                        <p className="text-sm text-gray-400">
                          Collez le lien complet de l'annonce (LeBonCoin, ParuVendu, Autoscout24...)
                        </p>
                      </div>
                    </TabsContent>
                    <TabsContent value="text" className="space-y-4 mt-6">
                      <div className="space-y-2">
                        <Label htmlFor="description" className="text-white">Description de l'annonce</Label>
                        <Textarea
                          id="description"
                          placeholder="Collez ici le texte complet de l'annonce..."
                          rows={6}
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          className="bg-white/5 border-white/20 text-white placeholder:text-gray-500 focus:border-blue-500"
                          disabled={analyzing}
                        />
                      </div>
                    </TabsContent>
                  </Tabs>

                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="price" className="text-white">Prix annoncé (€)</Label>
                      <Input
                        id="price"
                        type="number"
                        placeholder="Ex: 22500"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        className="bg-white/5 border-white/20 text-white placeholder:text-gray-500 focus:border-blue-500"
                        disabled={analyzing}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="mileage" className="text-white">Kilométrage</Label>
                      <Input
                        id="mileage"
                        type="number"
                        placeholder="Ex: 45000"
                        value={mileage}
                        onChange={(e) => setMileage(e.target.value)}
                        className="bg-white/5 border-white/20 text-white placeholder:text-gray-500 focus:border-blue-500"
                        disabled={analyzing}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="year" className="text-white">Année</Label>
                      <Input
                        id="year"
                        type="number"
                        placeholder="Ex: 2020"
                        value={year}
                        onChange={(e) => setYear(e.target.value)}
                        className="bg-white/5 border-white/20 text-white placeholder:text-gray-500 focus:border-blue-500"
                        disabled={analyzing}
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    size="lg"
                    className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-full"
                    disabled={analyzing}
                  >
                    {analyzing ? (
                      <>
                        <Sparkles className="size-5 mr-2 animate-spin" />
                        Analyse en cours...
                      </>
                    ) : (
                      <>
                        <FileSearch className="size-5 mr-2" />
                        Analyser l'annonce
                      </>
                    )}
                  </Button>
                  {error && (
                    <Alert className="border-red-500/50 bg-red-500/10">
                      <AlertTriangle className="size-4 text-red-400" />
                      <AlertDescription className="text-red-400">{error}</AlertDescription>
                    </Alert>
                  )}
                </form>
              </CardContent>
            </Card>
          </motion.div>

          {/* Results Section */}
          {hasAnalyzed && analysisResult && (
            <motion.div 
              className="mt-12 space-y-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="flex items-center gap-2 text-white mb-6">
                <Sparkles className="size-6 text-blue-400" />
                <h2 className="text-3xl font-medium">Résultat de l'analyse</h2>
              </div>

              {/* Score Summary */}
              <div className="grid md:grid-cols-3 gap-6">
                <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                  <CardContent className="p-6 text-center">
                    <div className="text-5xl mb-2 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent font-bold">{getReliabilityScore()}</div>
                    <div className="text-sm text-gray-400">Score de fiabilité</div>
                    <div className="mt-4">
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                          style={{ width: `${getReliabilityScore()}%` }}
                        ></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                  <CardContent className="p-6 text-center">
                    <div className="text-5xl mb-2 text-yellow-400 font-bold">{100 - getReliabilityScore()}%</div>
                    <div className="text-sm text-gray-400">Niveau de risque</div>
                    <div className="mt-4">
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-yellow-500"
                          style={{ width: `${100 - getReliabilityScore()}%` }}
                        ></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className={`bg-white/5 backdrop-blur-xl border-white/10 ${getRecommendationColor(analysisResult.recommendation || analysisResult.final_recommendation || 'À vérifier')}/20`}>
                  <CardContent className="p-6 text-center">
                    <div className="flex justify-center mb-2">
                      {getRecommendationIcon(analysisResult.recommendation || analysisResult.final_recommendation || 'À vérifier')}
                    </div>
                    <div className="text-2xl mb-2 text-white font-medium">{analysisResult.recommendation || analysisResult.final_recommendation || 'À vérifier'}</div>
                    <div className="text-sm text-gray-400">Recommandation</div>
                  </CardContent>
                </Card>
              </div>

              {/* Red Flags */}
              {analysisResult.redFlags && analysisResult.redFlags.length > 0 && (
                <Card className="bg-red-500/10 backdrop-blur-xl border-red-500/30">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-red-400">
                      <AlertTriangle className="size-5" />
                      Drapeaux rouges détectés
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {analysisResult.redFlags.map((flag, index) => (
                        <div key={index} className={`p-4 border-l-4 rounded-lg ${
                          flag.severity === 'critical' 
                            ? 'border-red-500 bg-red-950/30' 
                            : 'border-orange-500 bg-orange-950/20'
                        }`}>
                          <div className="flex items-start justify-between mb-2">
                            <div className="text-white font-semibold">{flag.message}</div>
                            <Badge variant="outline" className={
                              flag.severity === 'critical' 
                                ? 'border-red-500 text-red-400' 
                                : 'border-orange-500 text-orange-400'
                            }>
                              {flag.severity === 'critical' ? 'Critique' : 'Élevé'}
                            </Badge>
                          </div>
                          <div className="text-sm text-gray-300">{flag.details}</div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Informations de l'annonce */}
              {extractedData && (
                <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-white text-sm">
                      <Info className="size-4 text-blue-400" />
                      Informations de l&apos;annonce
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-3 gap-4 text-sm">
                      {extractedData.year && (
                        <div>
                          <div className="text-gray-400 mb-1">Année</div>
                          <div className="text-xl text-white font-semibold">{extractedData.year}</div>
                        </div>
                      )}
                      <div>
                        <div className="text-gray-400 mb-1">Kilométrage</div>
                        {(() => {
                          // Récupérer le kilométrage brut EXACT de l'annonce source
                          // Utiliser uniquement les candidats bruts scrapés, sans traitement
                          let rawMileage: number | null = null
                          let rawMileageDisplay: string | null = null
                          
                          if (extractedData.mileageSelection?.mileageCandidates && extractedData.mileageSelection.mileageCandidates.length > 0) {
                            // Prendre le candidat avec la valeur la plus élevée (valeur réelle de l'annonce)
                            // C'est la valeur brute scrapée, non traitée
                            const candidates = extractedData.mileageSelection.mileageCandidates
                            const highestCandidate = candidates.reduce((max: any, c: any) => 
                              c.value > max.value ? c : max
                            )
                            rawMileage = highestCandidate.value
                            // Utiliser la valeur raw si disponible pour l'affichage exact
                            rawMileageDisplay = highestCandidate.raw || null
                          } else if (extractedData.mileage_km !== null && extractedData.mileage_km !== undefined && extractedData.mileage_km > 0) {
                            // Fallback uniquement si valeur > 0 (éviter les valeurs nulles/erronées)
                            rawMileage = extractedData.mileage_km
                          }
                          
                          if (rawMileage !== null && rawMileage > 0) {
                            // Afficher la valeur brute formatée
                            return (
                              <div className="text-xl text-white font-semibold">
                                {rawMileage.toLocaleString('fr-FR')} km
                              </div>
                            )
                          } else {
                            return (
                              <div className="text-lg text-gray-400 italic">
                                Kilométrage non renseigné dans l'annonce
                              </div>
                            )
                          }
                        })()}
                      </div>
                      {extractedData.fuel && (
                        <div>
                          <div className="text-gray-400 mb-1">Carburant</div>
                          <div className="text-xl text-white font-semibold capitalize">{extractedData.fuel}</div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Résumé cohérence */}
              <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white text-sm">
                    <Info className="size-4 text-blue-400" />
                    Résumé de cohérence
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <div className="text-gray-400 mb-1">Score global</div>
                      <div className="text-2xl text-white font-bold">{analysisResult.score}</div>
                      <div className="text-xs text-gray-500">/ 100</div>
                    </div>
                    <div>
                      <div className="text-gray-400 mb-1">Score de fiabilité</div>
                      <div className="text-2xl text-blue-400 font-bold">{analysisResult.reliabilityScore}</div>
                      <div className="text-xs text-gray-500">/ 100</div>
                    </div>
                    <div>
                      <div className="text-gray-400 mb-1">Niveau de risque</div>
                      <div className="text-2xl font-bold">
                        <span className={
                          analysisResult.riskLevel === 'low' ? 'text-green-400' :
                          analysisResult.riskLevel === 'medium' ? 'text-yellow-400' :
                          'text-red-400'
                        }>
                          {analysisResult.riskLevel === 'low' ? 'Faible' :
                           analysisResult.riskLevel === 'medium' ? 'Moyen' :
                           'Élevé'}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">Risk score: {100 - analysisResult.reliabilityScore}%</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Score Breakdown */}
              {analysisResult.scoreBreakdown && analysisResult.scoreBreakdown.length > 0 && (
                <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-white">
                      <BarChart3 className="size-5 text-blue-400" />
                      Comment le score est calculé
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {analysisResult.scoreBreakdown.map((criterion, index) => (
                        <div key={index} className="flex items-start justify-between p-3 bg-white/5 border border-white/10 rounded-lg">
                          <div className="flex-1">
                            <div className="text-white font-medium mb-1">{criterion.criterion}</div>
                            <div className="text-sm text-gray-400">{criterion.details}</div>
                          </div>
                          <div className={`text-lg font-bold ml-4 ${criterion.points >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {criterion.points >= 0 ? '+' : ''}{criterion.points}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Detailed Analysis */}
              <div className="grid md:grid-cols-2 gap-6">
                {/* Positive Points */}
                <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-green-400">
                      <CheckCircle className="size-5" />
                      Points positifs
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {analysisResult.positives && analysisResult.positives.length > 0 ? (
                      <ul className="space-y-3">
                        {analysisResult.positives.map((point, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <CheckCircle className="size-5 text-green-400 mt-0.5 flex-shrink-0" />
                            <span className="text-gray-300">{point}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-gray-400">Aucun point positif identifié</p>
                    )}
                  </CardContent>
                </Card>

                {/* Warning Points */}
                <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-yellow-400">
                      <AlertTriangle className="size-5" />
                      Points à surveiller
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {getWatchouts().length > 0 ? (
                      <ul className="space-y-3">
                        {getWatchouts().map((point, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <AlertTriangle className="size-5 text-yellow-400 mt-0.5 flex-shrink-0" />
                            <span className="text-gray-300">{point}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-gray-400">Aucun point d'alerte identifié</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Market Price */}
              {analysisResult.marketPrice && analysisResult.marketPrice.min && analysisResult.marketPrice.max && (
                <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-white">
                      <TrendingUp className="size-5 text-blue-400" />
                      Estimation prix marché
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Prix annoncé */}
                      {announcedPrice && (
                        <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
                          <div className="text-sm text-gray-400 mb-1">Prix annoncé</div>
                          <div className="text-2xl font-semibold text-white">
                            {announcedPrice.toLocaleString('fr-FR')} €
                          </div>
                        </div>
                      )}
                      
                      {/* Fourchette de prix marché */}
                      <div>
                        <div className="text-sm text-gray-400 mb-2">Fourchette de prix marché</div>
                        <div className="text-2xl text-white">
                          {analysisResult.marketPrice.min.toLocaleString('fr-FR')} € - {analysisResult.marketPrice.max.toLocaleString('fr-FR')} €
                        </div>
                      </div>

                      {/* Explication des ajustements */}
                      {analysisResult.marketPrice.explanation && analysisResult.marketPrice.explanation.length > 0 && (
                        <div className="space-y-2 mt-4">
                          <div className="text-sm text-gray-400">Détail de l'estimation</div>
                          <div className="space-y-2">
                            {analysisResult.marketPrice.explanation.map((adj, index) => (
                              <div key={index} className="flex justify-between items-center p-2 bg-white/5 rounded text-sm">
                                <span className="text-gray-300">{adj.factor}</span>
                                <span className={`font-semibold ${adj.impact >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                  {adj.impact >= 0 ? '+' : ''}{adj.impact.toLocaleString('fr-FR')} €
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Comparaison visuelle */}
                      {announcedPrice && (
                        <div className="space-y-2 mt-4">
                          <div className="text-sm text-gray-400">Position du prix annoncé</div>
                          <div className="relative h-8 bg-white/10 border border-white/20 rounded-full overflow-hidden">
                            {/* Barre de fourchette */}
                            <div className="absolute inset-0 flex items-center">
                              <div 
                                className="h-full bg-blue-500/30"
                                style={{
                                  marginLeft: '0%',
                                  width: `${Math.min(100, ((analysisResult.marketPrice.max - analysisResult.marketPrice.min) / (analysisResult.marketPrice.max + (analysisResult.marketPrice.max - analysisResult.marketPrice.min) * 0.2)) * 100)}%`
                                }}
                              />
                            </div>
                            {/* Indicateur du prix annoncé */}
                            {(() => {
                              const range = analysisResult.marketPrice.max - analysisResult.marketPrice.min;
                              const extendedRange = range * 1.2;
                              const minExtended = analysisResult.marketPrice.min - range * 0.1;
                              const position = Math.max(0, Math.min(100, ((announcedPrice - minExtended) / extendedRange) * 100));
                              const isInRange = announcedPrice >= analysisResult.marketPrice.min && announcedPrice <= analysisResult.marketPrice.max;
                              const color = isInRange ? 'bg-green-400' : announcedPrice < analysisResult.marketPrice.min ? 'bg-green-500' : 'bg-yellow-500';
                              
                              return (
                                <div 
                                  className={`absolute top-0 bottom-0 w-1 ${color} shadow-lg`}
                                  style={{ left: `${position}%`, transform: 'translateX(-50%)' }}
                                >
                                  <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs text-gray-300 font-semibold whitespace-nowrap">
                                    {announcedPrice.toLocaleString('fr-FR')}€
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                          <div className="flex justify-between text-xs text-gray-500">
                            <span>{analysisResult.marketPrice.min.toLocaleString('fr-FR')}€</span>
                            <span>{analysisResult.marketPrice.max.toLocaleString('fr-FR')}€</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Conseil de négociation */}
                    {analysisResult.marketPrice.negotiationAdvice && (
                      <Alert className={`mt-4 ${
                        analysisResult.marketPrice.position === 'basse_fourchette' ? 'border-green-600/20 bg-green-950/20' :
                        analysisResult.marketPrice.position === 'haute_fourchette' || analysisResult.marketPrice.position === 'hors_fourchette' ? 'border-yellow-600/20 bg-yellow-950/20' :
                        'border-blue-600/20 bg-blue-950/20'
                      }`}>
                        <Info className="size-4 text-blue-400" />
                        <AlertDescription className="text-gray-300">
                          {analysisResult.marketPrice.negotiationAdvice}
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Known Issues */}
              {getKnownIssues().length > 0 && (
                <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-orange-400">
                      <AlertTriangle className="size-5" />
                      Faiblesses connues du modèle
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {getKnownIssues().map((issueCategory, index) => (
                        <div key={index} className="border-l-2 border-orange-500/30 pl-4">
                          <h4 className="text-orange-400 font-semibold mb-2">{issueCategory.category}</h4>
                          <ul className="space-y-2">
                            {issueCategory.items.map((item, itemIndex) => (
                              <li key={itemIndex} className="flex items-start gap-2 text-gray-300">
                                <span className="text-orange-400 mt-1">•</span>
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Buyer Checklist */}
              {analysisResult.buyerChecklist && analysisResult.buyerChecklist.length > 0 && (
                <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-white">
                      <CheckCircle className="size-5 text-blue-400" />
                      Checklist avant achat
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {analysisResult.buyerChecklist.map((item, index) => (
                        <li key={index} className="flex items-start gap-3">
                          <div className="mt-0.5 w-5 h-5 rounded border-2 border-white/30 flex-shrink-0"></div>
                          <span className="text-gray-300">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Final Verdict */}
              {analysisResult.finalVerdict && (
                <Card className="bg-white/5 backdrop-blur-xl border-2 border-blue-500/30">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-white">
                      <Shield className="size-5 text-blue-400" />
                      Verdict final
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-lg text-gray-200 leading-relaxed">{analysisResult.finalVerdict}</p>
                  </CardContent>
                </Card>
              )}

              {/* Advice (compatibilité) */}
              {analysisResult.advice && !analysisResult.buyerChecklist && (
                <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-white">
                      <Sparkles className="size-5 text-blue-400" />
                      Conseils pour l'acheteur
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-300 whitespace-pre-line">{analysisResult.advice}</p>
                  </CardContent>
                </Card>
              )}

              {/* CTA */}
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-lg p-6 text-center">
                <h3 className="text-white mb-2">Besoin d'un accompagnement personnalisé ?</h3>
                <p className="text-gray-400 mb-4">
                  Nos experts peuvent vous accompagner pour la négociation et l'achat final
                </p>
                <Button 
                  asChild
                  className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white"
                >
                  <Link href="/contact">
                    Contacter un expert
                  </Link>
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      </section>
      
      {/* Modal de paywall si quota épuisé */}
      <PaywallModal />
    </div>
  );
}
