import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { scrapeWithZenRows } from '@/lib/zenrows'
import { openai } from '@/lib/openai'
import { getAuthenticatedUser } from '@/lib/auth'
import { analyzeListingSchema, type AnalyzeListingInput } from '@/lib/validation'
import type { AnalyzeListingResponse } from '@/lib/types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseAnonKey)

/**
 * Analyse une annonce avec l'IA pour détecter les arnaques
 */
export async function POST(request: NextRequest) {
  const routePrefix = '[API /api/analyze-listing]'
  
  try {
    const body = await request.json()

    // Validation avec Zod
    const validationResult = analyzeListingSchema.safeParse(body)

    if (!validationResult.success) {
      console.error(`${routePrefix} ❌ Validation échouée:`, validationResult.error.errors)
      return NextResponse.json(
        {
          success: false,
          error: 'Validation échouée',
          details: validationResult.error.errors,
        },
        { status: 400 }
      )
    }

    const input: AnalyzeListingInput = validationResult.data

    // Récupération de l'utilisateur (optionnel mais recommandé)
    const user = await getAuthenticatedUser(request)

    if (!openai) {
      console.error(`${routePrefix} ❌ OPENAI_API_KEY manquante`)
      return NextResponse.json(
        { success: false, error: 'Configuration serveur manquante' },
        { status: 500 }
      )
    }

    console.log(`\n${'='.repeat(60)}`)
    console.log(`${routePrefix} 🔍 ANALYSE ANTI-ARNAQUE`)
    console.log(`${'='.repeat(60)}\n`)

    // ========================================================================
    // ÉTAPE 1: Récupération du contenu (scraping si URL fournie)
    // ========================================================================
    let contentToAnalyze = ''

    if (input.url) {
      console.log(`🌐 Scraping de l'URL: ${input.url}`)
      try {
        const html = await scrapeWithZenRows(input.url, {
          js_render: 'true',
          premium_proxy: 'true',
          wait: '5000',
        })
        contentToAnalyze = html.substring(0, 50000) // Limiter pour l'IA
        console.log(`${routePrefix} ✅ HTML récupéré: ${contentToAnalyze.length} caractères`)
      } catch (error) {
        console.error(`${routePrefix} ❌ Erreur scraping:`, error)
        return NextResponse.json(
          {
            success: false,
            error: 'Impossible de scraper l\'URL fournie',
            details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined,
          },
          { status: 500 }
        )
      }
    } else {
      // Utiliser les données textuelles fournies
      contentToAnalyze = [
        input.title,
        input.description,
        input.price_eur ? `Prix: ${input.price_eur}€` : '',
        input.mileage_km ? `Kilométrage: ${input.mileage_km} km` : '',
        input.year ? `Année: ${input.year}` : '',
      ]
        .filter(Boolean)
        .join('\n')
    }

    if (!contentToAnalyze || contentToAnalyze.length < 50) {
      console.error(`${routePrefix} ❌ Contenu insuffisant (${contentToAnalyze.length} caractères)`)
      return NextResponse.json(
        {
          success: false,
          error: 'Contenu insuffisant pour l\'analyse',
        },
        { status: 400 }
      )
    }

    // ========================================================================
    // ÉTAPE 2: Analyse avec OpenAI
    // ========================================================================
    const systemPrompt = `Tu es un expert automobile et un détecteur d'arnaques spécialisé dans les annonces de véhicules d'occasion.

Ta mission :
- Analyser une annonce de véhicule d'occasion
- Détecter les signaux d'alerte potentiels (prix suspect, description vague, incohérences)
- Estimer le prix du marché
- Fournir une recommandation claire

Tu dois TOUJOURS répondre en JSON strictement valide.`

    const userPrompt = `Analyse cette annonce de véhicule d'occasion et fournis un rapport anti-arnaque complet.

CONTENU DE L'ANNONCE :
"""${contentToAnalyze}"""

INFORMATIONS SUPPLÉMENTAIRES :
${input.price_eur ? `- Prix annoncé: ${input.price_eur}€` : ''}
${input.mileage_km ? `- Kilométrage: ${input.mileage_km} km` : ''}
${input.year ? `- Année: ${input.year}` : ''}

FORMAT JSON STRICT (OBLIGATOIRE) :
{
  "summary": "Résumé de l'analyse en 2-3 phrases",
  "risk_score": 0-100 (0 = très sûr, 100 = très risqué),
  "risk_level": "low" | "medium" | "high",
  "market_price_estimate": {
    "min": nombre,
    "max": nombre,
    "comment": "Explication de l'estimation"
  },
  "positives": ["Point positif 1", "Point positif 2"],
  "warnings": ["Alerte 1", "Alerte 2"],
  "final_recommendation": "Recommandation finale claire (ex: 'Recommandé', 'À éviter', 'À vérifier')",
  "technical_notes": "Remarques techniques optionnelles (cohérence prix/km/année, éléments manquants, etc.)"
}

RÈGLES :
- risk_score : 0-30 = low, 31-60 = medium, 61-100 = high
- Sois précis dans l'estimation du prix du marché
- Liste les points positifs ET les alertes
- Fournis une recommandation actionnable
- technical_notes : analyse la cohérence prix/kilométrage/année, détecte les éléments manquants ou suspects

Tu n'as PAS le droit d'ajouter du texte en dehors du JSON.`

    console.log(`${routePrefix} 🤖 Analyse IA en cours...`)

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
      max_tokens: 2000,
    })

    const responseContent = completion.choices[0]?.message?.content
    if (!responseContent) {
      console.error(`${routePrefix} ❌ OpenAI n'a pas retourné de contenu`)
      throw new Error('OpenAI n\'a pas retourné de contenu')
    }

    console.log(`${routePrefix} 📄 Réponse IA reçue (${responseContent.length} chars)`)

    // Parsing de la réponse
    let analysisResult: any
    try {
      analysisResult = JSON.parse(responseContent)
    } catch (error) {
      console.error(`${routePrefix} ❌ Erreur parsing JSON:`, error)
      console.error(`${routePrefix} 📄 Réponse (début):`, responseContent.substring(0, 500))
      throw new Error('Réponse IA invalide')
    }

    // Validation de la structure
    if (!analysisResult.risk_score || !analysisResult.risk_level) {
      console.error(`${routePrefix} ❌ Structure de réponse IA incomplète:`, analysisResult)
      throw new Error('Structure de réponse IA incomplète')
    }

    // Normalisation du risk_level
    const riskLevel = ['low', 'medium', 'high'].includes(analysisResult.risk_level)
      ? analysisResult.risk_level
      : analysisResult.risk_score <= 30
      ? 'low'
      : analysisResult.risk_score <= 60
      ? 'medium'
      : 'high'

    const analysisData = {
      summary: analysisResult.summary || 'Analyse effectuée',
      risk_score: Math.max(0, Math.min(100, Number(analysisResult.risk_score) || 50)),
      risk_level: riskLevel as 'low' | 'medium' | 'high',
      market_price_estimate: {
        min: Number(analysisResult.market_price_estimate?.min) || 0,
        max: Number(analysisResult.market_price_estimate?.max) || 0,
        comment: analysisResult.market_price_estimate?.comment || 'Estimation non disponible',
      },
      positives: Array.isArray(analysisResult.positives) ? analysisResult.positives : [],
      warnings: Array.isArray(analysisResult.warnings) ? analysisResult.warnings : [],
      final_recommendation: analysisResult.final_recommendation || 'À vérifier',
      technical_notes: analysisResult.technical_notes || undefined,
    }

    console.log(`${routePrefix} ✅ Analyse terminée - Risk: ${riskLevel} (${analysisData.risk_score}/100)\n`)

    // ========================================================================
    // ÉTAPE 3: Enregistrement dans Supabase (si user authentifié)
    // ========================================================================
    if (user) {
      try {
        await supabase.from('analyzed_listings').insert({
          user_id: user.id,
          url: input.url || null,
          raw_input: input,
          risk_score: analysisData.risk_score,
          risk_level: analysisData.risk_level,
          market_min: analysisData.market_price_estimate.min,
          market_max: analysisData.market_price_estimate.max,
          summary: analysisData.summary,
          recommendation: analysisData.final_recommendation,
          positives: analysisData.positives,
          warnings: analysisData.warnings,
        })

        console.log(`${routePrefix} 💾 Analyse enregistrée pour l'utilisateur ${user.id}`)
      } catch (error) {
        console.error(`${routePrefix} ❌ Erreur enregistrement analyse:`, error)
        // Ne pas faire échouer la requête si l'enregistrement échoue
      }
    }

    // ========================================================================
    // RETOUR DE LA RÉPONSE
    // ========================================================================
    const response: AnalyzeListingResponse = {
      success: true,
      data: analysisData,
    }

    return NextResponse.json(response)
  } catch (error: any) {
    console.error(`${routePrefix} ❌ Erreur serveur:`, error)
    return NextResponse.json(
      {
        success: false,
        error: 'Erreur lors de l\'analyse',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    )
  }
}

