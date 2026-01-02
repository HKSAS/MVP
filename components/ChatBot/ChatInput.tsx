/**
 * ZONE DE SAISIE
 * - Auto-resize du textarea
 * - Bouton envoi + Enter pour envoyer
 * - État disabled pendant le chargement
 * - Placeholder dynamique
 */

'use client'

import React, { useState, useRef, KeyboardEvent } from 'react';
import styles from './ChatBot.module.css';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled: boolean;
  primaryColor: string;
}

export default function ChatInput({ onSend, disabled, primaryColor }: ChatInputProps) {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (input.trim() && !disabled) {
      onSend(input.trim());
      setInput('');
      
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Auto-resize textarea
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  return (
    <div className={styles.chatInput}>
      <textarea
        ref={textareaRef}
        value={input}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        placeholder="Tapez votre message..."
        disabled={disabled}
        className={styles.inputField}
        rows={1}
        style={{
          color: '#1F2937',
          backgroundColor: 'white'
        }}
      />
      
      <button
        onClick={handleSend}
        disabled={disabled || !input.trim()}
        className={styles.sendButton}
        style={{
          background: input.trim() && !disabled 
            ? `linear-gradient(135deg, ${primaryColor} 0%, #A78BFA 100%)` 
            : '#E5E7EB'
        }}
        aria-label="Envoyer le message"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path 
            d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13" 
            stroke={input.trim() && !disabled ? 'white' : '#9CA3AF'} 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  );
}

