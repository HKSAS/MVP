import { NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * Récupère la liste des transactions avec filtres
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = (page - 1) * limit
    const status = searchParams.get('status') || ''
    const startDate = searchParams.get('startDate') || ''
    const endDate = searchParams.get('endDate') || ''

    const supabase = getSupabaseAdminClient()

    let query = supabase
      .from('transactions')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Filtrer par status
    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    // Filtrer par date
    if (startDate) {
      query = query.gte('created_at', startDate)
    }
    if (endDate) {
      query = query.lte('created_at', endDate)
    }

    const { data: transactions, error, count } = await query

    if (error) {
      throw error
    }

    // Récupérer les emails depuis profiles
    const userIds = transactions?.map(t => t.user_id).filter(Boolean) || []
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email')
      .in('id', userIds)

    const profileMap = new Map(profiles?.map(p => [p.id, p.email]) || [])

    // Formater les données
    const formattedTransactions = transactions?.map(tx => ({
      ...tx,
      email: profileMap.get(tx.user_id) || '',
    })) || []

    return NextResponse.json({
      transactions: formattedTransactions,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching transactions:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

