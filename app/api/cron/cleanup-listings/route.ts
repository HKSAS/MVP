import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createRouteLogger } from '@/lib/logger'

const log = createRouteLogger('/api/cron/cleanup-listings')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

/**
 * Nettoyer les annonces de plus de 30 jours
 * À appeler via un cron job (Vercel Cron ou autre)
 * 
 * Usage:
 * - Vercel Cron: Ajouter dans vercel.json
 * - Appel manuel: GET /api/cron/cleanup-listings
 */
export async function GET(request: Request) {
  try {
    // Vérifier que c'est bien un appel cron (optionnel, pour sécurité)
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      log.warn('Tentative d\'accès non autorisée au cron')
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    log.info('Début nettoyage des annonces', {
      cutoffDate: thirtyDaysAgo.toISOString()
    })

    // Option 1: Supprimer les vieilles annonces
    const { data: deletedData, error: deleteError } = await supabase
      .from('listings')
      .delete()
      .lt('created_at', thirtyDaysAgo.toISOString())
      .select('id')

    if (deleteError) {
      log.error('Erreur lors de la suppression', { error: deleteError.message })
      throw deleteError
    }

    const deletedCount = deletedData?.length || 0

    log.info('Nettoyage terminé', {
      deletedCount,
      cutoffDate: thirtyDaysAgo.toISOString()
    })

    return NextResponse.json({
      success: true,
      message: 'Nettoyage effectué',
      deleted: deletedCount,
      cutoffDate: thirtyDaysAgo.toISOString()
    })

  } catch (error) {
    log.error('Erreur lors du nettoyage', {
      error: error instanceof Error ? error.message : String(error)
    })
    
    return NextResponse.json({
      success: false,
      error: 'Cleanup failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}



