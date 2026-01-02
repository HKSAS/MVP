/**
 * COMPOSANT CHATBOT PRINCIPAL
 * - S'affiche uniquement si utilisateur connecté
 * - Bouton flottant en bas à droite
 * - Animation d'ouverture/fermeture fluide
 * - Persistance de l'état (ouvert/fermé) dans localStorage
 */

'use client'

import React, { useState, useEffect } from 'react';
import ChatButton from './ChatButton';
import ChatWindow from './ChatWindow';
import { useAuth } from '@/hooks/useAuth';
import type { Message } from '@/types/chat';

interface ChatBotProps {
  position?: 'bottom-right' | 'bottom-left';
  primaryColor?: string;
  calendlyUrl?: string;
}

export default function ChatBot({ 
  position = 'bottom-right',
  primaryColor = '#667EEA',
  calendlyUrl
}: ChatBotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const { user, loading } = useAuth();

  // Message de bienvenue personnalisé
  useEffect(() => {
    if (loading || !user || messages.length > 0) return;
    
    const welcomeMessage: Message = {
      id: 'welcome',
      type: 'bot',
      content: `Bonjour ${user?.user_metadata?.name || user?.email || 'cher client'} ! 👋\n\nJe suis votre assistant virtuel Autoval IA. Je peux vous aider avec :\n• Informations sur nos services de recherche de véhicules\n• Questions sur les tarifs et abonnements\n• Prendre un rendez-vous pour une démonstration\n• Fonctionnalités de la plateforme\n\nComment puis-je vous aider aujourd'hui ?`,
      timestamp: new Date()
    };
    
    setMessages([welcomeMessage]);
  }, [user, loading, messages.length]);

  // Vérification : NE PAS afficher si non connecté ou en chargement
  if (loading || !user) {
    return null;
  }

  // Récupérer l'URL Calendly depuis les variables d'environnement si non fournie
  const finalCalendlyUrl = calendlyUrl || process.env.NEXT_PUBLIC_CALENDLY_URL || '';

  return (
    <>
      <ChatButton 
        isOpen={isOpen}
        onClick={() => setIsOpen(!isOpen)}
        position={position}
        primaryColor={primaryColor}
      />
      
      {isOpen && (
        <ChatWindow
          messages={messages}
          setMessages={setMessages}
          onClose={() => setIsOpen(false)}
          position={position}
          primaryColor={primaryColor}
          calendlyUrl={finalCalendlyUrl}
          userName={user?.user_metadata?.name || user?.email}
        />
      )}
    </>
  );
}

