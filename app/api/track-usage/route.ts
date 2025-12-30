/**
 * API Route pour tracker l'utilisation
 * 
 * POST /api/track-usage
 * Body: { actionType: 'recherche' | 'analyse', actionData?: object }
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { trackUsage } from '@/lib/auth/usage-tracker'
import { getSupabaseBrowserClient } from '@/lib/supabase/browser'

export async function POST(request: NextRequest) {
  try {
    // Vérifier l'authentification
    const user = await requireAuth(request)
    
    // Parser le body
    const body = await request.json()
    const { actionType, actionData } = body
    
    if (!actionType || !['recherche', 'analyse'].includes(actionType)) {
      return NextResponse.json(
        { error: 'actionType doit être "recherche" ou "analyse"' },
        { status: 400 }
      )
    }
    
    // Tracker l'utilisation
    const result = await trackUsage(actionType as 'recherche' | 'analyse', actionData, user.id)
    
    if (!result.success) {
      return NextResponse.json(
        { 
          error: result.message || 'Quota épuisé',
          reason: result.error || 'quota_exceeded'
        },
        { status: 403 }
      )
    }
    
    return NextResponse.json({
      success: true,
      remaining: result.remaining,
      unlimited: result.unlimited
    })
    
  } catch (error: any) {
    console.error('Erreur track-usage:', error)
    return NextResponse.json(
      { error: error.message || 'Erreur serveur' },
      { status: 500 }
    )
  }
}

