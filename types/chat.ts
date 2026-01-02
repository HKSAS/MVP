/**
 * TYPES TYPESCRIPT POUR LE CHATBOT
 */

export interface Message {
  id: string;
  type: 'user' | 'bot' | 'system';
  content: string;
  timestamp: Date;
  calendlyLink?: string;
  metadata?: {
    intent?: string;
    confidence?: number;
    requiresCalendly?: boolean;
  };
}

export interface ChatBotConfig {
  position?: 'bottom-right' | 'bottom-left';
  primaryColor?: string;
  calendlyUrl: string;
  enableHistory?: boolean;
  maxMessages?: number;
  welcomeMessage?: string;
}

export interface ChatResponse {
  response: string;
  shouldShowCalendly: boolean;
  calendlyUrl?: string;
  intent?: string;
  confidence?: number;
}

export interface UserAuth {
  isAuthenticated: boolean;
  user?: {
    id: string;
    name?: string;
    email?: string;
  };
}

