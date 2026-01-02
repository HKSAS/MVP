/**
 * SERVICE OPENAI
 * Configuration centralisée de l'API OpenAI
 */

import OpenAI from 'openai';

export class OpenAIService {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || '',
    });
  }

  async chat(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  ) {
    try {
      const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
      
      const completion = await this.client.chat.completions.create({
        model: model,
        messages: messages,
        max_tokens: 500,
        temperature: 0.7,
      });

      return {
        success: true,
        content: completion.choices[0]?.message?.content || '',
        usage: completion.usage
      };
    } catch (error) {
      console.error('Erreur OpenAI Service:', error);
      return {
        success: false,
        content: 'Erreur lors de la communication avec l\'assistant.',
        error
      };
    }
  }

  // Méthode avec streaming (optionnel, pour affichage progressif)
  async chatStream(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  ) {
    try {
      const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
      
      const stream = await this.client.chat.completions.create({
        model: model,
        messages: messages,
        max_tokens: 500,
        temperature: 0.7,
        stream: true,
      });

      return {
        success: true,
        stream
      };
    } catch (error) {
      console.error('Erreur OpenAI Stream:', error);
      return {
        success: false,
        error
      };
    }
  }
}

export const openaiService = new OpenAIService();

