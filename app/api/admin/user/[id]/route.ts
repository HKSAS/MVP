import { NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * Récupère les détails complets d'un utilisateur
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const userId = params.id
    const supabase = getSupabaseAdminClient()

    // Récupérer le profil
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Récupérer l'utilisateur auth (via service role)
    let userEmail = profile.email
    try {
      const { data: { user } } = await supabase.auth.admin.getUserById(userId)
      if (user?.email) {
        userEmail = user.email
      }
    } catch (error) {
      // Si échec, utiliser l'email du profile
      console.warn('Could not fetch user from auth:', error)
    }

    // Récupérer les recherches IA
    const { data: searches } = await supabase
      .from('ai_searches')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)

    // Récupérer les analyses
    const { data: analyses } = await supabase
      .from('analyses')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)

    // Récupérer l'abonnement actuel
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    // Récupérer les transactions
    const { data: transactions } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)

    return NextResponse.json({
      profile: {
        ...profile,
        email: userEmail,
      },
      searches: searches || [],
      analyses: analyses || [],
      subscription: subscription || null,
      transactions: transactions || [],
    })
  } catch (error) {
    console.error('Error fetching user details:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

