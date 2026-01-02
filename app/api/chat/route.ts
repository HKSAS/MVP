/**
 * API ENDPOINT POUR OPENAI GPT-4
 * - Reçoit le message utilisateur
 * - Analyse le contexte et l'intention
 * - Appelle l'API OpenAI
 * - Détermine si redirection Calendly nécessaire
 * - Retourne la réponse formatée
 */

import { NextRequest, NextResponse } from 'next/server';
import { openaiService } from '@/lib/openaiService';
import { getKnowledgeBase } from '@/lib/chatbotKnowledge';
import { analyzeIntent, needsCalendlyRedirect } from './helpers';

export async function POST(req: NextRequest) {
  try {
    const { message, conversationHistory, userName, calendlyUrl } = await req.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { response: 'Message invalide.', shouldShowCalendly: false },
        { status: 400 }
      );
    }

    // Analyser l'intention de l'utilisateur
    const intent = analyzeIntent(message);
    
    // Base de connaissances FAQ
    const knowledgeBase = getKnowledgeBase();

    // Construire le prompt système pour GPT-4
    const systemPrompt = `Tu es l'assistant virtuel d'Autoval IA, une plateforme de recherche intelligente de véhicules d'occasion avec intelligence artificielle.

IDENTITÉ ET TON :
- Tu es chaleureux, professionnel et efficace
- Tu utilises un ton amical mais respectueux
- Tu t'adresses à ${userName || 'l\'utilisateur'} de manière personnalisée

BASE DE CONNAISSANCES :
${knowledgeBase}

RÈGLES IMPORTANTES :
1. Réponds UNIQUEMENT aux questions liées à la recherche de véhicules, les services de la plateforme, les tarifs, les quotas, les fonctionnalités
2. Si la question est hors sujet (météo, recettes, etc.), redirige poliment vers le sujet de la plateforme
3. Sois concis : maximum 3-4 phrases par réponse
4. Utilise des emojis avec parcimonie (1 par message max) 🚗
5. Si la demande nécessite un RDV, une démonstration personnalisée, ou une explication détaillée, propose Calendly

DÉCLENCHEURS CALENDLY (réponds "CALENDLY_NEEDED" au début si c'est le cas) :
- Mots-clés : "rendez-vous", "rdv", "réserver", "prendre un rendez-vous", "disponibilité", "démonstration", "démo"
- Questions techniques complexes nécessitant une explication détaillée
- Demandes de présentation personnalisée
- Besoin d'aide approfondie

EXEMPLES DE RÉPONSES :
Q: "Comment fonctionne la recherche ?"
R: "Notre plateforme utilise l'IA pour analyser des milliers d'annonces de véhicules d'occasion. Vous pouvez rechercher par critères (marque, prix, kilométrage) et l'IA vous propose les meilleures opportunités avec des scores d'analyse. 🚗"

Q: "Je veux prendre rendez-vous pour une démonstration"
R: "CALENDLY_NEEDED Parfait ! Je vais vous rediriger vers notre système de prise de rendez-vous en ligne. Vous pourrez choisir le créneau qui vous convient le mieux pour une démonstration personnalisée."

Q: "Quels sont les tarifs ?"
R: "Nous proposons plusieurs formules : un abonnement mensuel à 39€/mois, ou des packs one-time (Essentiel 299€, Confort 599€, Premium 999€). Chaque plan inclut un quota d'analyses mensuel. Voulez-vous plus de détails sur un plan spécifique ?"

Réponds maintenant à la question de l'utilisateur.`;

    // Construire l'historique des messages pour OpenAI
    const messages = [
      {
        role: 'system' as const,
        content: systemPrompt
      },
      ...(conversationHistory || [])
        .filter((msg: any) => msg.type !== 'system')
        .slice(-10) // Limiter à 10 derniers messages pour économiser les tokens
        .map((msg: any) => ({
          role: msg.type === 'user' ? ('user' as const) : ('assistant' as const),
          content: msg.content
        })),
      {
        role: 'user' as const,
        content: message
      }
    ];

    // Appeler OpenAI API
    const result = await openaiService.chat(messages);

    if (!result.success) {
      throw new Error('Erreur lors de l\'appel OpenAI');
    }

    // Extraire la réponse
    const botResponse = result.content || 'Désolé, je n\'ai pas pu traiter votre demande.';

    // Vérifier si Calendly doit être proposé
    const shouldShowCalendly = botResponse.includes('CALENDLY_NEEDED') || 
                               needsCalendlyRedirect(message, intent);
    const cleanedResponse = botResponse.replace('CALENDLY_NEEDED', '').trim();

    return NextResponse.json({
      response: cleanedResponse,
      shouldShowCalendly,
      calendlyUrl: shouldShowCalendly ? (calendlyUrl || process.env.NEXT_PUBLIC_CALENDLY_URL) : null,
      intent
    });

  } catch (error) {
    console.error('Erreur API Chat:', error);
    
    return NextResponse.json(
      { 
        response: "Je rencontre un problème technique. Pourriez-vous reformuler votre question ?",
        shouldShowCalendly: false 
      },
      { status: 500 }
    );
  }
}

