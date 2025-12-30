'use client'

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Sparkles, Loader2, HelpCircle, Send } from "lucide-react";
import { motion } from 'framer-motion';
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
  const [searching, setSearching] = useState(false);
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [budget, setBudget] = useState("");
  const [fuel, setFuel] = useState("");
  const [error, setError] = useState<string | null>(null);
  
  // État pour le modal de contact
  const [contactOpen, setContactOpen] = useState(false);
  const [contactSending, setContactSending] = useState(false);
  const [contactForm, setContactForm] = useState({
    name: "",
    email: "",
    budget: "",
    usage: "",
    priority: "",
    message: "",
  });
  
  // Garde-fou pour empêcher les appels simultanés
  const inFlightRef = useRef(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);


  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Guard : empêcher le double lancement
    if (searching || inFlightRef.current) {
      return;
    }
    
    // Validation basique
    if (!brand.trim() || !model.trim()) {
      setError("Veuillez remplir au moins la marque et le modèle");
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

          if (fuel && fuel !== "all") {
            params.set("fuelType", fuel);
          }

          // Rediriger vers la page de résultats
          router.push(`/resultats?${params.toString()}`);
          return { success: true };
        },
        {
          brand: brand.trim(),
          model: model.trim(),
          budget: budget.trim(),
          fuel: fuel
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

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setContactSending(true);
    
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: contactForm.name,
          email: contactForm.email,
          subject: `Aide recherche - Budget: ${contactForm.budget || 'Non spécifié'}`,
          message: `Bonjour,

Je recherche de l'aide pour trouver le modèle idéal.

Budget: ${contactForm.budget || 'Non spécifié'}
Usage: ${contactForm.usage || 'Non spécifié'}
Priorité: ${contactForm.priority || 'Non spécifié'}

${contactForm.message || ''}`,
        }),
      });

      if (!response.ok) {
        throw new Error('Erreur lors de l\'envoi');
      }

      toast.success("Message envoyé avec succès !", {
        description: "Nous vous répondrons dans les plus brefs délais.",
      });
      
      setContactForm({
        name: "",
        email: "",
        budget: "",
        usage: "",
        priority: "",
        message: "",
      });
      setContactOpen(false);
    } catch (error) {
      toast.error("Erreur lors de l'envoi", {
        description: "Veuillez réessayer plus tard.",
      });
    } finally {
      setContactSending(false);
    }
  };

  return (
    <div className="bg-[#0a0a0a] text-white min-h-screen pt-20">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px] animate-pulse"></div>
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

          {/* Search Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Card className="max-w-5xl mx-auto bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border-white/20 shadow-2xl">
              <CardContent className="p-4 sm:p-6 md:p-8">
                {error && (
                  <div className="mb-3 sm:mb-4 rounded-lg border border-red-500/50 bg-red-500/10 p-2 sm:p-3 text-xs sm:text-sm text-red-400">
                    {error}
                  </div>
                )}
                <form onSubmit={handleSearch} className="space-y-4 sm:space-y-6">
                  {/* Main Search Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="brand" className="text-sm sm:text-base text-white">Marque</Label>
                      <Input
                        id="brand"
                        placeholder="Ex: Audi, Renault..."
                        value={brand}
                        onChange={(e) => setBrand(e.target.value)}
                        className="bg-white/5 border-white/20 text-white placeholder:text-gray-500 focus:border-blue-500 focus:ring-blue-500/20 text-sm sm:text-base h-10 sm:h-11"
                        disabled={searching}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="model" className="text-sm sm:text-base text-white">Modèle</Label>
                      <Input
                        id="model"
                        placeholder="Ex: A3, Clio..."
                        value={model}
                        onChange={(e) => setModel(e.target.value)}
                        className="bg-white/5 border-white/20 text-white placeholder:text-gray-500 focus:border-blue-500 focus:ring-blue-500/20 text-sm sm:text-base h-10 sm:h-11"
                        disabled={searching}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="budget" className="text-sm sm:text-base text-white">Budget maximum (€)</Label>
                      <Input
                        id="budget"
                        type="number"
                        placeholder="Ex: 25000"
                        value={budget}
                        onChange={(e) => setBudget(e.target.value)}
                        className="bg-white/5 border-white/20 text-white placeholder:text-gray-500 focus:border-blue-500 focus:ring-blue-500/20 text-sm sm:text-base h-10 sm:h-11"
                        disabled={searching}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="fuel" className="text-sm sm:text-base text-white">Type de carburant</Label>
                      <Select value={fuel} onValueChange={setFuel} disabled={searching}>
                        <SelectTrigger 
                          id="fuel"
                          className="bg-white/5 border-white/20 text-white focus:border-blue-500 focus:ring-blue-500/20 text-sm sm:text-base h-10 sm:h-11"
                        >
                          <SelectValue placeholder="Sélectionner" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1a1a1a] border-white/20">
                          <SelectItem value="all">Tous</SelectItem>
                          <SelectItem value="essence">Essence</SelectItem>
                          <SelectItem value="diesel">Diesel</SelectItem>
                          <SelectItem value="electrique">Électrique</SelectItem>
                          <SelectItem value="hybride">Hybride</SelectItem>
                          <SelectItem value="gpl">GPL</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Search Button */}
                  <Button
                    type="submit"
                    size="lg"
                    className="w-full bg-gradient-to-r from-blue-500 via-blue-600 to-purple-500 hover:from-blue-600 hover:via-blue-700 hover:to-purple-600 text-white shadow-lg shadow-blue-500/25 transition-all h-11 sm:h-12 text-sm sm:text-base"
                    disabled={searching}
                  >
                    {searching ? (
                      <>
                        <Loader2 className="size-4 sm:size-5 mr-2 animate-spin" />
                        <span>Analyse en cours...</span>
                      </>
                    ) : (
                      <>
                        <Search className="size-4 sm:size-5 mr-2" />
                        <span>Lancer la recherche IA</span>
                      </>
                    )}
                  </Button>
                </form>

                {/* Quick Stats */}
                <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-white/10">
                  <div className="grid grid-cols-3 gap-2 sm:gap-4 text-center">
                    <div>
                      <div className="text-xl sm:text-2xl font-medium bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                        50K+
                      </div>
                      <div className="text-xs text-gray-400 mt-1">Annonces analysées</div>
                    </div>
                    <div>
                      <div className="text-xl sm:text-2xl font-medium bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                        98%
                      </div>
                      <div className="text-xs text-gray-400 mt-1">Précision IA</div>
                    </div>
                    <div>
                      <div className="text-xl sm:text-2xl font-medium bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                        24/7
                      </div>
                      <div className="text-xs text-gray-400 mt-1">Mise à jour</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Bouton Contact */}
          <div className="mt-6 sm:mt-8 text-center px-4">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
            >
              <Button
                variant="ghost"
                className="text-gray-400 hover:text-white text-sm sm:text-base"
                onClick={() => router.push('/contact')}
                size="lg"
              >
                <HelpCircle className="size-3 sm:size-4 mr-2" />
                <span className="hidden sm:inline">Pas sûr du modèle idéal ? Contactez-nous</span>
                <span className="sm:hidden">Besoin d&apos;aide ?</span>
              </Button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Modal de paywall si quota épuisé */}
      <PaywallModal />
    </div>
  );
}
