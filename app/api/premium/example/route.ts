/**
 * EXEMPLE: Route API protégée nécessitant un abonnement actif
 * GET /api/premium/example
 * 
 * Cette route est un exemple montrant comment protéger une route API
 * avec la vérification d'abonnement actif.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireActiveSubscription, createUnauthorizedResponse } from '@/lib/middleware/subscription'
import { createRouteLogger } from '@/lib/logger'

const logger = createRouteLogger('/api/premium/example')

export async function GET(req: NextRequest) {
  try {
    // Vérifier que l'utilisateur a un abonnement actif
    const { authorized, userId, error } = await requireActiveSubscription(req)

    if (!authorized) {
      logger.warn('Unauthorized access attempt', { userId, error })
      return createUnauthorizedResponse(error)
    }

    // Ici, votre logique métier pour les utilisateurs premium
    logger.info('Premium feature accessed', { userId })

    return NextResponse.json({
      success: true,
      message: 'Fonctionnalité premium accessible',
      data: {
        // Vos données premium ici
      },
    })
  } catch (error: any) {
    logger.error('Error in premium route', { error: error.message })
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

