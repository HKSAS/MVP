'use client'

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Sparkles, Loader2, ChevronUp, ChevronDown, Filter } from "lucide-react";
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from "sonner";
import { useQuotaCheck } from "@/lib/auth/with-quota-check";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function SearchPage() {
  const router = useRouter();
  const { checkAndTrack, PaywallModal } = useQuotaCheck('recherche');
  
  // Vérifier l'authentification au chargement
  useEffect(() => {
    const checkAuth = async () => {
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/signup?redirect=/recherche');
      }
    };
    checkAuth();
  }, [router]);

  // États de base
  const [searching, setSearching] = useState(false);
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [budget, setBudget] = useState("");
  const [fuel, setFuel] = useState("");
  const [error, setError] = useState<string | null>(null);
  
  // États filtres avancés
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showSites, setShowSites] = useState(false);
  const [yearMin, setYearMin] = useState("");
  const [yearMax, setYearMax] = useState("");
  const [mileageMax, setMileageMax] = useState("");
  const [location, setLocation] = useState("");
  const [transmission, setTransmission] = useState("");
  const [bodyType, setBodyType] = useState("");
  const [doors, setDoors] = useState("");
  const [seats, setSeats] = useState("");
  const [color, setColor] = useState("");
  const [minPrice, setMinPrice] = useState("");
  
  // Sites disponibles pour le scraping
  const availableSites = [
    { id: 'LeBonCoin', name: 'LeBonCoin', icon: '🏷️' },
    { id: 'LaCentrale', name: 'LaCentrale', icon: '🚗' },
    { id: 'AutoScout24', name: 'AutoScout24', icon: '🌍' },
    { id: 'LeParking', name: 'LeParking', icon: '🅿️' },
    { id: 'ProCarLease', name: 'ProCarLease', icon: '💼' },
    { id: 'Kyump', name: 'Kyump', icon: '🔍' },
    { id: 'TransakAuto', name: 'TransakAuto', icon: '🚙' },
  ];
  
  // État pour les sites sélectionnés (par défaut tous activés)
  const [selectedSites, setSelectedSites] = useState<Set<string>>(
    new Set(availableSites.map(s => s.id))
  );
  
  // Garde-fou pour empêcher les appels simultanés
  const inFlightRef = useRef(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-complétion marques populaires
  const popularBrands = [
    'Audi', 'BMW', 'Citroën', 'Dacia', 'Fiat', 'Ford', 'Mercedes', 
    'Opel', 'Peugeot', 'Renault', 'Seat', 'Skoda', 'Toyota', 'Volkswagen'
  ];

  // Auto-complétion modèles selon marque
  const getModelsByBrand = (brandName: string): string[] => {
    const models: Record<string, string[]> = {
      'renault': ['Clio', 'Megane', 'Captur', 'Kadjar', 'Scenic', 'Talisman', 'Koleos'],
      'peugeot': ['208', '308', '3008', '5008', '2008', '508', 'Partner'],
      'citroën': ['C3', 'C4', 'C5', 'Berlingo', 'Cactus', 'C4 Picasso'],
      'volkswagen': ['Polo', 'Golf', 'Passat', 'Tiguan', 'Touareg', 'T-Cross'],
      'audi': ['A3', 'A4', 'A5', 'A6', 'Q3', 'Q5', 'Q7'],
      'bmw': ['Série 1', 'Série 3', 'Série 5', 'X1', 'X3', 'X5'],
      'mercedes': ['Classe A', 'Classe C', 'Classe E', 'GLA', 'GLC', 'GLE'],
      'ford': ['Fiesta', 'Focus', 'Mondeo', 'Kuga', 'Edge', 'Mustang'],
      'opel': ['Corsa', 'Astra', 'Insignia', 'Crossland', 'Grandland'],
      'toyota': ['Yaris', 'Corolla', 'C-HR', 'RAV4', 'Prius', 'Auris'],
    };
    return models[brandName.toLowerCase()] || [];
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Guard : empêcher le double lancement
    if (searching || inFlightRef.current) {
      return;
    }
    
    // Validation basique
    if (!brand.trim() || !model.trim()) {
      setError("Veuillez remplir au moins la marque et le modèle");
      toast.error("Marque et modèle requis");
      return;
    }
    
    // Vérifier qu'au moins un site est sélectionné
    if (selectedSites.size === 0) {
      setError("Veuillez sélectionner au moins un site à rechercher");
      toast.error("Sélectionnez au moins un site");
      return;
    }

    // Validation année
    if (yearMin && yearMax && parseInt(yearMin) > parseInt(yearMax)) {
      setError("L'année minimum doit être inférieure à l'année maximum");
      toast.error("Vérifiez les années");
      return;
    }

    // Validation prix
    if (minPrice && budget && parseInt(minPrice) > parseInt(budget)) {
      setError("Le prix minimum doit être inférieur au prix maximum");
      toast.error("Vérifiez les prix");
      return;
    }

    // Nettoyer le timer de debounce précédent
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    // Debounce de 400ms
    debounceTimerRef.current = setTimeout(async () => {
      inFlightRef.current = true;
      setSearching(true);
      setError(null);

      // Vérifier et tracker le quota AVANT de continuer
      const quotaCheck = await checkAndTrack(
        async () => {
          // Construire les paramètres de recherche pour l'URL
          const params = new URLSearchParams({
            brand: brand.trim(),
            model: model.trim(),
          });

          if (budget.trim()) {
            params.set("max_price", budget.trim());
          }

          if (minPrice.trim()) {
            params.set("min_price", minPrice.trim());
          }

          if (fuel && fuel !== "all") {
            params.set("fuelType", fuel);
          }

          if (yearMin.trim()) {
            params.set("yearMin", yearMin.trim());
          }

          if (yearMax.trim()) {
            params.set("yearMax", yearMax.trim());
          }

          if (mileageMax.trim()) {
            params.set("mileageMax", mileageMax.trim());
          }

          if (location.trim()) {
            params.set("location", location.trim());
          }

          if (transmission && transmission !== "all") {
            params.set("transmission", transmission);
          }

          if (bodyType && bodyType !== "all") {
            params.set("bodyType", bodyType);
          }

          if (doors && doors !== "all") {
            params.set("doors", doors);
          }

          if (seats && seats !== "all") {
            params.set("seats", seats);
          }

          if (color && color !== "all") {
            params.set("color", color);
          }
          
          // Ajouter les sites exclus (sites non sélectionnés)
          const excludedSites = availableSites
            .filter(site => !selectedSites.has(site.id))
            .map(site => site.id);
          
          if (excludedSites.length > 0) {
            params.set("excludedSites", excludedSites.join(','));
          }

          // Rediriger vers la page de résultats
          router.push(`/resultats?${params.toString()}`);
          return { success: true };
        },
        {
          brand: brand.trim(),
          model: model.trim(),
          budget: budget.trim(),
          fuel: fuel,
          yearMin: yearMin.trim(),
          yearMax: yearMax.trim(),
          mileageMax: mileageMax.trim(),
        }
      );

      // Si quota épuisé, le modal s'affiche automatiquement
      if (!quotaCheck.success) {
        setError(quotaCheck.error || "Quota épuisé");
        setSearching(false);
        inFlightRef.current = false;
        return;
      }

      // Succès - la redirection a été faite dans checkAndTrack
      setSearching(false);
      inFlightRef.current = false;
    }, 400);
  };

  // Formatage automatique du budget
  const formatBudget = (value: string) => {
    const num = value.replace(/\D/g, '');
    if (!num) return '';
    return parseInt(num).toLocaleString('fr-FR');
  };

  const handleBudgetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    setBudget(value);
  };

  const handleMinPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    setMinPrice(value);
  };

  const handleMileageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    setMileageMax(value);
  };

  // Modèles suggérés selon marque
  const suggestedModels = brand ? getModelsByBrand(brand) : [];

  return (
    <div className="bg-[#0a0a0a] text-white min-h-screen pt-16 sm:pt-20">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-1/4 right-1/3 w-[400px] h-[400px] bg-purple-600/10 rounded-full blur-[100px]"></div>
      </div>

      {/* Hero Section */}
      <section className="relative pt-16 sm:pt-20 md:pt-24 pb-12 sm:pb-16 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto relative z-10">
          <motion.div
            className="text-center mb-8 sm:mb-10 md:mb-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Badge variant="secondary" className="bg-white/10 text-white border-white/20 rounded-full px-3 sm:px-4 py-1.5 sm:py-2 mb-4 sm:mb-6 text-xs sm:text-sm">
              <Sparkles className="size-3 sm:size-4 mr-2 inline" />
              Recherche propulsée par l&apos;IA
            </Badge>
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-medium text-white mb-3 sm:mb-4 px-2">
              Rechercher une voiture
              <br />
              <span className="bg-gradient-to-r from-blue-400 via-blue-500 to-purple-500 bg-clip-text text-transparent">
                avec l&apos;IA
              </span>
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-gray-400 max-w-2xl mx-auto px-4">
              Notre IA analyse des milliers d&apos;annonces pour vous proposer les meilleures offres
            </p>
          </motion.div>

          {/* Search Form Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Card className="bg-white/5 backdrop-blur-xl border border-blue-500/20 shadow-lg shadow-blue-500/10">
              <CardContent className="p-6 sm:p-8">
                {error && (
                  <div className="mb-4 rounded-lg border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-400">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSearch} className="space-y-6">
                  {/* Filtres de base */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    {/* Colonne gauche */}
                    {/* Marque */}
                    <div className="space-y-2">
                      <Label htmlFor="brand" className="text-sm font-medium text-blue-300">
                        Marque
                      </Label>
                      <div className="relative">
                        <Input
                          id="brand"
                          placeholder="Ex: Audi, Renault..."
                          value={brand}
                          onChange={(e) => setBrand(e.target.value)}
                          className="bg-white/5 backdrop-blur-sm border border-blue-500/20 text-white placeholder:text-gray-500 focus:border-blue-500/40 focus:ring-blue-500/20 h-11 rounded-xl shadow-sm shadow-blue-500/5 transition-all"
                          disabled={searching}
                          list="brands-list"
                        />
                        <datalist id="brands-list">
                          {popularBrands.map((b) => (
                            <option key={b} value={b} />
                          ))}
                        </datalist>
                      </div>
                    </div>

                    {/* Colonne droite */}
                    {/* Modèle */}
                    <div className="space-y-2">
                      <Label htmlFor="model" className="text-sm font-medium text-blue-300">
                        Modèle
                      </Label>
                      <div className="relative">
                        <Input
                          id="model"
                          placeholder="Ex: A3, Clio..."
                          value={model}
                          onChange={(e) => setModel(e.target.value)}
                          className="bg-white/5 backdrop-blur-sm border border-blue-500/20 text-white placeholder:text-gray-500 focus:border-blue-500/40 focus:ring-blue-500/20 h-11 rounded-xl shadow-sm shadow-blue-500/5 transition-all"
                          disabled={searching}
                          list="models-list"
                        />
                        <datalist id="models-list">
                          {suggestedModels.map((m) => (
                            <option key={m} value={m} />
                          ))}
                        </datalist>
                      </div>
                    </div>

                    {/* Colonne gauche - Ligne 2 */}
                    {/* Budget maximum */}
                    <div className="space-y-2">
                      <Label htmlFor="budget" className="text-sm font-medium text-blue-300">
                        Budget maximum (€)
                      </Label>
                      <Input
                        id="budget"
                        type="text"
                        placeholder="Ex: 25000"
                        value={budget ? parseInt(budget).toLocaleString('fr-FR') : ''}
                        onChange={handleBudgetChange}
                        className="bg-white/5 backdrop-blur-sm border border-blue-500/20 text-white placeholder:text-gray-500 focus:border-blue-500/40 focus:ring-blue-500/20 h-11 rounded-xl shadow-sm shadow-blue-500/5 transition-all"
                        disabled={searching}
                      />
                    </div>

                    {/* Colonne droite - Ligne 2 */}
                    {/* Type de carburant */}
                    <div className="space-y-2">
                      <Label htmlFor="fuel" className="text-sm font-medium text-blue-300">
                        Type de carburant
                      </Label>
                      <Select value={fuel} onValueChange={setFuel} disabled={searching}>
                        <SelectTrigger 
                          id="fuel"
                          className="bg-white/5 backdrop-blur-sm border border-blue-500/20 text-white focus:border-blue-500/40 focus:ring-blue-500/20 h-11 rounded-xl shadow-sm shadow-blue-500/5 transition-all"
                        >
                          <SelectValue placeholder="Sélectionner" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1a1a1a] border-white/20">
                          <SelectItem value="all">Tous</SelectItem>
                          <SelectItem value="essence">Essence</SelectItem>
                          <SelectItem value="diesel">Diesel</SelectItem>
                          <SelectItem value="electrique">Électrique</SelectItem>
                          <SelectItem value="hybride">Hybride</SelectItem>
                          <SelectItem value="hybride_rechargeable">Hybride rechargeable</SelectItem>
                          <SelectItem value="gpl">GPL</SelectItem>
                          <SelectItem value="e85">E85</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Toggle Sites */}
                  <motion.button
                    type="button"
                    onClick={() => setShowSites(!showSites)}
                    className="w-full flex items-center justify-between px-6 py-3 bg-white/5 backdrop-blur-xl border border-blue-500/20 rounded-xl text-blue-300 shadow-lg shadow-blue-500/10 hover:bg-blue-500/10 hover:border-blue-500/40 transition-all"
                    whileHover={{ scale: 1.03, borderColor: "rgba(59, 130, 246, 0.4)", boxShadow: "0 0 20px rgba(59, 130, 246, 0.2)" }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                    aria-expanded={showSites}
                    aria-label="Afficher ou masquer la sélection des sites"
                  >
                    <div className="flex items-center gap-2">
                      <Search className="size-4" />
                      <span className="text-sm font-medium">
                        {showSites ? 'Masquer les sites' : 'Afficher les sites de recherche'}
                      </span>
                    </div>
                    <ChevronDown className={`size-4 transition-transform duration-300 ${showSites ? "rotate-180" : ""}`} />
                  </motion.button>

                  {/* Sélection des Sites */}
                  <AnimatePresence>
                    {showSites && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                      >
                        <div className="pt-4 border-t border-blue-500/20">
                          <Label className="text-sm font-medium text-blue-300 mb-3 block">
                            Sites à rechercher
                          </Label>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {availableSites.map((site) => (
                              <motion.button
                                key={site.id}
                                type="button"
                                onClick={() => {
                                  setSelectedSites(prev => {
                                    const newSet = new Set(prev);
                                    if (newSet.has(site.id)) {
                                      newSet.delete(site.id);
                                    } else {
                                      newSet.add(site.id);
                                    }
                                    return newSet;
                                  });
                                }}
                                className={`flex items-center gap-2 p-3 rounded-xl border backdrop-blur-sm transition-all ${
                                  selectedSites.has(site.id)
                                    ? 'bg-blue-500/10 border-blue-500/40 text-blue-300 shadow-lg shadow-blue-500/10'
                                    : 'bg-white/5 border-blue-500/20 text-gray-300 hover:bg-blue-500/5 hover:border-blue-500/30'
                                }`}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                transition={{ type: "spring", stiffness: 400, damping: 17 }}
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedSites.has(site.id)}
                                  onChange={() => {}}
                                  className="w-4 h-4 rounded border-blue-500/30 bg-white/5 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
                                  disabled={searching}
                                />
                                <span className="text-sm flex items-center gap-1.5">
                                  <span>{site.icon}</span>
                                  <span>{site.name}</span>
                                </span>
                              </motion.button>
                            ))}
                          </div>
                          {selectedSites.size === 0 && (
                            <p className="text-xs text-red-400 mt-2">Veuillez sélectionner au moins un site</p>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Toggle Filtres Avancés */}
                  <motion.button
                    type="button"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="w-full flex items-center justify-between px-6 py-3 bg-white/5 backdrop-blur-xl border border-blue-500/20 rounded-xl text-blue-300 shadow-lg shadow-blue-500/10 hover:bg-blue-500/10 hover:border-blue-500/40 transition-all"
                    whileHover={{ scale: 1.03, borderColor: "rgba(59, 130, 246, 0.4)", boxShadow: "0 0 20px rgba(59, 130, 246, 0.2)" }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                    aria-expanded={showAdvanced}
                    aria-label="Afficher ou masquer les filtres avancés"
                  >
                    <div className="flex items-center gap-2">
                      <Filter className="size-4" />
                      <span className="text-sm font-medium">
                        {showAdvanced ? 'Masquer les filtres avancés' : 'Afficher les filtres avancés'}
                      </span>
                    </div>
                    <ChevronDown className={`size-4 transition-transform duration-300 ${showAdvanced ? "rotate-180" : ""}`} />
                  </motion.button>

                  {/* Filtres Avancés */}
                  <AnimatePresence>
                    {showAdvanced && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 pt-4 border-t border-white/10">
                          {/* Prix minimum */}
                          <div className="space-y-2">
                            <Label htmlFor="minPrice" className="text-sm font-medium text-blue-300">
                              Prix minimum (€)
                            </Label>
                            <Input
                              id="minPrice"
                              type="text"
                              placeholder="Ex: 5000"
                              value={minPrice ? parseInt(minPrice).toLocaleString('fr-FR') : ''}
                              onChange={handleMinPriceChange}
                              className="bg-white/5 backdrop-blur-sm border border-blue-500/20 text-white placeholder:text-gray-500 focus:border-blue-500/40 focus:ring-blue-500/20 h-11 rounded-xl shadow-sm shadow-blue-500/5 transition-all"
                              disabled={searching}
                            />
                          </div>

                          {/* Année min */}
                          <div className="space-y-2">
                            <Label htmlFor="yearMin" className="text-sm font-medium text-blue-300">
                              Année min
                            </Label>
                            <Input
                              id="yearMin"
                              type="number"
                              placeholder="Ex: 2015"
                              value={yearMin}
                              onChange={(e) => setYearMin(e.target.value)}
                              min="1900"
                              max={new Date().getFullYear()}
                              className="bg-white/5 backdrop-blur-sm border border-blue-500/20 text-white placeholder:text-gray-500 focus:border-blue-500/40 focus:ring-blue-500/20 h-11 rounded-xl shadow-sm shadow-blue-500/5 transition-all"
                              disabled={searching}
                            />
                          </div>

                          {/* Année max */}
                          <div className="space-y-2">
                            <Label htmlFor="yearMax" className="text-sm font-medium text-blue-300">
                              Année max
                            </Label>
                            <Input
                              id="yearMax"
                              type="number"
                              placeholder="Ex: 2024"
                              value={yearMax}
                              onChange={(e) => setYearMax(e.target.value)}
                              min="1900"
                              max={new Date().getFullYear() + 1}
                              className="bg-white/5 backdrop-blur-sm border border-blue-500/20 text-white placeholder:text-gray-500 focus:border-blue-500/40 focus:ring-blue-500/20 h-11 rounded-xl shadow-sm shadow-blue-500/5 transition-all"
                              disabled={searching}
                            />
                          </div>

                          {/* Kilométrage max */}
                          <div className="space-y-2">
                            <Label htmlFor="mileageMax" className="text-sm font-medium text-blue-300">
                              Kilométrage max
                            </Label>
                            <Input
                              id="mileageMax"
                              type="text"
                              placeholder="Ex: 100000"
                              value={mileageMax ? parseInt(mileageMax).toLocaleString('fr-FR') : ''}
                              onChange={handleMileageChange}
                              className="bg-white/5 backdrop-blur-sm border border-blue-500/20 text-white placeholder:text-gray-500 focus:border-blue-500/40 focus:ring-blue-500/20 h-11 rounded-xl shadow-sm shadow-blue-500/5 transition-all"
                              disabled={searching}
                            />
                          </div>

                          {/* Localisation */}
                          <div className="space-y-2">
                            <Label htmlFor="location" className="text-sm font-medium text-blue-300">
                              Localisation
                            </Label>
                            <Input
                              id="location"
                              placeholder="Ville ou région"
                              value={location}
                              onChange={(e) => setLocation(e.target.value)}
                              className="bg-white/5 backdrop-blur-sm border border-blue-500/20 text-white placeholder:text-gray-500 focus:border-blue-500/40 focus:ring-blue-500/20 h-11 rounded-xl shadow-sm shadow-blue-500/5 transition-all"
                              disabled={searching}
                            />
                          </div>

                          {/* Transmission (Boîte) */}
                          <div className="space-y-2">
                            <Label htmlFor="transmission" className="text-sm font-medium text-blue-300">
                              Boîte de vitesses
                            </Label>
                            <Select value={transmission} onValueChange={setTransmission} disabled={searching}>
                              <SelectTrigger 
                                id="transmission"
                                className="bg-white/5 backdrop-blur-sm border border-blue-500/20 text-white focus:border-blue-500/40 focus:ring-blue-500/20 h-11 rounded-xl shadow-sm shadow-blue-500/5 transition-all"
                              >
                                <SelectValue placeholder="Tous" />
                              </SelectTrigger>
                              <SelectContent className="bg-[#1a1a1a] border-white/20">
                                <SelectItem value="all">Tous</SelectItem>
                                <SelectItem value="manuelle">Manuelle</SelectItem>
                                <SelectItem value="automatique">Automatique</SelectItem>
                                <SelectItem value="semi_automatique">Semi-automatique</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Type de carrosserie */}
                          <div className="space-y-2">
                            <Label htmlFor="bodyType" className="text-sm font-medium text-blue-300">
                              Type de carrosserie
                            </Label>
                            <Select value={bodyType} onValueChange={setBodyType} disabled={searching}>
                              <SelectTrigger 
                                id="bodyType"
                                className="bg-white/5 backdrop-blur-sm border border-blue-500/20 text-white focus:border-blue-500/40 focus:ring-blue-500/20 h-11 rounded-xl shadow-sm shadow-blue-500/5 transition-all"
                              >
                                <SelectValue placeholder="Tous" />
                              </SelectTrigger>
                              <SelectContent className="bg-[#1a1a1a] border-white/20">
                                <SelectItem value="all">Tous</SelectItem>
                                <SelectItem value="berline">Berline</SelectItem>
                                <SelectItem value="break">Break</SelectItem>
                                <SelectItem value="suv">SUV</SelectItem>
                                <SelectItem value="monospace">Monospace</SelectItem>
                                <SelectItem value="coupe">Coupé</SelectItem>
                                <SelectItem value="cabriolet">Cabriolet</SelectItem>
                                <SelectItem value="citadine">Citadine</SelectItem>
                                <SelectItem value="utilitaire">Utilitaire</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Nombre de portes */}
                          <div className="space-y-2">
                            <Label htmlFor="doors" className="text-sm font-medium text-blue-300">
                              Nombre de portes
                            </Label>
                            <Select value={doors} onValueChange={setDoors} disabled={searching}>
                              <SelectTrigger 
                                id="doors"
                                className="bg-white/5 backdrop-blur-sm border border-blue-500/20 text-white focus:border-blue-500/40 focus:ring-blue-500/20 h-11 rounded-xl shadow-sm shadow-blue-500/5 transition-all"
                              >
                                <SelectValue placeholder="Tous" />
                              </SelectTrigger>
                              <SelectContent className="bg-[#1a1a1a] border-white/20">
                                <SelectItem value="all">Tous</SelectItem>
                                <SelectItem value="3">3 portes</SelectItem>
                                <SelectItem value="5">5 portes</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Nombre de places */}
                          <div className="space-y-2">
                            <Label htmlFor="seats" className="text-sm font-medium text-blue-300">
                              Nombre de places
                            </Label>
                            <Select value={seats} onValueChange={setSeats} disabled={searching}>
                              <SelectTrigger 
                                id="seats"
                                className="bg-white/5 backdrop-blur-sm border border-blue-500/20 text-white focus:border-blue-500/40 focus:ring-blue-500/20 h-11 rounded-xl shadow-sm shadow-blue-500/5 transition-all"
                              >
                                <SelectValue placeholder="Tous" />
                              </SelectTrigger>
                              <SelectContent className="bg-[#1a1a1a] border-white/20">
                                <SelectItem value="all">Tous</SelectItem>
                                <SelectItem value="2">2 places</SelectItem>
                                <SelectItem value="4">4 places</SelectItem>
                                <SelectItem value="5">5 places</SelectItem>
                                <SelectItem value="7">7 places</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Couleur */}
                          <div className="space-y-2">
                            <Label htmlFor="color" className="text-sm font-medium text-blue-300">
                              Couleur
                            </Label>
                            <Select value={color} onValueChange={setColor} disabled={searching}>
                              <SelectTrigger 
                                id="color"
                                className="bg-white/5 backdrop-blur-sm border border-blue-500/20 text-white focus:border-blue-500/40 focus:ring-blue-500/20 h-11 rounded-xl shadow-sm shadow-blue-500/5 transition-all"
                              >
                                <SelectValue placeholder="Tous" />
                              </SelectTrigger>
                              <SelectContent className="bg-[#1a1a1a] border-white/20">
                                <SelectItem value="all">Tous</SelectItem>
                                <SelectItem value="noir">Noir</SelectItem>
                                <SelectItem value="blanc">Blanc</SelectItem>
                                <SelectItem value="gris">Gris</SelectItem>
                                <SelectItem value="argent">Argent</SelectItem>
                                <SelectItem value="bleu">Bleu</SelectItem>
                                <SelectItem value="rouge">Rouge</SelectItem>
                                <SelectItem value="vert">Vert</SelectItem>
                                <SelectItem value="beige">Beige</SelectItem>
                                <SelectItem value="marron">Marron</SelectItem>
                                <SelectItem value="jaune">Jaune</SelectItem>
                                <SelectItem value="orange">Orange</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Bouton Recherche */}
                  <motion.button
                    type="submit"
                    disabled={searching}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 via-blue-600 to-purple-500 hover:from-blue-600 hover:via-blue-700 hover:to-purple-600 text-white shadow-lg shadow-blue-500/25 rounded-xl h-12 text-base font-medium backdrop-blur-sm border border-blue-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    whileHover={!searching ? { scale: 1.02, boxShadow: "0 0 30px rgba(59, 130, 246, 0.4)" } : {}}
                    whileTap={!searching ? { scale: 0.98 } : {}}
                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                  >
                    {searching ? (
                      <>
                        <Loader2 className="size-5 animate-spin" />
                        <span>Analyse en cours...</span>
                      </>
                    ) : (
                      <>
                        <Search className="size-5" />
                        <span>Lancer la recherche IA</span>
                      </>
                    )}
                  </motion.button>
                </form>

                {/* Statistiques */}
                <div className="mt-6 pt-6 border-t border-white/10">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-2xl sm:text-3xl font-medium bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                        50K+
                      </div>
                      <div className="text-xs sm:text-sm text-gray-400 mt-1">Annonces analysées</div>
                    </div>
                    <div>
                      <div className="text-2xl sm:text-3xl font-medium bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                        98%
                      </div>
                      <div className="text-xs sm:text-sm text-gray-400 mt-1">Précision IA</div>
                    </div>
                    <div>
                      <div className="text-2xl sm:text-3xl font-medium bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                        24/7
                      </div>
                      <div className="text-xs sm:text-sm text-gray-400 mt-1">Mise à jour</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* Modal de paywall si quota épuisé */}
      <PaywallModal />
    </div>
  );
}
