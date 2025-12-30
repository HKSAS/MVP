/**
 * HOC (Higher Order Component) pour protéger les actions avec vérification de quota
 * 
 * Usage:
 *   const ProtectedSearchButton = withQuotaCheck(SearchButton, 'recherche')
 */

'use client'

import { useState, useCallback } from 'react'
import { canPerformAction } from './access-control'
import { trackUsage } from './usage-tracker'
import { QuotaExceeded } from '@/components/paywall/QuotaExceeded'
import { QuotaAlert } from '@/components/paywall/QuotaAlert'

type ActionType = 'recherche' | 'analyse'

interface WithQuotaCheckOptions {
  actionType: ActionType
  onSuccess?: () => void
  onError?: (error: string) => void
}

/**
 * Wrapper pour une fonction qui nécessite un quota
 */
export function withQuotaCheck<T extends (...args: any[]) => Promise<any>>(
  action: T,
  options: WithQuotaCheckOptions
): T {
  return (async (...args: Parameters<T>) => {
    // Vérifier si l'action est possible
    const accessCheck = await canPerformAction(options.actionType)
    
    if (!accessCheck.canPerform) {
      const error = accessCheck.message || 'Quota épuisé'
      options.onError?.(error)
      throw new Error(error)
    }
    
    try {
      // Exécuter l'action
      const result = await action(...args)
      
      // Tracker l'utilisation après succès
      await trackUsage(options.actionType, {
        timestamp: new Date().toISOString(),
        ...(typeof result === 'object' ? result : {})
      })
      
      options.onSuccess?.()
      return result
    } catch (error) {
      options.onError?.(error instanceof Error ? error.message : 'Erreur inconnue')
      throw error
    }
  }) as T
}

/**
 * Hook pour gérer le quota check dans un composant
 * Mode bloquant : bloque l'action si quota épuisé et affiche un message
 */
export function useQuotaCheck(actionType: ActionType) {
  const [showAlert, setShowAlert] = useState(false)
  const [showPaywall, setShowPaywall] = useState(false)
  const [checking, setChecking] = useState(false)
  const [quotaExhausted, setQuotaExhausted] = useState(false)
  const [blockedMessage, setBlockedMessage] = useState<string | null>(null)
  
  const checkAndTrack = useCallback(async (
    action: () => Promise<any>,
    actionData?: Record<string, any>
  ) => {
    setChecking(true)
    
    try {
      // Vérifier l'accès AVANT d'exécuter l'action
      // Forcer un rafraîchissement en appelant directement la fonction SQL
      const accessCheck = await canPerformAction(actionType)
      
      // Si VIP, Admin ou Abonnement actif, permettre l'action même si reason = 'quota_exceeded'
      // (au cas où le cache serait obsolète)
      if (accessCheck.reason === 'vip' || accessCheck.reason === 'admin' || accessCheck.reason === 'subscription') {
        // Accès illimité, permettre l'action
        const result = await action()
        const trackResult = await trackUsage(actionType, actionData)
        setChecking(false)
        return { 
          success: true, 
          result, 
          remaining: undefined,
          unlimited: true
        }
      }
      
      // Si quota épuisé, BLOQUER l'action et afficher le modal
      if (!accessCheck.canPerform && accessCheck.reason === 'quota_exceeded') {
        setQuotaExhausted(true)
        setShowPaywall(true)
        setBlockedMessage(accessCheck.message || 'Quota épuisé')
        setChecking(false)
        return { 
          success: false, 
          error: accessCheck.message || 'Quota épuisé',
          quotaExhausted: true,
          showPaywall: true
        }
      }
      
      // Si l'action est permise, l'exécuter
      const result = await action()
      
      // Tracker l'utilisation après succès
      const trackResult = await trackUsage(actionType, actionData)
      
      // Si le tracking échoue (quota épuisé entre temps), bloquer
      if (!trackResult.success && trackResult.error === 'quota_exceeded') {
        setQuotaExhausted(true)
        setShowPaywall(true)
        setBlockedMessage(trackResult.message || 'Quota épuisé')
        return { 
          success: false, 
          error: trackResult.message || 'Quota épuisé',
          quotaExhausted: true,
          showPaywall: true
        }
      }
      
      setChecking(false)
      return { 
        success: true, 
        result, 
        remaining: trackResult.remaining,
        quotaExhausted: false
      }
      
    } catch (error) {
      setChecking(false)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erreur inconnue' 
      }
    }
  }, [actionType])
  
  return {
    checkAndTrack,
    showAlert,
    setShowAlert,
    quotaExhausted,
    showPaywall,
    setShowPaywall,
    checking,
    blockedMessage,
    QuotaAlertComponent: () => showAlert ? (
      <QuotaAlert 
        actionType={actionType} 
        onDismiss={() => setShowAlert(false)}
        variant="inline"
      />
    ) : null,
    PaywallModal: () => (
      <QuotaExceeded
        actionType={actionType}
        open={showPaywall}
        onClose={() => setShowPaywall(false)}
      />
    )
  }
}

