import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/server'

/**
 * Route API pour vérifier si un email existe déjà
 * Utilise le service role pour bypasser RLS
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { exists: false, error: 'Email invalide' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdminClient()

    // Vérifier dans profiles (la source de vérité pour notre application)
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('email', email.trim().toLowerCase())

    const countInProfiles = profiles?.length || 0
    const existsInProfiles = countInProfiles > 0

    // Vérifier aussi dans auth.users via listUsers (méthode disponible dans l'API admin)
    // Note: getUserByEmail n'existe pas, on utilise listUsers et on filtre
    let existsInAuth = false
    try {
      const { data: usersData, error: authError } = await supabase.auth.admin.listUsers()
      if (!authError && usersData?.users) {
        existsInAuth = usersData.users.some(
          (user: any) => user.email?.toLowerCase() === email.trim().toLowerCase()
        )
      }
    } catch (error) {
      // Si l'erreur survient, on continue avec la vérification profiles uniquement
      console.warn('[CHECK-EMAIL] Erreur lors de la vérification auth.users:', error)
    }

    // L'email existe si présent dans auth.users OU dans profiles
    const exists = existsInAuth || existsInProfiles
    const isDuplicate = countInProfiles > 1

    console.log('[CHECK-EMAIL] Vérification email:', {
      email: email.trim().toLowerCase(),
      exists,
      existsInAuth,
      existsInProfiles,
      countInProfiles,
      isDuplicate,
      profilesError: profilesError?.message,
    })

    return NextResponse.json({ 
      exists, 
      existsInAuth,
      existsInProfiles,
      count: countInProfiles,
      isDuplicate,
      profiles: profiles || []
    })
  } catch (error) {
    console.error('[CHECK-EMAIL] Erreur serveur:', error)
    return NextResponse.json(
      { exists: false, error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

