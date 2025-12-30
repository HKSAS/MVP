import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { getSupabaseAdminClient } from '@/lib/supabase/server'
import { createRouteLogger } from '@/lib/logger'
import { createErrorResponse } from '@/lib/errors'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/users/[id]/activity
 * Retourne les 20 dernières recherches et 20 dernières analyses d'un utilisateur
 * Protégé : admin uniquement
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const log = createRouteLogger('/api/admin/users/[id]/activity')
  
  try {
    // Vérifier que l'utilisateur est admin
    await requireAdmin(request)
    
    // Next.js 15+ : params peut être une Promise
    const resolvedParams = await Promise.resolve(params)
    const userId = resolvedParams.id
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID requis' },
        { status: 400 }
      )
    }
    
    const supabase = getSupabaseAdminClient()
    
    // Récupérer les 20 dernières recherches
    const { data: searches, error: searchesError } = await supabase
      .from('ai_searches')
      .select('id, query_text, filters, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20)
    
    if (searchesError) {
      log.error('Erreur récupération recherches', { error: searchesError.message })
      throw new Error(`Erreur récupération recherches: ${searchesError.message}`)
    }
    
    // Récupérer les 20 dernières analyses
    const { data: analyses, error: analysesError } = await supabase
      .from('ai_analyses')
      .select('id, listing_url, listing_source, risk_score, risk_level, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20)
    
    if (analysesError) {
      log.error('Erreur récupération analyses', { error: analysesError.message })
      throw new Error(`Erreur récupération analyses: ${analysesError.message}`)
    }
    
    log.info('Activité utilisateur récupérée', {
      userId,
      searchesCount: searches?.length || 0,
      analysesCount: analyses?.length || 0,
    })
    
    return NextResponse.json({
      success: true,
      data: {
        userId,
        searches: searches || [],
        analyses: analyses || [],
        total_searches: searches?.length || 0,
        total_analyses: analyses?.length || 0,
      },
    })
  } catch (error) {
    log.error('Erreur serveur', {
      error: error instanceof Error ? error.message : String(error),
    })
    return createErrorResponse(error)
  }
}

