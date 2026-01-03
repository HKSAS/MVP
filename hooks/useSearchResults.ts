import { useQuery } from '@tanstack/react-query'
import type { SearchResponse, ListingResponse } from '@/lib/types'

interface SearchParams {
  brand: string
  model: string
  max_price?: string
  min_price?: string
  fuelType?: string
  yearMin?: string
  yearMax?: string
  mileageMax?: string
  location?: string
  transmission?: string
  bodyType?: string
  doors?: string
  excludedSites?: string
}

export function useSearchResults(params: SearchParams) {
  return useQuery<SearchResponse & { listings?: ListingResponse[] }>({
    queryKey: ['search', params],
    queryFn: async () => {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...params,
          max_price: params.max_price ? Number(params.max_price) : undefined,
          min_price: params.min_price ? Number(params.min_price) : undefined,
          year_min: params.yearMin ? Number(params.yearMin) : undefined,
          year_max: params.yearMax ? Number(params.yearMax) : undefined,
          mileage_max: params.mileageMax ? Number(params.mileageMax) : undefined,
          excludedSites: params.excludedSites ? params.excludedSites.split(',').map(s => s.trim()) : undefined,
          page: 1,
          limit: 50,
        }),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.error || error.message || 'Erreur lors de la recherche')
      }

      return response.json()
    },
    enabled: !!(params.brand && params.model),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })
}

