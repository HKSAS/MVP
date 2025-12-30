'use client'

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import {
  Check,
  ArrowRight,
  Shield,
  Sparkles,
  Zap,
  Gift,
} from "lucide-react";
import { motion } from 'framer-motion';

export default function PricingPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user || null);
      } catch (error) {
        console.error('Erreur vérification utilisateur:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkUser();
  }, []);

  const handleSubscribeClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (user) {
      // Utilisateur connecté, rediriger vers la page de paiement
      router.push('/paiement?pack=subscription&price=39');
    } else {
      // Utilisateur non connecté, rediriger vers login avec retour vers paiement
      const redirectUrl = encodeURIComponent('/paiement?pack=subscription&price=39');
      router.push(`/login?redirect=${redirectUrl}`);
    }
  };

  const handlePackClick = (packName: string, price: string) => {
    return (e: React.MouseEvent) => {
      e.preventDefault();
      if (user) {
        // Utilisateur connecté, rediriger vers la page de paiement
        router.push(`/paiement?pack=${packName.toLowerCase()}&price=${price}`);
      } else {
        // Utilisateur non connecté, rediriger vers login avec retour vers paiement
        const redirectUrl = encodeURIComponent(`/paiement?pack=${packName.toLowerCase()}&price=${price}`);
        router.push(`/login?redirect=${redirectUrl}`);
      }
    };
  };
  const subscriptionPlan = {
    name: "AutoIA",
    price: "39",
    period: "mois",
    description: "Recherche et analyse en toute autonomie",
    valueProposition: "Idéal pour analyser et comparer des annonces en toute autonomie, sans risque.",
    features: [
      "Recherches illimitées de véhicules sur plusieurs plateformes",
      "Analyses IA illimitées des annonces",
      "Score de fiabilité détaillé (0 à 100)",
      "Détection automatique des incohérences (prix, kilométrage, description)",
      "Analyse du prix par rapport au marché",
      "Détection d'arnaques et signaux de risque par IA",
      "Historique complet des recherches et analyses",
      "Alertes personnalisées selon vos critères",
    ],
    cta: "Commencer maintenant",
  };

  const conciergePlans = [
    {
      name: "Essentiel",
      price: "299",
      period: "prestation",
      description: "Sécuriser votre achat sans perdre de temps",
      valueProposition: "Parfait pour éviter une mauvaise affaire et acheter au bon prix, en toute sérénité.",
      features: [
        "Accès AutoIA pendant 30 jours (sans limite)",
        "Sélection personnalisée de véhicules selon vos critères",
        "Analyse IA complète et approfondie des annonces sélectionnées",
        "Vérification du prix par rapport au marché",
        "Détection des risques et incohérences",
        "Rapport détaillé IA remis en PDF, clair et compréhensible",
        "Recommandations de négociation concrètes et exploitables",
      ],
      cta: "Choisir Essentiel",
      popular: false,
      highlighted: false,
    },
    {
      name: "Confort",
      price: "599",
      period: "prestation",
      description: "L'accompagnement complet pour acheter l'esprit tranquille",
      valueProposition: "Nous vous accompagnons de A à Z pour un achat sécurisé, optimisé et sans stress.",
      features: [
        "Tout le contenu du Pack Essentiel",
        "Accès AutoIA pendant 60 jours",
        "Interlocuteur dédié pour le suivi du dossier",
        "Sélection avancée et suivi des véhicules",
        "Conseils personnalisés à chaque étape",
        "Négociation complète menée avec le vendeur",
        "Coordination de la livraison (si nécessaire)",
        "Nettoyage professionnel du véhicule",
      ],
      cta: "Choisir Confort",
      popular: true,
      highlighted: true,
    },
    {
      name: "Premium",
      price: "999",
      period: "prestation",
      description: "Le service clé en main, sans aucune contrainte",
      valueProposition: "Vous ne vous occupez de rien. Nous gérons l'intégralité du processus pour vous.",
      features: [
        "Tout le contenu du Pack Confort",
        "Accès AutoIA pendant 90 jours",
        "Accompagnement complet jusqu'à la livraison",
        "Livraison du véhicule incluse",
        "Remise à niveau esthétique du véhicule",
        "Lavage intégral et préparation du véhicule",
        "Suivi premium post-achat",
      ],
      cta: "Choisir Premium",
      popular: false,
      highlighted: false,
    },
  ];

  return (
    <div className="bg-[#0a0a0a] text-white min-h-screen pt-16 sm:pt-20">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/3 w-[300px] sm:w-[500px] h-[300px] sm:h-[500px] bg-blue-600/20 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/3 w-[200px] sm:w-[400px] h-[200px] sm:h-[400px] bg-purple-600/10 rounded-full blur-[100px]"></div>
      </div>

      {/* Hero Section */}
      <section className="relative pt-16 sm:pt-24 md:pt-32 pb-8 sm:pb-12 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-4 sm:space-y-6 mb-8 sm:mb-12 md:mb-16"
          >
            <Badge variant="secondary" className="bg-white/10 text-white border border-white/20 rounded-full px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm">
              <Shield className="size-3 sm:size-4 mr-2 inline" />
              Tarifs transparents
            </Badge>
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-medium text-white px-2">
              Choisissez votre
              <br />
              <span className="bg-gradient-to-r from-blue-400 via-blue-500 to-purple-500 bg-clip-text text-transparent">
                mode d'accompagnement
              </span>
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-gray-400 max-w-3xl mx-auto px-4">
              De l'autonomie complète à l'accompagnement premium, trouvez la formule qui vous correspond
            </p>
          </motion.div>
        </div>
      </section>

      {/* AutoIA Subscription Section */}
      <section className="relative py-8 sm:py-12 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-center mb-8 sm:mb-12"
          >
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600/20 to-purple-600/20 backdrop-blur-sm border border-blue-500/30 rounded-full px-4 sm:px-6 py-1.5 sm:py-2 mb-3 sm:mb-4 text-xs sm:text-sm">
              <Zap className="size-4 sm:size-5 text-blue-400" />
              <span className="text-white">Abonnement mensuel</span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-medium text-white mb-2 sm:mb-3 px-4">
              AutoIA en autonomie
            </h2>
            <p className="text-sm sm:text-base text-gray-400 max-w-2xl mx-auto px-4">
              Accédez à tous les outils IA pour rechercher et analyser vos annonces en toute autonomie
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="max-w-2xl mx-auto"
          >
            <Card className="bg-gradient-to-br from-blue-600/10 to-purple-600/5 backdrop-blur-xl border-blue-500/30 rounded-2xl overflow-hidden">
              <CardHeader className="space-y-3 sm:space-y-4 p-4 sm:p-6 md:p-8 pb-4 sm:pb-6">
                <div>
                  <h3 className="text-xl sm:text-2xl font-medium text-white mb-2">{subscriptionPlan.name}</h3>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl sm:text-5xl md:text-6xl font-medium text-white">{subscriptionPlan.price}€</span>
                  <span className="text-sm sm:text-base md:text-lg text-gray-400">/ {subscriptionPlan.period}</span>
                </div>
                <p className="text-sm sm:text-base text-gray-300 leading-relaxed">
                  {subscriptionPlan.description}
                </p>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 md:p-8 pt-0 space-y-4 sm:space-y-6">
                <div>
                  <h4 className="text-sm sm:text-base text-white font-medium mb-3 sm:mb-4">Contenu du pack :</h4>
                  <ul className="space-y-2 sm:space-y-3">
                    {subscriptionPlan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2 sm:gap-3">
                        <Check className="size-4 sm:size-5 text-green-400 flex-shrink-0 mt-0.5" />
                        <span className="text-xs sm:text-sm text-gray-200">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <Button
                  size="lg"
                  onClick={handleSubscribeClick}
                  className="w-full py-5 sm:py-6 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl shadow-lg shadow-blue-600/25 text-sm sm:text-base h-12 sm:h-14"
                >
                  <span className="flex items-center justify-center gap-2">
                    {subscriptionPlan.cta}
                    <ArrowRight className="size-3 sm:size-4" />
                  </span>
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* Divider */}
      <div className="relative py-8 sm:py-12 md:py-16 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="relative flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10"></div>
            </div>
            <div className="relative bg-[#0a0a0a] px-4 sm:px-6">
              <span className="text-sm sm:text-base text-gray-500">ou</span>
            </div>
          </div>
        </div>
      </div>

      {/* Concierge Services Section */}
      <section className="relative py-8 sm:py-12 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-8 sm:mb-12"
          >
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600/20 to-blue-600/20 backdrop-blur-sm border border-purple-500/30 rounded-full px-4 sm:px-6 py-1.5 sm:py-2 mb-3 sm:mb-4 text-xs sm:text-sm">
              <Sparkles className="size-4 sm:size-5 text-purple-400" />
              <span className="text-white">Services de conciergerie</span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-medium text-white mb-2 sm:mb-3 px-4">
              Conciergerie automobile clé en main
            </h2>
            <p className="text-sm sm:text-base text-gray-400 max-w-2xl mx-auto px-4">
              Bénéficiez d'un accompagnement complet de A à Z dans votre achat automobile
            </p>
          </motion.div>

          {/* Pricing Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8 sm:mb-12">
            {conciergePlans.map((plan, index) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="relative"
              >
                {plan.popular && (
                  <div className="absolute -top-3 sm:-top-4 left-1/2 transform -translate-x-1/2 z-10">
                    <Badge className="bg-purple-600 text-white border-0 px-3 sm:px-4 py-1 sm:py-1.5 rounded-full shadow-lg text-xs sm:text-sm">
                      Le plus populaire
                    </Badge>
                  </div>
                )}
                <Card 
                  className={`bg-white/5 backdrop-blur-xl border transition-all duration-300 h-full rounded-2xl overflow-hidden flex flex-col ${
                    plan.highlighted 
                      ? 'border-purple-600 bg-gradient-to-b from-purple-600/10 to-transparent shadow-xl shadow-purple-600/10' 
                      : 'border-white/10 hover:border-white/20'
                  }`}
                >
                  <CardHeader className="space-y-3 sm:space-y-4 p-4 sm:p-6 md:p-8 pb-4 sm:pb-6">
                    <div>
                      <h3 className="text-xl sm:text-2xl font-medium text-white mb-2">{plan.name}</h3>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl sm:text-5xl font-medium text-white">{plan.price}€</span>
                      <span className="text-sm sm:text-base text-gray-400">/ {plan.period}</span>
                    </div>
                    <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
                      {plan.description}
                    </p>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-6 md:p-8 pt-0 space-y-4 sm:space-y-6 flex-grow flex flex-col">
                    <div className="flex-grow">
                      <h4 className="text-xs sm:text-sm text-white font-medium mb-2 sm:mb-3">Inclus :</h4>
                      <ul className="space-y-2 sm:space-y-2.5">
                        {plan.features.map((feature, i) => (
                          <li key={i} className="flex items-start gap-2 sm:gap-3">
                            <Check className="size-3 sm:size-4 text-green-400 flex-shrink-0 mt-0.5" />
                            <span className="text-xs sm:text-sm text-gray-300">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <Button
                      onClick={handlePackClick(plan.name, plan.price)}
                      className={`w-full py-4 sm:py-5 md:py-6 rounded-xl transition-all text-sm sm:text-base h-11 sm:h-12 md:h-14 ${
                        plan.highlighted
                          ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-600/25'
                          : 'bg-white/10 text-white hover:bg-white/15 border border-white/20'
                      }`}
                    >
                      <span className="flex items-center justify-center gap-2">
                        {plan.cta}
                      </span>
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Bonus Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="max-w-3xl mx-auto"
          >
            <Card className="bg-gradient-to-r from-orange-500/10 to-yellow-500/10 backdrop-blur-xl border-orange-500/30 rounded-2xl overflow-hidden">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="bg-gradient-to-br from-orange-500 to-yellow-500 rounded-full p-2 sm:p-3 flex-shrink-0">
                    <Gift className="size-5 sm:size-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm sm:text-base text-white font-medium mb-2">Bonus exclusif</h4>
                    <p className="text-xs sm:text-sm text-gray-300 leading-relaxed mb-3">
                      Le montant de l'abonnement AutoIA est déduit si vous passez à un pack Essentiel, Confort ou Premium.
                    </p>
                    <div className="flex flex-wrap gap-3 sm:gap-4 text-xs text-gray-400">
                      <div className="flex items-center gap-1.5">
                        <Shield className="size-3 sm:size-3.5 text-green-400 flex-shrink-0" />
                        <span>Paiement sécurisé</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Check className="size-3 sm:size-3.5 text-green-400 flex-shrink-0" />
                        <span>Service sans engagement</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-12 sm:py-16 md:py-24 px-4 sm:px-6 border-t border-white/10 mt-6 sm:mt-12">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8 sm:mb-12 md:mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-medium text-white mb-3 sm:mb-4 px-4">
              Questions fréquentes
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-gray-400 px-4">
              Tout ce que vous devez savoir sur nos services
            </p>
          </div>

          <div className="space-y-4 sm:space-y-6">
            {[
              {
                question: "Quelle est la différence entre AutoIA et les prestations ?",
                answer: "L'abonnement AutoIA vous donne accès à tous nos outils IA pour rechercher et analyser en autonomie. Les prestations de conciergerie incluent un accompagnement humain personnalisé, de la recherche à la livraison du véhicule.",
              },
              {
                question: "Puis-je combiner l'abonnement AutoIA avec une prestation ?",
                answer: "Oui ! Les prestations de conciergerie incluent déjà un accès AutoIA pendant la durée de l'accompagnement (30 à 90 jours selon le pack). Vous pouvez aussi souscrire à AutoIA avant de choisir une prestation.",
              },
              {
                question: "Comment fonctionne la déduction du montant AutoIA ?",
                answer: "Si vous êtes abonné à AutoIA et que vous décidez de prendre une prestation de conciergerie, le montant déjà payé pour AutoIA sera déduit du prix de la prestation. C'est notre façon de récompenser votre fidélité.",
              },
              {
                question: "Les prestations sont-elles remboursables ?",
                answer: "Oui, si vous n'êtes pas satisfait dans les 7 premiers jours, nous vous remboursons intégralement. L'abonnement AutoIA peut être annulé à tout moment.",
              },
              {
                question: "Comment fonctionne la négociation avec le vendeur ?",
                answer: "Dans les packs Confort et Premium, notre équipe contacte directement le vendeur pour négocier le meilleur prix selon notre analyse IA du marché et nos données de référence.",
              },
            ].map((faq, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card className="bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-all duration-300 rounded-2xl">
                  <CardContent className="p-4 sm:p-6 md:p-8">
                    <h3 className="text-base sm:text-lg md:text-xl font-medium text-white mb-2 sm:mb-3">{faq.question}</h3>
                    <p className="text-sm sm:text-base text-gray-400 leading-relaxed">{faq.answer}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 sm:py-16 md:py-24 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/20 rounded-2xl sm:rounded-3xl p-6 sm:p-8 md:p-12 space-y-6 sm:space-y-8"
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-medium text-white px-4">
              Prêt à trouver votre voiture ?
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-gray-400 max-w-2xl mx-auto px-4">
              Que vous préfériez l'autonomie ou l'accompagnement, nous avons la solution pour vous
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center pt-4 px-4">
              <Button 
                size="lg" 
                onClick={handleSubscribeClick}
                className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white px-6 sm:px-8 py-5 sm:py-6 text-sm sm:text-base rounded-full shadow-lg shadow-blue-500/25 w-full sm:w-auto h-11 sm:h-12"
              >
                <span className="flex items-center justify-center gap-2">
                  <span className="hidden sm:inline">Essayer AutoIA gratuitement</span>
                  <span className="sm:hidden">Essayer AutoIA</span>
                  <ArrowRight className="size-3 sm:size-4" />
                </span>
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                asChild
                className="border border-white/20 bg-white/5 hover:bg-white/10 text-white px-6 sm:px-8 py-5 sm:py-6 text-sm sm:text-base rounded-full backdrop-blur-sm w-full sm:w-auto h-11 sm:h-12"
              >
                <Link href="/contact" className="flex items-center justify-center">
                  <span className="hidden sm:inline">Demander un accompagnement</span>
                  <span className="sm:hidden">Nous contacter</span>
                </Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
