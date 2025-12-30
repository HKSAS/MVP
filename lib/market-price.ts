/**
 * Calcul déterministe du prix marché d'un véhicule
 * Basé sur des règles métier professionnelles
 */

interface PriceCalculationInput {
  brand?: string
  model?: string
  year?: number
  mileage?: number
  mileage_confidence?: 'high' | 'medium' | 'low'
  fuel?: string
  transmission?: string
  hasHistory?: boolean
  condition?: 'excellent' | 'good' | 'average' | 'poor' | 'unknown'
  region?: string
}

interface PriceAdjustment {
  factor: string
  impact: number
}

interface MarketPriceResult {
  min: number
  max: number
  vehiclePrice: number
  position: 'basse_fourchette' | 'moyenne' | 'haute_fourchette' | 'hors_fourchette'
  negotiationAdvice: string
  explanation: PriceAdjustment[]
}

/**
 * Base de données minimale de prix de référence par modèle/année
 * Valeurs moyennes basées sur le marché français (LaCentrale, L'Argus)
 */
const MODEL_PRICE_REFERENCE: Record<string, Record<number, number>> = {
  // Volkswagen
  'golf': {
    2016: 12000,
    2017: 13500,
    2018: 15000,
    2019: 16500,
    2020: 18000,
  },
  'polo': {
    2016: 9000,
    2017: 10000,
    2018: 11000,
    2019: 12000,
    2020: 13000,
  },
  // Renault
  'clio': {
    2016: 8000,
    2017: 9000,
    2018: 10000,
    2019: 11000,
    2020: 12000,
  },
  'megane': {
    2016: 10000,
    2017: 11500,
    2018: 13000,
    2019: 14500,
    2020: 16000,
  },
  // Peugeot
  '208': {
    2016: 7500,
    2017: 8500,
    2018: 9500,
    2019: 10500,
    2020: 11500,
  },
  '308': {
    2016: 9500,
    2017: 11000,
    2018: 12500,
    2019: 14000,
    2020: 15500,
  },
  // Audi
  'a3': {
    2016: 15000,
    2017: 17000,
    2018: 19000,
    2019: 21000,
    2020: 23000,
  },
  // BMW
  'serie 3': {
    2016: 18000,
    2017: 20000,
    2018: 22000,
    2019: 24000,
    2020: 26000,
  },
}

/**
 * Trouve le prix de base pour un modèle/année
 */
function getBasePrice(brand?: string, model?: string, year?: number): number | null {
  if (!brand || !model || !year) return null

  const modelKey = model.toLowerCase().replace(/\s+/g, '')
  const brandKey = brand.toLowerCase()

  // Chercher dans la base de données
  for (const [key, years] of Object.entries(MODEL_PRICE_REFERENCE)) {
    if (modelKey.includes(key) || key.includes(modelKey)) {
      // Trouver l'année la plus proche
      let baseYear = year
      while (baseYear >= 2010 && !years[baseYear]) {
        baseYear--
      }
      if (years[baseYear]) {
        // Ajuster pour l'année exacte (décote ~10% par an)
        const yearDiff = year - baseYear
        return Math.round(years[baseYear] * Math.pow(0.9, yearDiff))
      }
    }
  }

  // Fallback: estimation basée sur l'année et la catégorie
  const currentYear = new Date().getFullYear()
  const age = currentYear - year

  // Estimation par catégorie de véhicule
  let baseEstimate = 15000 // Compacte moyenne
  if (modelKey.includes('polo') || modelKey.includes('clio') || modelKey.includes('208')) {
    baseEstimate = 10000 // Citadine
  } else if (modelKey.includes('golf') || modelKey.includes('megane') || modelKey.includes('308')) {
    baseEstimate = 13000 // Compacte
  } else if (modelKey.includes('a3') || modelKey.includes('serie')) {
    baseEstimate = 20000 // Premium
  }

  // Décote annuelle
  return Math.round(baseEstimate * Math.pow(0.88, age))
}

/**
 * Calcule les ajustements de prix
 */
function calculateAdjustments(
  basePrice: number,
  input: PriceCalculationInput
): { adjustments: PriceAdjustment[]; finalPrice: number } {
  const adjustments: PriceAdjustment[] = []
  let finalPrice = basePrice

    // Ajustement kilométrage (AVEC VÉRIFICATION DE COHÉRENCE ET CONFIDENCE)
    if (input.mileage && input.year) {
      const currentYear = new Date().getFullYear()
      const age = currentYear - input.year
      const kmThreshold = 150000
      
      // Ne jamais majorer le prix si confidence != "high"
      const canApplyBonus = input.mileage_confidence === 'high'
      
      // Vérifier cohérence : pas de bonus si kilométrage suspect
      const isMileageSuspicious = (input.mileage < 500 && age >= 1) || (input.mileage < 2000 && age >= 2)
      
      if (isMileageSuspicious) {
        // Pas d'ajustement prix si suspect (on laisse le prix de base)
        adjustments.push({
          factor: `Kilométrage suspect (${Math.round(input.mileage).toLocaleString('fr-FR')} km)`,
          impact: 0,
        })
      } else if (input.mileage > kmThreshold) {
        const excessKm = input.mileage - kmThreshold
        const kmPenalty = Math.min(excessKm * 0.02, 2000) // Max 2000€ de pénalité
        finalPrice -= kmPenalty
        adjustments.push({
          factor: `Kilométrage (${Math.round(input.mileage).toLocaleString('fr-FR')} km)`,
          impact: -Math.round(kmPenalty),
        })
      } else if (input.mileage < 50000 && age >= 1 && canApplyBonus) {
        // Bonus uniquement si cohérent avec l'âge ET confidence high
        const bonus = Math.min((50000 - input.mileage) * 0.01, 500)
        finalPrice += bonus
        adjustments.push({
          factor: `Kilométrage faible (${Math.round(input.mileage).toLocaleString('fr-FR')} km)`,
          impact: Math.round(bonus),
        })
      } else if (input.mileage < 50000 && !canApplyBonus) {
        // Pas de bonus si confidence faible
        adjustments.push({
          factor: `Kilométrage faible (${Math.round(input.mileage).toLocaleString('fr-FR')} km) - confiance ${input.mileage_confidence || 'faible'}`,
          impact: 0,
        })
      }
    }

  // Ajustement historique
  if (input.hasHistory === false) {
    const historyPenalty = input.mileage && input.mileage > 150000 ? -800 : -300
    finalPrice += historyPenalty
    adjustments.push({
      factor: 'Historique entretien non prouvé',
      impact: historyPenalty,
    })
  } else if (input.hasHistory === true) {
    adjustments.push({
      factor: 'Historique entretien vérifié',
      impact: 0,
    })
  }

  // Ajustement transmission (DSG sans preuve de vidange)
  if (input.transmission?.toLowerCase().includes('automatique') || input.transmission?.toLowerCase().includes('dsg')) {
    // On suppose que sans preuve, c'est un risque
    const dsgPenalty = -400
    finalPrice += dsgPenalty
    adjustments.push({
      factor: 'Boîte DSG/Auto (vidange à vérifier)',
      impact: dsgPenalty,
    })
  }

  // Ajustement état
  if (input.condition === 'excellent') {
    finalPrice += 500
    adjustments.push({
      factor: 'État excellent',
      impact: 500,
    })
  } else if (input.condition === 'good') {
    adjustments.push({
      factor: 'État bon',
      impact: 0,
    })
  } else if (input.condition === 'average') {
    finalPrice -= 500
    adjustments.push({
      factor: 'État moyen',
      impact: -500,
    })
  } else if (input.condition === 'poor') {
    finalPrice -= 1500
    adjustments.push({
      factor: 'État médiocre',
      impact: -1500,
    })
  } else {
    adjustments.push({
      factor: 'Information insuffisante',
      impact: 0,
    })
  }

  // Ajustement région (Paris/IDF = +5%, Province = neutre)
  if (input.region?.toLowerCase().includes('paris') || input.region?.toLowerCase().includes('idf')) {
    finalPrice = Math.round(finalPrice * 1.05)
    adjustments.push({
      factor: 'Région Paris/IDF',
      impact: Math.round(basePrice * 0.05),
    })
  } else if (input.region) {
    adjustments.push({
      factor: 'Région',
      impact: 0,
    })
  }

  return { adjustments, finalPrice: Math.max(1000, Math.round(finalPrice)) } // Prix minimum 1000€, arrondi
}

/**
 * Calcule le prix marché avec fourchette min/max
 */
export function calculateMarketPrice(
  input: PriceCalculationInput,
  announcedPrice?: number
): MarketPriceResult {
  const basePrice = getBasePrice(input.brand, input.model, input.year)

  if (!basePrice) {
    // Fallback si pas de base de données
    const currentYear = new Date().getFullYear()
    const age = input.year ? currentYear - input.year : 5
    const estimatedBase = 12000 * Math.pow(0.88, age)
    return calculateWithBase(estimatedBase, input, announcedPrice)
  }

  return calculateWithBase(basePrice, input, announcedPrice)
}

function calculateWithBase(
  basePrice: number,
  input: PriceCalculationInput,
  announcedPrice?: number
): MarketPriceResult {
  const { adjustments, finalPrice } = calculateAdjustments(basePrice, input)

  // Fourchette: ±10% autour du prix final (arrondi à l'euro)
  const range = Math.round(finalPrice * 0.1)
  const min = Math.max(1000, Math.round(finalPrice - range))
  const max = Math.round(finalPrice + range)

  // Position du prix annoncé
  let position: MarketPriceResult['position'] = 'moyenne'
  let negotiationAdvice = ''

  if (announcedPrice) {
    const center = (min + max) / 2
    const rangeWidth = max - min

    if (announcedPrice < min * 0.9) {
      position = 'basse_fourchette'
      negotiationAdvice = 'Prix très attractif, opportunité intéressante'
    } else if (announcedPrice < min) {
      position = 'basse_fourchette'
      negotiationAdvice = 'Prix attractif, bon rapport qualité-prix'
    } else if (announcedPrice <= min + rangeWidth * 0.3) {
      position = 'basse_fourchette'
      negotiationAdvice = 'Prix cohérent, dans la fourchette basse'
    } else if (announcedPrice <= min + rangeWidth * 0.7) {
      position = 'moyenne'
      negotiationAdvice = 'Prix dans la moyenne du marché'
    } else if (announcedPrice <= max) {
      position = 'haute_fourchette'
      const diff = announcedPrice - center
      negotiationAdvice = `Prix dans la fourchette haute. Négociation possible: ${Math.round(diff * 0.3)}-${Math.round(diff * 0.5)}€`
    } else if (announcedPrice <= max * 1.1) {
      position = 'haute_fourchette'
      const diff = announcedPrice - max
      negotiationAdvice = `Négociation recommandée: ${Math.round(diff * 0.5)}-${Math.round(diff * 0.8)}€`
    } else {
      position = 'hors_fourchette'
      const diff = announcedPrice - max
      negotiationAdvice = `Négociation nécessaire: ${Math.round(diff * 0.6)}-${Math.round(diff)}€`
    }
  }

  return {
    min,
    max,
    vehiclePrice: finalPrice,
    position,
    negotiationAdvice,
    explanation: adjustments,
  }
}

