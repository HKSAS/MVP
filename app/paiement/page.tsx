'use client'

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Check,
  Shield,
  ChevronRight,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Info,
} from "lucide-react";
import { motion } from 'framer-motion';
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

type CheckoutState = "form" | "loading" | "success" | "error" | "cancelled";

interface PackInfo {
  name: string;
  price: number;
  isSubscription: boolean;
}

export default function CheckoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [state, setState] = useState<CheckoutState>("form");
  const [email, setEmail] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [packInfo, setPackInfo] = useState<PackInfo>({
    name: "Autoval IA Analyse",
    price: 39,
    isSubscription: true,
  });
  const [error, setError] = useState<string | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  // Vérifier l'authentification
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.user) {
          // Pas connecté, rediriger vers login avec retour vers paiement
          const currentUrl = window.location.href;
          const redirectUrl = encodeURIComponent(currentUrl);
          router.push(`/login?redirect=${redirectUrl}`);
          return;
        }

        // Utilisateur connecté, récupérer l'email
        setEmail(session.user.email || '');
        setLoadingAuth(false);
      } catch (error) {
        console.error('Erreur vérification auth:', error);
        setLoadingAuth(false);
      }
    };

    checkAuth();
  }, [router]);

  useEffect(() => {
    const pack = searchParams.get("pack");
    const price = searchParams.get("price");
    const success = searchParams.get("success");
    const canceled = searchParams.get("canceled");

    // Gérer le retour de Stripe
    if (success) {
      setState("success");
      return;
    }

    if (canceled === "1" || canceled === "true") {
      setState("cancelled");
      setTimeout(() => {
        setState("form");
        // Nettoyer l'URL
        router.replace("/paiement");
      }, 3000);
      return;
    }

    if (pack && price) {
      // Pack conciergerie sélectionné
      setPackInfo({
        name: `Pack ${pack.charAt(0).toUpperCase() + pack.slice(1)}`,
        price: parseInt(price, 10),
        isSubscription: false,
      });
    } else {
      // Abonnement par défaut
      setPackInfo({
        name: "Autoval IA Analyse",
        price: 39,
        isSubscription: true,
      });
    }
  }, [searchParams, router]);

  // Afficher un loader pendant la vérification d'auth
  if (loadingAuth) {
    return (
      <div className="bg-[#0a0a0a] text-white min-h-screen pt-20 flex items-center justify-center">
        <Loader2 className="size-8 animate-spin text-blue-400" />
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation côté client
    if (!email || !email.trim()) {
      setError("Veuillez saisir votre adresse email");
      setState("error");
      return;
    }

    if (!acceptTerms) {
      setError("Veuillez accepter les CGV pour continuer");
      setState("error");
      return;
    }

    // Validation email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Format d'email invalide");
      setState("error");
      return;
    }

    // Validation pack sélectionné
    if (!packInfo || !packInfo.price) {
      setError("Aucun pack sélectionné. Veuillez choisir un pack depuis la page tarifs.");
      setState("error");
      return;
    }

    setState("loading");
    setError(null);
    
    // Déterminer le plan selon le prix
    const plan = `pack_${packInfo.price}`;
    
    if (process.env.NODE_ENV === 'development') {
      console.log('[PAYMENT] Starting checkout for:', email, 'plan:', plan, 'price:', packInfo.price);
    }

    try {
      // Appeler l'API pour créer la session Stripe Checkout
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          plan: plan,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Message d'erreur explicite depuis l'API
        const errorMessage = data.error || "Erreur lors de la création de la session de paiement";
        if (process.env.NODE_ENV === 'development') {
          console.error('[PAYMENT] Error:', errorMessage);
        }
        throw new Error(errorMessage);
      }

      // Rediriger vers Stripe Checkout
      if (data.url) {
        if (process.env.NODE_ENV === 'development') {
          console.log('[PAYMENT] Redirecting to Stripe:', data.url);
        }
        window.location.href = data.url;
      } else {
        throw new Error("URL de paiement non disponible. Veuillez réessayer.");
      }
    } catch (error: any) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[PAYMENT] Error:', error);
      }
      setError(error.message || "Une erreur est survenue lors de la création de la session de paiement. Veuillez réessayer.");
      setState("error");
    }
  };

  const handleRetry = () => {
    setState("form");
    setError(null);
  };

  // État succès
  if (state === "success") {
    return (
      <div className="bg-[#0a0a0a] text-white min-h-screen pt-20 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center bg-white/5 backdrop-blur-xl border-white/10">
          <CardContent className="p-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500/20 border border-green-500/30 rounded-full mb-6">
              <CheckCircle2 className="size-8 text-green-400" />
            </div>
            <h1 className="text-white mb-4">Abonnement activé 🎉</h1>
            <p className="text-gray-400 mb-8">
              {packInfo.isSubscription
                ? "Votre abonnement Autoval IA Analyse est maintenant actif. Vous pouvez commencer à analyser des annonces immédiatement."
                : `Votre pack ${packInfo.name} est maintenant activé. Notre équipe va vous contacter sous peu pour démarrer votre accompagnement.`}
            </p>
            <Button asChild className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white" size="lg">
              <Link href="/dashboard">Aller au Dashboard</Link>
            </Button>
            <p className="text-sm text-gray-400 mt-4">
              Un email de confirmation a été envoyé à {email || "votre adresse"}
            </p>
          </CardContent>
        </Card>
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
      
      {/* Hero compact */}
      <section className="relative bg-white/5 backdrop-blur-xl border-b border-white/10">
        <motion.div 
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-400 mb-4 sm:mb-6 overflow-x-auto">
            <Link href="/tarif" className="hover:text-blue-400 transition-colors whitespace-nowrap">
              Tarifs
            </Link>
            <ChevronRight className="size-3 sm:size-4 flex-shrink-0" />
            <span className="text-white whitespace-nowrap">Paiement</span>
          </div>

          {/* Titre */}
          <div className="text-center max-w-2xl mx-auto">
            <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl text-white mb-2 px-2">
              {packInfo.isSubscription
                ? "Finaliser mon abonnement"
                : "Finaliser ma commande"}
            </h1>
            <p className="text-sm sm:text-base text-gray-400 px-4">
              {packInfo.isSubscription
                ? "Accès immédiat à l'analyse d'annonces par IA. Sans engagement."
                : "Accompagnement complet pour votre achat automobile. Prestation unique."}
            </p>
          </div>
        </motion.div>
      </section>

      {/* Alerts */}
      {state === "error" && error && (
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Alert className="border-red-500/30 bg-red-500/10 backdrop-blur-xl">
            <AlertCircle className="size-4 text-red-400" />
            <AlertDescription className="text-red-300">
              {error}
            </AlertDescription>
          </Alert>
        </div>
      )}

      {state === "cancelled" && (
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Alert className="border-orange-500/30 bg-orange-500/10 backdrop-blur-xl">
            <Info className="size-4 text-orange-400" />
            <AlertDescription className="text-orange-300">
              Paiement annulé.
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Layout 2 colonnes */}
      <section className="relative py-6 sm:py-8 md:py-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            className="grid lg:grid-cols-2 gap-4 sm:gap-6 md:gap-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            {/* COLONNE GAUCHE — Récapitulatif simplifié */}
            <Card className="bg-white/5 backdrop-blur-xl border-white/10 order-2 lg:order-1">
              <CardContent className="p-4 sm:p-6 md:p-8">
                <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 mb-4 sm:mb-6 text-xs sm:text-sm">
                  {packInfo.name}
                </Badge>

                <div className="mb-4 sm:mb-6">
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-2xl sm:text-3xl md:text-4xl text-white font-medium">{packInfo.price}€</span>
                    <span className="text-sm sm:text-base text-gray-400">
                      {packInfo.isSubscription ? " / mois" : " / prestation"}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-400">
                    {packInfo.isSubscription
                      ? "Sans engagement • Résiliation en 1 clic"
                      : "Prestation unique • Accompagnement complet"}
                  </p>
                </div>

                <div className="border-t border-white/10 pt-4 sm:pt-6 space-y-2 sm:space-y-3">
                  <p className="text-sm sm:text-base text-white mb-3 sm:mb-4">
                    {packInfo.isSubscription
                      ? "Inclus dans l'abonnement :"
                      : "Inclus dans le pack :"}
                  </p>
                  {packInfo.isSubscription
                    ? [
                        "Analyse d'annonces par IA",
                        "Score de fiabilité détaillé",
                        "Détection des arnaques",
                        "Estimation du prix marché",
                        "Utilisation illimitée",
                      ].map((feature) => (
                        <div key={feature} className="flex items-start gap-2 sm:gap-3">
                          <Check className="size-4 sm:size-5 text-green-400 flex-shrink-0 mt-0.5" />
                          <span className="text-xs sm:text-sm text-gray-300">{feature}</span>
                        </div>
                      ))
                    : [
                        "Accès Autoval IA pendant la durée du pack",
                        "Sélection personnalisée de véhicules",
                        "Analyse complète des annonces",
                        "Vérification prix marché",
                        "Accompagnement complet par nos experts",
                      ].map((feature) => (
                        <div key={feature} className="flex items-start gap-2 sm:gap-3">
                          <Check className="size-4 sm:size-5 text-green-400 flex-shrink-0 mt-0.5" />
                          <span className="text-xs sm:text-sm text-gray-300">{feature}</span>
                        </div>
                      ))}
                </div>

                <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-white/10 flex items-center gap-2 text-xs sm:text-sm text-gray-400">
                  <Shield className="size-3 sm:size-4 text-blue-400 flex-shrink-0" />
                  <span>Paiement 100% sécurisé via Stripe</span>
                </div>
              </CardContent>
            </Card>

            {/* COLONNE DROITE — Paiement */}
            <Card className="bg-white/5 backdrop-blur-xl border-white/10 order-1 lg:order-2">
              <CardContent className="p-4 sm:p-6 md:p-8">
                <h2 className="text-lg sm:text-xl md:text-2xl text-white mb-2">Paiement sécurisé</h2>
                <p className="text-xs sm:text-sm text-gray-400 mb-4 sm:mb-6">
                  Vous serez redirigé vers Stripe pour finaliser le paiement
                </p>

                <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                  {/* Email */}
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm sm:text-base text-white">Email de facturation</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="votre@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={state === "loading"}
                      className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 text-sm sm:text-base h-10 sm:h-11"
                    />
                  </div>

                  {/* CGV */}
                  <div className="flex items-start gap-2 sm:gap-3">
                    <Checkbox
                      id="terms"
                      checked={acceptTerms}
                      onCheckedChange={(checked) => setAcceptTerms(checked as boolean)}
                      disabled={state === "loading"}
                      className="mt-0.5"
                    />
                    <Label
                      htmlFor="terms"
                      className="text-xs sm:text-sm text-gray-300 cursor-pointer leading-relaxed"
                    >
                      J&apos;accepte les{" "}
                      <Link href="/cgv" className="text-blue-400 hover:text-blue-300 hover:underline">
                        CGV
                      </Link>{" "}
                      et la{" "}
                      <Link href="/confidentialite" className="text-blue-400 hover:text-blue-300 hover:underline">
                        politique de confidentialité
                      </Link>
                    </Label>
                  </div>

                  {/* Bouton paiement */}
                  <Button
                    type="submit"
                    size="lg"
                    className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white text-sm sm:text-base h-11 sm:h-12"
                    disabled={!acceptTerms || !email || !email.trim() || state === "loading"}
                  >
                    {state === "loading" ? (
                      <>
                        <Loader2 className="size-5 mr-2 animate-spin" />
                        Redirection vers Stripe…
                      </>
                    ) : (
                      <>
                        <Shield className="size-5 mr-2" />
                        {packInfo.isSubscription
                          ? `Payer ${packInfo.price}€ et s'abonner`
                          : `Payer ${packInfo.price}€`}
                      </>
                    )}
                  </Button>

                  <p className="text-center text-sm text-gray-400">
                    Sans engagement • Résiliation en 1 clic
                  </p>

                  {/* Note sur les moyens de paiement */}
                  <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                    <p className="text-xs text-blue-300">
                      <Info className="size-3 inline mr-1" />
                      <strong>Note :</strong> Apple Pay et Google Pay peuvent ne pas apparaître en local (HTTP). 
                      En production (HTTPS + domaine), Stripe les proposera automatiquement si éligible.
                    </p>
                  </div>
                </form>

                {/* Liens secondaires */}
                <div className="mt-6 pt-6 border-t border-white/10 flex gap-4 justify-center text-sm">
                  <Link href="/tarif" className="text-gray-400 hover:text-blue-400 transition-colors">
                    Retour aux tarifs
                  </Link>
                  <span className="text-gray-600">•</span>
                  <Link href="/contact" className="text-gray-400 hover:text-blue-400 transition-colors">
                    Besoin d&apos;aide ?
                  </Link>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>
    </div>
  );
}

