import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth'
import { createRouteLogger } from '@/lib/logger'
import { createErrorResponse, ValidationError } from '@/lib/errors'
import {
  createAlert,
  getUserAlerts,
  deactivateAlert,
  type AlertCriteria,
} from '@/lib/alerts-system'

export const dynamic = 'force-dynamic'

/**
 * Crée une nouvelle alerte
 */
export async function POST(request: NextRequest) {
  const log = createRouteLogger('/api/alerts')
  
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { brand, model, maxPrice, minPrice, yearMin, yearMax, mileageMax, fuelType, location, radiusKm } = body

    if (!brand && !model) {
      throw new ValidationError('Au moins la marque ou le modèle doit être spécifié')
    }

    const alertId = await createAlert(user.id, {
      brand,
      model,
      maxPrice,
      minPrice,
      yearMin,
      yearMax,
      mileageMax,
      fuelType,
      location,
      radiusKm,
    })

    if (!alertId) {
      return NextResponse.json(
        { error: 'Erreur lors de la création de l\'alerte' },
        { status: 500 }
      )
    }

    log.info('Alerte créée', { userId: user.id, alertId })

    return NextResponse.json({
      success: true,
      alertId,
      message: 'Alerte créée avec succès',
    })
  } catch (error) {
    log.error('Erreur création alerte', {
      error: error instanceof Error ? error.message : String(error),
    })
    return createErrorResponse(error)
  }
}

/**
 * Récupère les alertes d'un utilisateur
 */
export async function GET(request: NextRequest) {
  const log = createRouteLogger('/api/alerts')
  
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      )
    }

    const alerts = await getUserAlerts(user.id)

    return NextResponse.json({
      success: true,
      alerts,
    })
  } catch (error) {
    log.error('Erreur récupération alertes', {
      error: error instanceof Error ? error.message : String(error),
    })
    return createErrorResponse(error)
  }
}

/**
 * Désactive une alerte
 */
export async function DELETE(request: NextRequest) {
  const log = createRouteLogger('/api/alerts')
  
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const alertId = searchParams.get('id')

    if (!alertId) {
      throw new ValidationError('ID d\'alerte manquant')
    }

    const success = await deactivateAlert(alertId, user.id)

    if (!success) {
      return NextResponse.json(
        { error: 'Erreur lors de la désactivation de l\'alerte' },
        { status: 500 }
      )
    }

    log.info('Alerte désactivée', { userId: user.id, alertId })

    return NextResponse.json({
      success: true,
      message: 'Alerte désactivée avec succès',
    })
  } catch (error) {
    log.error('Erreur désactivation alerte', {
      error: error instanceof Error ? error.message : String(error),
    })
    return createErrorResponse(error)
  }
}

