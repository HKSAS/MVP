'use client'

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from 'framer-motion';
import { Shield, Lock, Eye, Database, UserX, Cookie } from "lucide-react";

export default function PolitiqueConfidentialitePage() {
  return (
    <div className="bg-[#0a0a0a] text-white min-h-screen pt-20">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/3 w-[400px] h-[400px] bg-purple-600/10 rounded-full blur-[100px]"></div>
      </div>

      <div className="relative py-20 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Hero Section */}
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Badge variant="secondary" className="bg-white/10 text-white border-white/20 rounded-full px-4 py-1 mb-6">
              <Shield className="size-4 mr-2 inline" />
              Protection des données
            </Badge>
            <h1 className="text-5xl md:text-6xl font-medium text-white mb-4">
              Politique de
              <br />
              <span className="bg-gradient-to-r from-blue-400 via-blue-500 to-purple-500 bg-clip-text text-transparent">
                Confidentialité
              </span>
            </h1>
            <p className="text-xl text-gray-400">
              Comment nous collectons, utilisons et protégeons vos données personnelles
            </p>
          </motion.div>

          {/* Content */}
          <motion.div
            className="space-y-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            {/* Introduction */}
            <Card className="bg-white/5 backdrop-blur-xl border-white/10">
              <CardContent className="p-8">
                <p className="text-gray-400">
                  Chez AutoIA, nous accordons une grande importance à la protection de vos données personnelles. 
                  La présente Politique de Confidentialité a pour but de vous informer sur la manière dont nous collectons, 
                  utilisons, partageons et protégeons vos informations conformément au Règlement Général sur la Protection des Données (RGPD) 
                  et à la loi "Informatique et Libertés".
                </p>
              </CardContent>
            </Card>

            {/* Section 1 */}
            <Card className="bg-white/5 backdrop-blur-xl border-white/10">
              <CardContent className="p-8 space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
                    <Database className="size-6 text-white" />
                  </div>
                  <h2 className="text-2xl font-medium text-white">Données collectées</h2>
                </div>
                <div className="text-gray-400 space-y-4">
                  <p>Nous collectons les données suivantes :</p>
                  
                  <div className="space-y-3">
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                      <h3 className="text-white font-medium mb-2">Données d'identification</h3>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        <li>Nom et prénom</li>
                        <li>Adresse email</li>
                        <li>Numéro de téléphone (optionnel)</li>
                      </ul>
                    </div>
                    
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                      <h3 className="text-white font-medium mb-2">Données de navigation</h3>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        <li>Adresse IP</li>
                        <li>Type de navigateur</li>
                        <li>Pages visitées et durée de visite</li>
                        <li>Données de géolocalisation (avec votre consentement)</li>
                      </ul>
                    </div>
                    
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                      <h3 className="text-white font-medium mb-2">Données de recherche</h3>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        <li>Critères de recherche de véhicules</li>
                        <li>Annonces consultées et analysées</li>
                        <li>Recherches sauvegardées</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Section 2 */}
            <Card className="bg-white/5 backdrop-blur-xl border-white/10">
              <CardContent className="p-8 space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
                    <Eye className="size-6 text-white" />
                  </div>
                  <h2 className="text-2xl font-medium text-white">Utilisation des données</h2>
                </div>
                <div className="text-gray-400 space-y-3">
                  <p>Nous utilisons vos données personnelles pour :</p>
                  <ul className="list-none space-y-2">
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 flex-shrink-0"></div>
                      <span>Créer et gérer votre compte utilisateur</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 flex-shrink-0"></div>
                      <span>Fournir nos services de recherche et d'analyse de véhicules</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 flex-shrink-0"></div>
                      <span>Personnaliser votre expérience sur la plateforme</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 flex-shrink-0"></div>
                      <span>Vous envoyer des notifications concernant votre compte et nos services</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 flex-shrink-0"></div>
                      <span>Améliorer nos services et développer de nouvelles fonctionnalités</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 flex-shrink-0"></div>
                      <span>Respecter nos obligations légales et réglementaires</span>
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Section 3 */}
            <Card className="bg-white/5 backdrop-blur-xl border-white/10">
              <CardContent className="p-8 space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
                    <Lock className="size-6 text-white" />
                  </div>
                  <h2 className="text-2xl font-medium text-white">Sécurité des données</h2>
                </div>
                <div className="text-gray-400 space-y-3">
                  <p>
                    Nous mettons en œuvre des mesures techniques et organisationnelles appropriées pour protéger vos données personnelles 
                    contre la perte, l'utilisation abusive, l'accès non autorisé, la divulgation, la modification ou la destruction.
                  </p>
                  <p>Ces mesures incluent :</p>
                  <ul className="list-none space-y-2">
                    <li className="flex items-start gap-2">
                      <Lock className="size-4 text-blue-400 flex-shrink-0 mt-1" />
                      <span>Chiffrement des données sensibles (SSL/TLS)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Lock className="size-4 text-blue-400 flex-shrink-0 mt-1" />
                      <span>Contrôle d'accès strict aux données personnelles</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Lock className="size-4 text-blue-400 flex-shrink-0 mt-1" />
                      <span>Sauvegardes régulières et sécurisées</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Lock className="size-4 text-blue-400 flex-shrink-0 mt-1" />
                      <span>Surveillance et audit de sécurité réguliers</span>
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Section 4 */}
            <Card className="bg-white/5 backdrop-blur-xl border-white/10">
              <CardContent className="p-8 space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
                    <Cookie className="size-6 text-white" />
                  </div>
                  <h2 className="text-2xl font-medium text-white">Cookies</h2>
                </div>
                <div className="text-gray-400 space-y-3">
                  <p>
                    Notre site utilise des cookies pour améliorer votre expérience de navigation. Les cookies sont de petits fichiers texte 
                    stockés sur votre appareil lorsque vous visitez notre site.
                  </p>
                  
                  <div className="space-y-3 mt-4">
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                      <h3 className="text-white font-medium mb-2">Cookies essentiels</h3>
                      <p className="text-sm">Nécessaires au fonctionnement du site (connexion, panier, etc.)</p>
                    </div>
                    
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                      <h3 className="text-white font-medium mb-2">Cookies analytiques</h3>
                      <p className="text-sm">Nous aident à comprendre comment les visiteurs utilisent notre site</p>
                    </div>
                    
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                      <h3 className="text-white font-medium mb-2">Cookies de personnalisation</h3>
                      <p className="text-sm">Permettent de mémoriser vos préférences et paramètres</p>
                    </div>
                  </div>
                  
                  <p className="mt-4">
                    Vous pouvez gérer vos préférences de cookies à tout moment dans les paramètres de votre navigateur.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Section 5 */}
            <Card className="bg-white/5 backdrop-blur-xl border-white/10">
              <CardContent className="p-8 space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
                    <UserX className="size-6 text-white" />
                  </div>
                  <h2 className="text-2xl font-medium text-white">Vos droits</h2>
                </div>
                <div className="text-gray-400 space-y-3">
                  <p>Conformément au RGPD, vous disposez des droits suivants :</p>
                  
                  <div className="grid md:grid-cols-2 gap-3 mt-4">
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                      <h3 className="text-white font-medium mb-1">Droit d'accès</h3>
                      <p className="text-sm">Obtenir une copie de vos données personnelles</p>
                    </div>
                    
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                      <h3 className="text-white font-medium mb-1">Droit de rectification</h3>
                      <p className="text-sm">Corriger vos données inexactes ou incomplètes</p>
                    </div>
                    
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                      <h3 className="text-white font-medium mb-1">Droit à l'effacement</h3>
                      <p className="text-sm">Demander la suppression de vos données</p>
                    </div>
                    
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                      <h3 className="text-white font-medium mb-1">Droit d'opposition</h3>
                      <p className="text-sm">Vous opposer au traitement de vos données</p>
                    </div>
                    
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                      <h3 className="text-white font-medium mb-1">Droit à la portabilité</h3>
                      <p className="text-sm">Récupérer vos données dans un format structuré</p>
                    </div>
                    
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                      <h3 className="text-white font-medium mb-1">Droit de limitation</h3>
                      <p className="text-sm">Limiter le traitement de vos données</p>
                    </div>
                  </div>
                  
                  <p className="mt-4">
                    Pour exercer ces droits, contactez-nous à : <a href="mailto:privacy@autoia.fr" className="text-blue-400 hover:text-blue-300">privacy@autoia.fr</a>
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Section 6 */}
            <Card className="bg-white/5 backdrop-blur-xl border-white/10">
              <CardContent className="p-8 space-y-6">
                <h2 className="text-2xl font-medium text-white">Conservation des données</h2>
                <div className="text-gray-400 space-y-3">
                  <p>
                    Nous conservons vos données personnelles uniquement pendant la durée nécessaire aux finalités pour lesquelles elles ont été collectées :
                  </p>
                  <ul className="list-none space-y-2">
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 flex-shrink-0"></div>
                      <span><strong className="text-white">Données de compte :</strong> Jusqu'à la suppression de votre compte + 1 an</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 flex-shrink-0"></div>
                      <span><strong className="text-white">Données de navigation :</strong> 13 mois maximum</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 flex-shrink-0"></div>
                      <span><strong className="text-white">Données de recherche :</strong> Durée de votre abonnement + 3 ans</span>
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Section 7 */}
            <Card className="bg-white/5 backdrop-blur-xl border-white/10">
              <CardContent className="p-8 space-y-6">
                <h2 className="text-2xl font-medium text-white">Partage des données</h2>
                <div className="text-gray-400 space-y-3">
                  <p>
                    Nous ne vendons ni ne louons vos données personnelles à des tiers. Nous pouvons partager vos données uniquement dans les cas suivants :
                  </p>
                  <ul className="list-none space-y-2">
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 flex-shrink-0"></div>
                      <span>Avec des prestataires de services qui nous aident à fournir nos services (hébergement, analytics)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 flex-shrink-0"></div>
                      <span>Si la loi l'exige ou en réponse à une demande légale</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 flex-shrink-0"></div>
                      <span>Avec votre consentement explicite</span>
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Contact */}
            <Card className="bg-blue-500/10 border-blue-500/20 backdrop-blur-xl">
              <CardContent className="p-6 text-center space-y-3">
              </CardContent>
            </Card>

            {/* Dernière mise à jour */}
            <div className="text-center text-gray-500 text-sm mt-8">
              Dernière mise à jour : 23 décembre 2024
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

