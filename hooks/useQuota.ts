/**
 * Hook React pour gérer les quotas utilisateur
 * 
 * Usage:
 *   const { quota, loading, refetch, quotaRecherches, quotaAnalyses, isUnlimited, isAdmin } = useQuota()
 */

'use client'

import { useEffect, useState, useCallback } from 'react'
import { checkUserAccess, type AccessResult } from '@/lib/auth/access-control'

export interface UseQuotaResult {
  quota: AccessResult | null
  loading: boolean
  refetch: () => Promise<void>
  quotaRecherches: number
  quotaAnalyses: number
  isUnlimited: boolean
  isAdmin: boolean
  isVip: boolean
}

/**
 * Hook pour récupérer et gérer les quotas de l'utilisateur
 */
export function useQuota(): UseQuotaResult {
  const [quota, setQuota] = useState<AccessResult | null>(null)
  const [loading, setLoading] = useState(true)
  
  const refetch = useCallback(async () => {
    setLoading(true)
    try {
      const result = await checkUserAccess()
      setQuota(result)
    } catch (error) {
      console.error('Erreur useQuota:', error)
      setQuota({
        hasAccess: false,
        reason: 'user_not_found',
        message: 'Erreur de chargement'
      })
    } finally {
      setLoading(false)
    }
  }, [])
  
  useEffect(() => {
    refetch()
  }, [refetch])
  
  return {
    quota,
    loading,
    refetch,
    quotaRecherches: quota?.quotaRecherchesRestantes ?? 0,
    quotaAnalyses: quota?.quotaAnalysesRestantes ?? 0,
    isUnlimited: quota?.unlimited ?? false,
    isAdmin: quota?.isAdmin ?? false,
    isVip: quota?.isVip ?? false
  }
}

