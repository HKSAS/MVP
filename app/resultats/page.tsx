'use client'

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  Brain,
  MapPin,
  Gauge,
  Calendar,
  ExternalLink,
  Eye,
  AlertCircle,
  Search,
  Filter,
  Loader2,
  Sparkles,
} from "lucide-react";
import { ImageWithFallback } from "@/components/figma/ImageWithFallback";
import { FavoriteButton } from "@/components/favorites/FavoriteButton";
import type { ListingResponse, SearchResponse, SiteResult } from "@/lib/types";
import { toast } from "sonner";
import { CheckCircle2, XCircle, RefreshCw, Clock } from "lucide-react";
import { useSaveSearch } from "@/hooks/useSearchHistory";
import { SearchLoadingMultisite } from "@/components/SearchLoadingMultisite";
import { ListingCardPremium } from "@/components/listings/ListingCardPremium";

const FALLBACK_IMAGE = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%231f2937" width="400" height="300"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" fill="%236b7280" font-family="Arial" font-size="18"%3EImage non disponible%3C/text%3E%3C/svg%3E'

type ResultState = "loading" | "error" | "empty" | "success";

function SearchResultsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { saveSearch } = useSaveSearch();
  const [state, setState] = useState<ResultState>("loading");
  const [sortBy, setSortBy] = useState("score");
  const [results, setResults] = useState<ListingResponse[]>([]);
  const [searchCriteria, setSearchCriteria] = useState({
    brand: "",
    model: "",
    resultsCount: 0,
    platformsCount: 0,
  });
  const [error, setError] = useState<string | null>(null);
  const [siteResults, setSiteResults] = useState<SiteResult[]>([]);
  const [jobId, setJobId] = useState<string | null>(null);
  
  // Garde-fou pour empêcher les appels simultanés
  const inFlightRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Job ID pour permettre l'annulation du scraping (ref pour le cleanup)
  const jobIdRef = useRef<string | null>(null);

  // Cleanup : Annuler le job de scraping si l'utilisateur quitte la page
  useEffect(() => {
    return () => {
      // Annuler le job de scraping si on quitte la page
      if (jobIdRef.current) {
        cancelScrapingJob(jobIdRef.current).catch((err) => {
          console.error('[Resultats] Erreur annulation job au démontage:', err);
        });
      }
      
      // Nettoyer les timers et abort controllers
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Fonction pour annuler un job de scraping
  const cancelScrapingJob = async (jobId: string) => {
    try {
      const response = await fetch('/api/scraping/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.warn('[Resultats] Erreur annulation job:', errorData.error || 'Erreur inconnue');
      } else {
        console.log('[Resultats] Job annulé avec succès:', jobId);
      }
    } catch (err) {
      console.error('[Resultats] Erreur lors de l\'annulation du job:', err);
    }
  };

  // Récupérer les paramètres de recherche depuis l'URL
  useEffect(() => {
    // Garde-fou strict : ignorer si une requête est déjà en cours
    if (inFlightRef.current) {
      console.log('[SEARCH] useEffect ignoré: requête déjà en cours');
      return;
    }
    
    // Annuler la requête précédente si elle existe
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Annuler le job précédent si il existe
    if (jobIdRef.current) {
      cancelScrapingJob(jobIdRef.current).catch((err) => {
        console.error('[Resultats] Erreur annulation job précédent:', err);
      });
      jobIdRef.current = null;
    }
    
    // Nettoyer le timer de debounce précédent
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    
    const brand = searchParams.get("brand") || "";
    const model = searchParams.get("model") || "";
    const maxPrice = searchParams.get("max_price") || "";
    const minPrice = searchParams.get("min_price") || "";
    const fuelType = searchParams.get("fuelType") || "";
    const yearMin = searchParams.get("yearMin") || "";
    const yearMax = searchParams.get("yearMax") || "";
    const mileageMax = searchParams.get("mileageMax") || "";
    const location = searchParams.get("location") || "";
    const transmission = searchParams.get("transmission") || "";
    const bodyType = searchParams.get("bodyType") || "";
    const doors = searchParams.get("doors") || "";
    const seats = searchParams.get("seats") || "";
    const color = searchParams.get("color") || "";
    const excludedSitesParam = searchParams.get("excludedSites") || "";

    // Vérifier si on vient de l'historique
    const fromHistory = searchParams.get('fromHistory') === 'true';
    
    if (fromHistory) {
      // Charger depuis localStorage si on vient de l'historique
      const savedResults = localStorage.getItem('searchResults');
      const savedCriteria = localStorage.getItem('searchCriteria');
      
      if (savedResults && savedCriteria) {
        try {
          const parsedResults = JSON.parse(savedResults);
          const parsedCriteria = JSON.parse(savedCriteria);
          
          setResults(parsedResults.listings || []);
          setSiteResults(parsedResults.siteResults || []);
          setSearchCriteria(parsedCriteria);
          
          if (parsedResults.listings && parsedResults.listings.length > 0) {
            setState("success");
          } else {
            setState("empty");
          }
          // Nettoyer le flag
          localStorage.removeItem('fromHistory');
          return;
        } catch (e) {
          console.error("Erreur restauration localStorage:", e);
        }
      }
    }

    if (!brand || !model) {
      // Essayer de restaurer depuis localStorage
      const savedResults = localStorage.getItem('searchResults');
      const savedCriteria = localStorage.getItem('searchCriteria');
      
      if (savedResults && savedCriteria) {
        try {
          const parsedResults = JSON.parse(savedResults);
          const parsedCriteria = JSON.parse(savedCriteria);
          
          setResults(parsedResults.listings || []);
          setSiteResults(parsedResults.siteResults || []);
          setSearchCriteria(parsedCriteria);
          
          if (parsedResults.listings && parsedResults.listings.length > 0) {
            setState("success");
          } else {
            setState("empty");
          }
          return;
        } catch (e) {
          console.error("Erreur restauration localStorage:", e);
        }
      }
      
      // Rediriger vers la page de recherche si les paramètres sont manquants
      router.push("/recherche");
      return;
    }

    // Debounce de 500ms pour éviter les appels multiples (augmenté pour plus de sécurité)
    debounceTimerRef.current = setTimeout(() => {
      // Vérification finale avant de lancer la recherche
      if (!inFlightRef.current) {
        performSearch(brand, model, maxPrice, minPrice, fuelType, yearMin, yearMax, mileageMax, location, transmission, bodyType, doors, seats, color, excludedSitesParam);
      }
    }, 500);
    
    // Cleanup
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.toString()]); // Utiliser toString() pour éviter les re-renders inutiles

  const performSearch = async (
    brand: string,
    model: string,
    maxPrice: string,
    minPrice: string,
    fuelType: string,
    yearMin: string,
    yearMax: string,
    mileageMax: string,
    location: string,
    transmission: string,
    bodyType: string,
    doors: string,
    seats: string,
    color: string,
    excludedSites?: string
  ) => {
    // Garde-fou : ignorer si une requête est déjà en cours
    if (inFlightRef.current) {
      console.log('[SEARCH] Requête déjà en cours, ignorée');
      return;
    }
    
    // Annuler la requête précédente si elle existe
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Créer un nouveau AbortController
    abortControllerRef.current = new AbortController();
    inFlightRef.current = true;
    
    // Réinitialiser le jobId pour une nouvelle recherche
    setJobId(null);
    jobIdRef.current = null;
    
    setState("loading");
    setError(null);

    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand,
          model,
          max_price: maxPrice ? Number(maxPrice) : undefined,
          min_price: minPrice ? Number(minPrice) : undefined,
          fuelType: fuelType && fuelType !== "all" ? fuelType : undefined,
          year_min: yearMin ? Number(yearMin) : undefined,
          year_max: yearMax ? Number(yearMax) : undefined,
          mileage_max: mileageMax ? Number(mileageMax) : undefined,
          location: location || undefined,
          transmission: transmission && transmission !== "all" ? transmission : undefined,
          bodyType: bodyType && bodyType !== "all" ? bodyType : undefined,
          doors: doors && doors !== "all" ? doors : undefined,
          seats: seats && seats !== "all" ? seats : undefined,
          color: color && color !== "all" ? color : undefined,
          excludedSites: excludedSites ? excludedSites.split(',').map((s: string) => s.trim()) : undefined,
          page: 1,
          limit: 50,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(
          errorData.error || errorData.message || "Erreur lors de la recherche"
        );
      }

      const data: SearchResponse & { jobId?: string | null; cancelled?: boolean } = await res.json();

      // Si la recherche a été annulée, ne pas traiter les résultats
      if (data.cancelled) {
        console.log('[Resultats] Recherche annulée par l\'utilisateur');
        setState("empty");
        setError("Recherche annulée");
        return;
      }

      // Stocker le jobId pour permettre l'annulation
      if (data.jobId) {
        jobIdRef.current = data.jobId;
        setJobId(data.jobId); // État local pour le composant SearchLoading
        console.log('[Resultats] Job ID stocké:', data.jobId);
      }

      if (data.success && data.listings) {
        const listings = Array.isArray(data.listings) ? data.listings : [];
        const siteResults = data.siteResults || [];
        const totalResults = listings.length + siteResults.length;
        
        console.log('[Resultats] Données reçues:', {
          listingsCount: listings.length,
          siteResultsCount: siteResults.length,
          totalResults,
          hasListings: listings.length > 0,
          hasSiteResults: siteResults.length > 0,
          jobId: data.jobId
        })
        
        setResults(listings);
        setSiteResults(siteResults);
        const criteria = {
          brand,
          model,
          resultsCount: data.stats?.totalItems || totalResults,
          platformsCount: data.stats?.sitesScraped || 0,
        };
        setSearchCriteria(criteria);

        // Sauvegarder dans localStorage pour persistance (uniquement si succès)
        if (totalResults > 0) {
          try {
            const searchId = searchParams.get('searchId'); // Si on a un ID de recherche
            const resultsData = {
              listings,
              siteResults: siteResults,
              stats: data.stats,
            };
            
            localStorage.setItem('searchResults', JSON.stringify(resultsData));
            localStorage.setItem('searchCriteria', JSON.stringify(criteria));
            
            // Si on a un ID de recherche, sauvegarder aussi avec cette clé pour l'historique
            if (searchId) {
              localStorage.setItem(`searchResults_${searchId}`, JSON.stringify(resultsData));
            }
          } catch (e) {
            // Ignore les erreurs localStorage (quota, etc.)
          }
        }

        // 🎯 Sauvegarder dans l'historique (uniquement si succès)
        // Sauvegarder même si seulement siteResults (recherche sur sites marchands)
        // FORCER la sauvegarde même avec 0 résultats pour tester
        console.log('[Resultats] 🎯 Tentative sauvegarde recherche dans l\'historique', {
          brand,
          model,
          max_price: maxPrice ? Number(maxPrice) : undefined,
          resultsCount: data.stats?.totalItems || totalResults,
          listingsCount: listings.length,
          siteResultsCount: siteResults.length,
          totalResults,
          willSave: totalResults > 0
        })
        
        if (totalResults > 0) {
          try {
            // Sauvegarder la recherche avec tous les résultats
            const searchId = await saveSearch({
              brand,
              model,
              max_price: maxPrice ? Number(maxPrice) : undefined,
              budget: maxPrice ? Number(maxPrice) : undefined,
              location: 'France',
              resultsCount: data.stats?.totalItems || totalResults,
              results: data.listings || [], // Sauvegarder tous les résultats
              filters: {
                fuelType: fuelType && fuelType !== "all" ? fuelType : undefined,
              }
            })
            
            console.log('[Resultats] ✅ Recherche sauvegardée avec succès dans l\'historique, ID:', searchId)
            
            // Sauvegarder les résultats avec l'ID de recherche pour l'historique
            if (searchId) {
              try {
                localStorage.setItem(`searchResults_${searchId}`, JSON.stringify({
                  listings,
                  siteResults: siteResults,
                  stats: data.stats,
                }));
                console.log('[Resultats] ✅ Résultats sauvegardés avec ID:', searchId)
              } catch (e) {
                console.error('[Resultats] Erreur sauvegarde résultats avec ID:', e)
              }
            }
          } catch (err) {
            console.error('[Resultats] ❌ Erreur sauvegarde historique:', err)
            console.error('[Resultats] Détails erreur:', {
              message: err instanceof Error ? err.message : String(err),
              stack: err instanceof Error ? err.stack : undefined
            })
            // Ne pas bloquer l'utilisateur si la sauvegarde échoue
          }
        } else {
          console.log('[Resultats] ⚠️ Aucun résultat, skip sauvegarde historique (totalResults = 0)')
        }

        if (listings.length === 0) {
          setState("empty");
        } else {
          setState("success");
        }
      } else {
        setResults([]);
        setSiteResults([]);
        setState("empty");
      }
    } catch (err: any) {
      // Ignorer les erreurs d'annulation
      if (err.name === 'AbortError' || err.message?.includes('aborted')) {
        console.log('[SEARCH] Requête annulée');
        setState("empty");
        return;
      }
      
      console.error("Erreur recherche:", err);
      
      // Messages d'erreur plus clairs et utiles
      let errorMessage = "Une erreur est survenue lors de la recherche";
      
      if (err.message) {
        if (err.message.includes('timeout') || err.message.includes('Timeout')) {
          errorMessage = "La recherche a pris trop de temps. Veuillez réessayer avec moins de sites ou des critères moins restrictifs.";
        } else if (err.message.includes('network') || err.message.includes('fetch')) {
          errorMessage = "Problème de connexion. Vérifiez votre connexion internet et réessayez.";
        } else if (err.message.includes('quota') || err.message.includes('Quota')) {
          errorMessage = "Votre quota de recherches est épuisé. Veuillez mettre à jour votre abonnement.";
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
      setState("error");
      setResults([]);
      setSiteResults([]);
      
      // Afficher un toast pour informer l'utilisateur
      toast.error(errorMessage, {
        duration: 5000,
      });
    } finally {
      // Réinitialiser le flag
      inFlightRef.current = false;
      abortControllerRef.current = null;
    }
  };


  // Fonction pour calculer la pertinence d'une annonce avec les critères de recherche
  const calculateRelevance = (listing: ListingResponse, searchBrand: string, searchModel: string): number => {
    let relevance = 0
    const title = (listing.title || '').toLowerCase()
    const brandLower = searchBrand.toLowerCase()
    const modelLower = (searchModel || '').toLowerCase()
    
    // Vérifier si le titre est générique (comme "Annonce LaCentrale" sans marque/modèle)
    const isGenericTitle = title.includes('annonce') && 
                          (title.includes('lacentrale') || title.includes('leboncoin') || 
                           title.includes('transakauto') || title.includes('autoscout')) &&
                          !title.includes(brandLower)
    
    if (isGenericTitle) {
      // Titre générique sans marque = pertinence 0 (exclusion totale)
      return 0
    }
    
    // Vérifier la correspondance de la marque (critère essentiel)
    if (title.includes(brandLower)) {
      relevance += 50 // 50 points pour la marque
      
      // Vérifier la correspondance du modèle (critère important)
      if (modelLower && title.includes(modelLower)) {
        relevance += 40 // 40 points supplémentaires pour le modèle
      } else if (modelLower) {
        // Modèle non trouvé, pénalité
        relevance -= 20
      }
    } else {
      // Marque non trouvée, pertinence 0 (exclusion totale)
      return 0
    }
    
    // Bonus si le titre contient exactement la marque et le modèle
    if (title.includes(brandLower) && modelLower && title.includes(modelLower)) {
      // Vérifier si c'est une correspondance exacte ou proche
      const brandIndex = title.indexOf(brandLower)
      const modelIndex = title.indexOf(modelLower)
      if (Math.abs(brandIndex - modelIndex) < 20) {
        relevance += 10 // Bonus pour correspondance proche
      }
    }
    
    return Math.max(0, Math.min(100, relevance)) // Clamp entre 0 et 100
  }
  
  // Trier les résultats avec pertinence + score
  const brand = searchParams.get("brand") || ""
  const model = searchParams.get("model") || ""
  
  const sortedResults = [...results].sort((a, b) => {
    switch (sortBy) {
      case "score":
        // Calculer un score combiné : pertinence (60%) + score IA (40%)
        const relevanceA = calculateRelevance(a, brand, model)
        const relevanceB = calculateRelevance(b, brand, model)
        const scoreA = a.score_final ?? a.score_ia ?? 0
        const scoreB = b.score_final ?? b.score_ia ?? 0
        
        // Score combiné : pertinence * 0.6 + score IA * 0.4
        const combinedScoreA = relevanceA * 0.6 + scoreA * 0.4
        const combinedScoreB = relevanceB * 0.6 + scoreB * 0.4
        
        // Si la pertinence est très faible (< 30), pénaliser fortement
        if (relevanceA < 30 && relevanceB >= 30) return 1
        if (relevanceB < 30 && relevanceA >= 30) return -1
        
        return combinedScoreB - combinedScoreA
      case "price-asc":
        return (a.price_eur ?? 0) - (b.price_eur ?? 0);
      case "price-desc":
        return (b.price_eur ?? 0) - (a.price_eur ?? 0);
      case "mileage":
        return (a.mileage_km ?? 0) - (b.mileage_km ?? 0);
      case "year":
        return (b.year ?? 0) - (a.year ?? 0);
      default:
        return 0;
    }
  });
  
  // Filtrer les résultats non pertinents (pertinence = 0) avant de prendre le top 3
  // Une annonce avec pertinence 0 ne doit JAMAIS être dans le top 3
  const relevantResults = sortedResults.filter(r => {
    const relevance = calculateRelevance(r, brand, model)
    return relevance > 0 // Exclure strictement les annonces avec pertinence 0
  })
  
  // Si on a moins de 3 résultats pertinents, on prend ce qu'on a (mais jamais les non-pertinents)
  const top3Results = relevantResults.length > 0 ? relevantResults.slice(0, 3) : []
  // Les autres résultats sont ceux qui sont pertinents mais pas dans le top 3
  const otherResults = relevantResults.slice(3)

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-400 bg-green-600/10 border-green-500/30";
    if (score >= 60) return "text-orange-400 bg-orange-600/10 border-orange-500/30";
    return "text-red-400 bg-red-600/10 border-red-500/30";
  };

  const getScoreBadgeColor = (score: number) => {
    if (score >= 80) return "bg-gradient-to-r from-green-500 to-green-600 border-green-400/30";
    if (score >= 60) return "bg-gradient-to-r from-orange-500 to-orange-600 border-orange-400/30";
    return "bg-gradient-to-r from-red-500 to-red-600 border-red-400/30";
  };

  // État chargement - Utiliser le composant SearchLoadingMultisite
  if (state === "loading") {
    return (
      <SearchLoadingMultisite
        jobId={jobId}
        onCancel={() => {
          // Rediriger vers la page de recherche après annulation
          router.push("/recherche");
        }}
        searchCriteria={{
          brand: searchParams.get("brand") || undefined,
          model: searchParams.get("model") || undefined,
        }}
        excludedSites={searchParams.get("excludedSites")?.split(',').map(s => s.trim()) || []}
        realSiteResults={siteResults.map(sr => {
          // Convertir SiteResult de src/core/types vers lib/search-types
          // Dans src/core/types, items est un number, mais dans lib/search-types c'est Listing[]
          // On passe un tableau vide car les listings sont dans results, pas dans siteResults
          return {
            site: sr.site,
            ok: sr.ok,
            items: [],
            error: sr.error,
            ms: sr.ms || 0,
            strategy: sr.strategy || ''
          } as import('@/lib/search-types').SiteResult;
        })} // Passer les données réelles si disponibles
      />
    );
  }

  // État erreur
  if (state === "error") {
    return (
      <div className="bg-[#0a0a0a] text-white min-h-screen pt-20 flex items-center justify-center">
        <div className="max-w-md mx-auto px-4 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-500/20 rounded-full mb-6 border border-red-500/30">
            <AlertCircle className="size-8 text-red-400" />
          </div>
          <h1 className="text-white mb-4">Une erreur est survenue</h1>
          <p className="text-gray-400 mb-8">
            {error || "Nous n'avons pas pu effectuer la recherche. Veuillez réessayer."}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={() => {
                const brand = searchParams.get("brand") || "";
                const model = searchParams.get("model") || "";
                const maxPrice = searchParams.get("max_price") || "";
                const minPrice = searchParams.get("min_price") || "";
                const fuelType = searchParams.get("fuelType") || "";
                const yearMin = searchParams.get("yearMin") || "";
                const yearMax = searchParams.get("yearMax") || "";
                const mileageMax = searchParams.get("mileageMax") || "";
                const location = searchParams.get("location") || "";
                const transmission = searchParams.get("transmission") || "";
                const bodyType = searchParams.get("bodyType") || "";
                const doors = searchParams.get("doors") || "";
                const seats = searchParams.get("seats") || "";
                const color = searchParams.get("color") || "";
                const excludedSites = searchParams.get("excludedSites") || "";
                performSearch(brand, model, maxPrice, minPrice, fuelType, yearMin, yearMax, mileageMax, location, transmission, bodyType, doors, seats, color, excludedSites);
              }}
            >
              Réessayer
            </Button>
            <Button variant="outline" asChild>
              <Link href="/recherche">Modifier ma recherche</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // État aucun résultat
  if (state === "empty") {
    return (
      <div className="bg-[#0a0a0a] text-white min-h-screen pt-20 flex items-center justify-center">
        <div className="max-w-md mx-auto px-4 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/5 backdrop-blur-xl border border-white/10 rounded-full mb-6">
            <Search className="size-8 text-gray-400" />
          </div>
          <h1 className="text-white mb-4">Aucune annonce trouvée</h1>
          <p className="text-gray-400 mb-8">
            Nous n'avons trouvé aucun résultat correspondant à vos critères. Essayez d'élargir votre recherche.
          </p>
          <Button asChild>
            <Link href="/recherche">
              <Search className="size-4 mr-2" />
              Modifier ma recherche
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  // État résultats normaux
  return (
    <div className="bg-[#0a0a0a] text-white min-h-screen pt-16 sm:pt-20">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/3 w-[400px] h-[400px] bg-purple-600/10 rounded-full blur-[100px]"></div>
      </div>
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 md:py-12">
        {/* En-tête de page - Design amélioré */}
        <div className="mb-8 sm:mb-12">
          <div className="flex flex-wrap gap-2 mb-4 sm:mb-6">
            <Badge variant="outline" className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs sm:text-sm backdrop-blur-sm">
              {searchCriteria.resultsCount} annonces
            </Badge>
            <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500/30 text-xs sm:text-sm backdrop-blur-sm">
              {searchCriteria.platformsCount} plateformes
            </Badge>
            <Badge variant="outline" className="bg-white/10 text-white border-white/20 text-xs sm:text-sm backdrop-blur-sm">
              {searchCriteria.brand} {searchCriteria.model}
            </Badge>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-medium text-white mb-3 sm:mb-4">
            Résultats de la recherche
            <br />
            <span className="bg-gradient-to-r from-blue-400 via-blue-500 to-purple-500 bg-clip-text text-transparent">
              propulsée par l&apos;IA
            </span>
          </h1>
          <p className="text-base sm:text-lg text-gray-400 max-w-2xl">
            Notre IA a analysé des milliers d&apos;annonces et calculé un score de fiabilité pour chaque véhicule.
          </p>
        </div>

        {/* Barre d'actions - Design amélioré */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-lg p-4 sm:p-6 mb-6 sm:mb-8 shadow-lg">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-start sm:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-start sm:items-center flex-1 w-full sm:w-auto">
              <div className="flex items-center gap-2">
                <Filter className="size-3 sm:size-4 text-gray-400" />
                <span className="text-xs sm:text-sm text-white">Trier par :</span>
              </div>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-full sm:w-[180px] text-xs sm:text-sm h-9 sm:h-10">
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

            <Button variant="outline" asChild className="w-full sm:w-auto text-xs sm:text-sm h-9 sm:h-10">
              <Link href="/recherche" className="flex items-center justify-center">
                <Search className="size-3 sm:size-4 mr-2" />
                <span className="hidden sm:inline">Nouvelle recherche</span>
                <span className="sm:hidden">Rechercher</span>
              </Link>
            </Button>
          </div>
        </div>

        {/* Section "Par site" */}
        {siteResults.length > 0 && (
          <div className="mb-6 sm:mb-8">
            <h2 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4">Détail par site</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {siteResults.map((siteResult) => (
                <Card key={siteResult.site} className="bg-white/5 backdrop-blur-xl border-white/10">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {siteResult.ok ? (
                          <CheckCircle2 className="size-5 text-green-400" />
                        ) : (
                          <XCircle className="size-5 text-red-400" />
                        )}
                        <span className="font-semibold text-white">{siteResult.site}</span>
                      </div>
                      <Badge
                        variant={siteResult.ok ? "default" : "destructive"}
                        className={siteResult.ok ? "bg-green-600" : "bg-red-600"}
                      >
                        {siteResult.ok ? "OK" : "KO"}
                      </Badge>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-gray-400">
                        <Clock className="size-4" />
                        <span>{siteResult.ms}ms</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-400">
                        <Search className="size-4" />
                        <span>{siteResult.items} résultat{siteResult.items !== 1 ? 's' : ''}</span>
                      </div>
                      {siteResult.error && (
                        <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 p-2 rounded">
                          {siteResult.error === 'timeout' 
                            ? 'Timeout (critères trop stricts)' 
                            : siteResult.items === 0 && siteResult.ok
                            ? '0 résultat (critères trop stricts)'
                            : siteResult.error}
                        </div>
                      )}
                      {(siteResult as any).retryUsed && (
                        <div className="text-xs text-blue-400 bg-blue-500/10 border border-blue-500/20 p-2 rounded">
                          Fallback utilisé (requête assouplie)
                        </div>
                      )}
                    </div>

                    {!siteResult.ok && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3 w-full"
                        onClick={async () => {
                          // Réessayer ce site spécifique
                          const brand = searchParams.get("brand") || "";
                          const model = searchParams.get("model") || "";
                          const maxPrice = searchParams.get("max_price") || "";
                          const minPrice = searchParams.get("min_price") || "";
                          const fuelType = searchParams.get("fuelType") || "";
                          const yearMin = searchParams.get("yearMin") || "";
                          const yearMax = searchParams.get("yearMax") || "";
                          const mileageMax = searchParams.get("mileageMax") || "";
                          const location = searchParams.get("location") || "";
                          const transmission = searchParams.get("transmission") || "";
                          const bodyType = searchParams.get("bodyType") || "";
                          const doors = searchParams.get("doors") || "";
                          const seats = searchParams.get("seats") || "";
                          const color = searchParams.get("color") || "";
                          const excludedSites = searchParams.get("excludedSites") || "";
                          
                          // Pour l'instant, on relance toute la recherche
                          // TODO: Implémenter un endpoint pour réessayer un site spécifique
                          await performSearch(brand, model, maxPrice, minPrice, fuelType, yearMin, yearMax, mileageMax, location, transmission, bodyType, doors, seats, color, excludedSites);
                          toast.info(`Réessai de ${siteResult.site}...`);
                        }}
                      >
                        <RefreshCw className="size-4 mr-2" />
                        Réessayer ce site
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Top 3 meilleures annonces - Mise en avant */}
        {top3Results.length > 0 && (
          <div className="mb-8 sm:mb-12">
            <div className="flex items-center gap-3 mb-4 sm:mb-6">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 shadow-lg shadow-yellow-500/25">
                <Sparkles className="size-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-semibold text-white">Top 3 - Meilleures opportunités</h2>
                <p className="text-sm text-gray-400">Les annonces les plus pertinentes selon notre IA</p>
              </div>
            </div>
            <div className="grid md:grid-cols-3 gap-4 sm:gap-6 items-stretch">
              {top3Results.map((result, index) => {
                const rank = index + 1;
                const hasPremiumScore = !!(result as any).premiumScore;
                
                // ✅ Utiliser le composant premium si disponible
                if (hasPremiumScore) {
                  return (
                    <div key={result.id} className="relative">
                      {/* Badge de rang pour Top 3 */}
                      <div className="absolute top-3 left-3 z-20">
                        <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0 shadow-lg text-sm font-bold w-10 h-10 rounded-full flex items-center justify-center">
                          {rank}
                        </Badge>
                      </div>
                      <div className="bg-white/5 backdrop-blur-xl rounded-lg border-2 border-yellow-500/30 shadow-xl shadow-yellow-500/10">
                        <ListingCardPremium 
                          listing={result as any}
                          showComparison={true}
                        />
                      </div>
                    </div>
                  );
                }
                
                // Fallback sur l'ancien format si pas de premiumScore
                const score = result.score_final ?? result.score_ia ?? 0;
                return (
                  <Card 
                    key={result.id} 
                    className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border-2 border-yellow-500/30 overflow-hidden hover:bg-white/15 hover:border-yellow-500/50 transition-all cursor-pointer shadow-xl shadow-yellow-500/10 relative"
                    onClick={() => {
                      let urlToOpen = result.url;
                      if (!urlToOpen) return;
                      if (urlToOpen.startsWith('/')) {
                        const domainMap: Record<string, string> = {
                          'LeBonCoin': 'https://www.leboncoin.fr',
                          'LaCentrale': 'https://www.lacentrale.fr',
                          'ParuVendu': 'https://www.paruvendu.fr',
                          'AutoScout24': 'https://www.autoscout24.fr',
                          'LeParking': 'https://www.leparking.fr',
                          'ProCarLease': 'https://procarlease.com',
                        };
                        const baseDomain = domainMap[result.source] || 'https://';
                        urlToOpen = baseDomain + urlToOpen;
                      } else if (!urlToOpen.startsWith('http://') && !urlToOpen.startsWith('https://')) {
                        urlToOpen = 'https://' + urlToOpen;
                      }
                      window.open(urlToOpen, '_blank', 'noopener,noreferrer');
                    }}
                  >
                    {/* Badge de rang */}
                    <div className="absolute top-3 left-3 z-10">
                      <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0 shadow-lg text-sm font-bold w-8 h-8 rounded-full flex items-center justify-center">
                        {rank}
                      </Badge>
                    </div>
                    <div className="relative">
                      <ImageWithFallback
                        src={result.imageUrl || FALLBACK_IMAGE}
                        alt={result.title}
                        className="w-full h-56 object-cover"
                      />
                      <div className="absolute top-3 right-3 flex gap-2 items-center">
                        <Badge className={`${getScoreBadgeColor(score)} text-white border shadow-lg backdrop-blur-sm`}>
                          Score IA : {score}/100
                        </Badge>
                        <div 
                          onClick={(e) => e.stopPropagation()}
                          className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-full p-1.5 shadow-lg hover:shadow-xl hover:bg-white/20 transition-all"
                        >
                          <FavoriteButton 
                            listing={result} 
                            variant="ghost" 
                            size="sm"
                            className="hover:bg-transparent text-white hover:text-red-400"
                          />
                        </div>
                      </div>
                    </div>

                    <CardContent className="p-6 space-y-4">
                      <div>
                        <h3 className="text-white font-semibold mb-1 text-lg">{result.title}</h3>
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                          {result.year && (
                            <>
                              <Calendar className="size-4" />
                              <span>{result.year}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="text-white text-xl font-bold">
                        {result.price_eur
                          ? new Intl.NumberFormat("fr-FR", {
                              style: "currency",
                              currency: "EUR",
                              maximumFractionDigits: 0,
                            }).format(result.price_eur)
                          : "Prix non disponible"}
                      </div>

                      <div className="space-y-2 text-sm">
                        {result.mileage_km && (
                          <div className="flex items-center gap-2 text-gray-400">
                            <Gauge className="size-4" />
                            <span>
                              {new Intl.NumberFormat("fr-FR").format(result.mileage_km)} km
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="pt-2 border-t border-white/10">
                        <span className="text-xs text-gray-400">Source : {result.source}</span>
                      </div>

                      <div className={`p-3 rounded-lg border backdrop-blur-xl ${getScoreColor(score)}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <Brain className="size-4" />
                          <span className="text-sm font-medium">Analyse IA</span>
                        </div>
                        <p className="text-xs opacity-90">
                          {score >= 80
                            ? "Excellente opportunité détectée"
                            : score >= 60
                            ? "Bonne offre, vérifications recommandées"
                            : "Points de vigilance détectés"}
                        </p>
                      </div>

                      <div className="flex gap-2 pt-2" onClick={(e) => e.stopPropagation()}>
                        <Button
                          className="flex-1 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white shadow-lg shadow-purple-500/25"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            let urlToOpen = result.url;
                            if (!urlToOpen || !urlToOpen.trim()) {
                              toast.error('URL invalide');
                              return;
                            }
                            urlToOpen = urlToOpen.trim();
                            if (urlToOpen.startsWith('/')) {
                              const domainMap: Record<string, string> = {
                                'LeBonCoin': 'https://www.leboncoin.fr',
                                'LaCentrale': 'https://www.lacentrale.fr',
                                'ParuVendu': 'https://www.paruvendu.fr',
                                'Autoscout24': 'https://www.autoscout24.fr',
                                'LeParking': 'https://www.leparking.fr',
                                'ProCarLease': 'https://procarlease.com',
                              };
                              const baseDomain = domainMap[result.source] || 'https://';
                              urlToOpen = baseDomain + urlToOpen;
                            } else if (!urlToOpen.startsWith('http://') && !urlToOpen.startsWith('https://')) {
                              urlToOpen = 'https://' + urlToOpen;
                            }
                            try {
                              new URL(urlToOpen);
                            } catch (e) {
                              toast.error('URL invalide pour cette annonce');
                              return;
                            }
                            window.open(urlToOpen, '_blank', 'noopener,noreferrer');
                          }}
                        >
                          <Eye className="size-4 mr-2" />
                          Voir les détails
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
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
                );
              })}
            </div>
          </div>
        )}

        {/* Autres résultats */}
        {otherResults.length > 0 && (
          <div>
            <h2 className="text-lg sm:text-xl font-semibold text-white mb-4 sm:mb-6">Toutes les annonces</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
              {otherResults.map((result) => {
            const score = result.score_final ?? result.score_ia ?? 0;
            const hasPremiumScore = !!(result as any).premiumScore;
            
            // ✅ Utiliser le composant premium si disponible
            if (hasPremiumScore) {
              return (
                <div key={result.id} className="bg-white/5 backdrop-blur-xl rounded-lg border border-white/10 p-4">
                  <ListingCardPremium 
                    listing={result as any}
                    showComparison={true}
                  />
                </div>
              );
            }
            
            // Sinon, utiliser l'ancien composant (compatibilité)
            return (
              <Card key={result.id} className="bg-white/5 backdrop-blur-xl border-white/10 overflow-hidden hover:bg-white/10 hover:border-white/20 transition-all cursor-pointer" onClick={() => {
                // Normaliser et valider l'URL avant ouverture
                let urlToOpen = result.url;
                
                // Validation et normalisation de l'URL
                if (!urlToOpen) return;
                
                // Si l'URL est relative, la convertir en absolue
                if (urlToOpen.startsWith('/')) {
                  const domainMap: Record<string, string> = {
                    'LeBonCoin': 'https://www.leboncoin.fr',
                    'LaCentrale': 'https://www.lacentrale.fr',
                    'ParuVendu': 'https://www.paruvendu.fr',
                    'AutoScout24': 'https://www.autoscout24.fr',
                    'LeParking': 'https://www.leparking.fr',
                    'ProCarLease': 'https://procarlease.com',
                  };
                  const baseDomain = domainMap[result.source] || 'https://';
                  urlToOpen = baseDomain + urlToOpen;
                } else if (!urlToOpen.startsWith('http://') && !urlToOpen.startsWith('https://')) {
                  // URL sans protocole, ajouter https://
                  urlToOpen = 'https://' + urlToOpen;
                }
                
                // Ouvrir dans un nouvel onglet pour garder la page de recherche
                window.open(urlToOpen, '_blank', 'noopener,noreferrer');
              }}>
                <div className="relative">
                  <ImageWithFallback
                    src={result.imageUrl || FALLBACK_IMAGE}
                    alt={result.title}
                    className="w-full h-48 object-cover"
                  />
                  <div className="absolute top-3 right-3 flex gap-2 items-center">
                    <Badge className={`${getScoreBadgeColor(score)} text-white border shadow-lg backdrop-blur-sm`}>
                      Score IA : {score}/100
                    </Badge>
                    <div 
                      onClick={(e) => e.stopPropagation()}
                      className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-full p-1.5 shadow-lg hover:shadow-xl hover:bg-white/20 transition-all"
                    >
                      <FavoriteButton 
                        listing={result} 
                        variant="ghost" 
                        size="sm"
                        className="hover:bg-transparent text-white hover:text-red-400"
                      />
                    </div>
                  </div>
                </div>

                <CardContent className="p-6 space-y-4">
                  {/* Titre */}
                  <div>
                    <h3 className="text-white mb-1">{result.title}</h3>
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      {result.year && (
                        <>
                          <Calendar className="size-4" />
                          <span>{result.year}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Prix */}
                  <div className="text-white text-lg font-semibold">
                    {result.price_eur
                      ? new Intl.NumberFormat("fr-FR", {
                          style: "currency",
                          currency: "EUR",
                          maximumFractionDigits: 0,
                        }).format(result.price_eur)
                      : "Prix non disponible"}
                  </div>

                  {/* Détails */}
                  <div className="space-y-2 text-sm">
                    {result.mileage_km && (
                      <div className="flex items-center gap-2 text-gray-400">
                        <Gauge className="size-4" />
                        <span>
                          {new Intl.NumberFormat("fr-FR").format(result.mileage_km)} km
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Source */}
                  <div className="pt-2 border-t border-white/10">
                    <span className="text-xs text-gray-400">Source : {result.source}</span>
                  </div>

                  {/* Score détaillé */}
                  <div className={`p-3 rounded-lg border backdrop-blur-xl ${getScoreColor(score)}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <Brain className="size-4" />
                      <span className="text-sm font-medium">Analyse IA</span>
                    </div>
                    <p className="text-xs opacity-90">
                      {score >= 80
                        ? "Excellente opportunité détectée"
                        : score >= 60
                        ? "Bonne offre, vérifications recommandées"
                        : "Points de vigilance détectés"}
                    </p>
                  </div>

                  {/* Boutons */}
                  <div className="flex gap-2 pt-2" onClick={(e) => e.stopPropagation()}>
                    <Button
                      className="flex-1 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white shadow-lg shadow-purple-500/25"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        // Validation et normalisation de l'URL
                        let urlToOpen = result.url;
                        
                        // Vérifier que l'URL est valide
                        if (!urlToOpen || !urlToOpen.trim()) {
                          toast.error('URL invalide');
                          return;
                        }
                        
                        // Normaliser l'URL si nécessaire
                        urlToOpen = urlToOpen.trim();
                        
                        // Si l'URL est relative, la compléter selon la source
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
                          const baseDomain = domainMap[result.source] || 'https://';
                          urlToOpen = baseDomain + urlToOpen;
                        } else if (!urlToOpen.startsWith('http://') && !urlToOpen.startsWith('https://')) {
                          // URL sans protocole, ajouter https://
                          urlToOpen = 'https://' + urlToOpen;
                        }
                        
                        // Validation finale
                        try {
                          new URL(urlToOpen);
                        } catch (e) {
                          console.error('URL invalide:', urlToOpen, result);
                          toast.error('URL invalide pour cette annonce');
                          return;
                        }
                        
                        // Tracking du clic sortant
                        if (typeof window !== 'undefined' && (window as any).gtag) {
                          (window as any).gtag('event', {
                            event_category: 'listing',
                            event_label: result.source,
                            value: result.price_eur || 0,
                          });
                        }
                        
                        // Ouvrir directement le site marchand
                        window.open(urlToOpen, '_blank', 'noopener,noreferrer');
                      }}
                    >
                      <Eye className="size-4 mr-2" />
                      Voir les détails
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        // Copier le lien dans le presse-papier
                        navigator.clipboard.writeText(result.url).then(() => {
                          toast.success('Lien copié dans le presse-papier');
                        }).catch(() => {
                          // Fallback si clipboard API n'est pas disponible
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
            );
          })}
        </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SearchResultsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900">
        <Loader2 className="size-8 animate-spin text-blue-500" />
      </div>
    }>
      <SearchResultsContent />
    </Suspense>
  );
}

