/**
 * Extraction spécifique pour les pages Leboncoin
 * Priorise le JSON __NEXT_DATA__ puis fallback sur DOM
 */

// Import des fonctions de parsing en premier
import { parsePriceEUR, parseMileageKM, parseYear, parseFuel, parseTransmission, hasMaintenanceHistory } from './parsing-fr'

export interface MileageCandidate {
  value: number
  source: string
  raw: string
}

export interface MileageSelection {
  mileage_km_final: number | null
  mileage_confidence: 'high' | 'medium' | 'low'
  mileage_notes: string[]
  mileageCandidates: MileageCandidate[]
}

export interface ExtractedListingData {
  title: string | null
  price_eur: number | null
  mileage_km: number | null // DEPRECATED: utiliser mileageSelection
  mileageSelection?: MileageSelection
  year: number | null
  fuel: string | null
  gearbox: string | null
  location: string | null
  description: string | null
  photos_count: number | null
  has_history_report: boolean | null
  extraction_source?: 'NEXT_DATA' | 'JSON_LD' | 'DOM' | 'MIXED'
  // Champs optionnels pour compatibilité
  brand?: string | null
  model?: string | null
}

/**
 * Extrait les données depuis le JSON __NEXT_DATA__ de Leboncoin
 */
function extractFromNextData(html: string): (Partial<ExtractedListingData> & { _source?: 'NEXT_DATA'; mileageCandidates?: MileageCandidate[] }) | null {
  try {
    // Chercher le script __NEXT_DATA__
    const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)
    if (!nextDataMatch) return null
    
    const jsonStr = nextDataMatch[1]
    const nextData = JSON.parse(jsonStr)
    
    // Naviguer dans la structure Next.js pour trouver les props de page
    const props = nextData?.props?.pageProps?.ad ?? 
                  nextData?.props?.pageProps?.item ??
                  nextData?.props?.initialState?.ad ??
                  null
    
    if (!props) return null
    
    const result: Partial<ExtractedListingData> = {}
    const mileageCandidates: MileageCandidate[] = []
    
    // Extraire titre
    result.title = props.subject || props.title || props.name || null
    
    // Extraire prix
    if (props.price && Array.isArray(props.price) && props.price.length > 0) {
      result.price_eur = Math.round(Number(props.price[0]) || 0) || null
    } else if (typeof props.price === 'number') {
      result.price_eur = Math.round(props.price) || null
    } else if (typeof props.price === 'string') {
      result.price_eur = parsePriceEUR(props.price) || null
    }
    
    // Extraire kilométrage - COLLECTER TOUS LES CANDIDATS
    // Chercher dans plusieurs emplacements possibles de la structure JSON
    
    // Candidat 1: props.attributes.mileage (priorité haute - structure principale)
    if (props.attributes?.mileage !== null && props.attributes?.mileage !== undefined) {
      const rawValue = String(props.attributes.mileage)
      const mileageValue = typeof props.attributes.mileage === 'number'
        ? Math.round(props.attributes.mileage)
        : parseMileageKM(rawValue)
      if (mileageValue && mileageValue > 0) {
        mileageCandidates.push({
          value: mileageValue,
          source: 'NEXT_DATA.attributes.mileage',
          raw: rawValue,
        })
        // Log de diagnostic pour détecter les problèmes de parsing
        if (typeof props.attributes.mileage === 'string' && mileageValue < 1000 && rawValue.length > 3) {
          console.warn('[Mileage] Valeur suspecte extraite:', {
            raw: rawValue,
            parsed: mileageValue,
            source: 'NEXT_DATA.attributes.mileage',
          })
        }
      }
    }
    
    // Candidat 2: props.vehicle.attributes.mileage (priorité haute - structure véhicule)
    if (props.vehicle?.attributes?.mileage !== null && props.vehicle?.attributes?.mileage !== undefined) {
      const mileageValue = typeof props.vehicle.attributes.mileage === 'number'
        ? Math.round(props.vehicle.attributes.mileage)
        : parseMileageKM(String(props.vehicle.attributes.mileage))
      if (mileageValue && mileageValue > 0) {
        mileageCandidates.push({
          value: mileageValue,
          source: 'NEXT_DATA.vehicle.attributes.mileage',
          raw: String(props.vehicle.attributes.mileage),
        })
      }
    }
    
    // Candidat 3: props.vehicle.mileage
    if (props.vehicle?.mileage !== null && props.vehicle?.mileage !== undefined) {
      const mileageValue = typeof props.vehicle.mileage === 'number'
        ? Math.round(props.vehicle.mileage)
        : parseMileageKM(String(props.vehicle.mileage))
      if (mileageValue && mileageValue > 0) {
        mileageCandidates.push({
          value: mileageValue,
          source: 'NEXT_DATA.vehicle.mileage',
          raw: String(props.vehicle.mileage),
        })
      }
    }
    
    // Candidat 4: props.mileage
    if (props.mileage !== null && props.mileage !== undefined) {
      const mileageValue = typeof props.mileage === 'number' 
        ? Math.round(props.mileage) 
        : parseMileageKM(String(props.mileage))
      if (mileageValue && mileageValue > 0) {
        mileageCandidates.push({
          value: mileageValue,
          source: 'NEXT_DATA.mileage',
          raw: String(props.mileage),
        })
      }
    }
    
    // Candidat 5: Chercher dans d'autres structures possibles
    // Parfois le kilométrage est dans props.key_values ou props.specs
    if (props.key_values && Array.isArray(props.key_values)) {
      for (const kv of props.key_values) {
        if (kv && (kv.key === 'mileage' || kv.key === 'kilometrage' || kv.key === 'km')) {
          const mileageValue = typeof kv.value === 'number'
            ? Math.round(kv.value)
            : parseMileageKM(String(kv.value))
          if (mileageValue && mileageValue > 0) {
            mileageCandidates.push({
              value: mileageValue,
              source: 'NEXT_DATA.key_values',
              raw: String(kv.value),
            })
          }
        }
      }
    }
    
    // Candidat 6: props.specs ou props.vehicle.specs
    const specs = props.specs || props.vehicle?.specs
    if (specs && typeof specs === 'object') {
      for (const [key, value] of Object.entries(specs)) {
        if ((key.toLowerCase().includes('mileage') || key.toLowerCase().includes('kilometrage') || key.toLowerCase().includes('km')) && value) {
          const mileageValue = typeof value === 'number'
            ? Math.round(value)
            : parseMileageKM(String(value))
          if (mileageValue && mileageValue > 0) {
            mileageCandidates.push({
              value: mileageValue,
              source: 'NEXT_DATA.specs',
              raw: String(value),
            })
          }
        }
      }
    }
    
    // Garder la compatibilité avec l'ancien format
    if (mileageCandidates.length > 0) {
      result.mileage_km = mileageCandidates[0].value
    }
    
    // Extraire année
    if (props.regdate) {
      if (typeof props.regdate === 'number') {
        result.year = props.regdate || null
      } else {
        result.year = parseYear(String(props.regdate)) || null
      }
    } else if (props.vehicle && props.vehicle.regdate) {
      if (typeof props.vehicle.regdate === 'number') {
        result.year = props.vehicle.regdate || null
      } else {
        result.year = parseYear(String(props.vehicle.regdate)) || null
      }
    } else if (props.year) {
      result.year = typeof props.year === 'number' ? props.year : parseYear(String(props.year)) || null
    }
    
    // Extraire carburant
    if (props.energy) {
      result.fuel = parseFuel(String(props.energy)) || null
    } else if (props.vehicle && props.vehicle.energy) {
      result.fuel = parseFuel(String(props.vehicle.energy)) || null
    }
    
    // Extraire transmission
    if (props.gearbox) {
      result.gearbox = parseTransmission(String(props.gearbox)) || null
    } else if (props.vehicle && props.vehicle.gearbox) {
      result.gearbox = parseTransmission(String(props.vehicle.gearbox)) || null
    }
    
    // Extraire localisation
    if (props.location) {
      if (typeof props.location === 'string') {
        result.location = props.location
      } else if (props.location.city) {
        result.location = props.location.city
        if (props.location.department) {
          result.location += ` (${props.location.department})`
        }
      }
    }
    
    // Extraire description
    if (props.body) {
      result.description = String(props.body) || null
    } else if (props.description) {
      result.description = String(props.description) || null
    }
    
    // Extraire nombre de photos
    if (props.images && Array.isArray(props.images)) {
      result.photos_count = props.images.length
    } else if (props.photos && Array.isArray(props.photos)) {
      result.photos_count = props.photos.length
    }
    
    // Historique (Leboncoin a parfois un rapport d'historique)
    result.has_history_report = props.hasHistoryReport || 
                                props.history_report || 
                                props.vehicle?.hasHistoryReport || 
                                null // null si non déterminé, sera vérifié dans la description
    
    return { ...result, _source: 'NEXT_DATA', mileageCandidates }
  } catch (error) {
    console.error('Erreur extraction __NEXT_DATA__:', error)
    return null
  }
}

/**
 * Extrait depuis JSON-LD (fallback)
 */
function extractFromJSONLD(html: string): (Partial<ExtractedListingData> & { _source?: 'JSON_LD' }) | null {
  try {
    const jsonLdMatch = html.match(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)
    if (!jsonLdMatch) return null
    
    for (const script of jsonLdMatch) {
      const jsonStr = script.replace(/<script[^>]*>/, '').replace(/<\/script>/, '')
      const jsonLd = JSON.parse(jsonStr)
      
      if (jsonLd['@type'] === 'Product' || jsonLd['@type'] === 'Vehicle') {
        const result: Partial<ExtractedListingData> = {}
        
        result.title = jsonLd.name || null
        if (jsonLd.offers?.price) {
          result.price_eur = parsePriceEUR(String(jsonLd.offers.price)) || null
        }
        result.description = jsonLd.description || null
        
        return { ...result, _source: 'JSON_LD' }
      }
    }
    
    return null
  } catch (error) {
    return null
  }
}

/**
 * Extrait depuis le DOM HTML (dernier recours)
 */
function extractFromDOM(html: string): (Partial<ExtractedListingData> & { _source?: 'DOM'; mileageCandidates?: MileageCandidate[] }) | null {
  // Utiliser une regex simple pour extraire depuis le HTML
  const result: Partial<ExtractedListingData> = {}
  const mileageCandidates: MileageCandidate[] = []
  
  // Prix: chercher patterns comme "8 000 €", "8000€"
  const priceMatch = html.match(/(\d{1,3}(?:\s?\d{3})*)\s*€/i)
  if (priceMatch) {
    result.price_eur = parsePriceEUR(priceMatch[1]) || null
  }
  
  // Kilométrage: chercher TOUS les patterns possibles
  // Pattern 1: "216 515 km" ou "216515 km" ou "139 000 km"
  // Amélioration : chercher avec regex plus robuste pour capturer les espaces
  const mileagePatterns = [
    /(\d{1,3}(?:\s?\d{3}){0,2})\s*km/gi,  // "139 000 km" ou "139000 km"
    /(\d{1,3}(?:\u00A0?\d{3}){0,2})\s*km/gi,  // Espaces insécables
    /kilométrage[^>]*>[\s\D]*?(\d{1,3}(?:\s?\d{3}){0,2})/gi,  // Dans un élément "kilométrage"
    /mileage[^>]*>[\s\D]*?(\d{1,3}(?:\s?\d{3}){0,2})/gi,  // Dans un élément "mileage"
  ]
  
  for (const pattern of mileagePatterns) {
    const matches = html.match(pattern)
    if (matches) {
      for (const match of matches) {
        const numberMatch = match.match(/(\d{1,3}(?:\s?\d{3}){0,2})/)
        if (numberMatch) {
          const mileageValue = parseMileageKM(numberMatch[1])
          if (mileageValue && mileageValue > 0) {
            mileageCandidates.push({
              value: mileageValue,
              source: 'DOM.regex',
              raw: match.trim(),
            })
          }
        }
      }
    }
  }
  
  // Pattern 2: data-mileage attribute
  const dataMileageMatch = html.match(/data-mileage=["'](\d+)["']/i)
  if (dataMileageMatch) {
    const mileageValue = parseMileageKM(dataMileageMatch[1])
    if (mileageValue) {
      mileageCandidates.push({
        value: mileageValue,
        source: 'DOM.data-mileage',
        raw: dataMileageMatch[0],
      })
    }
  }
  
  // Pattern 3: class ou id contenant "kilometrage" ou "mileage"
  const specMatches = html.match(/(?:kilometrage|mileage)[^>]*>[\s\D]*?(\d{1,3}(?:\s?\d{3})*)/i)
  if (specMatches) {
    const mileageValue = parseMileageKM(specMatches[1])
    if (mileageValue) {
      mileageCandidates.push({
        value: mileageValue,
        source: 'DOM.specs.kilometrage',
        raw: specMatches[0],
      })
    }
  }
  
  // Garder la compatibilité
  if (mileageCandidates.length > 0) {
    result.mileage_km = mileageCandidates[0].value
  }
  
  // Année: chercher années entre 1990 et maintenant
  const yearMatch = html.match(/\b(19[9]\d|20[0-3]\d)\b/)
  if (yearMatch) {
    result.year = parseYear(yearMatch[1]) || null
  }
  
  return { ...result, _source: 'DOM', mileageCandidates }
}

/**
 * Extrait les données d'une page Leboncoin
 */
export function extractLeboncoinData(html: string): ExtractedListingData {
  let extraction_source: 'NEXT_DATA' | 'JSON_LD' | 'DOM' | 'MIXED' = 'DOM'
  const extractedParts: (Partial<ExtractedListingData> & { mileageCandidates?: MileageCandidate[] })[] = []
  const allMileageCandidates: MileageCandidate[] = []
  
  // 1. Essayer __NEXT_DATA__ (priorité)
  const nextData = extractFromNextData(html)
  if (nextData) {
    extractedParts.push(nextData)
    if (nextData.mileageCandidates) {
      allMileageCandidates.push(...nextData.mileageCandidates)
    }
    extraction_source = nextData._source || 'NEXT_DATA'
  }
  
  // 2. Fallback JSON-LD
  const jsonLdData = extractFromJSONLD(html)
  if (jsonLdData) {
    extractedParts.push(jsonLdData)
    if (extraction_source === 'DOM') {
      extraction_source = jsonLdData._source || 'JSON_LD'
    } else {
      extraction_source = 'MIXED'
    }
  }
  
  // 3. Fallback DOM pour compléter les champs manquants
  const domData = extractFromDOM(html)
  if (domData) {
    extractedParts.push(domData)
    if (domData.mileageCandidates) {
      allMileageCandidates.push(...domData.mileageCandidates)
    }
    if (extraction_source === 'DOM') {
      extraction_source = domData._source || 'DOM'
    } else {
      extraction_source = 'MIXED'
    }
  }
  
  // Extraire aussi depuis le texte de description si disponible
  const description = extractedParts.find(p => p.description)?.description
  if (description) {
    // Utiliser match avec regex global au lieu de matchAll pour compatibilité
    const textMatches = description.match(/(\d{1,3}(?:\s?\d{3})*)\s*km/gi)
    if (textMatches) {
      for (const match of textMatches) {
        const numberMatch = match.match(/(\d{1,3}(?:\s?\d{3})*)/)
        if (numberMatch) {
          const mileageValue = parseMileageKM(numberMatch[1])
          if (mileageValue) {
            allMileageCandidates.push({
              value: mileageValue,
              source: 'TEXT_REGEX(description)',
              raw: match,
            })
          }
        }
      }
    }
  }
  
  // Fusionner les données (priorité aux premières sources)
  const merged: Partial<ExtractedListingData> = {}
  for (const part of extractedParts.reverse()) {
    Object.assign(merged, part)
  }
  
  // Vérifier l'historique depuis la description
  if (merged.description && merged.has_history_report === null) {
    merged.has_history_report = hasMaintenanceHistory(merged.description)
  }
  
  // Dédupliquer les candidats (même valeur = garder celui avec meilleure source)
  const uniqueCandidates = new Map<number, MileageCandidate>()
  for (const candidate of allMileageCandidates) {
    const existing = uniqueCandidates.get(candidate.value)
    if (!existing || candidate.source.includes('NEXT_DATA') || candidate.source.includes('attributes')) {
      uniqueCandidates.set(candidate.value, candidate)
    }
  }
  
  return {
    title: merged.title || null,
    price_eur: merged.price_eur || null,
    mileage_km: merged.mileage_km || null, // DEPRECATED
    mileageSelection: {
      mileageCandidates: Array.from(uniqueCandidates.values()),
      mileage_km_final: null, // Sera calculé par chooseBestMileage
      mileage_confidence: 'low',
      mileage_notes: [],
    },
    year: merged.year || null,
    fuel: merged.fuel || null,
    gearbox: merged.gearbox || null,
    location: merged.location || null,
    description: merged.description || null,
    photos_count: merged.photos_count || null,
    has_history_report: merged.has_history_report || null,
    extraction_source,
  }
}


