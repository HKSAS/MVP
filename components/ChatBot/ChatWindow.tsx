/**
 * FENÊTRE DE CHAT PRINCIPALE
 * - Design moderne avec header, body, footer
 * - Scrolling automatique vers le dernier message
 * - Affichage typing indicator quand OpenAI répond
 * - Boutons suggestions rapides
 * - Format responsive (mobile-friendly)
 */

'use client'

import React, { useEffect, useRef, useState } from 'react';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import type { Message } from '@/types/chat';
import styles from './ChatBot.module.css';

interface ChatWindowProps {
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  onClose: () => void;
  position: string;
  primaryColor: string;
  calendlyUrl: string;
  userName?: string;
}

export default function ChatWindow({
  messages,
  setMessages,
  onClose,
  position,
  primaryColor,
  calendlyUrl,
  userName
}: ChatWindowProps) {
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll vers le bas
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Suggestions rapides (à afficher au début)
  const quickSuggestions = [
    "Quels sont vos services ?",
    "Prendre un rendez-vous",
    "Tarifs et abonnements",
    "Comment fonctionne la recherche ?"
  ];

  const handleSendMessage = async (content: string) => {
    // Ajouter le message utilisateur
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Appel API vers OpenAI
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content,
          conversationHistory: messages,
          userName,
          calendlyUrl
        })
      });

      if (!response.ok) {
        throw new Error('Erreur API');
      }

      const data = await response.json();

      // Ajouter la réponse de l'IA
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        content: data.response,
        timestamp: new Date(),
        calendlyLink: data.shouldShowCalendly ? (data.calendlyUrl || calendlyUrl) : undefined
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Erreur chat:', error);
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'system',
        content: "Désolé, une erreur s'est produite. Veuillez réessayer.",
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`${styles.chatWindow} ${styles[position]}`}>
      {/* Header */}
      <div 
        className={styles.chatHeader}
        style={{ background: `linear-gradient(135deg, ${primaryColor} 0%, #A78BFA 100%)` }}
      >
        <div className={styles.headerContent}>
          <div className={styles.headerAvatar}>
            🤖
          </div>
          <div>
            <h3 className={styles.headerTitle}>Assistant Virtuel</h3>
            <p className={styles.headerStatus}>
              <span className={styles.statusDot}></span>
              En ligne
            </p>
          </div>
        </div>
        <button 
          onClick={onClose}
          className={styles.closeButton}
          aria-label="Fermer le chat"
        >
          ✕
        </button>
      </div>

      {/* Messages */}
      <div className={styles.chatBody}>
        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}
        
        {isLoading && (
          <div className={styles.typingIndicator}>
            <span></span>
            <span></span>
            <span></span>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Suggestions rapides (afficher seulement au début) */}
      {messages.length <= 1 && (
        <div className={styles.quickSuggestions}>
          {quickSuggestions.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => handleSendMessage(suggestion)}
              className={styles.suggestionButton}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <ChatInput 
        onSend={handleSendMessage}
        disabled={isLoading}
        primaryColor={primaryColor}
      />
    </div>
  );
}

