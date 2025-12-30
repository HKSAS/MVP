import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '@/lib/auth'
import type { ListingResponse } from '@/lib/types'
import { createRouteLogger } from '@/lib/logger'
import { createErrorResponse, AuthenticationError, InternalServerError, ExternalServiceError } from '@/lib/errors'
import { openai } from '@/lib/openai'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseAnonKey)

/**
 * GET /api/me/recommendations
 * Retourne des annonces recommandées basées sur l'historique de recherche de l'utilisateur
 */
export async function GET(request: NextRequest) {
  const log = createRouteLogger('/api/me/recommendations')
  
  try {
    // Vérification de l'authentification
    const user = await requireAuth(request)
    log.info('Récupération des recommandations', { userId: user.id })

    // Récupération des paramètres
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50)

    // Récupérer les dernières recherches de l'utilisateur pour déterminer ses préférences
    const { data: recentSearches } = await supabase
      .from('searches')
      .select('brand, model, max_price')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5)

    if (!recentSearches || recentSearches.length === 0) {
      log.info('Aucune recherche historique, retour de listings avec fort score', { userId: user.id })
      
      // Si pas d'historique, retourner simplement les meilleures annonces (score_final élevé)
      const { data: listings, error } = await supabase
        .from('listings')
        .select('external_id, title, price_eur, mileage_km, year, source, url, image_url, score_ia, score_final')
        .not('score_final', 'is', null)
        .order('score_final', { ascending: false })
        .limit(limit)

      if (error) {
        log.error('Erreur Supabase', { error: error.message, userId: user.id })
        throw new InternalServerError('Erreur lors de la récupération des recommandations', {
          dbError: error.message,
        })
      }

      const formattedListings: ListingResponse[] = (listings || []).map((listing) => ({
        id: listing.external_id,
        title: listing.title,
        price_eur: listing.price_eur ? Number(listing.price_eur) : null,
        mileage_km: listing.mileage_km ? Number(listing.mileage_km) : null,
        year: listing.year || null,
        source: listing.source,
        url: listing.url,
        imageUrl: listing.image_url,
        score_ia: listing.score_ia ? Number(listing.score_ia) : null,
        score_final: listing.score_final ? Number(listing.score_final) : 0,
      }))

      // Ajouter des raisons par défaut
      const recommendationsWithReasons = formattedListings.map((listing) => ({
        ...listing,
        recommendation_reason: 'Excellente annonce avec un bon score',
      } as ListingResponse & { recommendation_reason?: string }))

      return NextResponse.json({
        success: true,
        data: recommendationsWithReasons,
        message: 'Recommandations basées sur les meilleures annonces disponibles',
      })
    }

    // Extraire les marques/modèles les plus recherchés
    const brandModelCounts = new Map<string, number>()
    const maxPrices: number[] = []

    recentSearches.forEach((search) => {
      const key = `${search.brand.toLowerCase()}_${search.model.toLowerCase()}`
      brandModelCounts.set(key, (brandModelCounts.get(key) || 0) + 1)
      maxPrices.push(Number(search.max_price))
    })

    // Trouver la marque/modèle la plus recherchée
    let mostSearched = ''
    let maxCount = 0
    // @ts-ignore - Map iteration is supported in Node.js runtime
    for (const [key, count] of brandModelCounts.entries()) {
      if (count > maxCount) {
        maxCount = count
        mostSearched = key
      }
    }

    const [brand, model] = mostSearched.split('_')
    const avgMaxPrice = maxPrices.length > 0 
      ? Math.round(maxPrices.reduce((a, b) => a + b, 0) / maxPrices.length)
      : 50000

    log.debug('Préférences détectées', {
      brand,
      model,
      avgMaxPrice,
      userId: user.id,
    })

    // Rechercher des annonces correspondant aux préférences avec un bon score
    const { data: listings, error } = await supabase
      .from('listings')
      .select('external_id, title, price_eur, mileage_km, year, source, url, image_url, score_ia, score_final')
      .ilike('title', `%${brand}%`)
      .ilike('title', `%${model}%`)
      .lte('price_eur', avgMaxPrice * 1.2) // 20% de marge au-dessus de la moyenne
      .not('score_final', 'is', null)
      .order('score_final', { ascending: false })
      .limit(limit)

    if (error) {
      log.error('Erreur Supabase', { error: error.message, userId: user.id })
      throw new InternalServerError('Erreur lors de la récupération des recommandations', {
        dbError: error.message,
      })
    }

    // Si pas assez de résultats, compléter avec des annonces à fort score
    let formattedListings: ListingResponse[] = (listings || []).map((listing) => ({
      id: listing.external_id,
      title: listing.title,
      price_eur: listing.price_eur ? Number(listing.price_eur) : null,
      mileage_km: listing.mileage_km ? Number(listing.mileage_km) : null,
      year: listing.year || null,
      source: listing.source,
      url: listing.url,
      imageUrl: listing.image_url,
      score_ia: listing.score_ia ? Number(listing.score_ia) : null,
      score_final: listing.score_final ? Number(listing.score_final) : 0,
    }))

    if (formattedListings.length < limit) {
      const { data: additionalListings } = await supabase
        .from('listings')
        .select('external_id, title, price_eur, mileage_km, year, source, url, image_url, score_ia, score_final')
        .not('score_final', 'is', null)
        .order('score_final', { ascending: false })
        .limit(limit - formattedListings.length)

      const additional = (additionalListings || []).map((listing) => ({
        id: listing.external_id,
        title: listing.title,
        price_eur: listing.price_eur ? Number(listing.price_eur) : null,
        mileage_km: listing.mileage_km ? Number(listing.mileage_km) : null,
        year: listing.year || null,
        source: listing.source,
        url: listing.url,
        imageUrl: listing.image_url,
        score_ia: listing.score_ia ? Number(listing.score_ia) : null,
        score_final: listing.score_final ? Number(listing.score_final) : 0,
      }))

      formattedListings = [...formattedListings, ...additional].slice(0, limit)
    }

    // Utiliser OpenAI pour générer des recommandations intelligentes avec raisons personnalisées
    let recommendationsWithReasons = formattedListings
    if (openai && formattedListings.length > 0) {
      try {
        const searchSummary = recentSearches
          .map((s, i) => `${i + 1}. ${s.brand} ${s.model} (budget: ${s.max_price}€)`)
          .join('\n')

        const listingsSummary = formattedListings
          .slice(0, Math.min(limit, formattedListings.length))
          .map((l, i) => `${i + 1}. ${l.title} - ${l.price_eur}€ - Score: ${l.score_final}/100`)
          .join('\n')

        const systemPrompt = `Tu es un assistant expert en recommandations automobiles. Tu analyses l'historique de recherche d'un utilisateur et des annonces disponibles pour générer des recommandations personnalisées avec des raisons pertinentes.

Pour chaque annonce, génère une raison courte (1 phrase) expliquant pourquoi cette annonce est recommandée à cet utilisateur, basée sur:
- Ses recherches récentes (marques, modèles, budgets)
- Le score de l'annonce
- Le rapport qualité-prix
- La cohérence avec ses préférences

Réponds STRICTEMENT en JSON avec cette structure:
{
  "recommendations": [
    {
      "listing_index": 0,
      "reason": "Raison courte et personnalisée (max 80 caractères)"
    }
  ]
}

Les raisons doivent être en français, concises, et expliquer pourquoi cette annonce correspond aux besoins de l'utilisateur.`

        const userPrompt = `Historique de recherches de l'utilisateur:
${searchSummary}

Annonces à recommander:
${listingsSummary}

Génère une raison personnalisée pour chaque annonce.`

        const completion = await openai.chat.completions.create({
          model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.7,
          max_tokens: 800,
        })

        const responseContent = completion.choices[0]?.message?.content
        if (responseContent) {
          try {
            const aiResponse = JSON.parse(responseContent)
            const reasonMap = new Map<number, string>()
            
            if (aiResponse.recommendations && Array.isArray(aiResponse.recommendations)) {
              aiResponse.recommendations.forEach((rec: any) => {
                if (rec.listing_index !== undefined && rec.reason) {
                  reasonMap.set(rec.listing_index, rec.reason)
                }
              })
            }

            // Ajouter les raisons aux listings
            recommendationsWithReasons = formattedListings.map((listing, index) => ({
              ...listing,
              recommendation_reason: reasonMap.get(index) || `Correspond à vos recherches récentes (${brand} ${model})`,
            } as ListingResponse & { recommendation_reason?: string }))
          } catch (parseError) {
            log.warn('Erreur parsing JSON recommandations IA', {
              error: parseError instanceof Error ? parseError.message : String(parseError),
            })
            // Continuer sans raisons IA, utiliser raisons par défaut
            recommendationsWithReasons = formattedListings.map((listing) => ({
              ...listing,
              recommendation_reason: `Correspond à vos recherches récentes (${brand} ${model})`,
            } as ListingResponse & { recommendation_reason?: string }))
          }
        }
      } catch (aiError) {
        log.warn('Erreur OpenAI pour recommandations', {
          error: aiError instanceof Error ? aiError.message : String(aiError),
        })
        // Continuer sans raisons IA, utiliser raisons par défaut
        recommendationsWithReasons = formattedListings.map((listing) => ({
          ...listing,
          recommendation_reason: `Correspond à vos recherches récentes (${brand} ${model})`,
        } as ListingResponse & { recommendation_reason?: string }))
      }
    } else {
      // Pas d'OpenAI, utiliser raisons par défaut
      recommendationsWithReasons = formattedListings.map((listing) => ({
        ...listing,
        recommendation_reason: mostSearched 
          ? `Correspond à vos recherches récentes (${brand} ${model})`
          : 'Excellente annonce avec un bon score',
      } as ListingResponse & { recommendation_reason?: string }))
    }

    log.info('Recommandations retournées', {
      count: recommendationsWithReasons.length,
      userId: user.id,
      basedOn: mostSearched || 'top listings',
      withAIRasons: !!openai,
    })

    return NextResponse.json({
      success: true,
      data: recommendationsWithReasons,
      message: mostSearched 
        ? `Recommandations basées sur vos recherches récentes (${brand} ${model})`
        : 'Recommandations basées sur les meilleures annonces disponibles',
    })
  } catch (error) {
    if (error instanceof AuthenticationError) {
      log.warn('Non authentifié')
      return createErrorResponse(error)
    }

    log.error('Erreur serveur', {
      error: error instanceof Error ? error.message : String(error),
    })
    return createErrorResponse(error)
  }
}




