/**
 * 🛡️ SYSTÈME DE DÉTECTION DE FRAUDES AVANCÉ
 * Détection d'arnaques, annonces suspectes, et incohérences
 */

export interface FraudDetectionResult {
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  fraudScore: number // 0-100, plus élevé = plus risqué
  redFlags: FraudRedFlag[]
  suspiciousPatterns: string[]
  recommendations: string[]
}

export interface FraudRedFlag {
  type: FraudFlagType
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  description: string
  evidence: string[]
  confidence: 'low' | 'medium' | 'high'
}

export type FraudFlagType =
  | 'price_too_low'
  | 'price_too_high'
  | 'mileage_tampering'
  | 'suspicious_description'
  | 'seller_suspicious'
  | 'photo_anomaly'
  | 'duplicate_listing'
  | 'location_inconsistent'
  | 'contact_suspicious'
  | 'payment_method_suspicious'
  | 'urgency_pressure'
  | 'incomplete_information'
  | 'vice_cache_detected'

interface FraudDetectionInput {
  title?: string
  description?: string
  price_eur?: number
  marketMin?: number
  marketMax?: number
  mileage_km?: number
  year?: number
  location?: string
  contactInfo?: string
  photos_count?: number
  url?: string
  source?: string
  hasHistory?: boolean
}

/**
 * Mots-clés suspects dans les descriptions (arnaque classique)
 */
const SUSPICIOUS_KEYWORDS = {
  critical: [
    'virement immédiat',
    'paiement avant livraison',
    'pas de visite possible',
    'véhicule à l\'étranger',
    'départ urgent',
    'déménagement urgent',
    'divorce',
    'héritage',
    'décès',
    'cash uniquement',
    'pas de chèque',
    'virement bancaire uniquement',
  ],
  high: [
    'urgent',
    'rapide',
    'immédiat',
    'départ',
    'déménagement',
    'étranger',
    'virement',
    'cash',
    'pas de visite',
    'livraison possible',
    'garantie constructeur',
    'jamais accidenté',
  ],
  medium: [
    'occasion unique',
    'prix cassé',
    'braderie',
    'liquidation',
    'fin de série',
    'déstockage',
  ],
}

/**
 * Patterns de contact suspects
 */
const SUSPICIOUS_CONTACT_PATTERNS = [
  /^\+33[0-9]{9}$/, // Numéro étranger formaté
  /^00[0-9]{10,}$/, // Numéro international
  /gmail\.com/i, // Email générique (moins fiable)
  /yahoo\.fr/i,
  /hotmail\.(com|fr)/i,
]

/**
 * Détecte les fraudes et arnaques dans une annonce
 */
export function detectFraud(input: FraudDetectionInput): FraudDetectionResult {
  const redFlags: FraudRedFlag[] = []
  const suspiciousPatterns: string[] = []
  let fraudScore = 0

  const title = (input.title || '').toLowerCase()
  const description = (input.description || '').toLowerCase()
  const fullText = `${title} ${description}`.toLowerCase()

  // 1. DÉTECTION PRIX SUSPECT
  if (input.price_eur && input.marketMin) {
    const priceRatio = input.price_eur / input.marketMin
    if (priceRatio < 0.6) {
      // Prix < 60% du marché = très suspect
      redFlags.push({
        type: 'price_too_low',
        severity: 'critical',
        title: 'Prix anormalement bas',
        description: `Le prix (${input.price_eur.toLocaleString('fr-FR')} €) est ${Math.round((1 - priceRatio) * 100)}% en-dessous du marché estimé. Risque d'arnaque ou vice caché majeur.`,
        evidence: [
          `Prix annoncé: ${input.price_eur.toLocaleString('fr-FR')} €`,
          `Prix marché estimé: ${input.marketMin.toLocaleString('fr-FR')} €`,
          `Écart: ${Math.round((input.marketMin - input.price_eur))} €`,
        ],
        confidence: 'high',
      })
      fraudScore += 40
      suspiciousPatterns.push('prix_anormalement_bas')
    } else if (priceRatio < 0.75) {
      redFlags.push({
        type: 'price_too_low',
        severity: 'high',
        title: 'Prix suspect',
        description: `Le prix est significativement en-dessous du marché. Vérification impérative.`,
        evidence: [
          `Prix annoncé: ${input.price_eur.toLocaleString('fr-FR')} €`,
          `Prix marché estimé: ${input.marketMin.toLocaleString('fr-FR')} €`,
        ],
        confidence: 'medium',
      })
      fraudScore += 25
    }
  }

  // 2. DÉTECTION MOTS-CLÉS SUSPECTS
  for (const [severity, keywords] of Object.entries(SUSPICIOUS_KEYWORDS)) {
    for (const keyword of keywords) {
      if (fullText.includes(keyword.toLowerCase())) {
        const severityLevel = severity as 'critical' | 'high' | 'medium'
        redFlags.push({
          type: 'suspicious_description',
          severity: severityLevel,
          title: `Mots-clés suspects détectés: "${keyword}"`,
          description: `L'annonce contient des mots-clés typiques d'arnaques: "${keyword}". Prudence extrême.`,
          evidence: [`Mot-clé suspect: "${keyword}"`, `Contexte: ${fullText.substring(Math.max(0, fullText.indexOf(keyword) - 50), fullText.indexOf(keyword) + 100)}`],
          confidence: severityLevel === 'critical' ? 'high' : 'medium',
        })
        fraudScore += severityLevel === 'critical' ? 30 : severityLevel === 'high' ? 20 : 10
        suspiciousPatterns.push(`keyword_${keyword.replace(/\s+/g, '_')}`)
      }
    }
  }

  // 3. DÉTECTION PRESSION URGENCE
  const urgencyPatterns = [
    /urgent/i,
    /rapide/i,
    /immédiat/i,
    /départ/i,
    /déménagement/i,
    /dernière chance/i,
    /derniers jours/i,
  ]
  const urgencyCount = urgencyPatterns.filter(p => p.test(fullText)).length
  if (urgencyCount >= 2) {
    redFlags.push({
      type: 'urgency_pressure',
      severity: 'high',
      title: 'Pression d\'urgence suspecte',
      description: 'L\'annonce utilise plusieurs mots d\'urgence. Technique classique d\'arnaque pour forcer une décision rapide.',
      evidence: [`${urgencyCount} mots d'urgence détectés`],
      confidence: 'medium',
    })
    fraudScore += 20
    suspiciousPatterns.push('pression_urgence')
  }

  // 4. DÉTECTION CONTACT SUSPECT
  if (input.contactInfo) {
    for (const pattern of SUSPICIOUS_CONTACT_PATTERNS) {
      if (pattern.test(input.contactInfo)) {
        redFlags.push({
          type: 'contact_suspicious',
          severity: 'medium',
          title: 'Contact suspect',
          description: 'Le contact utilise un format suspect (email générique, numéro étranger, etc.).',
          evidence: [`Contact: ${input.contactInfo}`],
          confidence: 'low',
        })
        fraudScore += 10
        suspiciousPatterns.push('contact_suspect')
        break
      }
    }
  }

  // 5. DÉTECTION MÉTHODE DE PAIEMENT SUSPECTE
  const suspiciousPaymentPatterns = [
    /virement.*immédiat/i,
    /paiement.*avant.*livraison/i,
    /cash.*uniquement/i,
    /pas.*de.*chèque/i,
    /virement.*bancaire.*uniquement/i,
  ]
  for (const pattern of suspiciousPaymentPatterns) {
    if (pattern.test(fullText)) {
      redFlags.push({
        type: 'payment_method_suspicious',
        severity: 'critical',
        title: 'Méthode de paiement suspecte',
        description: 'L\'annonce impose une méthode de paiement suspecte (virement avant livraison, cash uniquement, etc.). Arnaque classique.',
        evidence: [`Pattern détecté: ${pattern}`],
        confidence: 'high',
      })
      fraudScore += 35
      suspiciousPatterns.push('paiement_suspect')
      break
    }
  }

  // 6. DÉTECTION INFORMATIONS INCOMPLÈTES
  const missingInfo: string[] = []
  if (!input.price_eur) missingInfo.push('prix')
  if (!input.mileage_km) missingInfo.push('kilométrage')
  if (!input.year) missingInfo.push('année')
  if (!input.location) missingInfo.push('localisation')
  if (!input.photos_count || input.photos_count === 0) missingInfo.push('photos')
  if (!input.description || input.description.length < 100) missingInfo.push('description détaillée')

  if (missingInfo.length >= 3) {
    redFlags.push({
      type: 'incomplete_information',
      severity: 'high',
      title: 'Informations manquantes',
      description: `L'annonce manque de ${missingInfo.length} informations essentielles. Annonce suspecte ou peu sérieuse.`,
      evidence: [`Informations manquantes: ${missingInfo.join(', ')}`],
      confidence: 'medium',
    })
    fraudScore += 15
    suspiciousPatterns.push('informations_incompletes')
  }

  // 7. DÉTECTION KILOMÉTRAGE TRAFIQUÉ
  if (input.mileage_km && input.year) {
    const currentYear = new Date().getFullYear()
    const age = currentYear - input.year
    const avgYearlyKm = input.mileage_km / Math.max(1, age)

    // Kilométrage anormalement faible (< 1000 km/an sur véhicule > 3 ans)
    if (input.mileage_km < 1000 && age >= 3) {
      redFlags.push({
        type: 'mileage_tampering',
        severity: 'critical',
        title: 'Kilométrage probablement trafiqué',
        description: `Kilométrage (${input.mileage_km} km) anormalement faible pour un véhicule de ${age} ans. Probable trafic du compteur.`,
        evidence: [
          `Kilométrage: ${input.mileage_km} km`,
          `Âge: ${age} ans`,
          `Moyenne: ${Math.round(avgYearlyKm)} km/an (normal: 10-20k km/an)`,
        ],
        confidence: 'high',
      })
      fraudScore += 40
      suspiciousPatterns.push('kilometrage_trafique')
    }
  }

  // 8. DÉTECTION VENDEUR SUSPECT (mots-clés)
  const sellerKeywords = ['concession', 'garage', 'professionnel', 'pro']
  const isProSeller = sellerKeywords.some(kw => fullText.includes(kw))
  if (isProSeller && !input.hasHistory) {
    redFlags.push({
      type: 'seller_suspicious',
      severity: 'medium',
      title: 'Vendeur pro sans historique',
      description: 'Vendeur professionnel sans historique d\'entretien. Inhabituel.',
      evidence: ['Vendeur professionnel détecté', 'Historique d\'entretien absent'],
      confidence: 'low',
    })
    fraudScore += 10
  }

  // 9. DÉTECTION LOCALISATION INCOHÉRENTE
  if (input.location && input.url) {
    // Si URL contient une localisation différente de celle mentionnée
    const urlLocation = input.url.match(/(paris|lyon|marseille|toulouse|nice|nantes|strasbourg|montpellier|bordeaux|rennes)/i)
    if (urlLocation && !input.location.toLowerCase().includes(urlLocation[0].toLowerCase())) {
      redFlags.push({
        type: 'location_inconsistent',
        severity: 'medium',
        title: 'Localisation incohérente',
        description: `Localisation mentionnée (${input.location}) différente de celle dans l'URL (${urlLocation[0]}).`,
        evidence: [`Localisation annonce: ${input.location}`, `Localisation URL: ${urlLocation[0]}`],
        confidence: 'low',
      })
      fraudScore += 10
      suspiciousPatterns.push('localisation_incoherente')
    }
  }

  // 10. DÉTECTION VICE CACHÉ (mots-clés dans description)
  const viceCacheKeywords = [
    'accident',
    'choc',
    'carrosserie',
    'réparation',
    'casse',
    'panne',
    'problème',
    'défaut',
    'vice',
    'sinistre',
  ]
  const viceCount = viceCacheKeywords.filter(kw => fullText.includes(kw)).length
  if (viceCount >= 3 && !fullText.includes('jamais accidenté') && !fullText.includes('aucun sinistre')) {
    redFlags.push({
      type: 'vice_cache_detected',
      severity: 'high',
      title: 'Indices de vice caché',
      description: `La description mentionne ${viceCount} mots liés à des problèmes/accidents. Vérification impérative.`,
      evidence: [`Mots détectés: ${viceCacheKeywords.filter(kw => fullText.includes(kw)).join(', ')}`],
      confidence: 'medium',
    })
    fraudScore += 25
    suspiciousPatterns.push('vice_cache_detecte')
  }

  // Calcul du niveau de risque final
  let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low'
  if (fraudScore >= 70) {
    riskLevel = 'critical'
  } else if (fraudScore >= 50) {
    riskLevel = 'high'
  } else if (fraudScore >= 30) {
    riskLevel = 'medium'
  }

  // Génération des recommandations
  const recommendations: string[] = []
  if (fraudScore >= 50) {
    recommendations.push('⚠️ ARNAQUE PROBABLE - Ne pas acheter sans vérification exhaustive')
    recommendations.push('Vérifier l\'identité du vendeur (pièce d\'identité)')
    recommendations.push('Exiger une visite physique du véhicule')
    recommendations.push('Ne jamais payer avant d\'avoir vu le véhicule')
  } else if (fraudScore >= 30) {
    recommendations.push('⚠️ Prudence recommandée - Vérifications approfondies nécessaires')
    recommendations.push('Demander des photos supplémentaires')
    recommendations.push('Vérifier l\'historique du véhicule (VIN)')
    recommendations.push('Rencontrer le vendeur en personne')
  } else if (fraudScore >= 15) {
    recommendations.push('Vérifications de routine recommandées')
    recommendations.push('Demander des informations complémentaires')
  }

  return {
    riskLevel,
    fraudScore: Math.min(100, fraudScore),
    redFlags,
    suspiciousPatterns,
    recommendations,
  }
}

/**
 * Détecte les annonces dupliquées (même véhicule, prix différents)
 */
export function detectDuplicateListings(
  listing: FraudDetectionInput,
  otherListings: FraudDetectionInput[]
): FraudRedFlag[] {
  const flags: FraudRedFlag[] = []

  if (!listing.title || !listing.price_eur) return flags

  // Chercher des annonces similaires (même titre, prix différent)
  const similar = otherListings.filter(other => {
    if (!other.title || !other.price_eur || !listing.title || !listing.price_eur) return false
    const titleSimilarity = calculateStringSimilarity(listing.title.toLowerCase(), other.title.toLowerCase())
    return titleSimilarity > 0.8 && Math.abs(listing.price_eur - other.price_eur) > 1000
  })

  if (similar.length > 0) {
    flags.push({
      type: 'duplicate_listing',
      severity: 'high',
      title: 'Annonce dupliquée détectée',
      description: `${similar.length} annonce(s) similaire(s) trouvée(s) avec des prix différents. Possible arnaque ou annonce multiple.`,
      evidence: similar.map(s => `Prix: ${s.price_eur?.toLocaleString('fr-FR')} € - ${s.url || 'URL inconnue'}`),
      confidence: 'medium',
    })
  }

  return flags
}

/**
 * Calcule la similarité entre deux chaînes (Jaro-Winkler simplifié)
 */
function calculateStringSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2
  const shorter = str1.length > str2.length ? str2 : str1
  if (longer.length === 0) return 1.0

  const distance = levenshteinDistance(longer, shorter)
  return (longer.length - distance) / longer.length
}

function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = []

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i]
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        )
      }
    }
  }

  return matrix[str2.length][str1.length]
}

