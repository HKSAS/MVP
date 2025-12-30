/**
 * Client OpenAI réutilisable avec fonctions utilitaires
 * 
 * ⚠️ Ce fichier est déprécié. Utilisez directement OpenAI avec getOpenAIApiKey() depuis lib/env.ts
 * Gardé pour compatibilité avec le code existant
 */

import OpenAI from 'openai'
import { getOpenAIApiKey } from './env'
import { logger } from './logger'

let openaiInstance: OpenAI | null = null

try {
  const apiKey = getOpenAIApiKey()
  openaiInstance = new OpenAI({
    apiKey,
  })
} catch (error) {
  logger.warn('⚠️ OPENAI_API_KEY n\'est pas configurée', {
    error: error instanceof Error ? error.message : String(error),
  })
}

export const openai = openaiInstance

