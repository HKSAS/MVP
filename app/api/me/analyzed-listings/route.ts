import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '@/lib/auth'
import type { UserAnalyzedListing } from '@/lib/types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseAnonKey)

/**
 * GET /api/me/analyzed-listings
 * Retourne les analyses effectuées par l'utilisateur
 */
export async function GET(request: NextRequest) {
  const routePrefix = '[API /api/me/analyzed-listings]'
  
  try {
    // Vérification de l'authentification
    const user = await requireAuth(request)
    console.log(`${routePrefix} 👤 Utilisateur: ${user.id}`)

    // Récupération des paramètres
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
    const offset = parseInt(searchParams.get('offset') || '0')

    // Récupération des analyses
    const { data: analyzedListings, error } = await supabase
      .from('analyzed_listings')
      .select('id, url, risk_score, risk_level, summary, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error(`${routePrefix} ❌ Erreur Supabase:`, error)
      return NextResponse.json(
        { success: false, error: 'Erreur lors de la récupération des analyses' },
        { status: 500 }
      )
    }

    const formattedAnalyses: UserAnalyzedListing[] = (analyzedListings || []).map((analysis) => ({
      id: analysis.id,
      url: analysis.url,
      risk_score: Number(analysis.risk_score),
      risk_level: analysis.risk_level as 'low' | 'medium' | 'high',
      summary: analysis.summary || '',
      created_at: analysis.created_at,
    }))

    console.log(`${routePrefix} ✅ ${formattedAnalyses.length} analyse(s) retournée(s)`)

    return NextResponse.json({
      success: true,
      data: formattedAnalyses,
      pagination: {
        limit,
        offset,
        total: formattedAnalyses.length,
      },
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized: Authentication required') {
      console.error(`${routePrefix} ❌ Non authentifié`)
      return NextResponse.json(
        { success: false, error: 'Authentification requise' },
        { status: 401 }
      )
    }

    console.error(`${routePrefix} ❌ Erreur serveur:`, error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erreur serveur',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    )
  }
}

