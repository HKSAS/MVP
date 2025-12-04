/**
 * Client OpenAI réutilisable avec fonctions utilitaires
 */

import OpenAI from 'openai'

if (!process.env.OPENAI_API_KEY) {
  console.warn('⚠️ OPENAI_API_KEY n\'est pas configurée')
}

export const openai = process.env.OPENAI_API_KEY 
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  : null

