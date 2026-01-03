'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useState } from 'react'

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Cache pendant 5 minutes
            staleTime: 5 * 60 * 1000,
            // Garde en cache pendant 10 minutes
            gcTime: 10 * 60 * 1000,
            // Retry 2 fois en cas d'erreur
            retry: 2,
            // Refetch on window focus désactivé pour éviter trop de requêtes
            refetchOnWindowFocus: false,
            // Refetch on reconnect activé
            refetchOnReconnect: true,
          },
          mutations: {
            // Retry 1 fois pour les mutations
            retry: 1,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  )
}

