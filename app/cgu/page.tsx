'use client'

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from 'framer-motion';
import { ScrollText, CheckCircle, AlertTriangle, UserCheck } from "lucide-react";

export default function CGUPage() {
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
              <ScrollText className="size-4 mr-2 inline" />
              Conditions d&apos;utilisation
            </Badge>
            <h1 className="text-5xl md:text-6xl font-medium text-white mb-4">
              Conditions Générales
              <br />
              <span className="bg-gradient-to-r from-blue-400 via-blue-500 to-purple-500 bg-clip-text text-transparent">
                d&apos;Utilisation
              </span>
            </h1>
            <p className="text-xl text-gray-400">
              Dernière mise à jour : 23 décembre 2024
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
              <CardContent className="p-8 space-y-8">
                {/* Article 1 */}
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center font-medium">
                      1
                    </div>
                    <h2 className="text-2xl font-medium text-white">Objet</h2>
                  </div>
                  <div className="text-gray-400 space-y-3 ml-13">
                    <p>
                      Les présentes Conditions Générales d&apos;Utilisation (ci-après "CGU") ont pour objet de définir les modalités et conditions 
                      d&apos;utilisation de la plateforme AutoIA (ci-après "la Plateforme"), ainsi que les droits et obligations des utilisateurs 
                      (ci-après "l'Utilisateur" ou "les Utilisateurs").
                    </p>
                    <p>
                      L&apos;accès et l&apos;utilisation de la Plateforme sont subordonnés à l&apos;acceptation et au respect des présentes CGU.
                    </p>
                  </div>
                </div>

                <div className="h-px bg-white/10"></div>

                {/* Article 2 */}
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center font-medium">
                      2
                    </div>
                    <h2 className="text-2xl font-medium text-white">Accès à la Plateforme</h2>
                  </div>
                  <div className="text-gray-400 space-y-3 ml-13">
                    <p>
                      La Plateforme est accessible gratuitement à tout Utilisateur disposant d&apos;un accès à Internet. 
                      Tous les coûts afférents à l&apos;accès à la Plateforme, que ce soient les frais matériels, logiciels ou d&apos;accès à Internet, 
                      sont exclusivement à la charge de l&apos;Utilisateur.
                    </p>
                    <p>
                      AutoIA met en œuvre tous les moyens raisonnables à sa disposition pour assurer un accès de qualité à la Plateforme, 
                      mais n&apos;est tenue à aucune obligation d&apos;y parvenir.
                    </p>
                  </div>
                </div>

                <div className="h-px bg-white/10"></div>

                {/* Article 3 */}
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center font-medium">
                      3
                    </div>
                    <h2 className="text-2xl font-medium text-white">Services proposés</h2>
                  </div>
                  <div className="text-gray-400 space-y-3 ml-13">
                    <p>La Plateforme permet aux Utilisateurs de :</p>
                    <ul className="list-none space-y-2">
                      <li className="flex items-start gap-2">
                        <CheckCircle className="size-5 text-blue-400 flex-shrink-0 mt-0.5" />
                        <span>Effectuer des recherches de véhicules d&apos;occasion via une intelligence artificielle</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="size-5 text-blue-400 flex-shrink-0 mt-0.5" />
                        <span>Analyser des annonces automobiles pour détecter d&apos;éventuelles anomalies ou arnaques</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="size-5 text-blue-400 flex-shrink-0 mt-0.5" />
                        <span>Accéder à un tableau de bord personnalisé</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="size-5 text-blue-400 flex-shrink-0 mt-0.5" />
                        <span>Sauvegarder et suivre leurs recherches favorites</span>
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="h-px bg-white/10"></div>

                {/* Article 4 */}
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center font-medium">
                      4
                    </div>
                    <h2 className="text-2xl font-medium text-white">Inscription et compte utilisateur</h2>
                  </div>
                  <div className="text-gray-400 space-y-3 ml-13">
                    <p>
                      L&apos;utilisation de certaines fonctionnalités de la Plateforme nécessite la création d&apos;un compte utilisateur. 
                      L&apos;Utilisateur s&apos;engage à fournir des informations exactes et à les maintenir à jour.
                    </p>
                    <p>
                      L&apos;Utilisateur est responsable de la confidentialité de ses identifiants de connexion et s&apos;engage à ne pas les partager 
                      avec des tiers. Toute utilisation de la Plateforme effectuée à partir du compte d&apos;un Utilisateur est réputée avoir été 
                      effectuée par cet Utilisateur.
                    </p>
                  </div>
                </div>

                <div className="h-px bg-white/10"></div>

                {/* Article 5 */}
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center font-medium">
                      5
                    </div>
                    <h2 className="text-2xl font-medium text-white">Obligations de l&apos;Utilisateur</h2>
                  </div>
                  <div className="text-gray-400 space-y-3 ml-13">
                    <p>L&apos;Utilisateur s&apos;engage à :</p>
                    <ul className="list-none space-y-2">
                      <li className="flex items-start gap-2">
                        <UserCheck className="size-5 text-blue-400 flex-shrink-0 mt-0.5" />
                        <span>Utiliser la Plateforme de manière loyale et conforme à sa destination</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <UserCheck className="size-5 text-blue-400 flex-shrink-0 mt-0.5" />
                        <span>Ne pas utiliser la Plateforme à des fins illégales ou frauduleuses</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <UserCheck className="size-5 text-blue-400 flex-shrink-0 mt-0.5" />
                        <span>Respecter les droits de propriété intellectuelle d&apos;AutoIA</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <UserCheck className="size-5 text-blue-400 flex-shrink-0 mt-0.5" />
                        <span>Ne pas tenter de contourner les mesures de sécurité de la Plateforme</span>
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="h-px bg-white/10"></div>

                {/* Article 6 */}
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center font-medium">
                      6
                    </div>
                    <h2 className="text-2xl font-medium text-white">Limitation de responsabilité</h2>
                  </div>
                  <div className="text-gray-400 space-y-3 ml-13">
                    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 flex gap-3">
                      <AlertTriangle className="size-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                      <div className="space-y-2">
                        <p className="text-yellow-200">
                          Les analyses et recommandations fournies par AutoIA sont purement informatives et ne constituent pas des conseils juridiques, 
                          financiers ou professionnels.
                        </p>
                        <p className="text-yellow-200">
                          AutoIA ne peut être tenue responsable des décisions prises par l&apos;Utilisateur sur la base des informations fournies par la Plateforme.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="h-px bg-white/10"></div>

                {/* Article 7 */}
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center font-medium">
                      7
                    </div>
                    <h2 className="text-2xl font-medium text-white">Propriété intellectuelle</h2>
                  </div>
                  <div className="text-gray-400 space-y-3 ml-13">
                    <p>
                      Tous les éléments de la Plateforme (textes, images, graphismes, logo, icônes, sons, logiciels) sont la propriété exclusive 
                      d&apos;AutoIA, à l&apos;exception des marques, logos ou contenus appartenant à d&apos;autres sociétés partenaires ou auteurs.
                    </p>
                    <p>
                      Toute reproduction, représentation, modification, publication, adaptation de tout ou partie des éléments de la Plateforme, 
                      quel que soit le moyen ou le procédé utilisé, est interdite, sauf autorisation écrite préalable d&apos;AutoIA.
                    </p>
                  </div>
                </div>

                <div className="h-px bg-white/10"></div>

                {/* Article 8 */}
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center font-medium">
                      8
                    </div>
                    <h2 className="text-2xl font-medium text-white">Modification des CGU</h2>
                  </div>
                  <div className="text-gray-400 space-y-3 ml-13">
                    <p>
                      AutoIA se réserve le droit de modifier les présentes CGU à tout moment. Les Utilisateurs seront informés de ces modifications 
                      par tout moyen utile. Les CGU applicables sont celles en vigueur à la date de connexion et d&apos;utilisation de la Plateforme par l&apos;Utilisateur.
                    </p>
                  </div>
                </div>

                <div className="h-px bg-white/10"></div>

                {/* Article 9 */}
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center font-medium">
                      9
                    </div>
                    <h2 className="text-2xl font-medium text-white">Droit applicable et juridiction</h2>
                  </div>
                  <div className="text-gray-400 space-y-3 ml-13">
                    <p>
                      Les présentes CGU sont régies par le droit français. En cas de litige et à défaut d&apos;accord amiable, le litige sera porté 
                      devant les tribunaux français conformément aux règles de compétence en vigueur.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contact */}
            <Card className="bg-blue-500/10 border-blue-500/20 backdrop-blur-xl">
              <CardContent className="p-6 text-center">
                <p className="text-gray-300">
                  Pour toute question concernant ces CGU, veuillez nous contacter à{" "}
                  <a href="mailto:legal@autoia.fr" className="text-blue-400 hover:text-blue-300">legal@autoia.fr</a>
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

