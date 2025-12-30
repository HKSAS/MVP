'use client'

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from 'framer-motion';
import { FileText, Building2, Mail, Phone, Globe } from "lucide-react";

export default function MentionsLegalesPage() {
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
              <FileText className="size-4 mr-2 inline" />
              Informations légales
            </Badge>
            <h1 className="text-5xl md:text-6xl font-medium text-white mb-4">
              Mentions légales
            </h1>
            <p className="text-xl text-gray-400">
              Informations légales et réglementaires concernant AutoIA
            </p>
          </motion.div>

          {/* Content */}
          <motion.div
            className="space-y-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Card className="bg-white/5 backdrop-blur-xl border-white/10">
              <CardContent className="p-8 space-y-6">
                {/* Éditeur */}
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
                      <Building2 className="size-5 text-white" />
                    </div>
                    <h2 className="text-2xl font-medium text-white">Éditeur du site</h2>
                  </div>
                  <div className="text-gray-400 space-y-2 ml-13">
                    <p><strong className="text-white">Raison sociale :</strong> AutoIA SAS</p>
                    <p><strong className="text-white">Capital social :</strong> 50 000 €</p>
                    <p><strong className="text-white">SIRET :</strong> 123 456 789 00012</p>
                    <p><strong className="text-white">Siège social :</strong> 123 Avenue de la Technologie, 75001 Paris, France</p>
                    <p><strong className="text-white">Directeur de publication :</strong> Jean Dupont</p>
                  </div>
                </div>

                <div className="h-px bg-white/10"></div>

                {/* Hébergement */}
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
                      <Globe className="size-5 text-white" />
                    </div>
                    <h2 className="text-2xl font-medium text-white">Hébergement</h2>
                  </div>
                  <div className="text-gray-400 space-y-2 ml-13">
                    <p><strong className="text-white">Hébergeur :</strong> Vercel Inc.</p>
                    <p><strong className="text-white">Adresse :</strong> 340 S Lemon Ave #4133, Walnut, CA 91789, USA</p>
                    <p><strong className="text-white">Site web :</strong> <a href="https://vercel.com" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">vercel.com</a></p>
                  </div>
                </div>

                <div className="h-px bg-white/10"></div>

                {/* Contact */}
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
                      <Mail className="size-5 text-white" />
                    </div>
                    <h2 className="text-2xl font-medium text-white">Contact</h2>
                  </div>
                  <div className="text-gray-400 space-y-2 ml-13">
                    <p className="flex items-center gap-2">
                      <Mail className="size-4" />
                      <a href="mailto:contact@autoia.fr" className="text-blue-400 hover:text-blue-300">contact@autoia.fr</a>
                    </p>
                    <p className="flex items-center gap-2">
                      <Phone className="size-4" />
                      <a href="tel:+33123456789" className="text-blue-400 hover:text-blue-300">+33 1 23 45 67 89</a>
                    </p>
                  </div>
                </div>

                <div className="h-px bg-white/10"></div>

                {/* Propriété intellectuelle */}
                <div>
                  <h2 className="text-2xl font-medium text-white mb-4">Propriété intellectuelle</h2>
                  <div className="text-gray-400 space-y-3">
                    <p>
                      L&apos;ensemble de ce site relève de la législation française et internationale sur le droit d&apos;auteur et la propriété intellectuelle. 
                      Tous les droits de reproduction sont réservés, y compris pour les documents téléchargeables et les représentations iconographiques et photographiques.
                    </p>
                    <p>
                      La reproduction de tout ou partie de ce site sur un support électronique quel qu&apos;il soit est formellement interdite 
                      sauf autorisation expresse du directeur de la publication.
                    </p>
                  </div>
                </div>

                <div className="h-px bg-white/10"></div>

                {/* Données personnelles */}
                <div>
                  <h2 className="text-2xl font-medium text-white mb-4">Protection des données personnelles</h2>
                  <div className="text-gray-400 space-y-3">
                    <p>
                      Conformément à la loi "Informatique et Libertés" du 6 janvier 1978 modifiée et au Règlement Général sur la Protection des Données (RGPD), 
                      vous disposez d&apos;un droit d&apos;accès, de rectification, de suppression et d&apos;opposition aux données personnelles vous concernant.
                    </p>
                    <p>
                      Pour exercer ces droits, veuillez nous contacter à l&apos;adresse : <a href="mailto:privacy@autoia.fr" className="text-blue-400 hover:text-blue-300">privacy@autoia.fr</a>
                    </p>
                  </div>
                </div>

                <div className="h-px bg-white/10"></div>

                {/* Cookies */}
                <div>
                  <h2 className="text-2xl font-medium text-white mb-4">Cookies</h2>
                  <div className="text-gray-400 space-y-3">
                    <p>
                      Le site AutoIA peut être amené à vous demander l&apos;acceptation des cookies pour des besoins de statistiques et d&apos;affichage. 
                      Un cookie est une information déposée sur votre disque dur par le serveur du site que vous visitez.
                    </p>
                    <p>
                      Vous pouvez désactiver les cookies dans les paramètres de votre navigateur.
                    </p>
                  </div>
                </div>
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

