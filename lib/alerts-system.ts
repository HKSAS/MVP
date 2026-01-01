/**
 * 🔔 SYSTÈME D'ALERTES EN TEMPS RÉEL
 * Notifie les utilisateurs des nouvelles annonces correspondant à leurs critères
 */

import { createClient } from '@supabase/supabase-js'
import type { ListingResponse } from './types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export interface AlertCriteria {
  userId: string
  brand?: string
  model?: string
  maxPrice?: number
  minPrice?: number
  yearMin?: number
  yearMax?: number
  mileageMax?: number
  fuelType?: string
  location?: string
  radiusKm?: number
  isActive: boolean
}

export interface AlertMatch {
  alertId: string
  listing: ListingResponse
  matchScore: number
  matchReasons: string[]
}

/**
 * Crée une alerte pour un utilisateur
 */
export async function createAlert(
  userId: string,
  criteria: Omit<AlertCriteria, 'userId' | 'isActive'>
): Promise<string | null> {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { data, error } = await supabase
      .from('user_alerts')
      .insert({
        user_id: userId,
        criteria_json: criteria,
        is_active: true,
        created_at: new Date().toISOString(),
        last_checked_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error('Erreur création alerte:', error)
      return null
    }

    return data.id
  } catch (error) {
    console.error('Erreur création alerte:', error)
    return null
  }
}

/**
 * Vérifie si une annonce correspond à une alerte
 */
export function checkListingMatchesAlert(
  listing: ListingResponse,
  criteria: AlertCriteria
): { matches: boolean; score: number; reasons: string[] } {
  let score = 0
  const reasons: string[] = []

  // Marque
  if (criteria.brand) {
    const titleLower = (listing.title || '').toLowerCase()
    const brandLower = criteria.brand.toLowerCase()
    if (titleLower.includes(brandLower)) {
      score += 30
      reasons.push(`Marque: ${criteria.brand}`)
    } else {
      return { matches: false, score: 0, reasons: [] }
    }
  }

  // Modèle
  if (criteria.model) {
    const titleLower = (listing.title || '').toLowerCase()
    const modelLower = criteria.model.toLowerCase()
    if (titleLower.includes(modelLower)) {
      score += 20
      reasons.push(`Modèle: ${criteria.model}`)
    }
  }

  // Prix
  if (listing.price_eur) {
    if (criteria.maxPrice && listing.price_eur <= criteria.maxPrice) {
      score += 20
      reasons.push(`Prix: ${listing.price_eur.toLocaleString('fr-FR')} €`)
    } else if (criteria.maxPrice) {
      return { matches: false, score: 0, reasons: [] }
    }

    if (criteria.minPrice && listing.price_eur >= criteria.minPrice) {
      score += 10
    } else if (criteria.minPrice) {
      return { matches: false, score: 0, reasons: [] }
    }
  }

  // Année
  if (listing.year) {
    if (criteria.yearMin && listing.year >= criteria.yearMin) {
      score += 10
      reasons.push(`Année: ${listing.year}`)
    } else if (criteria.yearMin) {
      return { matches: false, score: 0, reasons: [] }
    }

    if (criteria.yearMax && listing.year <= criteria.yearMax) {
      score += 5
    } else if (criteria.yearMax) {
      return { matches: false, score: 0, reasons: [] }
    }
  }

  // Kilométrage
  if (listing.mileage_km) {
    if (criteria.mileageMax && listing.mileage_km <= criteria.mileageMax) {
      score += 10
      reasons.push(`Kilométrage: ${listing.mileage_km.toLocaleString('fr-FR')} km`)
    } else if (criteria.mileageMax) {
      return { matches: false, score: 0, reasons: [] }
    }
  }

  // Score minimum (bonus)
  if (listing.score_final && listing.score_final >= 70) {
    score += 5
    reasons.push('Excellent score IA')
  }

  return {
    matches: score >= 30, // Minimum 30 points pour matcher
    score,
    reasons,
  }
}

/**
 * Vérifie toutes les alertes actives contre une nouvelle annonce
 */
export async function checkAlertsForListing(
  listing: ListingResponse
): Promise<AlertMatch[]> {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Récupérer toutes les alertes actives
    const { data: alerts, error } = await supabase
      .from('user_alerts')
      .select('*')
      .eq('is_active', true)

    if (error || !alerts) {
      console.error('Erreur récupération alertes:', error)
      return []
    }

    const matches: AlertMatch[] = []

    for (const alert of alerts) {
      const criteria: AlertCriteria = {
        userId: alert.user_id,
        ...alert.criteria_json,
        isActive: alert.is_active,
      }

      const { matches: doesMatch, score, reasons } = checkListingMatchesAlert(listing, criteria)

      if (doesMatch) {
        matches.push({
          alertId: alert.id,
          listing,
          matchScore: score,
          matchReasons: reasons,
        })

        // Mettre à jour last_checked_at
        await supabase
          .from('user_alerts')
          .update({ last_checked_at: new Date().toISOString() })
          .eq('id', alert.id)
      }
    }

    return matches
  } catch (error) {
    console.error('Erreur vérification alertes:', error)
    return []
  }
}

/**
 * Envoie une notification pour une alerte matchée
 * (À implémenter avec votre système de notifications: email, push, etc.)
 */
export async function sendAlertNotification(
  userId: string,
  match: AlertMatch
): Promise<boolean> {
  try {
    // TODO: Implémenter l'envoi de notification
    // Options:
    // 1. Email (via Resend, SendGrid, etc.)
    // 2. Push notification (via Firebase, OneSignal, etc.)
    // 3. Notification in-app (via Supabase Realtime)

    console.log(`[ALERT] Nouvelle annonce pour utilisateur ${userId}:`, {
      listing: match.listing.title,
      score: match.matchScore,
      reasons: match.matchReasons,
    })

    // Exemple: Enregistrer dans une table de notifications
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    await supabase.from('user_notifications').insert({
      user_id: userId,
      type: 'alert_match',
      title: `Nouvelle annonce: ${match.listing.title}`,
      message: `Annonce correspondant à vos critères: ${match.matchReasons.join(', ')}`,
      data: {
        listing_id: match.listing.id,
        listing_url: match.listing.url,
        match_score: match.matchScore,
      },
      read: false,
      created_at: new Date().toISOString(),
    })

    return true
  } catch (error) {
    console.error('Erreur envoi notification:', error)
    return false
  }
}

/**
 * Désactive une alerte
 */
export async function deactivateAlert(alertId: string, userId: string): Promise<boolean> {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { error } = await supabase
      .from('user_alerts')
      .update({ is_active: false })
      .eq('id', alertId)
      .eq('user_id', userId)

    return !error
  } catch (error) {
    console.error('Erreur désactivation alerte:', error)
    return false
  }
}

/**
 * Récupère les alertes d'un utilisateur
 */
export async function getUserAlerts(userId: string): Promise<AlertCriteria[]> {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { data, error } = await supabase
      .from('user_alerts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error || !data) {
      console.error('Erreur récupération alertes:', error)
      return []
    }

    return data.map(alert => ({
      userId: alert.user_id,
      ...alert.criteria_json,
      isActive: alert.is_active,
    }))
  } catch (error) {
    console.error('Erreur récupération alertes:', error)
    return []
  }
}

