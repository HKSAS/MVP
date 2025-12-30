'use client'

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from 'framer-motion';
import {
  Target,
  Sparkles,
  Shield,
  Users,
  TrendingUp,
  CheckCircle,
  Brain,
  Heart,
  ArrowRight,
} from "lucide-react";

export default function AboutPage() {
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
              <Sparkles className="size-4 mr-2 inline" />
              À propos d&apos;AutoIA
            </Badge>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-medium text-white">
              Révolutionner l&apos;achat
              <br />
              <span className="bg-gradient-to-r from-blue-400 via-blue-500 to-purple-500 bg-clip-text text-transparent">
                automobile grâce à l&apos;IA
              </span>
            </h1>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Notre mission est de rendre l&apos;achat d&apos;une voiture d&apos;occasion simple, transparent et sécurisé pour tous.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <Badge variant="secondary" className="bg-white/10 text-white border-white/20 rounded-full px-4 py-1 mb-6 inline-flex">
                <Target className="size-4 mr-2" />
                Notre mission
              </Badge>
              <h2 className="text-4xl font-medium text-white mb-6">
                Protéger les acheteurs, simplifier le processus
              </h2>
              <p className="text-gray-400 mb-4">
                L&apos;achat d&apos;une voiture d&apos;occasion peut être stressant et risqué. Les arnaques sont fréquentes, les prix difficiles à évaluer, et les informations souvent incomplètes.
              </p>
              <p className="text-gray-400 mb-4">
                C&apos;est pourquoi nous avons créé AutoIA : une plateforme qui utilise l&apos;intelligence artificielle pour analyser des milliers d&apos;annonces, détecter les incohérences et vous guider vers le bon choix.
              </p>
              <p className="text-gray-400">
                Que vous soyez jeune conducteur, parent de famille ou passionné automobile, nous mettons la technologie au service de votre tranquillité d&apos;esprit.
              </p>
            </motion.div>
            <motion.div 
              className="grid grid-cols-2 gap-4"
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <Card className="bg-white/5 backdrop-blur-xl border-white/10 hover:bg-white/10 transition-all">
                <CardContent className="p-6 text-center">
                  <div className="text-5xl font-medium bg-gradient-to-r from-blue-400 to-blue-500 bg-clip-text text-transparent mb-2">10k+</div>
                  <div className="text-sm text-gray-400">Annonces analysées</div>
                </CardContent>
              </Card>
              <Card className="bg-white/5 backdrop-blur-xl border-white/10 hover:bg-white/10 transition-all">
                <CardContent className="p-6 text-center">
                  <div className="text-5xl font-medium bg-gradient-to-r from-green-400 to-green-500 bg-clip-text text-transparent mb-2">98%</div>
                  <div className="text-sm text-gray-400">Satisfaction client</div>
                </CardContent>
              </Card>
              <Card className="bg-white/5 backdrop-blur-xl border-white/10 hover:bg-white/10 transition-all">
                <CardContent className="p-6 text-center">
                  <div className="text-5xl font-medium bg-gradient-to-r from-purple-400 to-purple-500 bg-clip-text text-transparent mb-2">5k+</div>
                  <div className="text-sm text-gray-400">Utilisateurs actifs</div>
                </CardContent>
              </Card>
              <Card className="bg-white/5 backdrop-blur-xl border-white/10 hover:bg-white/10 transition-all">
                <CardContent className="p-6 text-center">
                  <div className="text-5xl font-medium bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent mb-2">24/7</div>
                  <div className="text-sm text-gray-400">Support disponible</div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="bg-white/10 text-white border-white/20 rounded-full px-4 py-1 mb-6">
              Technologie
            </Badge>
            <h2 className="text-4xl md:text-5xl font-medium text-white mb-4">Comment fonctionne notre IA ?</h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Une technologie de pointe combinée à l&apos;expertise automobile
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <Brain className="size-10" />,
                title: "Analyse intelligente",
                description: "Notre IA scanne et analyse des milliers d'annonces en temps réel, en comparant prix, kilométrages et descriptions.",
              },
              {
                icon: <Shield className="size-10" />,
                title: "Détection d'anomalies",
                description: "Algorithmes avancés pour repérer les incohérences, photos suspectes, prix anormaux et autres signaux d'alerte.",
              },
              {
                icon: <TrendingUp className="size-10" />,
                title: "Score de fiabilité",
                description: "Chaque véhicule reçoit un score basé sur des centaines de critères, pour vous aider à prendre la meilleure décision.",
              },
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card className="bg-white/5 backdrop-blur-xl border-white/10 hover:bg-white/10 transition-all h-full text-center">
                  <CardContent className="p-8">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl mb-6 shadow-lg shadow-blue-500/20">
                      <div className="text-white">{feature.icon}</div>
                    </div>
                    <h3 className="text-2xl font-medium text-white mb-3">{feature.title}</h3>
                    <p className="text-gray-400">{feature.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="bg-white/10 text-white border-white/20 rounded-full px-4 py-1 mb-6">
              Valeurs
            </Badge>
            <h2 className="text-4xl md:text-5xl font-medium text-white mb-4">Nos valeurs</h2>
          </div>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              {
                icon: <CheckCircle className="size-8" />,
                title: "Transparence",
                description: "Tous nos critères d'analyse sont publics et explicités",
              },
              {
                icon: <Shield className="size-8" />,
                title: "Sécurité",
                description: "Votre protection est notre priorité absolue",
              },
              {
                icon: <Users className="size-8" />,
                title: "Accessibilité",
                description: "Un service pour tous, quel que soit le budget",
              },
              {
                icon: <Heart className="size-8" />,
                title: "Accompagnement",
                description: "Des experts humains disponibles à chaque étape",
              },
            ].map((value, index) => (
              <motion.div 
                key={index} 
                className="text-center"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl mb-6 shadow-lg shadow-blue-500/20">
                  <div className="text-white">{value.icon}</div>
                </div>
                <h3 className="text-xl font-medium text-white mb-2">{value.title}</h3>
                <p className="text-gray-400">{value.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="bg-white/10 text-white border-white/20 rounded-full px-4 py-1 mb-6">
              Histoire
            </Badge>
            <h2 className="text-4xl md:text-5xl font-medium text-white mb-4">Notre histoire</h2>
          </div>
          <div className="space-y-8">
            {[
              {
                year: "2023",
                title: "Naissance du projet",
                description: "Après avoir vécu plusieurs expériences d'achats difficiles, nous décidons de créer AutoIA.",
              },
              {
                year: "2024",
                title: "Lancement de la plateforme",
                description: "Première version de notre IA d'analyse avec 1000 utilisateurs bêta-testeurs.",
              },
              {
                year: "2025",
                title: "Expansion nationale",
                description: "5000+ utilisateurs actifs et partenariats avec des experts automobiles partout en France.",
              },
            ].map((milestone, index) => (
              <motion.div 
                key={index} 
                className="flex gap-6"
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <div className="flex-shrink-0">
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-500 text-white rounded-2xl flex items-center justify-center font-medium shadow-lg shadow-blue-500/20">
                    {milestone.year}
                  </div>
                </div>
                <div className="pt-2">
                  <h3 className="text-2xl font-medium text-white mb-2">{milestone.title}</h3>
                  <p className="text-gray-400">{milestone.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="bg-white/10 text-white border-white/20 rounded-full px-4 py-1 mb-6">
              Équipe
            </Badge>
            <h2 className="text-4xl md:text-5xl font-medium text-white mb-4">L&apos;équipe derrière AutoIA</h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Une équipe passionnée d&apos;ingénieurs, data scientists et experts automobiles
            </p>
          </div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <Card className="bg-white/5 backdrop-blur-xl border-white/10 text-center">
              <CardContent className="p-12">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl mb-6 shadow-lg shadow-blue-500/20">
                  <Users className="size-10 text-white" />
                </div>
                <h3 className="text-3xl font-medium text-white mb-4">Une équipe à votre service</h3>
                <p className="text-gray-400 mb-8 max-w-2xl mx-auto">
                  Nous sommes une équipe de 15 personnes passionnées par l&apos;automobile et la technologie, 
                  déterminées à rendre l&apos;achat d&apos;une voiture plus sûr et plus simple pour tous.
                </p>
                <Button asChild className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-full px-8">
                  <Link href="/contact">Nous contacter</Link>
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-32 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="space-y-8"
          >
            <h2 className="text-5xl md:text-6xl font-medium text-white">
              Prêt à découvrir AutoIA ?
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Rejoignez des milliers d&apos;utilisateurs qui ont déjà sécurisé leur achat automobile avec notre IA.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button size="lg" asChild className="bg-white text-black hover:bg-gray-200 px-8 py-6 text-base rounded-full">
                <Link href="/recherche" className="flex items-center gap-2">
                  Commencer une recherche
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="border border-white/20 bg-white/5 hover:bg-white/10 text-white px-8 py-6 text-base rounded-full backdrop-blur-sm">
                <Link href="/inscription">Créer un compte</Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}

