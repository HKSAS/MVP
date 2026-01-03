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

    // Stats transactions (revenu)
    const { data: transactionsData, error: txError } = await supabase
      .from('transactions')
      .select('amount, status, created_at')

    if (txError) {
      console.warn('Transactions error:', txError)
    }

    const thirtyDaysAgoForRevenue = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    
    const totalRevenue = transactionsData
      ?.filter(tx => tx.status === 'paid' || tx.status === 'succeeded')
      .reduce((sum, tx) => sum + (tx.amount || 0), 0) || 0

    const revenueThisMonth = transactionsData
      ?.filter(tx => 
        (tx.status === 'paid' || tx.status === 'succeeded') &&
        tx.created_at && new Date(tx.created_at) >= thirtyDaysAgo
      )
      .reduce((sum, tx) => sum + (tx.amount || 0), 0) || 0

    const successfulTransactions = transactionsData?.filter(
      tx => tx.status === 'paid' || tx.status === 'succeeded'
    ).length || 0
    const totalTransactions = transactionsData?.length || 1
    const conversionRate = (successfulTransactions / totalTransactions) * 100

    // Revenu par jour (30 derniers jours) pour graphique
    const revenueByDay: Array<{ date: string; revenue: number }> = []
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
      const dateStr = date.toISOString().split('T')[0]
      const dayRevenue = transactionsData
        ?.filter(tx =>
          (tx.status === 'paid' || tx.status === 'succeeded') &&
          tx.created_at &&
          new Date(tx.created_at).toISOString().split('T')[0] === dateStr
        )
        .reduce((sum, tx) => sum + (tx.amount || 0), 0) || 0
      revenueByDay.push({ date: dateStr, revenue: dayRevenue })
    }

    // Stats recherches IA
    const { data: searchesData, error: searchesError } = await supabase
      .from('ai_searches')
      .select('query, created_at')

    if (searchesError) {
      console.warn('Searches error:', searchesError)
    }

    const searchesThisMonth = searchesData?.filter(s =>
      s.created_at && new Date(s.created_at) >= thirtyDaysAgoForRevenue
    ).length || 0

    // Répartition recherches IA par type (pour graphique)
    const searchDistribution: Record<string, number> = {
      'Estimation Prix': 0,
      'Comparaison': 0,
      'Fiabilité': 0,
      'Autre': 0,
    }

    searchesData?.forEach(search => {
      const query = (search.query || '').toLowerCase()
      if (query.includes('prix') || query.includes('price')) {
        searchDistribution['Estimation Prix']++
      } else if (query.includes('comparaison') || query.includes('compare')) {
        searchDistribution['Comparaison']++
      } else if (query.includes('fiabilité') || query.includes('fiabilite') || query.includes('reliable')) {
        searchDistribution['Fiabilité']++
      } else {
        searchDistribution['Autre']++
      }
    })

    const searchDistributionData = Object.entries(searchDistribution).map(([name, value]) => ({
      name,
      value,
    })).filter(item => item.value > 0)

    // Alertes système (simplifié)
    const failedTransactionsLast24h = transactionsData?.filter(tx =>
      (tx.status === 'failed' || tx.status === 'error') &&
      tx.created_at &&
      new Date(tx.created_at) >= new Date(now.getTime() - 24 * 60 * 60 * 1000)
    ).length || 0

    const systemAlerts = failedTransactionsLast24h > 0 ? 1 : 0

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
      revenue: {
        total: totalRevenue / 100, // Convertir centimes en euros
        thisMonth: revenueThisMonth / 100,
        conversionRate: Math.round(conversionRate * 100) / 100,
        byDay: revenueByDay.map(item => ({
          ...item,
          revenue: item.revenue / 100,
        })),
      },
      searches: {
        thisMonth: searchesThisMonth,
        distribution: searchDistributionData,
      },
      alerts: {
        count: systemAlerts,
        failedTransactionsLast24h,
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

