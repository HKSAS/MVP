/**
 * Hook React pour vérifier l'accès utilisateur
 * 
 * Usage:
 *   'use client'
 *   import { useAccess } from '@/hooks/useAccess'
 *   
 *   function MyComponent() {
 *     const { hasAccess, loading, reason, isAdmin, isVip, unlimited } = useAccess()
 *     ...
 *   }
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { checkUserAccess, type AccessResult } from '@/lib/auth/access-control'

export interface UseAccessResult extends AccessResult {
  loading: boolean
  refetch: () => Promise<void>
}

/**
 * Hook React pour vérifier l'accès utilisateur
 * @returns État de l'accès avec loading
 */
export function useAccess(): UseAccessResult {
  const [access, setAccess] = useState<UseAccessResult>({ 
    hasAccess: false, 
    loading: true,
    reason: 'user_not_found',
    message: 'Chargement...',
    refetch: async () => {}
  })
  
  const refetch = useCallback(async () => {
    setAccess(prev => ({ ...prev, loading: true }))
    try {
      const result = await checkUserAccess()
      setAccess({ ...result, loading: false, refetch })
    } catch (error) {
      console.error('Erreur useAccess:', error)
      setAccess({
        hasAccess: false,
        loading: false,
        reason: 'user_not_found',
        message: 'Erreur de vérification',
        refetch
      })
    }
  }, [])
  
  useEffect(() => {
    refetch()
  }, [refetch])
  
  return access
}

