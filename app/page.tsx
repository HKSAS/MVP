'use client'

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import TypewriterText from "@/components/TypewriterText";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import {
  Search,
  FileSearch,
  Shield,
  Brain,
  Sparkles,
  ArrowRight,
  Code,
  BarChart3,
  Zap,
  CheckCircle2,
} from "lucide-react";
import { motion } from 'framer-motion';

export default function HomePage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
    } catch (error) {
      console.error('Erreur vérification auth:', error);
      setIsAuthenticated(false);
    }
  };

  const handleSearchClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!isAuthenticated) {
      e.preventDefault();
      router.push('/signup?redirect=/recherche');
    }
  };

  const handleAnalyzeClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!isAuthenticated) {
      e.preventDefault();
      router.push('/signup?redirect=/analyser');
    }
  };

  return (
    <div className="bg-gradient-to-br from-[#0a0a0a] via-[#0f0f1a] to-[#1a0a2e] text-white min-h-screen pt-16 sm:pt-20">
      {/* Hero Section */}
      <section className="relative pt-20 sm:pt-32 pb-12 sm:pb-20 px-4 sm:px-6 overflow-hidden">
        {/* Enhanced Gradient Background Effects */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 left-1/4 w-[400px] sm:w-[800px] h-[400px] sm:h-[800px] bg-gradient-to-r from-blue-600/30 via-blue-500/20 to-transparent rounded-full blur-[140px] animate-pulse"></div>
          <div className="absolute top-1/2 right-1/4 w-[300px] sm:w-[600px] h-[300px] sm:h-[600px] bg-gradient-to-l from-purple-600/25 via-purple-500/15 to-transparent rounded-full blur-[120px]"></div>
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[500px] sm:w-[1000px] h-[200px] sm:h-[400px] bg-gradient-to-t from-blue-900/20 via-purple-900/15 to-transparent rounded-full blur-[100px]"></div>
        </div>
        
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center max-w-4xl mx-auto space-y-6 sm:space-y-8">
            {/* Main Heading */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="space-y-4 sm:space-y-6"
            >
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-medium text-white tracking-tight px-2">
                Trouvez la voiture
                <br />
                de{' '}
                <TypewriterText 
                  text="vos rêves" 
                  className="bg-gradient-to-r from-blue-400 via-blue-500 to-purple-500 bg-clip-text text-transparent"
                  typingSpeed={120}
                  deletingSpeed={80}
                  pauseDuration={2000}
                />
              </h1>
              <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-400 max-w-2xl mx-auto px-4">
                Laissez notre IA analyser des milliers d&apos;annonces pour vous
              </p>
            </motion.div>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center pt-4 px-4"
            >
              <Button 
                size="lg" 
                asChild 
                className="bg-white text-black hover:bg-gray-200 px-6 sm:px-8 py-5 sm:py-6 text-sm sm:text-base rounded-full transition-all w-full sm:w-auto"
              >
                <Link href="/recherche" onClick={handleSearchClick} className="flex items-center justify-center gap-2">
                  Commencer
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                asChild
                className="border border-white/20 bg-white/5 hover:bg-white/10 text-white px-6 sm:px-8 py-5 sm:py-6 text-sm sm:text-base rounded-full backdrop-blur-sm transition-all w-full sm:w-auto"
              >
                <Link href="/analyser" onClick={handleAnalyzeClick} className="flex items-center justify-center">
                  Analyser une annonce
                </Link>
              </Button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-12 sm:py-16 md:py-24 px-4 sm:px-6 relative">
        {/* Background gradient for services section */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-950/10 to-transparent"></div>
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {[
              {
                icon: <Search className="size-12 mb-6 text-blue-400" />,
                title: "Recherche intelligente",
                description: "Notre IA scanne toutes les plateformes pour trouver les meilleures opportunités selon vos critères.",
                items: [
                  "Scan automatique de milliers d'annonces",
                  "Filtres intelligents personnalisés",
                  "Alertes en temps réel",
                ],
                gradient: "from-blue-500/20 to-blue-600/10",
                borderColor: "border-blue-500/30",
                hoverGradient: "hover:from-blue-500/30 hover:to-blue-600/20"
              },
              {
                icon: <Code className="size-12 mb-6 text-purple-400" />,
                title: "Analyse approfondie",
                description: "Chaque annonce est analysée en profondeur pour détecter les anomalies et évaluer la fiabilité.",
                items: [
                  "Vérification des prix du marché",
                  "Détection des incohérences",
                  "Analyse des photos et descriptions",
                ],
                gradient: "from-purple-500/20 to-purple-600/10",
                borderColor: "border-purple-500/30",
                hoverGradient: "hover:from-purple-500/30 hover:to-purple-600/20"
              },
              {
                icon: <Sparkles className="size-12 mb-6 text-blue-400" />,
                title: "Conseil personnalisé",
                description: "Bénéficiez de recommandations sur mesure basées sur vos besoins et votre budget.",
                items: [
                  "Suggestions adaptées à votre profil",
                  "Accompagnement dans la négociation",
                  "Support expert disponible 24/7",
                ],
                gradient: "from-blue-500/20 to-purple-500/10",
                borderColor: "border-blue-500/30",
                hoverGradient: "hover:from-blue-500/30 hover:to-purple-500/20"
              },
            ].map((service, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card className={`bg-gradient-to-br ${service.gradient} backdrop-blur-sm border ${service.borderColor} ${service.hoverGradient} hover:border-opacity-50 transition-all duration-300 h-full rounded-2xl sm:rounded-3xl shadow-lg shadow-blue-500/10`}>
                  <CardContent className="p-4 sm:p-6 md:p-8 space-y-3 sm:space-y-4">
                    <div className="text-white/90">
                      {service.icon}
                    </div>
                    <h3 className="text-xl sm:text-2xl font-medium text-white">{service.title}</h3>
                    <p className="text-sm sm:text-base text-gray-300 leading-relaxed">{service.description}</p>
                    <ul className="space-y-2 pt-3 sm:pt-4">
                      {service.items.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs sm:text-sm text-gray-300">
                          <CheckCircle2 className="size-3 sm:size-4 text-blue-400 mt-0.5 flex-shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 sm:py-16 md:py-24 px-4 sm:px-6 relative">
        {/* Background gradient for features section */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-purple-950/10 to-transparent"></div>
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-8 sm:mb-12 md:mb-16 px-4">
            <Badge variant="secondary" className="mb-3 sm:mb-4 bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-white border-blue-500/30 rounded-full px-3 sm:px-4 py-1 text-xs sm:text-sm">
              Fonctionnalités
            </Badge>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-medium text-white mb-3 sm:mb-4">
              Toutes les fonctionnalités au même endroit
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-gray-300 max-w-2xl mx-auto">
              Des outils puissants pour sécuriser votre achat automobile
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {[
              {
                icon: <Shield className="size-8" />,
                title: "Protection anti-arnaque",
                description: "Détection automatique des annonces frauduleuses",
                color: "text-blue-400"
              },
              {
                icon: <Brain className="size-8" />,
                title: "Intelligence artificielle",
                description: "Algorithmes avancés d'analyse et de recommandation",
                color: "text-purple-400"
              },
              {
                icon: <BarChart3 className="size-8" />,
                title: "Analyse de prix",
                description: "Comparaison avec le marché pour éviter les surcoûts",
                color: "text-blue-400"
              },
              {
                icon: <Zap className="size-8" />,
                title: "Résultats instantanés",
                description: "Obtenez des réponses en quelques secondes",
                color: "text-purple-400"
              },
              {
                icon: <FileSearch className="size-8" />,
                title: "Vérification détaillée",
                description: "Contrôle approfondi de chaque annonce",
                color: "text-blue-400"
              },
              {
                icon: <CheckCircle2 className="size-8" />,
                title: "Score de fiabilité",
                description: "Note claire et transparente pour chaque véhicule",
                color: "text-purple-400"
              },
              {
                icon: <Search className="size-8" />,
                title: "Multi-plateformes",
                description: "Recherche simultanée sur tous les sites",
                color: "text-blue-400"
              },
              {
                icon: <Sparkles className="size-8" />,
                title: "Alertes intelligentes",
                description: "Notifications personnalisées selon vos critères",
                color: "text-purple-400"
              },
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.05 }}
              >
                <Card className="bg-gradient-to-br from-white/5 to-white/0 backdrop-blur-sm border border-white/10 hover:border-blue-500/30 hover:bg-gradient-to-br hover:from-blue-500/10 hover:to-purple-500/5 transition-all duration-300 h-full rounded-2xl sm:rounded-3xl group shadow-lg shadow-blue-500/5">
                  <CardContent className="p-4 sm:p-5 md:p-6 space-y-2 sm:space-y-3">
                    <div className={`${feature.color} group-hover:scale-110 transition-transform duration-300`}>
                      {feature.icon}
                    </div>
                    <h3 className="text-base sm:text-lg font-medium text-white">{feature.title}</h3>
                    <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">{feature.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Process Section */}
      <section id="process" className="py-12 sm:py-16 md:py-24 px-4 sm:px-6 relative">
        {/* Background gradient for process section */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-950/5 to-transparent"></div>
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-8 sm:mb-12 md:mb-16 px-4">
            <Badge variant="secondary" className="mb-3 sm:mb-4 bg-gradient-to-r from-purple-500/20 to-blue-500/20 text-white border-purple-500/30 rounded-full px-3 sm:px-4 py-1 text-xs sm:text-sm">
              Processus
            </Badge>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-medium text-white mb-3 sm:mb-4">
              Comment ça fonctionne
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-gray-300 max-w-2xl mx-auto">
              Un parcours simple en 4 étapes
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-6 sm:gap-8 max-w-5xl mx-auto px-4">
            {[
              {
                number: "01",
                title: "Définissez vos critères",
                description: "Marque, modèle, budget, kilométrage... Précisez ce que vous recherchez.",
              },
              {
                number: "02",
                title: "L'IA analyse le marché",
                description: "Scan automatique de toutes les annonces disponibles en temps réel.",
              },
              {
                number: "03",
                title: "Recevez les résultats",
                description: "Liste des meilleures options avec score de fiabilité et alertes.",
              },
              {
                number: "04",
                title: "Achetez en confiance",
                description: "Accompagnement jusqu'à la finalisation de votre achat.",
              },
            ].map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="flex gap-3 sm:gap-4 md:gap-6"
              >
                <div className="text-4xl sm:text-5xl md:text-6xl font-medium bg-gradient-to-br from-blue-500/20 to-purple-500/20 bg-clip-text text-transparent flex-shrink-0">
                  {step.number}
                </div>
                <div className="pt-1 sm:pt-2 space-y-1 sm:space-y-2">
                  <h3 className="text-lg sm:text-xl md:text-2xl font-medium text-white">{step.title}</h3>
                  <p className="text-sm sm:text-base text-gray-300 leading-relaxed">{step.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 sm:py-16 md:py-24 px-4 sm:px-6 border-t border-white/10 relative">
        {/* Background gradient for stats section */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-purple-950/5 to-transparent"></div>
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 md:gap-12 text-center">
            {[
              { number: "100K+", label: "Annonces analysées", color: "from-blue-400 to-blue-500" },
              { number: "98%", label: "Satisfaction client", color: "from-purple-400 to-purple-500" },
              { number: "15K+", label: "Utilisateurs actifs", color: "from-blue-400 to-purple-500" },
              { number: "24/7", label: "Support disponible", color: "from-purple-400 to-blue-500" },
            ].map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <div className={`text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-medium bg-gradient-to-r ${stat.color} bg-clip-text text-transparent mb-1 sm:mb-2`}>{stat.number}</div>
                <div className="text-xs sm:text-sm md:text-base text-gray-300">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section - Masquée si l'utilisateur est connecté */}
      {!isAuthenticated && (
        <section className="py-16 sm:py-24 md:py-32 px-4 sm:px-6">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="space-y-6 sm:space-y-8"
            >
              <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-medium text-white px-4">
                Prêt à commencer ?
              </h2>
              <p className="text-base sm:text-lg md:text-xl text-gray-400 max-w-2xl mx-auto px-4">
                Rejoignez des milliers d&apos;utilisateurs qui ont déjà trouvé leur voiture idéale grâce à notre IA.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center pt-4 px-4">
                <Button 
                  size="lg" 
                  asChild
                  className="bg-white text-black hover:bg-gray-200 px-6 sm:px-8 py-5 sm:py-6 text-sm sm:text-base rounded-full transition-all w-full sm:w-auto"
                >
                  <Link href="/recherche" className="flex items-center justify-center gap-2">
                    Commencer ma recherche
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button 
                  size="lg" 
                  variant="outline" 
                  asChild
                  className="border border-white/20 bg-white/5 hover:bg-white/10 text-white px-6 sm:px-8 py-5 sm:py-6 text-sm sm:text-base rounded-full backdrop-blur-sm transition-all w-full sm:w-auto"
                >
                  <Link href="/signup" className="flex items-center justify-center">
                    Créer un compte
                  </Link>
                </Button>
              </div>
            </motion.div>
          </div>
        </section>
      )}
    </div>
  );
}
