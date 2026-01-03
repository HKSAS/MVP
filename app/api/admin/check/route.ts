import { NextResponse } from 'next/server'
import { getSupabaseBrowserClient } from '@/lib/supabase/browser'
import { createClient } from '@supabase/supabase-js'
import { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY } from '@/src/core/config/env'

export const dynamic = 'force-dynamic'

/**
 * Vérifie si l'utilisateur actuel est admin
 * Admin = role='pro' OU access_override=true
 */
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ isAdmin: false, error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    
    // Créer un client Supabase avec le token
    const supabase = createClient(
      NEXT_PUBLIC_SUPABASE_URL!,
      NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    // Vérifier le token et récupérer l'utilisateur
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    
    if (userError || !user) {
      return NextResponse.json({ isAdmin: false, error: 'Invalid token' }, { status: 401 })
    }

    // Récupérer le profil avec role et access_override
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, access_override')
      .eq('id', user.id)
      .single()

    if (profileError) {
      return NextResponse.json({ isAdmin: false, error: 'Profile not found' }, { status: 403 })
    }

    // Vérifier si admin : role='pro' OU access_override=true
    const isAdmin = profile?.role === 'pro' || profile?.access_override === true

    return NextResponse.json({ isAdmin, profile })
  } catch (error) {
    console.error('Error checking admin status:', error)
    return NextResponse.json(
      { isAdmin: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

