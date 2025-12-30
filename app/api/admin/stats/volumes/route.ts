import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { getSupabaseAdminClient } from '@/lib/supabase/server'
import { createRouteLogger } from '@/lib/logger'
import { createErrorResponse } from '@/lib/errors'

/**
 * GET /api/admin/stats/volumes
 * Retourne les statistiques de volume pour ai_searches et ai_analyses
 * Protégé : admin uniquement
 */
export async function GET(request: NextRequest) {
  const log = createRouteLogger('/api/admin/stats/volumes')
  
  try {
    // Vérifier que l'utilisateur est admin
    await requireAdmin(request)
    
    const supabase = getSupabaseAdminClient()
    
    // Compter les recherches IA
    const { count: searchesCount, error: searchesError } = await supabase
      .from('ai_searches')
      .select('*', { count: 'exact', head: true })
    
    if (searchesError) {
      log.error('Erreur comptage ai_searches', { error: searchesError.message })
      throw new Error(`Erreur comptage ai_searches: ${searchesError.message}`)
    }
    
    // Compter les analyses
    const { count: analysesCount, error: analysesError } = await supabase
      .from('ai_analyses')
      .select('*', { count: 'exact', head: true })
    
    if (analysesError) {
      log.error('Erreur comptage ai_analyses', { error: analysesError.message })
      throw new Error(`Erreur comptage ai_analyses: ${analysesError.message}`)
    }
    
    // Compter les demandes de contact
    const { count: contactsCount, error: contactsError } = await supabase
      .from('contact_requests')
      .select('*', { count: 'exact', head: true })
    
    if (contactsError) {
      log.error('Erreur comptage contact_requests', { error: contactsError.message })
      throw new Error(`Erreur comptage contact_requests: ${contactsError.message}`)
    }
    
    log.info('Statistiques volumes récupérées', {
      searches: searchesCount || 0,
      analyses: analysesCount || 0,
      contacts: contactsCount || 0,
    })
    
    return NextResponse.json({
      success: true,
      data: {
        ai_searches: searchesCount || 0,
        ai_analyses: analysesCount || 0,
        contact_requests: contactsCount || 0,
        total: (searchesCount || 0) + (analysesCount || 0) + (contactsCount || 0),
      },
    })
  } catch (error) {
    log.error('Erreur serveur', {
      error: error instanceof Error ? error.message : String(error),
    })
    return createErrorResponse(error)
  }
}

