/**
 * Calcul du score de fiabilité avec breakdown détaillé
 */

import { buildRedFlags, type RedFlag, adjustRiskScoreWithRedFlags, getRiskLevelFromScore } from './red-flags'

export interface ScoreCriterion {
  criterion: string
  points: number
  details: string
}

export interface ScoreBreakdownResult {
  totalScore: number
  reliabilityScore: number
  breakdown: ScoreCriterion[]
  redFlags: RedFlag[]
}

interface ScoreInput {
  mileage?: number
  year?: number
  hasHistory?: boolean
  pricePosition?: 'basse_fourchette' | 'moyenne' | 'haute_fourchette' | 'hors_fourchette'
  condition?: 'excellent' | 'good' | 'average' | 'poor' | 'unknown'
  brand?: string
  model?: string
  fuel?: string
  transmission?: string
  descriptionQuality?: 'excellent' | 'good' | 'average' | 'poor'
  hasPhotos?: boolean
  price_eur?: number
  marketMin?: number
  description?: string
  title?: string
  hasCT?: boolean
}

/**
 * Calcule le score de fiabilité avec breakdown
 */
export function calculateScoreBreakdown(input: ScoreInput): ScoreBreakdownResult {
  const breakdown: ScoreCriterion[] = []
  let totalScore = 50 // Score de base

  // Détecter les red flags AVANT tout autre calcul
  const redFlags = buildRedFlags({
    mileage_km: input.mileage,
    year: input.year,
    price_eur: input.price_eur,
    marketMin: input.marketMin,
    hasCT: input.hasCT,
    description: input.description,
    title: input.title,
  })

  // Vérifier si kilométrage incohérent (red flag)
  const hasMileageRedFlag = redFlags.some(flag => flag.type === 'mileage_inconsistent')
  const currentYear = new Date().getFullYear()
  const age = input.year ? currentYear - input.year : 0

  // Kilométrage - AVEC VÉRIFICATION DE COHÉRENCE (UTILISER UNIQUEMENT mileage_km_final)
  if (input.mileage !== null && input.mileage !== undefined) {
    // Si red flag kilométrage, pénalité sévère et pas de bonus
    if (hasMileageRedFlag) {
      totalScore -= 40
      breakdown.push({
        criterion: 'Kilométrage incohérent ou suspect',
        points: -40,
        details: `Kilométrage (${input.mileage.toLocaleString('fr-FR')} km) incohérent${age > 0 ? ` pour un véhicule de ${age} an${age > 1 ? 's' : ''}` : ''}. Risque de fraude ou erreur majeure.`,
      })
    } else if (input.year) {
      // Calcul normal uniquement si cohérent ET année disponible
      if (input.mileage >= 200000) {
        totalScore -= 20
        breakdown.push({
          criterion: 'Kilométrage très élevé (> 200k km)',
          points: -20,
          details: 'Risque d\'usure accrue, contrôles mécaniques impératifs',
        })
      } else if (input.mileage >= 150000) {
        totalScore -= 10
        breakdown.push({
          criterion: 'Kilométrage élevé (150-200k km)',
          points: -10,
          details: 'Usure accrue possible, vérifications nécessaires',
        })
      } else if (input.mileage >= 100000) {
        totalScore += 5
        breakdown.push({
          criterion: 'Kilométrage moyen (100-150k km)',
          points: 5,
          details: 'Kilométrage acceptable',
        })
      } else if (input.mileage >= 50000) {
        totalScore += 10
        breakdown.push({
          criterion: 'Kilométrage faible (< 100k km)',
          points: 10,
          details: 'Kilométrage raisonnable pour l\'âge',
        })
      } else if (input.mileage >= 500 && age <= 6) {
        // Bonus uniquement si année récente (age <= 6)
        totalScore += 15
        breakdown.push({
          criterion: 'Kilométrage très faible (< 50k km)',
          points: 15,
          details: 'Véhicule peu utilisé, usure minimale',
        })
      } else {
        // Kilométrage < 50k mais véhicule ancien = suspect
        totalScore -= 5
        breakdown.push({
          criterion: 'Kilométrage très faible (vérification nécessaire)',
          points: -5,
          details: `Kilométrage ${input.mileage.toLocaleString('fr-FR')} km sur véhicule de ${age} an${age > 1 ? 's' : ''}. Vérifier l'authenticité.`,
        })
      }
    } else {
      // Kilométrage sans année : évaluation neutre
      if (input.mileage >= 200000) {
        totalScore -= 15
        breakdown.push({
          criterion: 'Kilométrage très élevé (> 200k km)',
          points: -15,
          details: 'Kilométrage élevé, vérifications mécaniques recommandées',
        })
      } else if (input.mileage < 100000) {
        totalScore += 5
        breakdown.push({
          criterion: 'Kilométrage faible (< 100k km)',
          points: 5,
          details: 'Kilométrage raisonnable',
        })
      }
    }
  } else {
    // Kilométrage manquant
    totalScore -= 5
    breakdown.push({
      criterion: 'Kilométrage non détecté',
      points: -5,
      details: 'Information manquante, à vérifier auprès du vendeur',
    })
  }

  // Historique d'entretien - AFFICHER "non prouvé" SEULEMENT si explicitement false
  if (input.hasHistory === true) {
    totalScore += 15
    breakdown.push({
      criterion: 'Historique d\'entretien vérifié',
      points: 15,
      details: 'Factures et carnet d\'entretien disponibles',
    })
  } else if (input.hasHistory === false) {
    totalScore -= 10
    breakdown.push({
      criterion: 'Historique d\'entretien non prouvé',
      points: -10,
      details: 'Aucun justificatif fourni, risque d\'entretien négligé',
    })
  }
  // Si hasHistory est null/undefined, ne rien ajouter (sera déterminé depuis description si possible)

  // Cohérence prix vs marché
  if (input.pricePosition) {
    if (input.pricePosition === 'basse_fourchette') {
      totalScore += 10
      breakdown.push({
        criterion: 'Prix attractif (fourchette basse)',
        points: 10,
        details: 'Bon rapport qualité-prix',
      })
    } else if (input.pricePosition === 'moyenne') {
      totalScore += 5
      breakdown.push({
        criterion: 'Prix cohérent avec le marché',
        points: 5,
        details: 'Prix dans la moyenne',
      })
    } else if (input.pricePosition === 'haute_fourchette') {
      totalScore -= 10
      breakdown.push({
        criterion: 'Prix dans la fourchette haute',
        points: -10,
        details: 'Position haute fourchette, négociation recommandée',
      })
    } else {
      totalScore -= 15
      breakdown.push({
        criterion: 'Prix au-dessus du marché',
        points: -15,
        details: 'Prix significativement au-dessus, négociation nécessaire',
      })
    }
  }

  // État du véhicule - AFFICHER "Information insuffisante" si unknown, pas "non renseigné"
  if (input.condition === 'excellent') {
    totalScore += 10
    breakdown.push({
      criterion: 'État excellent',
      points: 10,
      details: 'Véhicule en très bon état',
    })
  } else if (input.condition === 'good') {
    totalScore += 5
    breakdown.push({
      criterion: 'État bon',
      points: 5,
      details: 'État correct',
    })
  } else if (input.condition === 'average') {
    totalScore -= 5
    breakdown.push({
      criterion: 'État moyen',
      points: -5,
      details: 'Usure normale, quelques défauts possibles',
    })
  } else if (input.condition === 'poor') {
    totalScore -= 15
    breakdown.push({
      criterion: 'État médiocre',
      points: -15,
      details: 'État préoccupant, réparations probables',
    })
  } else if (input.condition === 'unknown') {
    // Ne pas pénaliser si on a des photos ou une description
    if (!input.hasPhotos && !input.descriptionQuality) {
      breakdown.push({
        criterion: 'Information insuffisante sur l\'état',
        points: 0,
        details: 'Pas assez d\'informations pour évaluer l\'état',
      })
    }
  }

  // Qualité de la description - UTILISER UNIQUEMENT SI DISPONIBLE
  if (input.descriptionQuality) {
    if (input.descriptionQuality === 'excellent') {
      totalScore += 5
      breakdown.push({
        criterion: 'Description détaillée et professionnelle',
        points: 5,
        details: 'Annonce complète et transparente',
      })
    } else if (input.descriptionQuality === 'poor') {
      totalScore -= 5
      breakdown.push({
        criterion: 'Description insuffisante',
        points: -5,
        details: 'Manque d\'informations, à compléter',
      })
    }
  }

  // Photos - UTILISER UNIQUEMENT SI DÉFINI
  if (input.hasPhotos === true) {
    totalScore += 5
    breakdown.push({
      criterion: 'Photos disponibles',
      points: 5,
      details: 'Permet de vérifier l\'état visuel',
    })
  } else if (input.hasPhotos === false) {
    totalScore -= 5
    breakdown.push({
      criterion: 'Aucune photo',
      points: -5,
      details: 'Impossible de vérifier l\'état visuel',
    })
  }

  // Motorisation connue et fiable
  if (input.brand && input.model) {
    const modelKey = `${input.brand.toLowerCase()} ${input.model.toLowerCase()}`
    // Motorisations généralement fiables
    const reliableEngines = ['1.6 tdi', '2.0 tdi', '1.5 dci', '1.2 tce', '1.0 tsi']
    if (reliableEngines.some(engine => modelKey.includes(engine))) {
      totalScore += 5
      breakdown.push({
        criterion: 'Motorisation connue et fiable',
        points: 5,
        details: `${input.brand} ${input.model} globalement fiable si entretien suivi`,
      })
    }
  }

  // NOUVEAU: Analyse de rareté du modèle (modèles rares = plus de valeur)
  if (input.brand && input.model) {
    const rareModels = [
      'golf gti', 'golf r', 'audi rs', 'bmw m3', 'bmw m5',
      'mercedes amg', 'renault sport', 'peugeot gti',
    ]
    const isRare = rareModels.some(rare => 
      `${input.brand} ${input.model}`.toLowerCase().includes(rare)
    )
    if (isRare) {
      totalScore += 8
      breakdown.push({
        criterion: 'Modèle rare/édition spéciale',
        points: 8,
        details: 'Modèle rare ou édition spéciale, valeur de revente potentiellement plus élevée',
      })
    }
  }

  // NOUVEAU: Analyse de cohérence globale (prix/km/année)
  if (input.price_eur && input.mileage && input.year) {
    const currentYear = new Date().getFullYear()
    const age = currentYear - input.year
    const kmPerYear = input.mileage / Math.max(1, age)
    const pricePerKm = input.price_eur / Math.max(1, input.mileage)
    
    // Vérifier cohérence globale
    const isCoherent = 
      kmPerYear >= 8000 && kmPerYear <= 25000 && // Usage normal
      pricePerKm >= 0.05 && pricePerKm <= 0.5 && // Prix/km raisonnable
      input.price_eur >= 5000 && input.price_eur <= 100000 // Prix dans une fourchette normale
    
    if (isCoherent) {
      totalScore += 10
      breakdown.push({
        criterion: 'Cohérence globale prix/km/année',
        points: 10,
        details: 'Les données sont cohérentes entre elles, annonce crédible',
      })
    } else {
      totalScore -= 15
      breakdown.push({
        criterion: 'Incohérence détectée',
        points: -15,
        details: 'Les données (prix/km/année) ne sont pas cohérentes. Vérification impérative.',
      })
    }
  }

  // NOUVEAU: Bonus pour véhicule récent (< 3 ans)
  if (input.year) {
    const currentYear = new Date().getFullYear()
    const age = currentYear - input.year
    if (age <= 3) {
      totalScore += 8
      breakdown.push({
        criterion: 'Véhicule récent',
        points: 8,
        details: `Véhicule de ${age} an${age > 1 ? 's' : ''}, usure minimale attendue`,
      })
    }
  }

  // NOUVEAU: Bonus pour carburant écologique
  if (input.fuel) {
    const ecoFuels = ['electrique', 'hybride', 'hybride rechargeable']
    if (ecoFuels.some(eco => input.fuel?.toLowerCase().includes(eco))) {
      totalScore += 5
      breakdown.push({
        criterion: 'Carburant écologique',
        points: 5,
        details: 'Véhicule électrique ou hybride, avantages écologiques et économiques',
      })
    }
  }

  // Normaliser le score entre 0 et 100
  let reliabilityScore = Math.max(0, Math.min(100, totalScore))

  // Appliquer les red flags pour ajuster le risk score
  // Le risk score est l'inverse du reliability score (100 - reliabilityScore)
  let riskScore = 100 - reliabilityScore
  riskScore = adjustRiskScoreWithRedFlags(riskScore, redFlags)
  
  // Recalculer reliabilityScore depuis riskScore ajusté
  reliabilityScore = 100 - riskScore
  
  // Caps de cohérence : si riskScore élevé, reliabilityScore ne peut pas être trop haut
  if (riskScore >= 70) {
    reliabilityScore = Math.min(60, reliabilityScore)
  }
  
  // Caps inverse : si reliabilityScore très élevé, riskScore doit être bas
  if (reliabilityScore >= 80) {
    riskScore = Math.min(40, 100 - reliabilityScore)
    reliabilityScore = 100 - riskScore
  }

  return {
    totalScore: reliabilityScore,
    reliabilityScore,
    breakdown,
    redFlags,
  }
}

