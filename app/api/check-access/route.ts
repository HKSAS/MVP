/**
 * API Route pour vérifier l'accès utilisateur
 * 
 * GET /api/check-access
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { checkUserAccess } from '@/lib/auth/access-control'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Vérifier l'authentification
    const user = await requireAuth(request)
    
    // Vérifier l'accès
    const access = await checkUserAccess(user.id)
    
    return NextResponse.json(access)
    
  } catch (error: any) {
    console.error('Erreur check-access:', error)
    return NextResponse.json(
      { 
        hasAccess: false,
        reason: 'user_not_found',
        message: error.message || 'Erreur serveur'
      },
      { status: error.message === 'Authentication required' ? 401 : 500 }
    )
  }
}

