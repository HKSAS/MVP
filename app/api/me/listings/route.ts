import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { createErrorResponse } from '@/lib/errors'
import { createRouteLogger } from '@/lib/logger'
import { AuthenticationError } from '@/lib/errors'

const log = createRouteLogger('api/me/listings')

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    
    // TODO: Implémenter la récupération des listings de l'utilisateur
    return NextResponse.json({ listings: [] })
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return createErrorResponse(error)
    }
    log.error('Erreur serveur', {
      error: error instanceof Error ? error.message : String(error),
    })
    return createErrorResponse(error)
  }
}
