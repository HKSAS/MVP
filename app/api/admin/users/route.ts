import { NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * Récupère la liste des utilisateurs
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = (page - 1) * limit

    const supabase = getSupabaseAdminClient()

    // Construire la requête
    let query = supabase
      .from('profiles')
      .select(`
        id,
        email,
        role,
        access_override,
        created_at,
        updated_at
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Filtrer par email si recherche
    if (search) {
      query = query.ilike('email', `%${search}%`)
    }

    const { data: users, error, count } = await query

    if (error) {
      throw error
    }

    // Récupérer les abonnements pour chaque utilisateur
    const userIds = users?.map(u => u.id) || []
    const { data: subscriptions } = await supabase
      .from('subscriptions')
      .select('user_id, plan, status')
      .in('user_id', userIds)

    // Enrichir les utilisateurs avec leurs abonnements
    const usersWithSubs = users?.map(user => {
      const userSub = subscriptions?.find(s => s.user_id === user.id)
      return {
        ...user,
        plan: userSub?.plan || 'free',
        subscriptionStatus: userSub?.status || 'inactive',
      }
    }) || []

    return NextResponse.json({
      users: usersWithSubs,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Toggle VIP status d'un utilisateur
 */
export async function PATCH(request: Request) {
  try {
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    const supabase = getSupabaseAdminClient()

    // Récupérer l'état actuel
    const { data: currentProfile, error: fetchError } = await supabase
      .from('profiles')
      .select('access_override')
      .eq('id', userId)
      .single()

    if (fetchError || !currentProfile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Toggle access_override
    const newValue = !currentProfile.access_override

    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update({
        access_override: newValue,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single()

    if (updateError) {
      throw updateError
    }

    return NextResponse.json({
      success: true,
      user: updatedProfile,
      access_override: newValue,
    })
  } catch (error) {
    console.error('Error toggling VIP:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

