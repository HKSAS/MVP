/**
 * WRAPPER CLIENT POUR LE CHATBOT
 * Nécessaire car le layout est un Server Component
 */

'use client'

import dynamic from 'next/dynamic';

// Lazy load du chatbot pour optimiser les performances
const ChatBot = dynamic(() => import('./ChatBot'), {
  ssr: false,
});

export default function ChatBotWrapper() {
  // Récupérer l'URL Calendly depuis les variables d'environnement
  const calendlyUrl = typeof window !== 'undefined' 
    ? process.env.NEXT_PUBLIC_CALENDLY_URL 
    : process.env.NEXT_PUBLIC_CALENDLY_URL;

  return (
    <ChatBot
      position="bottom-right"
      primaryColor="#667EEA"
      calendlyUrl={calendlyUrl}
    />
  );
}

