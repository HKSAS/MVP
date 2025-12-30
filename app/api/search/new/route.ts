/**
 * POST /api/search/new
 * Nouveau endpoint selon architecture - validation DTO + appel SearchService
 */

import { NextRequest, NextResponse } from 'next/server'
import { createSearchJob } from '@/src/modules/search/service/SearchService'
import { createSearchDto } from '@/src/modules/search/dto/search.dto'
import { createRouteLogger } from '@/src/core/logger'

const log = createRouteLogger('api-search-new')

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validation DTO
    const validationResult = createSearchDto.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation échouée',
          details: validationResult.error.errors,
        },
        { status: 400 }
      )
    }

    const params = validationResult.data

    // TODO: Récupérer userId depuis session/auth si nécessaire
    const userId = null // À implémenter selon votre système d'auth

    // Créer la recherche (exécution sync temporaire, sera remplacé par BullMQ)
    const result = await createSearchJob(
      {
        ...params,
        userId,
      },
      true // executeSync = true temporairement
    )

    log.info('Recherche créée', {
      searchId: result.searchId,
      status: result.status,
    })

    return NextResponse.json({
      success: true,
      searchId: result.searchId,
      status: result.status,
      totalListings: result.totalListings,
      sitesCompleted: result.sitesCompleted,
      sitesTotal: result.sitesTotal,
    })
  } catch (error) {
    log.error('Erreur création recherche', {
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






