'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '@/lib/admin/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer'
import { Skeleton } from '@/components/ui/skeleton'
import { Search, Star, Eye } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

export default function AdminUsersPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', search, page],
    queryFn: () => adminApi.getUsers({ search, page, limit: 50 }),
  })

  const { data: userDetails, isLoading: loadingDetails } = useQuery({
    queryKey: ['admin-user-details', selectedUserId],
    queryFn: () => adminApi.getUserDetails(selectedUserId!),
    enabled: !!selectedUserId,
  })

  const toggleVIPMutation = useMutation({
    mutationFn: (userId: string) => adminApi.toggleVIP(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] })
      toast.success('Statut VIP mis à jour avec succès')
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`)
    },
  })

  const handleToggleVIP = (userId: string) => {
    toggleVIPMutation.mutate(userId)
  }

  const users = data?.users || []
  const pagination = data?.pagination || { total: 0, totalPages: 1 }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Utilisateurs</h1>
        <p className="text-gray-400">Gestion des utilisateurs et statuts VIP</p>
      </div>

      {/* Search bar */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Rechercher par email..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-white">
            Liste des utilisateurs ({pagination.total})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              Aucun utilisateur trouvé
            </div>
          ) : (
            <>
              <div className="rounded-md border border-gray-800 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-800">
                      <TableHead className="text-gray-400">VIP</TableHead>
                      <TableHead className="text-gray-400">Email</TableHead>
                      <TableHead className="text-gray-400">Rôle</TableHead>
                      <TableHead className="text-gray-400">Plan</TableHead>
                      <TableHead className="text-gray-400">Status</TableHead>
                      <TableHead className="text-gray-400">Créé le</TableHead>
                      <TableHead className="text-gray-400">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user: any) => (
                      <TableRow
                        key={user.id}
                        className="border-gray-800 cursor-pointer hover:bg-gray-900/50"
                        onClick={() => setSelectedUserId(user.id)}
                      >
                        <TableCell>
                          {user.access_override ? (
                            <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/50">
                              <Star className="h-3 w-3 mr-1" />
                              VIP
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-gray-400">
                              Free
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-white">{user.email}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-gray-400">
                            {user.role || 'user'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-gray-400">
                            {user.plan || 'free'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              user.subscriptionStatus === 'active'
                                ? 'default'
                                : 'outline'
                            }
                            className={
                              user.subscriptionStatus === 'active'
                                ? 'bg-green-500/20 text-green-500 border-green-500/50'
                                : 'text-gray-400'
                            }
                          >
                            {user.subscriptionStatus || 'inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-gray-400">
                          {user.created_at
                            ? format(new Date(user.created_at), 'dd/MM/yyyy', {
                                locale: fr,
                              })
                            : '-'}
                        </TableCell>
                        <TableCell>
                          <div 
                            className="flex items-center gap-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Switch
                              checked={user.access_override === true}
                              onCheckedChange={() => handleToggleVIP(user.id)}
                              disabled={toggleVIPMutation.isPending}
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedUserId(user.id)
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
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

      {/* User Details Drawer */}
      <Drawer open={!!selectedUserId} onOpenChange={(open) => !open && setSelectedUserId(null)}>
        <DrawerContent className="bg-[#0a0a0a] border-gray-800 text-white max-h-[90vh]">
          <DrawerHeader className="border-b border-gray-800">
            <DrawerTitle className="text-white">
              Détails de l'utilisateur
            </DrawerTitle>
            <DrawerDescription className="text-gray-400">
              {userDetails?.profile?.email}
            </DrawerDescription>
          </DrawerHeader>
          <div className="overflow-y-auto p-6 space-y-6">
            {loadingDetails ? (
              <div className="space-y-4">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : userDetails ? (
              <>
                {/* Infos générales */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-white">Informations générales</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Email:</span>
                      <span className="text-white">{userDetails.profile.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">ID:</span>
                      <span className="text-white font-mono text-sm">{userDetails.profile.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Rôle:</span>
                      <span className="text-white">{userDetails.profile.role || 'user'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">VIP:</span>
                      <span className="text-white">
                        {userDetails.profile.access_override ? 'Oui' : 'Non'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Créé le:</span>
                      <span className="text-white">
                        {userDetails.profile.created_at
                          ? format(new Date(userDetails.profile.created_at), 'dd/MM/yyyy HH:mm', {
                              locale: fr,
                            })
                          : '-'}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Abonnement */}
                {userDetails.subscription && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-white">Abonnement actuel</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Plan:</span>
                        <Badge>{userDetails.subscription.plan}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Status:</span>
                        <Badge>{userDetails.subscription.status}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Recherches IA */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-white">
                      Recherches IA ({userDetails.searches?.length || 0})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {userDetails.searches?.length > 0 ? (
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {userDetails.searches.slice(0, 10).map((search: any, idx: number) => (
                          <div
                            key={idx}
                            className="p-2 bg-gray-900 rounded text-sm border border-gray-800"
                          >
                            {search.query || search.prompt || 'N/A'}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-gray-400 text-sm">Aucune recherche</div>
                    )}
                  </CardContent>
                </Card>

                {/* Analyses */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-white">
                      Analyses ({userDetails.analyses?.length || 0})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {userDetails.analyses?.length > 0 ? (
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {userDetails.analyses.slice(0, 10).map((analysis: any, idx: number) => (
                          <div
                            key={idx}
                            className="p-2 bg-gray-900 rounded text-sm border border-gray-800"
                          >
                            {analysis.vehicle_info || analysis.id}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-gray-400 text-sm">Aucune analyse</div>
                    )}
                  </CardContent>
                </Card>
              </>
            ) : null}
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  )
}

