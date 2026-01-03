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
import { Skeleton } from '@/components/ui/skeleton'
import { Calendar, Clock, User, Mail } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

export default function AdminCalendarPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-calendly'],
    queryFn: () => adminApi.getCalendlyEvents({ status: 'active', count: 100 }),
    refetchInterval: 60000, // Refetch every minute
  })

  const events = data?.events || []
  const kpi = data?.kpi || { today: 0, thisWeek: 0, thisMonth: 0, total: 0 }

  // Trier les événements par date
  const sortedEvents = [...events].sort((a, b) => {
    const dateA = new Date(a.start_time).getTime()
    const dateB = new Date(b.start_time).getTime()
    return dateA - dateB
  })

  // Prochains RDV (à venir)
  const upcomingEvents = sortedEvents.filter(
    (event) => new Date(event.start_time) >= new Date()
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Calendrier</h1>
        <p className="text-gray-400">Gestion des rendez-vous Calendly</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              RDV aujourd'hui
            </CardTitle>
            <Calendar className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{kpi.today || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              Cette semaine
            </CardTitle>
            <Calendar className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{kpi.thisWeek || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              Ce mois
            </CardTitle>
            <Calendar className="h-4 w-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{kpi.thisMonth || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Total</CardTitle>
            <Calendar className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{kpi.total || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Prochains RDV en évidence */}
      {upcomingEvents.length > 0 && (
        <Card className="border-blue-500/50">
          <CardHeader>
            <CardTitle className="text-white">
              Prochains rendez-vous ({upcomingEvents.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {upcomingEvents.slice(0, 5).map((event: any) => {
                const eventDate = new Date(event.start_time)
                const invitee = event.invitees?.[0]

                return (
                  <div
                    key={event.uri}
                    className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Clock className="h-4 w-4 text-blue-400" />
                          <span className="text-white font-semibold">
                            {format(eventDate, 'dd MMMM yyyy à HH:mm', { locale: fr })}
                          </span>
                        </div>
                        {invitee && (
                          <div className="space-y-1 text-sm text-gray-300">
                            {invitee.name && (
                              <div className="flex items-center gap-2">
                                <User className="h-3 w-3" />
                                <span>{invitee.name}</span>
                              </div>
                            )}
                            {invitee.email && (
                              <div className="flex items-center gap-2">
                                <Mail className="h-3 w-3" />
                                <span>{invitee.email}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/50">
                        {event.event_type?.name || 'RDV'}
                      </Badge>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Table complète */}
      <Card>
        <CardHeader>
          <CardTitle className="text-white">
            Tous les rendez-vous ({events.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              Aucun rendez-vous trouvé
            </div>
          ) : (
            <div className="rounded-md border border-gray-800 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-800">
                    <TableHead className="text-gray-400">Date</TableHead>
                    <TableHead className="text-gray-400">Heure</TableHead>
                    <TableHead className="text-gray-400">Nom client</TableHead>
                    <TableHead className="text-gray-400">Email</TableHead>
                    <TableHead className="text-gray-400">Type</TableHead>
                    <TableHead className="text-gray-400">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedEvents.map((event: any) => {
                    const eventDate = new Date(event.start_time)
                    const invitee = event.invitees?.[0]
                    const isUpcoming = eventDate >= new Date()

                    return (
                      <TableRow
                        key={event.uri}
                        className={`border-gray-800 ${
                          isUpcoming ? 'bg-blue-500/5' : ''
                        }`}
                      >
                        <TableCell className="text-white">
                          {format(eventDate, 'dd/MM/yyyy', { locale: fr })}
                        </TableCell>
                        <TableCell className="text-white">
                          {format(eventDate, 'HH:mm', { locale: fr })}
                        </TableCell>
                        <TableCell className="text-white">
                          {invitee?.name || '-'}
                        </TableCell>
                        <TableCell className="text-white">
                          {invitee?.email || '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-gray-400">
                            {event.event_type?.name || 'RDV'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              isUpcoming
                                ? 'bg-green-500/20 text-green-400 border-green-500/50'
                                : 'bg-gray-500/20 text-gray-400 border-gray-500/50'
                            }
                          >
                            {isUpcoming ? 'À venir' : 'Passé'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

