/**
 * Utilitaires de parsing robuste pour valeurs françaises
 * Gère les espaces insécables, formats français, etc.
 */

/**
 * Convertit une chaîne française en nombre
 * Supprime espaces, espaces insécables, symboles monétaires, etc.
 * Gère correctement les formats français : "139 000", "139000", "139,000"
 */
export function toNumberFR(str: string | null | undefined): number | null {
  if (!str) return null
  
  // Convertir en string si nécessaire
  let cleaned = String(str).trim()
  
  if (!cleaned) return null
  
  // Supprimer espaces insécables (\u00A0, \u202F, \u2009)
  cleaned = cleaned.replace(/[\u00A0\u202F\u2009]/g, ' ')
  
  // IMPORTANT : Pour les kilométrages français, les espaces sont des séparateurs de milliers
  // Exemple : "98 000 km" doit devenir "98000", pas "98"
  // CRITIQUE : parseFloat("98 000") retourne 98 car il s'arrête au premier espace
  // On DOIT supprimer TOUS les espaces AVANT d'appeler parseFloat
  
  // Supprimer symboles monétaires et unités d'abord (pour éviter confusion)
  cleaned = cleaned.replace(/[€$£]/g, '')
  cleaned = cleaned.replace(/km|KM|kilomètres|kilomètre/gi, '')
  cleaned = cleaned.replace(/miles|mi/gi, '')
  
  // CRITIQUE : Supprimer TOUS les espaces AVANT toute autre opération
  // Cela garantit que "98 000" devient "98000" et non "98"
  cleaned = cleaned.replace(/\s+/g, '')
  
  // Supprimer autres caractères non numériques sauf point/virgule
  cleaned = cleaned.replace(/[^\d,.-]/g, '')
  
  // Gérer virgule comme séparateur décimal (format FR)
  // Mais attention : "139,000" pourrait être 139000 (format US) ou 139.000 (format FR)
  // En français, on utilise l'espace pour les milliers, donc une virgule seule = décimal
  // Si on a un point ET une virgule, le dernier est le séparateur décimal
  if (cleaned.includes('.') && cleaned.includes(',')) {
    // Format mixte : garder le dernier comme décimal
    if (cleaned.lastIndexOf('.') > cleaned.lastIndexOf(',')) {
      cleaned = cleaned.replace(/,/g, '') // Virgule = milliers
    } else {
      cleaned = cleaned.replace(/\./g, '') // Point = milliers
      cleaned = cleaned.replace(',', '.') // Virgule = décimal
    }
  } else if (cleaned.includes(',')) {
    // Seulement une virgule : vérifier si c'est décimal ou milliers
    // Si après la virgule il y a 3 chiffres, c'est probablement des milliers (format US)
    const commaIndex = cleaned.indexOf(',')
    const afterComma = cleaned.substring(commaIndex + 1)
    if (afterComma.length === 3 && /^\d{3}$/.test(afterComma)) {
      // Format milliers US : "139,000" -> "139000"
      cleaned = cleaned.replace(',', '')
    } else {
      // Format décimal FR : "139,5" -> "139.5"
      cleaned = cleaned.replace(',', '.')
    }
  } else if (cleaned.includes('.')) {
    // Seulement un point : vérifier si c'est décimal ou milliers
    const dotIndex = cleaned.indexOf('.')
    const afterDot = cleaned.substring(dotIndex + 1)
    if (afterDot.length === 3 && /^\d{3}$/.test(afterDot)) {
      // Format milliers FR : "139.000" -> "139000" (mais en FR on utilise l'espace)
      // Donc c'est probablement un format décimal US
      // On garde tel quel
    }
  }
  
  // Parser en nombre
  // À ce stade, tous les espaces ont été supprimés, donc parseFloat devrait fonctionner
  // Mais pour être sûr, on peut aussi utiliser une méthode plus robuste
  let num: number | null = null
  
  // Méthode 1 : parseFloat (devrait fonctionner maintenant que les espaces sont supprimés)
  num = parseFloat(cleaned)
  
  // Vérification de sécurité : si la chaîne originale contenait des espaces
  // et que le résultat semble trop petit, réessayer avec une méthode plus robuste
  const originalStr = String(str || '')
  const originalHadSpaces = /\s/.test(originalStr)
  
  if (originalHadSpaces && (isNaN(num) || num < 1000)) {
    // Méthode 2 : Extraire TOUS les chiffres et les concaténer
    const digitsOnly = originalStr.replace(/[^\d]/g, '')
    if (digitsOnly.length > 0) {
      const retryNum = parseFloat(digitsOnly)
      if (!isNaN(retryNum) && retryNum > (num || 0)) {
        console.warn('[toNumberFR] Correction parsing détectée:', {
          original: str,
          firstAttempt: num,
          corrected: retryNum,
          reason: 'Espaces détectés dans original, résultat trop faible',
        })
        num = retryNum
      }
    }
  }
  
  if (isNaN(num) || num === null) return null
  
  return num
}

/**
 * Parse un prix en euros depuis une chaîne française
 * Exemples: "8 000 €", "8 000€", "8000€", "8,000 €"
 */
export function parsePriceEUR(str: string | null | undefined): number | null {
  const num = toNumberFR(str)
  return num !== null ? Math.round(num) : null
}

/**
 * Parse un kilométrage en km depuis une chaîne française
 * Exemples: "216 515 km", "216515 km", "216 515km"
 */
export function parseMileageKM(str: string | null | undefined): number | null {
  const num = toNumberFR(str)
  return num !== null ? Math.round(num) : null
}

/**
 * Parse une année depuis une chaîne
 * Exemples: "2016", "année 2016", "2016"
 */
export function parseYear(str: string | null | undefined): number | null {
  if (!str) return null
  
  // Extraire année (4 chiffres entre 1990 et année actuelle + 1)
  const yearMatch = String(str).match(/\b(19[9]\d|20[0-3]\d)\b/)
  
  if (yearMatch) {
    const year = parseInt(yearMatch[1], 10)
    const currentYear = new Date().getFullYear()
    if (year >= 1990 && year <= currentYear + 1) {
      return year
    }
  }
  
  return null
}

/**
 * Parse un type de carburant depuis une chaîne
 */
export function parseFuel(str: string | null | undefined): string | null {
  if (!str) return null
  
  const lower = String(str).toLowerCase()
  
  if (lower.includes('essence') || lower.includes('sp95') || lower.includes('sp98')) {
    return 'essence'
  }
  if (lower.includes('diesel') || lower.includes('gazole')) {
    return 'diesel'
  }
  if (lower.includes('électrique') || lower.includes('electrique') || lower.includes('ev')) {
    return 'electrique'
  }
  if (lower.includes('hybride')) {
    return 'hybride'
  }
  if (lower.includes('gpl')) {
    return 'gpl'
  }
  
  return null
}

/**
 * Parse un type de transmission depuis une chaîne
 */
export function parseTransmission(str: string | null | undefined): string | null {
  if (!str) return null
  
  const lower = String(str).toLowerCase()
  
  if (lower.includes('automatique') || lower.includes('auto') || lower.includes('dsg') || lower.includes('s-tronic') || lower.includes('edc')) {
    return 'automatique'
  }
  if (lower.includes('manuelle') || lower.includes('manuel') || lower.includes('man')) {
    return 'manuelle'
  }
  
  return null
}

/**
 * Détecte si une description mentionne un historique d'entretien
 */
export function hasMaintenanceHistory(description: string | null | undefined): boolean {
  if (!description) return false
  
  const lower = String(description).toLowerCase()
  
  // Mots-clés indiquant un historique d'entretien
  const keywords = [
    'carnet d\'entretien',
    'carnet entretien',
    'factures',
    'facture',
    'historique',
    'entretien suivi',
    'entretien régulier',
    'entretien chez',
    'révision',
    'révisions',
    'vidange',
    'vidanges',
    'contrôle technique',
    'maintenance',
  ]
  
  return keywords.some(keyword => lower.includes(keyword))
}

/**
 * Formate un nombre en format français avec espaces
 */
export function formatNumberFR(num: number | null | undefined): string {
  if (num === null || num === undefined) return 'N/A'
  return Math.round(num).toLocaleString('fr-FR')
}

/**
 * Formate un prix en euros (format français)
 */
export function formatPriceEUR(num: number | null | undefined): string {
  if (num === null || num === undefined) return 'N/A'
  return `${formatNumberFR(num)} €`
}

