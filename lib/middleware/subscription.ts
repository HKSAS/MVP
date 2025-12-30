/**
 * Middleware pour vérifier les abonnements actifs
 */

import { NextRequest, NextResponse } from 'next/server'
import { hasActiveSubscription } from '../db/subscriptions'
import { getAuthenticatedUser } from '../auth'
import { createRouteLogger } from '../logger'

const logger = createRouteLogger('subscription-middleware')

/**
 * Vérifie si un utilisateur a un abonnement actif
 * Utilisé dans les routes API pour protéger l'accès premium
 */
export async function requireActiveSubscription(
  req: NextRequest
): Promise<{ authorized: boolean; userId?: string; error?: string }> {
  try {
    const user = await getAuthenticatedUser(req)
    if (!user?.id) {
      return {
        authorized: false,
        error: 'Authentification requise',
      }
    }

    const isActive = await hasActiveSubscription(user.id)

    if (!isActive) {
      logger.warn('User does not have active subscription', { userId: user.id })
      return {
        authorized: false,
        userId: user.id,
        error: 'Abonnement actif requis pour accéder à cette fonctionnalité',
      }
    }

    return {
      authorized: true,
      userId: user.id,
    }
  } catch (error: any) {
    logger.error('Error checking subscription', { error: error.message })
    return {
      authorized: false,
      error: 'Erreur lors de la vérification de l\'abonnement',
    }
  }
}

/**
 * Helper pour créer une réponse d'erreur d'autorisation
 */
export function createUnauthorizedResponse(message?: string) {
  return NextResponse.json(
    {
      error: message || 'Abonnement actif requis pour accéder à cette fonctionnalité',
      code: 'SUBSCRIPTION_REQUIRED',
    },
    { status: 403 }
  )
}

