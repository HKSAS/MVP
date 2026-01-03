'use client'

import { useQuery } from '@tanstack/react-query'
import { adminApi } from '@/lib/admin/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Users,
  Star,
  UserPlus,
  TrendingUp,
  DollarSign,
  Percent,
  Search,
  AlertCircle,
} from 'lucide-react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

export default function AdminDashboardPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => adminApi.getStats(),
    refetchInterval: 30000, // Refetch every 30s
  })

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-8 w-24 mb-2" />
                <Skeleton className="h-4 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  const userStats = stats?.users || {}
  const subStats = stats?.subscriptions || {}
  const revenueStats = stats?.revenue || {}
  const searchStats = stats?.searches || {}
  const alertsStats = stats?.alerts || {}

  // Préparer les données pour le graphique d'évolution
  const evolutionData = userStats.evolution?.map((item: any) => ({
    date: new Date(item.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
    Utilisateurs: item.count,
  })) || []

  // Préparer les données pour le graphique de distribution
  const distributionData = [
    { name: 'Free', value: subStats.free || 0 },
    { name: 'Starter', value: subStats.starter || 0 },
    { name: 'Premium', value: subStats.premium || 0 },
    { name: 'Enterprise', value: subStats.enterprise || 0 },
  ].filter(item => item.value > 0)

  // Préparer les données pour le graphique revenu par jour
  const revenueByDayData = revenueStats.byDay?.map((item: any) => ({
    date: new Date(item.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
    Revenu: item.revenue || 0,
  })) || []

  // Préparer les données pour le graphique répartition recherches IA
  const searchDistributionData = searchStats.distribution || []

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-medium text-white mb-2 bg-gradient-to-r from-blue-400 via-blue-500 to-purple-500 bg-clip-text text-transparent">
          Dashboard
        </h1>
        <p className="text-gray-400 text-lg">Vue d'ensemble de l'activité</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 backdrop-blur-sm border border-blue-500/30 shadow-lg shadow-blue-500/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">
              Total utilisateurs
            </CardTitle>
            <Users className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{userStats.total || 0}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-500/20 to-orange-600/10 backdrop-blur-sm border border-yellow-500/30 shadow-lg shadow-yellow-500/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">
              Admin VIP
            </CardTitle>
            <Star className="h-4 w-4 text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{userStats.vip || 0}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 backdrop-blur-sm border border-purple-500/30 shadow-lg shadow-purple-500/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">
              Utilisateurs standards
            </CardTitle>
            <Users className="h-4 w-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{userStats.free || 0}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/20 to-green-600/10 backdrop-blur-sm border border-green-500/30 shadow-lg shadow-green-500/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">
              Nouveaux (7j)
            </CardTitle>
            <UserPlus className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{userStats.newThisWeek || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* KPI Cards Row 2 - Nouveaux */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 backdrop-blur-sm border border-emerald-500/30 shadow-lg shadow-emerald-500/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">
              Revenu total
            </CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {revenueStats.total?.toLocaleString('fr-FR', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              }) || '0,00'} €
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 backdrop-blur-sm border border-cyan-500/30 shadow-lg shadow-cyan-500/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">
              Taux de conversion
            </CardTitle>
            <Percent className="h-4 w-4 text-cyan-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {revenueStats.conversionRate?.toFixed(1) || '0,0'}%
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-indigo-500/20 to-indigo-600/10 backdrop-blur-sm border border-indigo-500/30 shadow-lg shadow-indigo-500/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">
              Recherches IA (mois)
            </CardTitle>
            <Search className="h-4 w-4 text-indigo-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{searchStats.thisMonth || 0}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-500/20 to-red-600/10 backdrop-blur-sm border border-red-500/30 shadow-lg shadow-red-500/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">
              Alertes système
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-red-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{alertsStats.count || 0}</div>
            {alertsStats.failedTransactionsLast24h > 0 && (
              <p className="text-xs text-red-400 mt-1">
                {alertsStats.failedTransactionsLast24h} paiements échoués (24h)
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Évolution utilisateurs */}
        <Card className="bg-gradient-to-br from-blue-500/20 to-purple-600/10 backdrop-blur-sm border border-blue-500/30 shadow-lg shadow-blue-500/10">
          <CardHeader>
            <CardTitle className="text-white">Évolution des utilisateurs (30 jours)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={evolutionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="date" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: '1px solid #374151',
                    color: '#FFFFFF',
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="Utilisateurs"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  dot={{ fill: '#3B82F6' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Répartition par plan */}
        <Card className="bg-gradient-to-br from-purple-500/20 to-blue-600/10 backdrop-blur-sm border border-purple-500/30 shadow-lg shadow-purple-500/10">
          <CardHeader>
            <CardTitle className="text-white">Répartition par plan</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={distributionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="name" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: '1px solid #374151',
                    color: '#FFFFFF',
                  }}
                />
                <Legend />
                <Bar dataKey="value" fill="#10B981" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 - Nouveaux graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenu par jour */}
        <Card className="bg-gradient-to-br from-emerald-500/20 to-teal-600/10 backdrop-blur-sm border border-emerald-500/30 shadow-lg shadow-emerald-500/10">
          <CardHeader>
            <CardTitle className="text-white">Revenu par jour (30 jours)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={revenueByDayData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="date" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: '1px solid #374151',
                    color: '#FFFFFF',
                  }}
                  formatter={(value: number) => `${value.toFixed(2)} €`}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="Revenu"
                  stroke="#10B981"
                  fillOpacity={1}
                  fill="url(#colorRevenue)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Répartition recherches IA */}
        <Card className="bg-gradient-to-br from-indigo-500/20 to-violet-600/10 backdrop-blur-sm border border-indigo-500/30 shadow-lg shadow-indigo-500/10">
          <CardHeader>
            <CardTitle className="text-white">Répartition recherches IA</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={searchDistributionData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {searchDistributionData.map((entry: any, index: number) => {
                    const COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B']
                    return <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  })}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: '1px solid #374151',
                    color: '#FFFFFF',
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

