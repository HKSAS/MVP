import { NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * Récupère la liste des abonnements
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = (page - 1) * limit

    const supabase = getSupabaseAdminClient()

    const { data: subscriptions, error, count } = await supabase
      .from('subscriptions')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      throw error
    }

    // Récupérer les emails depuis profiles
    const userIds = subscriptions?.map(s => s.user_id).filter(Boolean) || []
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email')
      .in('id', userIds)

    const profileMap = new Map(profiles?.map(p => [p.id, p.email]) || [])

    // Formater les données
    const formattedSubs = subscriptions?.map(sub => ({
      ...sub,
      email: profileMap.get(sub.user_id) || '',
    })) || []

    return NextResponse.json({
      subscriptions: formattedSubs,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching subscriptions:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

