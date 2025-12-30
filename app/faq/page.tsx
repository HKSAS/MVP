'use client'

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { HelpCircle, MessageCircle } from "lucide-react";
import { motion } from "framer-motion";

const faqData = [
  {
    category: "Général",
    questions: [
      {
        question: "Qu'est-ce qu'AutoIA ?",
        answer: "AutoIA est une plateforme qui utilise l'intelligence artificielle pour vous aider à trouver et acheter une voiture d'occasion en toute sécurité. Notre IA analyse des milliers d'annonces, détecte les arnaques potentielles et vous fournit un score de fiabilité pour chaque véhicule.",
      },
      {
        question: "Comment fonctionne la recherche IA ?",
        answer: "Notre système d'IA scanne en temps réel les principales plateformes d'annonces automobiles (LeBonCoin, ParuVendu, Autoscout24, etc.). Il analyse les prix, kilométrages, descriptions et photos pour identifier les meilleures opportunités correspondant à vos critères.",
      },
      {
        question: "Est-ce que le service est gratuit ?",
        answer: "La recherche de base et l'analyse d'annonces sont gratuites. Nous proposons également des formules premium avec accompagnement personnalisé par nos experts automobiles pour ceux qui souhaitent un service complet.",
      },
    ],
  },
  {
    category: "Recherche et Analyse",
    questions: [
      {
        question: "Sur quels sites recherchez-vous les annonces ?",
        answer: "Nous scannons les principales plateformes françaises : LeBonCoin, ParuVendu, Autoscout24, La Centrale, et bien d'autres. Notre IA agrège les résultats pour vous offrir une vue complète du marché.",
      },
      {
        question: "Comment est calculé le score de fiabilité ?",
        answer: "Le score de fiabilité est calculé à partir de plus de 100 critères : cohérence du prix avec le marché, analyse du kilométrage par rapport à l'année, qualité de la description, vérification du vendeur, analyse des photos, historique du véhicule si disponible, etc.",
      },
      {
        question: "L'analyse d'annonce est-elle fiable ?",
        answer: "Notre IA a été entraînée sur des millions d'annonces et détecte les anomalies avec une précision de 95%. Cependant, nous recommandons toujours de faire vérifier le véhicule par un professionnel avant l'achat final.",
      },
      {
        question: "Puis-je analyser n'importe quelle annonce ?",
        answer: "Oui ! Vous pouvez copier-coller le lien ou le texte de n'importe quelle annonce automobile, quel que soit le site source. Notre IA l'analysera et vous fournira un rapport détaillé.",
      },
    ],
  },
  {
    category: "Budgets et Public",
    questions: [
      {
        question: "Est-ce que vous travaillez avec tous les budgets ?",
        answer: "Absolument ! Notre service s'adapte à tous les budgets, de la première voiture à 5000€ aux véhicules premium à plus de 50000€. L'IA analyse les véhicules de toutes catégories avec la même rigueur.",
      },
      {
        question: "Le service convient-il aux jeunes conducteurs ?",
        answer: "Oui, c'est même l'un de nos publics prioritaires ! Nous savons que l'achat d'une première voiture peut être stressant. Notre IA vous aide à éviter les pièges et à trouver un véhicule fiable dans votre budget.",
      },
      {
        question: "Est-ce que vous aidez aussi pour les voitures premium ?",
        answer: "Bien sûr ! Pour les véhicules haut de gamme, nous proposons même un accompagnement personnalisé avec des experts spécialisés dans les marques premium (Porsche, Mercedes, BMW, Tesla, etc.).",
      },
      {
        question: "Proposez-vous un service pour les professionnels ?",
        answer: "Oui, nous avons des offres spécifiques pour les garages, auto-écoles et marchands automobiles. Contactez-nous pour en savoir plus sur nos solutions B2B.",
      },
    ],
  },
  {
    category: "Sécurité et Confiance",
    questions: [
      {
        question: "Comment évitez-vous les arnaques ?",
        answer: "Notre IA détecte automatiquement les signaux d'alerte : prix anormalement bas, photos volées sur internet, descriptions incohérentes, vendeurs suspects, etc. Nous vous alertons sur tous les points à vérifier avant de vous engager.",
      },
      {
        question: "Puis-je faire confiance aux scores affichés ?",
        answer: "Les scores sont calculés de manière objective par notre IA sur la base de données vérifiables. Cependant, un bon score ne remplace pas une inspection physique du véhicule par un professionnel.",
      },
      {
        question: "Que se passe-t-il si j'achète un véhicule avec un problème ?",
        answer: "Nous fournissons une analyse basée sur les informations disponibles, mais nous ne sommes pas responsables de l'achat final. Nous recommandons toujours un contrôle technique et/ou l'expertise d'un mécanicien indépendant.",
      },
    ],
  },
  {
    category: "Compte et Données",
    questions: [
      {
        question: "Dois-je créer un compte ?",
        answer: "Non, vous pouvez utiliser les fonctions de base sans compte. Cependant, créer un compte gratuit vous permet de sauvegarder vos recherches et de suivre l'évolution des annonces qui vous intéressent.",
      },
      {
        question: "Mes données sont-elles protégées ?",
        answer: "Oui, nous prenons la protection de vos données très au sérieux. Nous ne vendons jamais vos informations et appliquons les normes RGPD les plus strictes.",
      },
      {
        question: "Comment supprimer mon compte ?",
        answer: "Vous pouvez supprimer votre compte à tout moment depuis les paramètres de votre profil. Toutes vos données seront définitivement effacées sous 30 jours.",
      },
    ],
  },
];

export default function FAQPage() {
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
              <HelpCircle className="size-4 mr-2 inline" />
              Centre d&apos;aide
            </Badge>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-medium text-white">
              Foire aux
              <br />
              <span className="bg-gradient-to-r from-blue-400 via-blue-500 to-purple-500 bg-clip-text text-transparent">
                questions
              </span>
            </h1>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Trouvez rapidement les réponses à vos questions sur AutoIA
            </p>
          </motion.div>
        </div>
      </section>

      {/* FAQ Content */}
      <section className="py-12 px-4 relative">
        <div className="max-w-4xl mx-auto">
          <div className="space-y-8">
            {faqData.map((category, categoryIndex) => (
              <motion.div 
                key={categoryIndex}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: categoryIndex * 0.1 }}
              >
                <h2 className="text-3xl font-medium text-white mb-6">{category.category}</h2>
                <Card className="bg-white/5 backdrop-blur-xl border-white/10 shadow-2xl">
                  <CardContent className="p-6">
                    <Accordion type="single" collapsible className="w-full">
                      {category.questions.map((faq, faqIndex) => (
                        <AccordionItem
                          key={faqIndex}
                          value={`${categoryIndex}-${faqIndex}`}
                          className="border-b border-white/10 last:border-0"
                        >
                          <AccordionTrigger className="text-left text-white hover:text-blue-400 transition-colors py-4">
                            {faq.question}
                          </AccordionTrigger>
                          <AccordionContent className="text-gray-400 pb-4">
                            {faq.answer}
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Contact CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: faqData.length * 0.1 }}
          >
            <Card className="mt-12 bg-white/5 backdrop-blur-xl border-white/10 shadow-2xl">
              <CardContent className="p-8 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 mb-6">
                  <MessageCircle className="size-8 text-white" />
                </div>
                <h3 className="text-2xl font-medium text-white mb-3">Vous ne trouvez pas votre réponse ?</h3>
                <p className="text-gray-400 mb-6 max-w-md mx-auto">
                  Notre équipe est là pour vous aider. N&apos;hésitez pas à nous contacter.
                </p>
                <Button asChild className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-full px-8">
                  <Link href="/contact">Nous contacter</Link>
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
