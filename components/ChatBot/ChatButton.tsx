/**
 * BOUTON FLOTTANT DU CHATBOT
 * - Design : Cercle avec icône de chat/bulle
 * - Couleur : Gradient bleu-violet (comme le design fourni)
 * - Position : Fixed, bottom-right (ou paramétrable)
 * - Animation : Pulse subtile pour attirer l'attention
 * - Badge : Notification si nouveau message
 */

'use client'

import React from 'react';
import styles from './ChatBot.module.css';

interface ChatButtonProps {
  isOpen: boolean;
  onClick: () => void;
  position: 'bottom-right' | 'bottom-left';
  primaryColor: string;
  unreadCount?: number;
}

export default function ChatButton({ 
  isOpen, 
  onClick, 
  position,
  primaryColor,
  unreadCount = 0 
}: ChatButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`${styles.chatButton} ${styles[position]} ${isOpen ? styles.open : ''}`}
      style={{
        background: `linear-gradient(135deg, ${primaryColor} 0%, #A78BFA 100%)`,
      }}
      aria-label="Ouvrir le chat"
    >
      {!isOpen ? (
        <>
          {/* Icône chat fermé */}
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <path 
              d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2Z" 
              fill="white"
            />
          </svg>
          
          {/* Badge notification */}
          {unreadCount > 0 && (
            <span className={styles.badge}>{unreadCount}</span>
          )}
        </>
      ) : (
        // Icône fermeture (X)
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path 
            d="M18 6L6 18M6 6L18 18" 
            stroke="white" 
            strokeWidth="2" 
            strokeLinecap="round"
          />
        </svg>
      )}
    </button>
  );
}

