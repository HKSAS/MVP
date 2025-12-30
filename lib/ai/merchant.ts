/**
 * Analyse marchand IA - Recommandations personnalisées
 * @deprecated Migrer vers @/src/modules/ai/analysis/analyzer.ts à terme
 */

import type { ClientProfile, MerchantAIResult, Listing } from '@/lib/search-types'
import { getOpenAIApiKey } from '@/lib/env'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: getOpenAIApiKey(),
})

/**
 * Analyse les résultats avec l'IA marchand pour des recommandations personnalisées
 */
export async function analyzeWithMerchantAI(
  clientProfile: ClientProfile | undefined,
  listings: Listing[]
): Promise<MerchantAIResult | null> {
  if (!clientProfile || listings.length === 0) {
    return null
  }

  try {
    const prompt = `Tu es un expert automobile qui conseille des clients.

Profil client:
- Budget: ${clientProfile.budget}€
- Préférences: ${JSON.stringify(clientProfile.preferences)}
${clientProfile.location ? `- Localisation: ${clientProfile.location.zipCode} (rayon ${clientProfile.location.radiusKm}km)` : ''}

Annonces trouvées: ${listings.length}

Analyse les annonces et fournis:
1. Recommandations principales (top 3-5 annonces)
2. Insights (points d'attention, opportunités)
3. Niveau de risque global

Format JSON:
{
  "recommendations": ["reco1", "reco2", ...],
  "insights": ["insight1", "insight2", ...],
  "riskLevel": "low" | "medium" | "high"
}`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Tu es un expert automobile. Tu retournes UNIQUEMENT du JSON valide.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    })

    const content = completion.choices[0]?.message?.content
    if (!content) return null

    // Parser le JSON
    const jsonStr = content.trim().replace(/^```json\s*/, '').replace(/\s*```$/, '')
    const result = JSON.parse(jsonStr) as MerchantAIResult

    return result
  } catch (error) {
    console.error('Erreur analyse marchand IA:', error)
    return null
  }
}
