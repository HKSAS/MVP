/**
 * COMPOSANT MESSAGE
 * - Style différent pour user/bot/system
 * - Markdown support pour les réponses formatées
 * - Bouton Calendly si nécessaire
 * - Timestamp
 */

'use client'

import React from 'react';
import type { Message } from '@/types/chat';
import styles from './ChatBot.module.css';

interface ChatMessageProps {
  message: Message;
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  // Ouvrir Calendly dans une popup
  const openCalendly = () => {
    if (message.calendlyLink) {
      window.open(
        message.calendlyLink,
        'calendly',
        'width=800,height=800,scrollbars=yes,resizable=yes'
      );
    }
  };

  return (
    <div className={`${styles.message} ${styles[message.type]}`}>
      {message.type === 'bot' && (
        <div className={styles.messageAvatar}>🤖</div>
      )}
      
      <div className={styles.messageContent}>
        <div className={styles.messageBubble}>
          {/* Contenu avec support des retours à la ligne */}
          <p 
            style={{ 
              whiteSpace: 'pre-wrap', 
              margin: 0,
              color: message.type === 'user' ? 'white' : '#1F2937',
              lineHeight: '1.5'
            }}
          >
            {message.content || ' '}
          </p>
          
          {/* Bouton Calendly si présent */}
          {message.calendlyLink && (
            <button 
              onClick={openCalendly}
              className={styles.calendlyButton}
            >
              📅 Prendre rendez-vous maintenant
            </button>
          )}
        </div>
        
        <span className={styles.messageTime}>
          {formatTime(message.timestamp)}
        </span>
      </div>
      
      {message.type === 'user' && (
        <div className={styles.messageAvatar}>👤</div>
      )}
    </div>
  );
}

