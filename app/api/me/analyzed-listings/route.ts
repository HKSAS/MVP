import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '@/lib/auth'
import type { UserAnalyzedListing } from '@/lib/types'
import { createRouteLogger } from '@/lib/logger'
import { createErrorResponse, AuthenticationError, InternalServerError } from '@/lib/errors'
import { getSupabaseAdminClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey

/**
 * Crée un client Supabase avec le token de session de l'utilisateur
 * Nécessaire pour que RLS fonctionne correctement
 */
function createSupabaseClientWithToken(accessToken: string) {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

/**
 * GET /api/me/analyzed-listings
 * Retourne les analyses effectuées par l'utilisateur
 */
export async function GET(request: NextRequest) {
  const log = createRouteLogger('/api/me/analyzed-listings')
  
  try {
    // Vérification de l'authentification
    const user = await requireAuth(request)
    log.info('Récupération des analyses', { userId: user.id })

    // Récupérer le token depuis les headers pour RLS
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.startsWith('Bearer ') ? authHeader.replace('Bearer ', '') : null
    
    // Créer le client Supabase avec le token si disponible
    const supabase = token 
      ? createSupabaseClientWithToken(token)
      : createClient(supabaseUrl, supabaseAnonKey)

    // Récupération des paramètres
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
    const offset = parseInt(searchParams.get('offset') || '0')

    // Récupération des analyses
    // Essayer d'abord avec analysis_result, si la colonne n'existe pas, essayer sans
    let analyzedListings: any[] | null = null
    let error: any = null
    
    log.info('Tentative récupération analyses', { 
      userId: user.id, 
      hasToken: !!token,
      limit,
      offset 
    })
    
    const { data, error: selectError } = await supabase
      .from('analyzed_listings')
      .select('id, url, risk_score, risk_level, summary, created_at, analysis_result, raw_input')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (selectError) {
      log.error('Erreur Supabase lors de la récupération', { 
        error: selectError.message, 
        code: selectError.code,
        details: selectError.details,
        hint: selectError.hint,
        userId: user.id 
      })
      
      // Si l'erreur est due à la colonne analysis_result manquante, réessayer sans
      if (selectError.message.includes('analysis_result') || selectError.message.includes('column') || selectError.code === '42703') {
        log.warn('Colonne analysis_result manquante, récupération sans cette colonne', {
          error: selectError.message,
          userId: user.id,
        })
        
        const { data: dataWithoutResult, error: retryError } = await supabase
          .from('analyzed_listings')
          .select('id, url, risk_score, risk_level, summary, created_at, raw_input')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1)
        
        if (retryError) {
          log.error('Erreur Supabase (sans analysis_result)', { 
            error: retryError.message, 
            code: retryError.code,
            userId: user.id 
          })
          throw new InternalServerError('Erreur lors de la récupération des analyses', {
            dbError: retryError.message,
          })
        }
        
        analyzedListings = dataWithoutResult
      } else {
        throw new InternalServerError('Erreur lors de la récupération des analyses', {
          dbError: selectError.message,
        })
      }
    } else {
      analyzedListings = data
      log.info('Analyses récupérées depuis Supabase', { 
        count: analyzedListings?.length || 0,
        userId: user.id 
      })
    }

    // Si on demande une analyse spécifique (pour récupérer les résultats complets)
    const analysisId = searchParams.get('id')
    if (analysisId) {
      const analysis = analyzedListings?.find(a => a.id === analysisId)
      if (analysis) {
        return NextResponse.json({
          success: true,
          data: {
            id: analysis.id,
            url: analysis.url,
            risk_score: Number(analysis.risk_score),
            risk_level: analysis.risk_level as 'low' | 'medium' | 'high',
            summary: analysis.summary || '',
            created_at: analysis.created_at,
            analysis_result: analysis.analysis_result || null,
          },
        })
      } else {
        return NextResponse.json({
          success: false,
          error: 'Analyse non trouvée',
        }, { status: 404 })
      }
    }

    const formattedAnalyses: UserAnalyzedListing[] = (analyzedListings || []).map((analysis) => {
      // Extraire le titre depuis raw_input ou analysis_result
      let title: string | null = null
      let price: number | null = null
      let year: number | null = null
      let mileage: number | null = null
      
      // Essayer depuis analysis_result d'abord
      if ((analysis as any).analysis_result) {
        const result = (analysis as any).analysis_result
        if (result.extractedData?.title) {
          title = result.extractedData.title
        }
        if (result.extractedData?.price_eur) {
          price = result.extractedData.price_eur
        }
        if (result.extractedData?.year) {
          year = result.extractedData.year
        }
        if (result.extractedData?.mileage_km) {
          mileage = result.extractedData.mileage_km
        }
      }
      
      // Fallback: essayer depuis raw_input
      if (!title && (analysis as any).raw_input) {
        const rawInput = (analysis as any).raw_input
        if (rawInput.title) {
          title = rawInput.title
        }
        if (rawInput.price || rawInput.price_eur) {
          price = rawInput.price || rawInput.price_eur
        }
        if (rawInput.year) {
          year = rawInput.year
        }
        if (rawInput.mileage || rawInput.mileage_km) {
          mileage = rawInput.mileage || rawInput.mileage_km
        }
      }
      
      // Si toujours pas de titre, essayer d'extraire depuis l'URL ou utiliser un titre par défaut
      if (!title) {
        if (analysis.url) {
          // Extraire un titre basique depuis l'URL
          try {
            const urlObj = new URL(analysis.url)
            const pathParts = urlObj.pathname.split('/').filter(p => p)
            if (pathParts.length > 0) {
              title = pathParts[pathParts.length - 1].replace(/-/g, ' ').substring(0, 60)
            }
          } catch {
            // Ignorer les erreurs d'URL
          }
        }
        if (!title) {
          title = 'Annonce analysée'
        }
      }
      
      return {
        id: analysis.id,
        url: analysis.url,
        title: title || 'Annonce analysée',
        price: price,
        year: year,
        mileage: mileage,
        risk_score: Number(analysis.risk_score),
        risk_level: analysis.risk_level as 'low' | 'medium' | 'high',
        summary: analysis.summary || '',
        created_at: analysis.created_at,
        hasFullResult: !!(analysis as any).analysis_result,
      }
    })

    log.info('Analyses retournées', {
      count: formattedAnalyses.length,
      userId: user.id,
    })

    return NextResponse.json({
      success: true,
      data: formattedAnalyses,
      pagination: {
        limit,
        offset,
        total: formattedAnalyses.length,
      },
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

/**
 * DELETE /api/me/analyzed-listings
 * Supprime l'historique d'analyses de l'utilisateur
 * Optionnel : supprimer une analyse spécifique avec ?id=xxx
 */
export async function DELETE(request: NextRequest) {
  const log = createRouteLogger('/api/me/analyzed-listings DELETE')
  
  try {
    // Vérification de l'authentification
    const user = await requireAuth(request)
    log.info(`Suppression historique analyses pour user ${user.id}`)

    // Récupérer le token depuis les headers pour RLS
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.startsWith('Bearer ') ? authHeader.replace('Bearer ', '') : null
    
    // Créer le client Supabase avec le token si disponible
    const supabase = token 
      ? createSupabaseClientWithToken(token)
      : createClient(supabaseUrl, supabaseAnonKey)

    const { searchParams } = new URL(request.url)
    const analysisId = searchParams.get('id')

    if (analysisId) {
      // Vérifier d'abord que l'analyse existe et appartient à l'utilisateur
      const { data: existingAnalysis, error: checkError } = await supabase
        .from('analyzed_listings')
        .select('id')
        .eq('id', analysisId)
        .eq('user_id', user.id)
        .maybeSingle()

      if (checkError) {
        log.error(`Erreur vérification analyse: ${checkError.message} (user: ${user.id})`)
        throw new InternalServerError('Erreur lors de la vérification de l\'analyse', {
          dbError: checkError.message,
        })
      }

      if (!existingAnalysis) {
        log.warn(`Analyse non trouvée ou n'appartient pas à l'utilisateur: ${analysisId} (user: ${user.id})`)
        return NextResponse.json({
          success: false,
          error: 'Analyse non trouvée ou vous n\'avez pas les permissions pour la supprimer'
        }, { status: 404 })
      }

      // Supprimer une analyse spécifique
      // Utiliser directement le service role car RLS peut bloquer silencieusement
      const supabaseAdmin = getSupabaseAdminClient()
      const { data: deletedData, error: deleteError } = await supabaseAdmin
        .from('analyzed_listings')
        .delete()
        .eq('id', analysisId)
        .eq('user_id', user.id) // Sécurité : s'assurer que c'est bien l'utilisateur
        .select()

      if (deleteError) {
        log.error(`Erreur suppression analyse: ${deleteError.message} (user: ${user.id}, analysisId: ${analysisId})`, {
          code: deleteError.code,
          details: deleteError.details,
          hint: deleteError.hint,
        })
        throw new InternalServerError('Erreur lors de la suppression de l\'analyse', {
          dbError: deleteError.message,
        })
      }

      if (!deletedData || deletedData.length === 0) {
        log.warn(`Aucune ligne supprimée pour l'analyse: ${analysisId} (user: ${user.id})`)
        return NextResponse.json({
          success: false,
          error: 'Aucune analyse trouvée à supprimer'
        }, { status: 404 })
      }

      log.info(`Analyse supprimée: ${analysisId} (user: ${user.id})`, {
        deleted: deletedData.length
      })

      return NextResponse.json({
        success: true,
        message: 'Analyse supprimée',
        deleted: deletedData?.length || 0
      })
    } else {
      // Supprimer tout l'historique
      // D'abord compter les analyses à supprimer
      const { count, error: countError } = await supabase
        .from('analyzed_listings')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
      
      if (countError) {
        log.error(`Erreur comptage analyses: ${countError.message} (user: ${user.id})`)
        throw new InternalServerError('Erreur lors du comptage des analyses', {
          dbError: countError.message,
        })
      }
      
      // Puis supprimer
      // Utiliser directement le service role car RLS peut bloquer silencieusement
      const supabaseAdmin = getSupabaseAdminClient()
      const { data: deletedData, error: deleteError } = await supabaseAdmin
        .from('analyzed_listings')
        .delete()
        .eq('user_id', user.id)
        .select()

      if (deleteError) {
        log.error(`Erreur suppression historique: ${deleteError.message} (user: ${user.id})`, {
          code: deleteError.code,
          details: deleteError.details,
          hint: deleteError.hint,
        })
        throw new InternalServerError('Erreur lors de la suppression de l\'historique', {
          dbError: deleteError.message,
        })
      }

      const deletedCount = deletedData?.length || count || 0
      
      if (deletedCount === 0 && count && count > 0) {
        log.warn(`Aucune ligne supprimée malgré ${count} analyses trouvées (user: ${user.id})`)
      }
      log.info(`Historique supprimé: ${deletedCount} analyses (user: ${user.id})`)

      return NextResponse.json({
        success: true,
        message: 'Historique supprimé',
        deletedCount: deletedCount
      })
    }

  } catch (error) {
    if (error instanceof AuthenticationError) {
      log.warn('Non authentifié')
      return createErrorResponse(error)
    }

    log.error(`Erreur serveur DELETE: ${error instanceof Error ? error.message : String(error)}`)
    return createErrorResponse(error)
  }
}

