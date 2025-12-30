/**
 * POST /api/scraping/cancel
 * Annule un job de scraping en cours
 * 
 * Sécurité : Vérifie que le job appartient bien à l'utilisateur connecté
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAuthenticatedUser } from '@/lib/auth'
import { createRouteLogger } from '@/lib/logger'
import { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY } from '@/lib/env'

export const dynamic = 'force-dynamic'

const log = createRouteLogger('api-scraping-cancel')

// Client Supabase avec service role pour les opérations serveur
const supabaseAdmin = createClient(
  NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)

export async function POST(request: NextRequest) {
  try {
    // Récupérer l'utilisateur (peut être null si non authentifié)
    const user = await getAuthenticatedUser(request)
    
    if (!user) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { jobId } = body

    if (!jobId || typeof jobId !== 'string') {
      return NextResponse.json(
        { error: 'jobId requis (string)' },
        { status: 400 }
      )
    }

    log.info('Tentative annulation job', {
      jobId,
      userId: user.id,
    })

    // Récupérer le job pour vérifier qu'il appartient à l'utilisateur
    const { data: job, error: fetchError } = await supabaseAdmin
      .from('scraping_jobs')
      .select('id, user_id, status')
      .eq('id', jobId)
      .single()

    if (fetchError || !job) {
      log.warn('Job non trouvé', {
        jobId,
        error: fetchError?.message,
      })
      return NextResponse.json(
        { error: 'Job non trouvé' },
        { status: 404 }
      )
    }

    // Vérifier que le job appartient à l'utilisateur
    if (job.user_id !== user.id) {
      log.warn('Tentative annulation job d\'un autre utilisateur', {
        jobId,
        jobUserId: job.user_id,
        requestUserId: user.id,
      })
      return NextResponse.json(
        { error: 'Accès refusé' },
        { status: 403 }
      )
    }

    // Vérifier que le job peut être annulé (doit être en cours)
    if (job.status !== 'running') {
      log.info('Job déjà terminé, pas besoin d\'annuler', {
        jobId,
        status: job.status,
      })
      return NextResponse.json({
        success: true,
        message: 'Job déjà terminé',
        status: job.status,
      })
    }

    // Mettre à jour le statut à 'cancelled'
    const { error: updateError } = await supabaseAdmin
      .from('scraping_jobs')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId)

    if (updateError) {
      log.error('Erreur lors de l\'annulation du job', {
        jobId,
        error: updateError.message,
      })
      return NextResponse.json(
        { error: 'Erreur lors de l\'annulation' },
        { status: 500 }
      )
    }

    log.info('Job annulé avec succès', {
      jobId,
      userId: user.id,
    })

    return NextResponse.json({
      success: true,
      message: 'Job annulé avec succès',
      jobId,
    })
  } catch (error) {
    log.error('Erreur serveur', {
      error: error instanceof Error ? error.message : String(error),
    })

    return NextResponse.json(
      {
        error: 'Erreur serveur',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

