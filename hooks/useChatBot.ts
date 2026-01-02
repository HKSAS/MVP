/**
 * HOOK PERSONNALISÉ POUR LA LOGIQUE DU CHATBOT
 * Gestion de l'état, persistance, etc.
 */

import { useState, useEffect } from 'react';
import type { Message } from '@/types/chat';

export function useChatBot() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  // Charger l'historique depuis localStorage (optionnel)
  useEffect(() => {
    const savedMessages = localStorage.getItem('chatbot_history');
    if (savedMessages) {
      try {
        const parsed = JSON.parse(savedMessages);
        setMessages(parsed.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        })));
      } catch (error) {
        console.error('Erreur chargement historique:', error);
      }
    }
  }, []);

  // Sauvegarder l'historique
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('chatbot_history', JSON.stringify(messages));
    }
  }, [messages]);

  // Limiter l'historique à 50 messages max
  useEffect(() => {
    if (messages.length > 50) {
      setMessages(prev => prev.slice(-50));
    }
  }, [messages]);

  const clearHistory = () => {
    setMessages([]);
    localStorage.removeItem('chatbot_history');
  };

  return {
    messages,
    setMessages,
    isOpen,
    setIsOpen,
    clearHistory
  };
}

