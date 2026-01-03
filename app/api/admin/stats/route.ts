import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY } from '@/src/core/config/env'
import { getSupabaseAdminClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * Récupère les statistiques globales du dashboard admin
 */
export async function GET() {
  try {
    const supabase = getSupabaseAdminClient()

    // Stats utilisateurs
    const { data: usersData, error: usersError } = await supabase
      .from('profiles')
      .select('id, access_override, created_at')

    if (usersError) {
      throw usersError
    }

    const now = new Date()
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    const totalUsers = usersData?.length || 0
    const totalVip = usersData?.filter(u => u.access_override === true).length || 0
    const totalFree = usersData?.filter(u => !u.access_override || u.access_override === false).length || 0
    const newThisWeek = usersData?.filter(u => 
      u.created_at && new Date(u.created_at) >= sevenDaysAgo
    ).length || 0

    // Évolution utilisateurs (30 derniers jours)
    const evolutionData: Array<{ date: string; count: number }> = []
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
      const dateStr = date.toISOString().split('T')[0]
      const count = usersData?.filter(u => 
        u.created_at && new Date(u.created_at).toISOString().split('T')[0] <= dateStr
      ).length || 0
      evolutionData.push({ date: dateStr, count })
    }

    // Stats abonnements
    const { data: subscriptionsData, error: subsError } = await supabase
      .from('subscriptions')
      .select('plan, status')

    if (subsError) {
      console.warn('Subscriptions error:', subsError)
    }

    const totalSubs = subscriptionsData?.length || 0
    const freeCount = subscriptionsData?.filter(s => s.plan === 'free').length || 0
    const starterCount = subscriptionsData?.filter(s => s.plan === 'starter').length || 0
    const premiumCount = subscriptionsData?.filter(s => s.plan === 'premium').length || 0
    const enterpriseCount = subscriptionsData?.filter(s => s.plan === 'enterprise').length || 0

    // Plan le plus populaire
    const planCounts: Record<string, number> = {}
    subscriptionsData?.forEach(s => {
      planCounts[s.plan] = (planCounts[s.plan] || 0) + 1
    })
    const mostPopularPlan = Object.keys(planCounts).reduce((a, b) => 
      planCounts[a] > planCounts[b] ? a : b, 'free'
    ) || 'free'

    return NextResponse.json({
      users: {
        total: totalUsers,
        vip: totalVip,
        free: totalFree,
        newThisWeek,
        evolution: evolutionData,
      },
      subscriptions: {
        total: totalSubs,
        free: freeCount,
        starter: starterCount,
        premium: premiumCount,
        enterprise: enterpriseCount,
        mostPopularPlan,
        distribution: {
          free: freeCount,
          starter: starterCount,
          premium: premiumCount,
          enterprise: enterpriseCount,
        },
      },
    })
  } catch (error) {
    console.error('Error fetching admin stats:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

