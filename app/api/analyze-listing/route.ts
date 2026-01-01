import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { scrapeWithZenRows } from '@/lib/zenrows'
import { openai } from '@/lib/openai'
import { getAuthenticatedUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'
import { analyzeListingSchema, type AnalyzeListingInput } from '@/lib/validation'
import type { AnalyzeListingResponse } from '@/lib/types'
import { createRouteLogger } from '@/lib/logger'
import { createErrorResponse, ValidationError, ExternalServiceError, InternalServerError } from '@/lib/errors'
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { calculateMarketPrice } from '@/lib/market-price'
import { calculateScoreBreakdown } from '@/lib/score-breakdown'
import { getKnownIssues } from '@/lib/known-issues'
import { extractLeboncoinData } from '@/lib/leboncoin-extractor'
import { parsePriceEUR, parseMileageKM, parseYear, hasMaintenanceHistory } from '@/lib/parsing-fr'
import { getRiskLevelFromScore } from '@/lib/red-flags'
import { chooseBestMileage } from '@/lib/mileage-selector'
import { logAiAnalysis } from '@/lib/tracking'
import { getSupabaseAdminClient } from '@/lib/supabase/server'
import { detectFraud, type FraudDetectionResult } from '@/lib/fraud-detection'
import { calculateMarketPriceWithDatabase } from '@/lib/market-price-database'
import { verifyListingImages } from '@/lib/image-verification'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseAnonKey)

/**
 * Analyse une annonce avec l'IA pour détecter les arnaques
 */
export async function POST(request: NextRequest) {
  const log = createRouteLogger('/api/analyze-listing')
  
  try {
    // ========================================================================
    // RATE LIMITING
    // ========================================================================
    const user = await getAuthenticatedUser(request)
    try {
      checkRateLimit(request, RATE_LIMITS.ANALYZE, user?.id)
    } catch (rateLimitError) {
      log.warn('Rate limit dépassé', { userId: user?.id })
      return createErrorResponse(rateLimitError)
    }

    // ========================================================================
    // VALIDATION
    // ========================================================================
    const body = await request.json()

    const validationResult = analyzeListingSchema.safeParse(body)

    if (!validationResult.success) {
      log.error('Validation échouée', { errors: validationResult.error.errors })
      throw new ValidationError('Données d\'analyse invalides', validationResult.error.errors)
    }

    const input: AnalyzeListingInput = validationResult.data

    // ========================================================================
    // VÉRIFICATION CONFIGURATION
    // ========================================================================
    if (!openai) {
      log.error('OPENAI_API_KEY manquante')
      throw new InternalServerError('Configuration serveur manquante (OpenAI)')
    }

    // Log de diagnostic tracking (AVANT l'analyse)
    console.log('[Tracking] Route /api/analyze-listing appelée', {
      userId: user?.id || 'anonymous',
      listingUrl: input.url || 'N/A',
      hasTitle: !!input.title,
      hasContent: !!(input.content || (input as any).description),
    })

    log.info('Analyse démarrée', {
      hasUrl: !!input.url,
      hasTitle: !!input.title,
      hasContent: !!(input.content || (input as any).description),
      userId: user?.id || null,
    })

    // ========================================================================
    // ÉTAPE 1: Enrichissement optionnel via scraping (non bloquant)
    // ========================================================================
    // Normaliser les champs (support des anciens noms pour compatibilité)
    let enrichedContent = (input as any).content || input.description || ''
    let enrichedTitle = input.title || ''

    // Variables pour stocker les données extraites normalisées
    let extractedData: {
      title?: string
      description?: string
      price_eur?: number
      mileage_km?: number
      mileageSelection?: {
        mileageCandidates?: Array<{ value: number; source: string; raw: string }>
        mileage_km_final?: number | null
        mileage_confidence?: 'high' | 'medium' | 'low'
        mileage_notes?: string[]
      }
      year?: number
      brand?: string
      model?: string
      fuel?: string
      gearbox?: string
      location?: string
      photos_count?: number
      has_history_report?: boolean
      extraction_source?: string
    } | null = null

    // Scraping optionnel si URL fournie et contenu vide ou très court
    if (input.url && (!enrichedContent || enrichedContent.length < 200)) {
      try {
        log.info('Tentative de scraping pour enrichir l\'analyse d\'annonce', { url: input.url })

        const html = await scrapeWithZenRows(input.url, {
          js_render: 'true',
          premium_proxy: 'true',
          wait: '5000',
        })

        // Utiliser l'extracteur Leboncoin si c'est une URL Leboncoin
        if (input.url.includes('leboncoin.fr')) {
          const leboncoinData = extractLeboncoinData(html)
          extractedData = {
            title: leboncoinData.title || undefined,
            description: leboncoinData.description || undefined,
            price_eur: leboncoinData.price_eur || undefined,
            mileage_km: leboncoinData.mileage_km || undefined, // DEPRECATED: utiliser mileageSelection
            mileageSelection: leboncoinData.mileageSelection || undefined, // IMPORTANT: candidats bruts pour sélection
            year: leboncoinData.year || undefined,
            fuel: leboncoinData.fuel || undefined,
            gearbox: leboncoinData.gearbox || undefined,
            location: leboncoinData.location || undefined,
            photos_count: leboncoinData.photos_count || undefined,
            has_history_report: leboncoinData.has_history_report ?? undefined,
            extraction_source: leboncoinData.extraction_source || undefined,
          }
          
          // Log détaillé pour diagnostic kilométrage
          const candidates = leboncoinData.mileageSelection?.mileageCandidates || []
          log.info('Extraction Leboncoin réussie', {
            source: leboncoinData.extraction_source,
            extractedFields: {
              price_eur: !!leboncoinData.price_eur,
              mileage_km: leboncoinData.mileage_km || null, // Valeur dépréciée
              mileageSelection: !!leboncoinData.mileageSelection,
              mileageCandidatesCount: candidates.length,
              mileageCandidates: candidates.map((c: any) => ({
                value: c.value,
                source: c.source,
                raw: c.raw,
              })),
              year: !!leboncoinData.year,
              fuel: !!leboncoinData.fuel,
              gearbox: !!leboncoinData.gearbox,
              photos_count: leboncoinData.photos_count,
              has_history_report: leboncoinData.has_history_report,
            },
          })
          
          log.info('Extraction Leboncoin réussie', {
            source: leboncoinData.extraction_source,
            extractedFields: {
              price_eur: !!leboncoinData.price_eur,
              mileage_km: !!leboncoinData.mileage_km,
              year: !!leboncoinData.year,
              fuel: !!leboncoinData.fuel,
              gearbox: !!leboncoinData.gearbox,
              photos_count: leboncoinData.photos_count,
              has_history_report: leboncoinData.has_history_report,
            },
          })
        } else {
          // Fallback: extraction IA pour autres sites
          const truncatedHtml = html.substring(0, 50000)
          
          // Appel OpenAI pour extraire proprement les infos texte depuis le HTML
        const extractionSystemPrompt = `Tu es un assistant spécialisé dans l'extraction d'informations structurées à partir de pages d'annonces de voitures d'occasion (sites comme Leboncoin, LaCentrale, etc.).

À partir du HTML fourni, tu dois extraire :

* le titre de l'annonce
* le texte principal de description
* le prix affiché (en euros)
* le kilométrage (en km)
* l'année de mise en circulation
* la marque et le modèle si possible

Réponds STRICTEMENT en JSON avec les clés suivantes :

{
  "title": string | null,
  "description": string | null,
  "price": number | null,
  "mileage": number | null,
  "year": number | null,
  "brand": string | null,
  "model": string | null
}`

        const extractionUserPrompt = `Voici le HTML de la page d'annonce à analyser :

${truncatedHtml}`

        const extraction = await openai.chat.completions.create({
          model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
          messages: [
            { role: 'system', content: extractionSystemPrompt },
            { role: 'user', content: extractionUserPrompt },
          ],
          response_format: { type: 'json_object' },
          temperature: 0,
          max_tokens: 800,
        })

          const extractionRaw = extraction.choices[0]?.message?.content ?? '{}'
          try {
            const extracted = JSON.parse(extractionRaw)
            extractedData = {
              title: extracted.title || undefined,
              description: extracted.description || undefined,
              price_eur: parsePriceEUR(extracted.price) || undefined,
              mileage_km: parseMileageKM(extracted.mileage) || undefined,
              year: parseYear(extracted.year) || undefined,
              brand: extracted.brand || undefined,
              model: extracted.model || undefined,
              extraction_source: 'AI',
            }
          } catch (parseError) {
            log.warn('Impossible de parser le JSON d\'extraction IA')
          }
        }

        // Enrichir les données uniquement si l'utilisateur ne les a pas fournies
        if (extractedData) {
          if (!enrichedTitle && extractedData.title) {
            enrichedTitle = extractedData.title
          }

          if (!enrichedContent && extractedData.description) {
            enrichedContent = extractedData.description
          }

          // Normaliser et assigner les valeurs avec parsing robuste
          if (!(input as any).price && !input.price_eur && extractedData.price_eur) {
            ;(input as any).price = extractedData.price_eur
            input.price_eur = extractedData.price_eur
          }

          // Sélectionner le meilleur kilométrage si plusieurs candidats
          // Note: La sélection finale sera faite plus tard dans le code pour éviter les conflits de scope
          if (!(input as any).mileage && !input.mileage_km && extractedData.mileage_km) {
            ;(input as any).mileage = extractedData.mileage_km
            input.mileage_km = extractedData.mileage_km
          }

          if (!input.year && extractedData.year) {
            input.year = extractedData.year
          }

          if (!(input as any).brand && extractedData.brand) {
            ;(input as any).brand = extractedData.brand
          }

          if (!(input as any).model && extractedData.model) {
            ;(input as any).model = extractedData.model
          }

          if (!(input as any).fuel && extractedData.fuel) {
            ;(input as any).fuel = extractedData.fuel
          }

          if (!(input as any).transmission && extractedData.gearbox) {
            ;(input as any).transmission = extractedData.gearbox
          }
        }
      } catch (err) {
        // Scraping NON BLOQUANT
        log.warn('Échec du scraping pour analyse d\'annonce, on continue avec les données utilisateur', {
          url: input.url,
          error: err instanceof Error ? err.message : String(err),
        })
        // On continue avec les données fournies par l'utilisateur
      }
    }

    // ========================================================================
    // ÉTAPE 2: Normalisation robuste des données (parsing FR)
    // ========================================================================
    // Normaliser les champs avec parsing robuste français
    let price: number | null = null
    if ((input as any).price) {
      price = typeof (input as any).price === 'number' ? Math.round((input as any).price) : parsePriceEUR(String((input as any).price))
    } else if (input.price_eur) {
      price = typeof input.price_eur === 'number' ? Math.round(input.price_eur) : parsePriceEUR(String(input.price_eur))
    }

    let yearValue: number | null = input.year ? (typeof input.year === 'number' ? input.year : parseYear(String(input.year))) : null

    let mileageValue: number | null = null
    let mileageSelectionResult: {
      mileage_km_final: number | null
      mileage_confidence: 'high' | 'medium' | 'low'
      mileage_notes: string[]
      redFlags: any[]
    } | null = null

    // RÈGLE : Si une URL est fournie, utiliser TOUJOURS la valeur extraite de l'annonce
    // Ignorer l'input utilisateur pour garantir la cohérence avec l'annonce source
    const hasUrl = input.url && input.url.trim().length > 0
    const userMileageInput = (input as any).mileage || input.mileage_km

    // Si URL fournie : utiliser uniquement l'extraction (ignorer input utilisateur)
    if (hasUrl && extractedData) {
      const mileageSelection = (extractedData as any).mileageSelection
      
      // Log de diagnostic
      log.info('Tentative utilisation extraction kilométrage', {
        hasMileageSelection: !!mileageSelection,
        hasMileageCandidates: !!(mileageSelection?.mileageCandidates),
        candidatesCount: mileageSelection?.mileageCandidates?.length || 0,
        mileage_km_deprecated: extractedData.mileage_km,
      })
      
      if (mileageSelection) {
        // Si on a déjà une sélection finale, l'utiliser
        if (mileageSelection.mileage_km_final !== null && mileageSelection.mileage_km_final !== undefined) {
          mileageValue = mileageSelection.mileage_km_final
          mileageSelectionResult = {
            mileage_km_final: mileageSelection.mileage_km_final,
            mileage_confidence: mileageSelection.mileage_confidence || 'medium',
            mileage_notes: mileageSelection.mileage_notes || [],
            redFlags: [],
          }
          log.info('Kilométrage extrait utilisé (URL fournie, input utilisateur ignoré)', {
            extractedValue: mileageValue,
            userInput: userMileageInput || 'non fourni',
            source: 'mileageSelection.mileage_km_final',
          })
        } 
        // Sinon, si on a des candidats, faire la sélection maintenant
        else if (mileageSelection.mileageCandidates && mileageSelection.mileageCandidates.length > 0) {
          log.info('Sélection du meilleur kilométrage depuis candidats', {
            candidatesCount: mileageSelection.mileageCandidates.length,
            candidates: mileageSelection.mileageCandidates.map((c: any) => `${c.value} km (${c.source})`),
          })
          
          mileageSelectionResult = chooseBestMileage({
            candidates: mileageSelection.mileageCandidates,
            year: extractedData.year || yearValue || undefined,
            title: extractedData.title || enrichedTitle || undefined,
            description: extractedData.description || enrichedContent || undefined,
          })
          mileageValue = mileageSelectionResult.mileage_km_final
          log.info('Kilométrage sélectionné depuis candidats (URL fournie)', {
            selectedValue: mileageValue,
            userInput: userMileageInput || 'non fourni',
            confidence: mileageSelectionResult.mileage_confidence,
            notes: mileageSelectionResult.mileage_notes,
          })
        } else {
          log.warn('mileageSelection existe mais sans candidats ni valeur finale', {
            mileageSelection,
          })
        }
      } else {
        log.warn('Pas de mileageSelection dans extractedData, utilisation fallback', {
          extractedDataKeys: Object.keys(extractedData || {}),
        })
      }
    }
    // Si PAS d'URL : utiliser l'input utilisateur si fourni
    else if (!hasUrl && userMileageInput !== null && userMileageInput !== undefined && userMileageInput !== '') {
      mileageValue = typeof userMileageInput === 'number' 
        ? Math.round(userMileageInput) 
        : parseMileageKM(String(userMileageInput))
      
      log.info('Kilométrage utilisateur utilisé (pas d\'URL)', {
        userInput: userMileageInput,
        parsedValue: mileageValue,
      })
    }
    
    // Compléter les données manquantes depuis extractedData (uniquement si pas déjà défini)
    if (extractedData) {
      if (price === null && extractedData.price_eur) {
        price = extractedData.price_eur
      }
      // Si pas de kilométrage défini, utiliser extractedData en fallback
      if (mileageValue === null && extractedData.mileage_km) {
        mileageValue = extractedData.mileage_km
        log.info('Kilométrage extrait utilisé (fallback)', {
          extractedValue: mileageValue,
          source: 'extractedData.mileage_km',
        })
      }
      if (yearValue === null && extractedData.year) {
        yearValue = extractedData.year
      }
    }

    // ========================================================================
    // ÉTAPE 2B: Construction du contexte à partir des données (enrichies ou non)
    // ========================================================================

    const contextParts: string[] = []

    if (input.url) {
      contextParts.push(`URL de l'annonce: ${input.url}`)
    }
    if (enrichedTitle) {
      contextParts.push(`Titre: ${enrichedTitle}`)
    }
    if (enrichedContent) {
      contextParts.push(`Texte de l'annonce:\n${enrichedContent}`)
    }
    if ((input as any).brand || (input as any).model) {
      const brand = (input as any).brand || ''
      const model = (input as any).model || ''
      contextParts.push(`Véhicule: ${brand} ${model}`.trim())
    }
    if (yearValue !== null && yearValue !== undefined) {
      contextParts.push(`Année: ${yearValue}`)
      input.year = yearValue
    } else if (input.year) {
      yearValue = typeof input.year === 'number' ? input.year : parseYear(String(input.year))
      if (yearValue) {
        contextParts.push(`Année: ${yearValue}`)
      }
    }
    if (mileageValue !== null && mileageValue !== undefined) {
      contextParts.push(`Kilométrage: ${mileageValue.toLocaleString('fr-FR')} km`)
    }
    if (price !== null && price !== undefined) {
      contextParts.push(`Prix demandé: ${price.toLocaleString('fr-FR')} €`)
    }
    if ((input as any).fuel) {
      contextParts.push(`Carburant: ${(input as any).fuel}`)
    }
    if ((input as any).source) {
      contextParts.push(`Plateforme: ${(input as any).source}`)
    }

    const contextText = contextParts.join('\n\n')

    if (!contextText || contextText.trim().length < 20) {
      log.error('Contenu insuffisant', { length: contextText.length })
      throw new ValidationError('Contenu insuffisant pour l\'analyse (minimum 20 caractères requis)')
    }

    // ========================================================================
    // ÉTAPE 3: Analyse avec OpenAI
    // ========================================================================
    const systemPrompt = `Tu es un expert automobile professionnel spécialisé dans l'évaluation et l'analyse de véhicules d'occasion sur le marché français. Tu as une connaissance approfondie des prix du marché, des tendances, de la décote, et des valeurs véhicules.

Ta mission :

1. ANALYSE DE PRIX MARCHÉ (CRITIQUE) :
   - Estime le prix marché RÉALISTE du véhicule en tenant compte de :
     * La marque et le modèle (avec leur cote Argus/LaCentrale si applicable)
     * L'année de mise en circulation (décote annuelle ~10-15% pour les premières années, puis ~5-8%)
     * Le kilométrage réel (impact : ~0.1-0.3€/km selon le modèle)
     * L'état général décrit (très bon état, état moyen, à rénover)
     * Les options et équipements mentionnés
     * La région/localisation (prix peuvent varier de ±5-10%)
     * La saisonnalité et les tendances actuelles du marché
   - IMPORTANT : Fournis des estimations MIN et MAX réalistes basées sur des données de marché réelles françaises (sites comme LaCentrale, L'Argus, etc.)
   - La fourchette min-max doit représenter les prix observés sur le marché (vente privée à professionnel)

2. ANALYSE DU PRIX ANNONCÉ :
   - Compare le prix annoncé avec ta fourchette estimée
   - Génère un commentaire PROFESSIONNEL et PRÉCIS :
     * Si prix < min-10% : "Prix très attractif, en-dessous du marché (opportunité)"
     * Si prix entre min-10% et min : "Prix attractif, légèrement en-dessous du marché"
     * Si prix entre min et (min+max)/2 : "Prix cohérent avec le marché, dans la fourchette basse"
     * Si prix entre (min+max)/2 et max : "Prix dans la moyenne du marché, correct"
     * Si prix entre max et max+10% : "Prix légèrement au-dessus du marché mais acceptable"
     * Si prix > max+10% : "Prix au-dessus du marché, à négocier fortement"
   - Sois PRÉCIS dans ton commentaire, évite les généralités

3. DÉTECTION D'ARNAQUE :
   * Évaluer le risque d'arnaque (paiement frauduleux, véhicule volé, kilométrage trafiqué, vices cachés, incohérences…)

4. FAIBLESSES CONNUES :
   * Identifier les "maladies" / faiblesses connues de ce modèle spécifique (problèmes mécaniques fréquents, pièces fragiles, rappels connus…)

5. CONSEILS PROFESSIONNELS :
   * Donner des conseils concrets pour l'acheteur (négociation, contrôles à faire, documents à exiger, points d'attention)

Réponds STRICTEMENT en JSON, sans texte autour, avec la structure suivante :
{
  "risk_level": "faible" | "moyen" | "élevé",
  "risk_score": 0-100,
  "estimated_price_min": number | null,
  "estimated_price_max": number | null,
  "price_comment": "Commentaire professionnel précis sur la position du prix annoncé par rapport à l'estimation marché (ex: 'Prix attractif, 800€ en-dessous de la fourchette basse du marché' ou 'Prix cohérent avec le marché, dans la moyenne' ou 'Prix légèrement au-dessus du marché, possibilité de négocier 500-800€')",
  "positives": [ "point positif 1", "point positif 2", ... ],
  "risks": [ "risque ou signal d'alerte 1", "risque 2", ... ],
  "known_issues": [ "maladie ou faiblesse connue du modèle (si dispo)", ... ],
  "advice": "conseils concrets pour l'acheteur (négociation, contrôles à faire, documents à exiger, etc.)",
  "final_recommendation": "OK pour acheter" | "À négocier / vérifier avant achat" | "À éviter (trop risqué)"
}`

    const userPrompt = `Voici les informations de l'annonce de voiture d'occasion à analyser :

${contextText}

Analyse cette annonce et remplis le JSON demandé.`

    log.debug('Analyse IA en cours')

    let completion
    try {
      completion = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
        max_tokens: 1200,
      })
    } catch (error) {
      log.error('Erreur OpenAI API', {
        error: error instanceof Error ? error.message : String(error),
      })
      throw new ExternalServiceError('OpenAI', 'Erreur lors de l\'appel à l\'API', {
        originalError: error instanceof Error ? error.message : String(error),
      })
    }

    const responseContent = completion.choices[0]?.message?.content
    if (!responseContent) {
      log.error('OpenAI n\'a pas retourné de contenu')
      throw new ExternalServiceError('OpenAI', 'Aucun contenu retourné')
    }

    log.debug('Réponse IA reçue', { length: responseContent.length })

    // Parsing de la réponse
    let analysisResult: any
    try {
      analysisResult = JSON.parse(responseContent)
    } catch (error) {
      log.error('Erreur parsing JSON', {
        error: error instanceof Error ? error.message : String(error),
        responsePreview: responseContent.substring(0, 200),
      })
      throw new ExternalServiceError('OpenAI', 'Réponse JSON invalide', {
        responsePreview: responseContent.substring(0, 200),
      })
    }

    // Validation de la structure
    if (analysisResult.risk_score === undefined || !analysisResult.risk_level) {
      log.error('Structure de réponse IA incomplète', { analysisResult })
      throw new ExternalServiceError('OpenAI', 'Structure de réponse incomplète', {
        hasRiskScore: analysisResult.risk_score !== undefined,
        hasRiskLevel: !!analysisResult.risk_level,
      })
    }

    // ========================================================================
    // ÉTAPE 4: Calculs déterministes (prix marché, score, faiblesses)
    // ========================================================================
    const announcedPrice = price
    
    // Utiliser les données extraites si disponibles, sinon fallback
    const transmission = extractedData?.gearbox || 
                        (input as any).transmission || 
                        (enrichedContent.toLowerCase().includes('dsg') ? 'DSG' : 
                         enrichedContent.toLowerCase().includes('automatique') ? 'automatique' : undefined)
    
    // Détecter si historique d'entretien est mentionné
    const hasHistory = extractedData?.has_history_report !== undefined 
                      ? extractedData.has_history_report
                      : (enrichedContent ? hasMaintenanceHistory(enrichedContent) : null)
    
    // Déterminer l'état basé sur photos et description
    let condition: 'excellent' | 'good' | 'average' | 'poor' | 'unknown' = 'unknown'
    if (extractedData?.photos_count && extractedData.photos_count > 0) {
      // Si photos disponibles, au moins "good"
      condition = enrichedContent.toLowerCase().includes('excellent') ? 'excellent' :
                  enrichedContent.toLowerCase().includes('très bon') ? 'good' : 'good'
    } else if (enrichedContent) {
      condition = enrichedContent.toLowerCase().includes('excellent') ? 'excellent' :
                  enrichedContent.toLowerCase().includes('très bon') ? 'good' :
                  enrichedContent.toLowerCase().includes('moyen') ? 'average' :
                  enrichedContent.toLowerCase().includes('médiocre') ? 'poor' : 'unknown'
    }

    // Calcul prix marché avec base de données étendue (PRIORITAIRE)
    let marketPrice
    const dbPrice = calculateMarketPriceWithDatabase(
      (input as any).brand,
      (input as any).model,
      yearValue || undefined,
      mileageValue || undefined
    )
    
    if (dbPrice) {
      // Utiliser la base de données si disponible
      const position = announcedPrice
        ? announcedPrice < dbPrice.min * 0.9
          ? 'basse_fourchette'
          : announcedPrice < dbPrice.min
          ? 'basse_fourchette'
          : announcedPrice <= dbPrice.max
          ? announcedPrice <= (dbPrice.min + dbPrice.max) / 2
            ? 'moyenne'
            : 'haute_fourchette'
          : announcedPrice <= dbPrice.max * 1.1
          ? 'haute_fourchette'
          : 'hors_fourchette'
        : 'moyenne'
      
      const negotiationAdvice = announcedPrice
        ? announcedPrice < dbPrice.min * 0.9
          ? 'Prix très attractif, opportunité intéressante'
          : announcedPrice < dbPrice.min
          ? 'Prix attractif, bon rapport qualité-prix'
          : announcedPrice <= (dbPrice.min + dbPrice.max) / 2
          ? 'Prix cohérent, dans la fourchette basse'
          : announcedPrice <= dbPrice.max
          ? 'Prix dans la moyenne du marché'
          : announcedPrice <= dbPrice.max * 1.1
          ? `Négociation recommandée: ${Math.round((announcedPrice - dbPrice.max) * 0.5)}-${Math.round((announcedPrice - dbPrice.max) * 0.8)}€`
          : `Négociation nécessaire: ${Math.round((announcedPrice - dbPrice.max) * 0.6)}-${Math.round(announcedPrice - dbPrice.max)}€`
        : ''
      
      marketPrice = {
        min: dbPrice.min,
        max: dbPrice.max,
        vehiclePrice: dbPrice.basePrice,
        position,
        negotiationAdvice,
        explanation: [
          { factor: 'Prix de base (base de données marché)', impact: dbPrice.basePrice },
          { factor: 'Ajustement kilométrage', impact: mileageValue ? Math.round((150000 - mileageValue) * 0.01) : 0 },
        ],
      }
    } else {
      // Fallback vers l'ancien système
      marketPrice = calculateMarketPrice(
        {
          brand: (input as any).brand,
          model: (input as any).model,
          year: yearValue || undefined,
          mileage: mileageValue || undefined,
          fuel: extractedData?.fuel || (input as any).fuel || input.fuel || undefined,
          transmission,
          hasHistory: hasHistory === true,
          condition,
          region: extractedData?.location || undefined,
        },
        announcedPrice || undefined
      )
    }

    // Calcul score breakdown (UTILISER UNIQUEMENT CHAMPS NORMALISÉS)
    const scoreResult = calculateScoreBreakdown({
      mileage: mileageValue !== null && mileageValue !== undefined ? mileageValue : undefined,
      year: yearValue || undefined,
      hasHistory: hasHistory === true ? true : hasHistory === false ? false : undefined,
      pricePosition: marketPrice.position,
      condition,
      brand: (input as any).brand,
      model: (input as any).model,
      fuel: extractedData?.fuel || (input as any).fuel || input.fuel || undefined,
      transmission,
      descriptionQuality: enrichedContent.length > 500 ? 'excellent' : enrichedContent.length > 200 ? 'good' : enrichedContent.length > 0 ? 'average' : 'poor',
      hasPhotos: extractedData?.photos_count ? extractedData.photos_count > 0 : (enrichedContent.toLowerCase().includes('photo') || input.url !== undefined),
      price_eur: announcedPrice || undefined,
      marketMin: marketPrice.min || undefined,
      description: enrichedContent || undefined,
      title: enrichedTitle || undefined,
      hasCT: enrichedContent ? (enrichedContent.toLowerCase().includes('contrôle technique') || enrichedContent.toLowerCase().includes('ct')) : null,
    })

    // DÉTECTION DE FRAUDES AVANCÉE
    const fraudDetection: FraudDetectionResult = detectFraud({
      title: enrichedTitle,
      description: enrichedContent,
      price_eur: announcedPrice || undefined,
      marketMin: marketPrice.min,
      marketMax: marketPrice.max,
      mileage_km: mileageValue || undefined,
      year: yearValue || undefined,
      location: extractedData?.location || undefined,
      photos_count: extractedData?.photos_count || undefined,
      url: input.url || undefined,
      source: extractedData?.extraction_source || (input as any).source || undefined,
      hasHistory: hasHistory === true,
    })

    // Fusionner tous les red flags (kilométrage + scoring + fraudes)
    const allRedFlags = [
      ...(mileageSelectionResult?.redFlags || []),
      ...scoreResult.redFlags,
      ...fraudDetection.redFlags.map(flag => ({
        type: flag.type as any,
        severity: flag.severity as 'high' | 'critical',
        message: flag.title,
        details: flag.description,
      })),
    ]

    // VÉRIFICATION D'IMAGES (détection photos volées/dupliquées)
    let imageVerification: any = null
    if ((extractedData as any)?.imageUrl || (input as any).imageUrl) {
      const imageUrl = (extractedData as any)?.imageUrl || (input as any).imageUrl
      try {
        const imageVerificationResult = await verifyListingImages(
          [imageUrl],
          input.url || undefined,
          enrichedTitle || undefined
        )
        imageVerification = imageVerificationResult
        
        // Si images suspectes, ajouter aux red flags
        if (imageVerificationResult.overallRisk === 'high' || imageVerificationResult.suspiciousCount > 0) {
          allRedFlags.push({
            type: 'photo_anomaly' as any,
            severity: imageVerificationResult.overallRisk === 'high' ? 'critical' : 'high',
            message: 'Images suspectes détectées',
            details: `Vérification images: ${imageVerificationResult.results[0]?.reasons.join(', ') || 'Photos suspectes'}`,
          })
        }
      } catch (imageError) {
        log.warn('Erreur vérification images (non-bloquant)', {
          error: imageError instanceof Error ? imageError.message : String(imageError),
        })
      }
    }
    
    // Ajouter les watchouts depuis red flags
    const watchoutsFromRedFlags = allRedFlags.map(flag => flag.details)

    // Faiblesses connues
    const knownIssues = getKnownIssues(
      (input as any).brand,
      (input as any).model,
      extractedData?.fuel || (input as any).fuel || input.fuel || undefined,
      transmission || undefined,
      mileageValue || undefined
    )

    // Calculer le risk score depuis reliabilityScore
    let riskScore = 100 - scoreResult.reliabilityScore
    
    // Ajuster risk score avec tous les red flags (kilométrage + scoring + fraudes)
    // Prendre en compte le fraud score
    if (fraudDetection.fraudScore > 0) {
      // Le fraud score contribue directement au risk score
      riskScore = Math.max(riskScore, fraudDetection.fraudScore)
    }
    
    if (allRedFlags.length > 0) {
      const criticalFlags = allRedFlags.filter(f => f.severity === 'critical')
      const highFlags = allRedFlags.filter(f => f.severity === 'high')
      
      if (criticalFlags.length > 0) {
        riskScore = Math.max(80, riskScore)
      } else if (highFlags.length >= 2) {
        riskScore = Math.max(75, riskScore)
      } else if (highFlags.length === 1) {
        riskScore = Math.max(70, riskScore)
      }
    }
    
    // Normalisation du risk_level depuis risk score (avec red flags)
    let riskLevel: 'low' | 'medium' | 'high' = getRiskLevelFromScore(riskScore)
    
    // Si red flags critiques, forcer risk level élevé
    if (allRedFlags.some(flag => flag.severity === 'critical')) {
      riskLevel = 'high'
    } else if (allRedFlags.length > 0 && riskLevel === 'low') {
      // Au minimum "moyen" si red flags présents
      riskLevel = 'medium'
    }

    // Génération de la checklist et du verdict
    const buyerChecklist: string[] = []
    
    if (!hasHistory) {
      buyerChecklist.push('Demander factures d\'entretien + rapport d\'historique (VIN)')
    }
    
    buyerChecklist.push('Contrôle OBD + essai routier (bruits, vibrations, fumées)')
    buyerChecklist.push('Contrôler freins (disques/plaquettes) + état pneus')
    
    if (transmission?.toLowerCase().includes('dsg') || transmission?.toLowerCase().includes('s-tronic')) {
      buyerChecklist.push('Si DSG/S-Tronic: exiger preuve de vidanges (tous les 60k km)')
    }
    
    if (mileageValue && mileageValue > 150000) {
      buyerChecklist.push('Vérifier état embrayage/boîte (bruits, patinage)')
    }

    // Verdict final basé sur risk level et red flags (COHÉRENT) - UTILISER mileage_km_final
    let finalVerdict = ''
    
    // Si red flags, verdict d'éviter avec détails
    if (allRedFlags.length > 0) {
      const criticalFlags = allRedFlags.filter(f => f.severity === 'critical')
      const flagMessages = allRedFlags.map(f => f.message).join(', ')
      
      if (criticalFlags.length > 0) {
        finalVerdict = `À éviter absolument. Drapeaux rouges détectés : ${flagMessages}. Ces éléments indiquent des risques majeurs (fraude possible, vice caché, ou erreur majeure). Ne pas acheter sans vérification exhaustive par un professionnel.`
      } else {
        finalVerdict = `À éviter tant que les points suivants ne sont pas clarifiés : ${flagMessages}. Vérifications approfondies impératives avant tout engagement.`
      }
    } else if (riskLevel === 'high') {
      finalVerdict = 'À éviter ou négociation très importante requise. Risques mécaniques élevés, contrôles exhaustifs impératifs avant tout engagement.'
    } else if (riskLevel === 'medium') {
      finalVerdict = 'Achetable sous conditions strictes : prix négocié, contrôle mécanique préalable obligatoire, et vérifications approfondies. Non recommandé pour un achat sans suivi d\'entretien complet.'
    } else if (riskLevel === 'low' && scoreResult.reliabilityScore >= 70) {
      finalVerdict = 'Achetable avec confiance. Vérifications de routine recommandées mais véhicule globalement fiable. Veillez néanmoins à effectuer les contrôles de base avant l\'achat.'
    } else {
      finalVerdict = 'À vérifier. Des éléments nécessitent des clarifications avant de prendre une décision. Contrôles préalables recommandés.'
    }
    
    // Ajouter note sur kilométrage si confidence faible
    if (mileageSelectionResult && mileageSelectionResult.mileage_confidence === 'low' && mileageValue !== null) {
      finalVerdict += ` Note : Le kilométrage détecté (${mileageValue.toLocaleString('fr-FR')} km) a une faible confiance. Vérification impérative du compteur.`
    }

    // Recommandation basée sur risk level et red flags
    let recommendation = 'À vérifier'
    
    // Si red flags présents, forcer recommandation d'éviter
    if (allRedFlags.length > 0) {
      recommendation = 'À éviter / vérifier absolument'
    } else if (riskLevel === 'high') {
      recommendation = 'À éviter (trop risqué)'
    } else if (riskLevel === 'medium') {
      recommendation = 'À négocier / vérifier avant achat'
    } else if (riskLevel === 'low' && scoreResult.reliabilityScore >= 70) {
      recommendation = 'OK pour acheter'
    } else {
      recommendation = 'À vérifier'
    }

    const analysisData = {
      score: scoreResult.totalScore,
      reliabilityScore: scoreResult.reliabilityScore,
      riskLevel,
      recommendation,
      marketPrice: {
        min: Math.round(marketPrice.min), // ARRONDI
        max: Math.round(marketPrice.max), // ARRONDI
        vehiclePrice: Math.round(marketPrice.vehiclePrice), // ARRONDI
        position: marketPrice.position,
        negotiationAdvice: marketPrice.negotiationAdvice,
        explanation: marketPrice.explanation,
      },
      scoreBreakdown: scoreResult.breakdown,
      redFlags: allRedFlags, // Tous les red flags (kilométrage + scoring + fraudes)
      fraudDetection: {
        riskLevel: fraudDetection.riskLevel,
        fraudScore: fraudDetection.fraudScore,
        suspiciousPatterns: fraudDetection.suspiciousPatterns,
        recommendations: fraudDetection.recommendations,
      },
      imageVerification: imageVerification ? {
        isSuspicious: imageVerification.overallRisk !== 'low',
        confidence: imageVerification.overallRisk,
        suspiciousCount: imageVerification.suspiciousCount,
        totalCount: imageVerification.totalCount,
        reasons: imageVerification.results[0]?.reasons || [],
      } : undefined,
      positives: Array.isArray(analysisResult.positives) ? analysisResult.positives : [],
      watchouts: [
        ...watchoutsFromRedFlags,
        ...fraudDetection.recommendations, // Ajouter les recommandations anti-fraude
        ...(Array.isArray(analysisResult.risks) ? analysisResult.risks : Array.isArray(analysisResult.warnings) ? analysisResult.warnings : [])
      ],
      knownIssues,
      buyerChecklist,
      finalVerdict,
      // Données extraites pour debug
      extractedData: extractedData ? {
        price_eur: extractedData.price_eur,
        mileage_km: mileageValue !== null ? mileageValue : undefined,
        mileageSelection: mileageSelectionResult ? {
          mileage_km_final: mileageSelectionResult.mileage_km_final,
          mileage_confidence: mileageSelectionResult.mileage_confidence,
          mileage_notes: mileageSelectionResult.mileage_notes,
          mileageCandidates: (extractedData as any).mileageSelection?.mileageCandidates || [],
        } : (extractedData as any).mileageSelection || undefined,
        year: extractedData.year,
        fuel: extractedData.fuel,
        gearbox: extractedData.gearbox,
        photos_count: extractedData.photos_count,
        has_history_report: extractedData.has_history_report,
        extraction_source: extractedData.extraction_source,
      } : undefined,
      // Champs de compatibilité
      summary: analysisResult.summary || finalVerdict,
      risk_score: riskScore, // Utiliser le risk score calculé (cohérent avec red flags)
      warnings: Array.isArray(analysisResult.risks) ? analysisResult.risks : [],
      advice: analysisResult.advice || buyerChecklist.join('; '),
      final_recommendation: recommendation,
    }

    log.info('Analyse terminée', {
      riskLevel,
      riskScore: analysisData.risk_score,
      userId: user?.id || null,
    })

    // ========================================================================
    // ÉTAPE 4: Enregistrement dans Supabase (si user authentifié)
    // ========================================================================
    if (user) {
      try {
        // Utiliser le service role pour bypasser RLS (comme dans logAiAnalysis)
        const supabaseAdmin = getSupabaseAdminClient()
        const { error: insertError } = await supabaseAdmin.from('analyzed_listings').insert({
          user_id: user.id,
          url: input.url || null,
          raw_input: input,
          risk_score: analysisData.risk_score,
          risk_level: analysisData.riskLevel,
          market_min: analysisData.marketPrice.min,
          market_max: analysisData.marketPrice.max,
          summary: analysisData.summary,
          recommendation: analysisData.recommendation,
          positives: analysisData.positives,
          warnings: analysisData.watchouts,
          analysis_result: analysisData, // Sauvegarder les résultats complets
        })

        if (insertError) {
          // Si l'erreur est due à la colonne analysis_result manquante, essayer sans cette colonne
          if (insertError.message.includes('analysis_result') || insertError.message.includes('column') || insertError.code === '42703') {
            log.warn('Colonne analysis_result manquante, tentative sans cette colonne', {
              error: insertError.message,
              userId: user.id,
            })
            
            // Réessayer sans analysis_result (utiliser aussi le service role)
            const { error: retryError } = await supabaseAdmin.from('analyzed_listings').insert({
              user_id: user.id,
              url: input.url || null,
              raw_input: input,
              risk_score: analysisData.risk_score,
              risk_level: analysisData.riskLevel,
              market_min: analysisData.marketPrice.min,
              market_max: analysisData.marketPrice.max,
              summary: analysisData.summary,
              recommendation: analysisData.recommendation,
              positives: analysisData.positives,
              warnings: analysisData.watchouts,
            })
            
            if (retryError) {
              log.error('Erreur enregistrement analyse (sans analysis_result)', {
                error: retryError.message,
                userId: user.id,
              })
            } else {
              log.debug('Analyse enregistrée (sans analysis_result)', { userId: user.id })
            }
          } else {
            log.error('Erreur enregistrement analyse', {
              error: insertError.message,
              code: insertError.code,
              userId: user.id,
            })
          }
        } else {
          log.debug('Analyse enregistrée avec résultats complets', { userId: user.id })
        }
      } catch (error) {
        log.error('Erreur enregistrement analyse', {
          error: error instanceof Error ? error.message : String(error),
          userId: user.id,
        })
        // Ne pas faire échouer la requête si l'enregistrement échoue
      }

      // Logging automatique dans ai_analyses (non-bloquant)
      console.log('[Tracking] Analyse terminée, appel logAiAnalysis', {
        userId: user.id,
        listingUrl: input.url || '',
        listingSource: (input as any).source || extractedData?.extraction_source || undefined,
        riskScore: analysisData.risk_score,
        riskLevel: analysisData.riskLevel,
      })

      logAiAnalysis(
        {
          userId: user.id,
          listingUrl: input.url || '',
          listingSource: (input as any).source || extractedData?.extraction_source || undefined,
          riskScore: analysisData.risk_score,
          riskLevel: analysisData.riskLevel,
        },
        { useServiceRole: true }
      ).catch(err => {
        log.warn('Erreur tracking analyse (non-bloquant)', { error: err })
        console.error('[Tracking] Exception dans logAiAnalysis:', err)
      })
    } else {
      console.log('[Tracking] Utilisateur non authentifié, skip logAiAnalysis (userId: null)')
    }

    // ========================================================================
    // RETOUR DE LA RÉPONSE
    // ========================================================================
    const response: AnalyzeListingResponse = {
      success: true,
      data: analysisData,
    }

    return NextResponse.json(response)
  } catch (error) {
    log.error('Erreur serveur', {
      error: error instanceof Error ? error.message : String(error),
    })
    return createErrorResponse(error)
  }
}

