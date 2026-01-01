/**
 * 📊 BASE DE DONNÉES DE PRIX MARCHÉ ÉTENDUE
 * Prix de référence basés sur le marché français (LaCentrale, L'Argus, etc.)
 * Mise à jour régulière recommandée
 */

export interface MarketPriceData {
  brand: string
  model: string
  year: number
  basePrice: number // Prix de base pour l'année
  priceRange: {
    min: number // Prix marché minimum (vente privée)
    max: number // Prix marché maximum (professionnel)
  }
  depreciationRate: number // Taux de décote annuel (%)
  category: 'citadine' | 'compacte' | 'berline' | 'suv' | 'premium' | 'sportive'
}

/**
 * Base de données étendue de prix de référence
 * Format: brand_model_year = basePrice
 */
const MARKET_PRICE_DATABASE: Record<string, MarketPriceData> = {
  // VOLKSWAGEN
  'volkswagen_golf_2020': {
    brand: 'Volkswagen',
    model: 'Golf',
    year: 2020,
    basePrice: 18000,
    priceRange: { min: 16000, max: 20000 },
    depreciationRate: 12,
    category: 'compacte',
  },
  'volkswagen_golf_2019': {
    brand: 'Volkswagen',
    model: 'Golf',
    year: 2019,
    basePrice: 16500,
    priceRange: { min: 14500, max: 18500 },
    depreciationRate: 12,
    category: 'compacte',
  },
  'volkswagen_golf_2018': {
    brand: 'Volkswagen',
    model: 'Golf',
    year: 2018,
    basePrice: 15000,
    priceRange: { min: 13000, max: 17000 },
    depreciationRate: 12,
    category: 'compacte',
  },
  'volkswagen_polo_2020': {
    brand: 'Volkswagen',
    model: 'Polo',
    year: 2020,
    basePrice: 13000,
    priceRange: { min: 11500, max: 14500 },
    depreciationRate: 13,
    category: 'citadine',
  },
  'volkswagen_polo_2019': {
    brand: 'Volkswagen',
    model: 'Polo',
    year: 2019,
    basePrice: 12000,
    priceRange: { min: 10500, max: 13500 },
    depreciationRate: 13,
    category: 'citadine',
  },
  'volkswagen_passat_2020': {
    brand: 'Volkswagen',
    model: 'Passat',
    year: 2020,
    basePrice: 25000,
    priceRange: { min: 22000, max: 28000 },
    depreciationRate: 11,
    category: 'berline',
  },

  // RENAULT
  'renault_clio_2020': {
    brand: 'Renault',
    model: 'Clio',
    year: 2020,
    basePrice: 12000,
    priceRange: { min: 10500, max: 13500 },
    depreciationRate: 14,
    category: 'citadine',
  },
  'renault_clio_2019': {
    brand: 'Renault',
    model: 'Clio',
    year: 2019,
    basePrice: 11000,
    priceRange: { min: 9500, max: 12500 },
    depreciationRate: 14,
    category: 'citadine',
  },
  'renault_megane_2020': {
    brand: 'Renault',
    model: 'Mégane',
    year: 2020,
    basePrice: 16000,
    priceRange: { min: 14000, max: 18000 },
    depreciationRate: 13,
    category: 'compacte',
  },
  'renault_captur_2020': {
    brand: 'Renault',
    model: 'Captur',
    year: 2020,
    basePrice: 17000,
    priceRange: { min: 15000, max: 19000 },
    depreciationRate: 12,
    category: 'suv',
  },

  // PEUGEOT
  'peugeot_208_2020': {
    brand: 'Peugeot',
    model: '208',
    year: 2020,
    basePrice: 11500,
    priceRange: { min: 10000, max: 13000 },
    depreciationRate: 14,
    category: 'citadine',
  },
  'peugeot_308_2020': {
    brand: 'Peugeot',
    model: '308',
    year: 2020,
    basePrice: 15500,
    priceRange: { min: 13500, max: 17500 },
    depreciationRate: 13,
    category: 'compacte',
  },
  'peugeot_3008_2020': {
    brand: 'Peugeot',
    model: '3008',
    year: 2020,
    basePrice: 24000,
    priceRange: { min: 21000, max: 27000 },
    depreciationRate: 11,
    category: 'suv',
  },

  // AUDI
  'audi_a3_2020': {
    brand: 'Audi',
    model: 'A3',
    year: 2020,
    basePrice: 23000,
    priceRange: { min: 20000, max: 26000 },
    depreciationRate: 10,
    category: 'premium',
  },
  'audi_a4_2020': {
    brand: 'Audi',
    model: 'A4',
    year: 2020,
    basePrice: 30000,
    priceRange: { min: 26000, max: 34000 },
    depreciationRate: 10,
    category: 'premium',
  },
  'audi_q3_2020': {
    brand: 'Audi',
    model: 'Q3',
    year: 2020,
    basePrice: 28000,
    priceRange: { min: 24000, max: 32000 },
    depreciationRate: 10,
    category: 'suv',
  },

  // BMW
  'bmw_serie3_2020': {
    brand: 'BMW',
    model: 'Série 3',
    year: 2020,
    basePrice: 26000,
    priceRange: { min: 23000, max: 29000 },
    depreciationRate: 10,
    category: 'premium',
  },
  'bmw_x1_2020': {
    brand: 'BMW',
    model: 'X1',
    year: 2020,
    basePrice: 28000,
    priceRange: { min: 25000, max: 31000 },
    depreciationRate: 10,
    category: 'suv',
  },

  // MERCEDES
  'mercedes_classe_a_2020': {
    brand: 'Mercedes',
    model: 'Classe A',
    year: 2020,
    basePrice: 25000,
    priceRange: { min: 22000, max: 28000 },
    depreciationRate: 10,
    category: 'premium',
  },
  'mercedes_classe_c_2020': {
    brand: 'Mercedes',
    model: 'Classe C',
    year: 2020,
    basePrice: 32000,
    priceRange: { min: 28000, max: 36000 },
    depreciationRate: 9,
    category: 'premium',
  },

  // CITROËN
  'citroen_c3_2020': {
    brand: 'Citroën',
    model: 'C3',
    year: 2020,
    basePrice: 11000,
    priceRange: { min: 9500, max: 12500 },
    depreciationRate: 14,
    category: 'citadine',
  },
  'citroen_c4_2020': {
    brand: 'Citroën',
    model: 'C4',
    year: 2020,
    basePrice: 14000,
    priceRange: { min: 12000, max: 16000 },
    depreciationRate: 13,
    category: 'compacte',
  },

  // FORD
  'ford_focus_2020': {
    brand: 'Ford',
    model: 'Focus',
    year: 2020,
    basePrice: 15000,
    priceRange: { min: 13000, max: 17000 },
    depreciationRate: 13,
    category: 'compacte',
  },
  'ford_fiesta_2020': {
    brand: 'Ford',
    model: 'Fiesta',
    year: 2020,
    basePrice: 11000,
    priceRange: { min: 9500, max: 12500 },
    depreciationRate: 14,
    category: 'citadine',
  },
}

/**
 * Normalise une clé de recherche (brand_model_year)
 */
function normalizeKey(brand: string, model: string, year: number): string {
  return `${brand.toLowerCase().replace(/\s+/g, '_')}_${model.toLowerCase().replace(/\s+/g, '_')}_${year}`
}

/**
 * Trouve le prix de référence le plus proche
 */
export function findMarketPrice(
  brand?: string,
  model?: string,
  year?: number
): MarketPriceData | null {
  if (!brand || !model || !year) return null

  // Chercher exact
  const exactKey = normalizeKey(brand, model, year)
  if (MARKET_PRICE_DATABASE[exactKey]) {
    return MARKET_PRICE_DATABASE[exactKey]
  }

  // Chercher année proche (±2 ans)
  for (let yearOffset = -2; yearOffset <= 2; yearOffset++) {
    const searchYear = year + yearOffset
    if (searchYear < 2010 || searchYear > new Date().getFullYear()) continue

    const key = normalizeKey(brand, model, searchYear)
    if (MARKET_PRICE_DATABASE[key]) {
      const data = MARKET_PRICE_DATABASE[key]
      // Ajuster pour l'année exacte
      const yearDiff = year - searchYear
      const adjustedBasePrice = Math.round(
        data.basePrice * Math.pow(1 - data.depreciationRate / 100, yearDiff)
      )
      return {
        ...data,
        year,
        basePrice: adjustedBasePrice,
        priceRange: {
          min: Math.round(data.priceRange.min * Math.pow(1 - data.depreciationRate / 100, yearDiff)),
          max: Math.round(data.priceRange.max * Math.pow(1 - data.depreciationRate / 100, yearDiff)),
        },
      }
    }
  }

  // Chercher modèle similaire (sans année)
  const modelKey = model.toLowerCase().replace(/\s+/g, '_')
  for (const [key, data] of Object.entries(MARKET_PRICE_DATABASE)) {
    if (key.includes(modelKey) || modelKey.includes(key.split('_')[1])) {
      // Ajuster pour l'année
      const yearDiff = year - data.year
      const adjustedBasePrice = Math.round(
        data.basePrice * Math.pow(1 - data.depreciationRate / 100, yearDiff)
      )
      return {
        ...data,
        brand,
        model,
        year,
        basePrice: adjustedBasePrice,
        priceRange: {
          min: Math.round(data.priceRange.min * Math.pow(1 - data.depreciationRate / 100, yearDiff)),
          max: Math.round(data.priceRange.max * Math.pow(1 - data.depreciationRate / 100, yearDiff)),
        },
      }
    }
  }

  return null
}

/**
 * Calcule le prix marché avec la base de données étendue
 */
export function calculateMarketPriceWithDatabase(
  brand?: string,
  model?: string,
  year?: number,
  mileage?: number
): { min: number; max: number; basePrice: number } | null {
  const marketData = findMarketPrice(brand, model, year)
  if (!marketData) return null

  let adjustedMin = marketData.priceRange.min
  let adjustedMax = marketData.priceRange.max
  let adjustedBase = marketData.basePrice

  // Ajustement kilométrage
  if (mileage) {
    const kmAdjustment = Math.max(-2000, Math.min(500, (150000 - mileage) * 0.01))
    adjustedMin = Math.max(1000, adjustedMin + kmAdjustment)
    adjustedMax = Math.max(1000, adjustedMax + kmAdjustment)
    adjustedBase = Math.max(1000, adjustedBase + kmAdjustment)
  }

  return {
    min: Math.round(adjustedMin),
    max: Math.round(adjustedMax),
    basePrice: Math.round(adjustedBase),
  }
}

/**
 * Obtient la catégorie d'un véhicule
 */
export function getVehicleCategory(brand?: string, model?: string): MarketPriceData['category'] | null {
  if (!brand || !model) return null

  const marketData = findMarketPrice(brand, model, new Date().getFullYear())
  return marketData?.category || null
}

