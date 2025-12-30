/**
 * Vérification des quotas utilisateur
 * 
 * Fonctions utilitaires pour vérifier les quotas sans appeler les fonctions SQL complètes
 */

import { checkUserAccess } from './access-control'
import { canPerformAction } from './access-control'

/**
 * Récupère les quotas actuels de l'utilisateur
 */
export async function getQuotas(userId?: string) {
  const access = await checkUserAccess(userId)
  
  return {
    unlimited: access.unlimited || false,
    isAdmin: access.isAdmin || false,
    isVip: access.isVip || false,
    quotaRecherches: access.quotaRecherchesRestantes ?? 0,
    quotaAnalyses: access.quotaAnalysesRestantes ?? 0,
    reason: access.reason,
    message: access.message
  }
}

/**
 * Vérifie rapidement si l'utilisateur peut faire une recherche
 */
export async function canSearch(userId?: string): Promise<boolean> {
  const result = await canPerformAction('recherche', userId)
  return result.canPerform
}

/**
 * Vérifie rapidement si l'utilisateur peut faire une analyse
 */
export async function canAnalyze(userId?: string): Promise<boolean> {
  const result = await canPerformAction('analyse', userId)
  return result.canPerform
}

/**
 * Récupère le nombre de recherches restantes
 */
export async function getRemainingSearches(userId?: string): Promise<number | null> {
  const result = await canPerformAction('recherche', userId)
  if (result.unlimited) return null // null = illimité
  return result.remaining ?? 0
}

/**
 * Récupère le nombre d'analyses restantes
 */
export async function getRemainingAnalyses(userId?: string): Promise<number | null> {
  const result = await canPerformAction('analyse', userId)
  if (result.unlimited) return null // null = illimité
  return result.remaining ?? 0
}

