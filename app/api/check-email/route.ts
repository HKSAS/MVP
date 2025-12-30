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

    // Vérifier directement dans auth.users (plus fiable)
    // Utiliser admin API pour vérifier l'email
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserByEmail(email.trim().toLowerCase())

    // Si l'utilisateur existe dans auth.users
    const existsInAuth = !authError && !!authUser?.user

    // Vérifier aussi dans profiles (pour détecter les doublons)
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('email', email.trim().toLowerCase())

    const countInProfiles = profiles?.length || 0
    const existsInProfiles = countInProfiles > 0

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
      authError: authError?.message,
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

