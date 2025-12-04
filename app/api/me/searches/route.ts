import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '@/lib/auth'
import type { UserSearch } from '@/lib/types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseAnonKey)

/**
 * GET /api/me/searches
 * Retourne les dernières recherches de l'utilisateur authentifié
 */
export async function GET(request: NextRequest) {
  const routePrefix = '[API /api/me/searches]'
  
  try {
    // Vérification de l'authentification
    const user = await requireAuth(request)
    console.log(`${routePrefix} 👤 Utilisateur: ${user.id}`)

    // Récupération des paramètres de pagination
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
    const offset = parseInt(searchParams.get('offset') || '0')

    // Récupération des recherches
    const { data: searches, error } = await supabase
      .from('searches')
      .select('id, brand, model, max_price, total_results, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error(`${routePrefix} ❌ Erreur Supabase:`, error)
      return NextResponse.json(
        { success: false, error: 'Erreur lors de la récupération des recherches' },
        { status: 500 }
      )
    }

    const formattedSearches: UserSearch[] = (searches || []).map((search) => ({
      id: search.id,
      brand: search.brand,
      model: search.model,
      max_price: Number(search.max_price),
      total_results: search.total_results || 0,
      created_at: search.created_at,
    }))

    console.log(`${routePrefix} ✅ ${formattedSearches.length} recherche(s) retournée(s)`)

    return NextResponse.json({
      success: true,
      data: formattedSearches,
      pagination: {
        limit,
        offset,
        total: formattedSearches.length,
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

