'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { adminApi } from '@/lib/admin/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { CreditCard, TrendingUp } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

const planColors: Record<string, string> = {
  free: 'bg-gray-500/20 text-gray-400 border-gray-500/50',
  starter: 'bg-blue-500/20 text-blue-400 border-blue-500/50',
  premium: 'bg-green-500/20 text-green-400 border-green-500/50',
  enterprise: 'bg-purple-500/20 text-purple-400 border-purple-500/50',
}

export default function AdminSubscriptionsPage() {
  const [page, setPage] = useState(1)

  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => adminApi.getStats(),
  })

  const { data, isLoading } = useQuery({
    queryKey: ['admin-subscriptions', page],
    queryFn: () => adminApi.getSubscriptions({ page, limit: 50 }),
  })

  const subscriptions = data?.subscriptions || []
  const pagination = data?.pagination || { total: 0, totalPages: 1 }
  const subStats = stats?.subscriptions || {}

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Abonnements</h1>
        <p className="text-gray-400">Gestion des abonnements utilisateurs</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              Total abonnements
            </CardTitle>
            <CreditCard className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{subStats.total || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              Plan populaire
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-bold text-white capitalize">
              {subStats.mostPopularPlan || 'free'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Free</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{subStats.free || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Starter</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{subStats.starter || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Premium</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{subStats.premium || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Enterprise</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{subStats.enterprise || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-white">
            Liste des abonnements ({pagination.total})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : subscriptions.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              Aucun abonnement trouvé
            </div>
          ) : (
            <>
              <div className="rounded-md border border-gray-800 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-800">
                      <TableHead className="text-gray-400">Email</TableHead>
                      <TableHead className="text-gray-400">Plan</TableHead>
                      <TableHead className="text-gray-400">Status</TableHead>
                      <TableHead className="text-gray-400">Créé le</TableHead>
                      <TableHead className="text-gray-400">Expire le</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subscriptions.map((sub: any) => (
                      <TableRow key={sub.id} className="border-gray-800">
                        <TableCell className="text-white">{sub.email}</TableCell>
                        <TableCell>
                          <Badge className={planColors[sub.plan] || planColors.free}>
                            {sub.plan || 'free'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              sub.status === 'active' ? 'default' : 'outline'
                            }
                            className={
                              sub.status === 'active'
                                ? 'bg-green-500/20 text-green-400 border-green-500/50'
                                : 'text-gray-400'
                            }
                          >
                            {sub.status || 'inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-gray-400">
                          {sub.created_at
                            ? format(new Date(sub.created_at), 'dd/MM/yyyy', {
                                locale: fr,
                              })
                            : '-'}
                        </TableCell>
                        <TableCell className="text-gray-400">
                          {sub.expires_at
                            ? format(new Date(sub.expires_at), 'dd/MM/yyyy', {
                                locale: fr,
                              })
                            : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-gray-400">
                    Page {page} sur {pagination.totalPages}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      Précédent
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setPage((p) => Math.min(pagination.totalPages, p + 1))
                      }
                      disabled={page === pagination.totalPages}
                    >
                      Suivant
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

