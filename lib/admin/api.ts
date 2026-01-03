/**
 * Helpers pour les appels API admin
 */

import { getSupabaseBrowserClient } from '@/lib/supabase/browser'

/**
 * Récupère le token d'authentification
 */
async function getAuthToken(): Promise<string | null> {
  const supabase = getSupabaseBrowserClient()
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token || null
}

/**
 * Appel API générique avec authentification
 */
async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getAuthToken()
  
  if (!token) {
    throw new Error('Not authenticated')
  }

  const response = await fetch(endpoint, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(error.error || `HTTP error! status: ${response.status}`)
  }

  return response.json()
}

export const adminApi = {
  // Stats
  getStats: () => apiCall<any>('/api/admin/stats'),

  // Users
  getUsers: (params?: { search?: string; page?: number; limit?: number }) => {
    const queryParams = new URLSearchParams()
    if (params?.search) queryParams.set('search', params.search)
    if (params?.page) queryParams.set('page', params.page.toString())
    if (params?.limit) queryParams.set('limit', params.limit.toString())
    return apiCall<any>(`/api/admin/users?${queryParams.toString()}`)
  },

  getUserDetails: (userId: string) => 
    apiCall<any>(`/api/admin/user/${userId}`),

  toggleVIP: (userId: string) =>
    apiCall<any>('/api/admin/users', {
      method: 'PATCH',
      body: JSON.stringify({ userId }),
    }),

  // Subscriptions
  getSubscriptions: (params?: { page?: number; limit?: number }) => {
    const queryParams = new URLSearchParams()
    if (params?.page) queryParams.set('page', params.page.toString())
    if (params?.limit) queryParams.set('limit', params.limit.toString())
    return apiCall<any>(`/api/admin/subscriptions?${queryParams.toString()}`)
  },

  // Transactions
  getTransactions: (params?: {
    page?: number
    limit?: number
    status?: string
    startDate?: string
    endDate?: string
  }) => {
    const queryParams = new URLSearchParams()
    if (params?.page) queryParams.set('page', params.page.toString())
    if (params?.limit) queryParams.set('limit', params.limit.toString())
    if (params?.status) queryParams.set('status', params.status)
    if (params?.startDate) queryParams.set('startDate', params.startDate)
    if (params?.endDate) queryParams.set('endDate', params.endDate)
    return apiCall<any>(`/api/admin/transactions?${queryParams.toString()}`)
  },

  // Calendly
  getCalendlyEvents: (params?: { status?: string; count?: number }) => {
    const queryParams = new URLSearchParams()
    if (params?.status) queryParams.set('status', params.status)
    if (params?.count) queryParams.set('count', params.count.toString())
    return apiCall<any>(`/api/admin/calendly?${queryParams.toString()}`)
  },
}

