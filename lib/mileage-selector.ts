/**
 * Sélection intelligente du kilométrage parmi plusieurs candidats
 */

import { buildRedFlags, type RedFlag } from './red-flags'

export interface MileageCandidate {
  value: number
  source: string
  raw: string
}

export interface MileageSelectionResult {
  mileage_km_final: number | null
  mileage_confidence: 'high' | 'medium' | 'low'
  mileage_notes: string[]
  redFlags: RedFlag[]
}

/**
 * Sélectionne le meilleur kilométrage parmi les candidats
 */
export function chooseBestMileage(params: {
  candidates: MileageCandidate[]
  year?: number | null
  title?: string | null
  description?: string | null
}): MileageSelectionResult {
  const { candidates, year, title, description } = params
  const notes: string[] = []
  const redFlags: RedFlag[] = []
  const currentYear = new Date().getFullYear()

  // Filtrer les valeurs impossibles
  const validCandidates = candidates.filter(c => {
    if (c.value <= 0 || c.value > 1000000) {
      notes.push(`Candidat ${c.value} km (${c.source}) rejeté : valeur impossible`)
      return false
    }
    return true
  })

  if (validCandidates.length === 0) {
    return {
      mileage_km_final: null,
      mileage_confidence: 'low',
      mileage_notes: ['Aucun candidat valide trouvé'],
      redFlags: [],
    }
  }

  // Si une seule valeur valide, la retourner
  if (validCandidates.length === 1) {
    const candidate = validCandidates[0]
    const age = year ? currentYear - year : null

    // Vérifier cohérence si on a l'année
    if (age !== null && age >= 1) {
      if (candidate.value < 500) {
        redFlags.push({
          type: 'mileage_inconsistent',
          severity: 'critical',
          message: 'Kilométrage incohérent',
          details: `Kilométrage anormalement faible (${candidate.value} km) pour un véhicule de ${age} an${age > 1 ? 's' : ''}. Probable erreur de saisie ou trafic du compteur.`,
        })
        notes.push(`Kilométrage suspect : ${candidate.value} km pour véhicule de ${age} an${age > 1 ? 's' : ''}`)
        return {
          mileage_km_final: null, // Ne pas utiliser une valeur incohérente
          mileage_confidence: 'low',
          mileage_notes: notes,
          redFlags,
        }
      } else if (candidate.value < 2000 && age >= 2) {
        redFlags.push({
          type: 'mileage_inconsistent',
          severity: 'high',
          message: 'Kilométrage suspect',
          details: `Kilométrage très faible (${candidate.value} km) pour un véhicule de ${age} ans. Vérification impérative du compteur.`,
        })
        notes.push(`Kilométrage suspect : ${candidate.value} km pour véhicule de ${age} ans`)
      }
    }

    return {
      mileage_km_final: candidate.value,
      mileage_confidence: age !== null && candidate.value >= 500 ? 'high' : 'medium',
      mileage_notes: notes.length > 0 ? notes : [`Kilométrage unique détecté : ${candidate.value} km (${candidate.source})`],
      redFlags,
    }
  }

  // Plusieurs candidats : choisir le plus plausible
  const age = year ? currentYear - year : null

  // Filtrer les valeurs incohérentes si on a l'année
  let plausibleCandidates = validCandidates
  if (age !== null && age >= 1) {
    const inconsistent = validCandidates.filter(c => {
      if (c.value < 500) {
        notes.push(`Candidat ${c.value} km (${c.source}) rejeté : incohérent pour véhicule de ${age} an${age > 1 ? 's' : ''}`)
        return true
      }
      if (c.value < 2000 && age >= 2) {
        notes.push(`Candidat ${c.value} km (${c.source}) suspect : très faible pour véhicule de ${age} ans`)
        return true
      }
      return false
    })

    if (inconsistent.length > 0) {
      plausibleCandidates = validCandidates.filter(c => !inconsistent.includes(c))
      
      if (inconsistent.length === validCandidates.length) {
        // Tous les candidats sont incohérents
        redFlags.push({
          type: 'mileage_inconsistent',
          severity: 'critical',
          message: 'Kilométrage incohérent (valeurs multiples)',
          details: `Plusieurs valeurs de kilométrage détectées mais toutes incohérentes pour un véhicule de ${age} an${age > 1 ? 's' : ''}. Risque de fraude ou erreur majeure.`,
        })
        return {
          mileage_km_final: null,
          mileage_confidence: 'low',
          mileage_notes: notes,
          redFlags,
        }
      }
    }
  }

  // Priorité des sources (défini en dehors du if pour être accessible partout)
  const sourcePriority: Record<string, number> = {
    'NEXT_DATA.attributes.mileage': 10,
    'NEXT_DATA.vehicle.attributes.mileage': 10,
    'NEXT_DATA.vehicle.mileage': 9,
    'NEXT_DATA.mileage': 8,
    'DOM.specs.kilometrage': 7,
    'DOM.data-mileage': 6,
    'DOM.regex': 5,
    'TEXT_REGEX(description)': 5,
    'TEXT_REGEX(title)': 4,
    'JSON_LD': 3,
    'DOM': 2,
    'OTHER': 1,
  }

  // Si plusieurs candidats plausibles, prioriser par source ET valeur
  if (plausibleCandidates.length > 1) {

    // Filtrer les valeurs trop faibles si on a des valeurs plus élevées cohérentes
    const maxValue = Math.max(...plausibleCandidates.map(c => c.value))
    const minValue = Math.min(...plausibleCandidates.map(c => c.value))
    
    // Si différence importante (> 10x), rejeter les valeurs très faibles
    let filteredCandidates = plausibleCandidates
    if (maxValue > minValue * 10) {
      // Rejeter les valeurs < 1000 si on a des valeurs > 10000
      filteredCandidates = plausibleCandidates.filter(c => {
        if (maxValue > 10000 && c.value < 1000) {
          notes.push(`Candidat ${c.value} km (${c.source}) rejeté : valeur trop faible comparée à ${maxValue} km`)
          return false
        }
        return true
      })
      
      // Si on a filtré tous les candidats, garder les originaux
      if (filteredCandidates.length === 0) {
        filteredCandidates = plausibleCandidates
      }
    }

    filteredCandidates.sort((a, b) => {
      const priorityA = sourcePriority[a.source] || 0
      const priorityB = sourcePriority[b.source] || 0
      
      // PRIORITÉ 1 : Source la plus fiable (NEXT_DATA.attributes en premier)
      if (priorityA !== priorityB) return priorityB - priorityA
      
      // PRIORITÉ 2 : Cohérence avec l'âge du véhicule
      if (age !== null && age >= 1) {
        const avgKmPerYear = 15000 // Moyenne française
        const expectedMaxKm = age * avgKmPerYear * 1.5 // 1.5x pour tolérer usage intensif
        const expectedMinKm = Math.max(0, age * avgKmPerYear * 0.3) // Minimum réaliste
        
        // Pénaliser les valeurs incohérentes (trop élevées ou trop faibles)
        const aIsCoherent = a.value >= expectedMinKm && a.value <= expectedMaxKm
        const bIsCoherent = b.value >= expectedMinKm && b.value <= expectedMaxKm
        
        // Si une valeur est cohérente et l'autre non, choisir la cohérente
        if (aIsCoherent && !bIsCoherent) return -1
        if (!aIsCoherent && bIsCoherent) return 1
        
        // Si les deux sont cohérentes, préférer la valeur la plus élevée (mais raisonnable)
        if (aIsCoherent && bIsCoherent) {
          // Préférer la valeur la plus proche de la moyenne attendue
          const expectedAvg = age * avgKmPerYear
          const aDistance = Math.abs(a.value - expectedAvg)
          const bDistance = Math.abs(b.value - expectedAvg)
          if (Math.abs(aDistance - bDistance) > 10000) {
            // Si différence significative, choisir la plus proche de la moyenne
            return aDistance - bDistance
          }
        }
      }
      
      // PRIORITÉ 3 : Si même priorité et cohérence, choisir la valeur la plus élevée
      // MAIS seulement si la différence n'est pas trop importante (éviter les erreurs)
      const valueDiff = Math.abs(a.value - b.value)
      const valueRatio = Math.max(a.value, b.value) / Math.min(a.value, b.value)
      
      // Si différence > 50%, préférer la valeur la plus cohérente avec l'âge
      if (valueRatio > 1.5 && age !== null && age >= 1) {
        const avgKmPerYear = 15000
        const expectedAvg = age * avgKmPerYear
        const aDistance = Math.abs(a.value - expectedAvg)
        const bDistance = Math.abs(b.value - expectedAvg)
        return aDistance - bDistance
      }
      
      return b.value - a.value
    })

    let selected = filteredCandidates[0]
    const otherValues = filteredCandidates.slice(1).map(c => `${c.value.toLocaleString('fr-FR')} km (${c.source})`)

    // VÉRIFICATION FINALE : Si la valeur sélectionnée est incohérente avec l'âge, chercher une alternative
    if (age !== null && age >= 1) {
      const avgKmPerYear = 15000
      const expectedAvg = age * avgKmPerYear
      const expectedMax = age * avgKmPerYear * 1.5
      const expectedMin = Math.max(0, age * avgKmPerYear * 0.3)
      
      // Si la valeur sélectionnée est trop élevée (ex: 138000 pour un véhicule de 11 ans)
      if (selected.value > expectedMax) {
        notes.push(`⚠️ Valeur initialement sélectionnée (${selected.value.toLocaleString('fr-FR')} km) trop élevée pour véhicule de ${age} an${age > 1 ? 's' : ''} (max attendu: ${expectedMax.toLocaleString('fr-FR')} km)`)
        
        // Chercher une alternative plus cohérente parmi les autres candidats
        const coherentAlternatives = filteredCandidates.filter(c => 
          c.value >= expectedMin && c.value <= expectedMax && c.value !== selected.value
        )
        
        if (coherentAlternatives.length > 0) {
          // Trier les alternatives par priorité de source puis par proximité à la moyenne
          coherentAlternatives.sort((a, b) => {
            const priorityA = sourcePriority[a.source] || 0
            const priorityB = sourcePriority[b.source] || 0
            if (priorityA !== priorityB) return priorityB - priorityA
            const aDistance = Math.abs(a.value - expectedAvg)
            const bDistance = Math.abs(b.value - expectedAvg)
            return aDistance - bDistance
          })
          
          const betterChoice = coherentAlternatives[0]
          notes.push(`✅ Alternative cohérente sélectionnée : ${betterChoice.value.toLocaleString('fr-FR')} km (${betterChoice.source}) au lieu de ${selected.value.toLocaleString('fr-FR')} km`)
          selected = betterChoice
        } else {
          notes.push(`⚠️ Aucune alternative cohérente trouvée, utilisation de ${selected.value.toLocaleString('fr-FR')} km malgré l'incohérence`)
        }
      } else if (selected.value < expectedMin) {
        notes.push(`⚠️ Valeur sélectionnée (${selected.value.toLocaleString('fr-FR')} km) inférieure à l'attendu pour un véhicule de ${age} an${age > 1 ? 's' : ''} (min attendu: ${expectedMin.toLocaleString('fr-FR')} km)`)
      }
    }

    notes.push(`Plusieurs candidats détectés (${filteredCandidates.length}). Sélectionné : ${selected.value.toLocaleString('fr-FR')} km (${selected.source})`)
    if (otherValues.length > 0) {
      notes.push(`Autres valeurs rejetées : ${otherValues.join(', ')}`)
    }

    // Si conflit fort (différence > 2x), red flag
    if (filteredCandidates.length > 1) {
      const filteredMaxValue = Math.max(...filteredCandidates.map(c => c.value))
      const filteredMinValue = Math.min(...filteredCandidates.map(c => c.value))
      if (filteredMaxValue > filteredMinValue * 2) {
        redFlags.push({
          type: 'mileage_inconsistent',
          severity: 'high',
          message: 'Kilométrage incohérent (valeurs multiples)',
          details: `Plusieurs valeurs de kilométrage détectées (${filteredCandidates.map(c => `${c.value.toLocaleString('fr-FR')} km (${c.source})`).join(', ')}). La valeur ${selected.value.toLocaleString('fr-FR')} km a été sélectionnée mais vérification impérative recommandée.`,
        })
      }
    }

    return {
      mileage_km_final: selected.value,
      mileage_confidence: filteredCandidates.length === 1 ? 'high' : 'medium',
      mileage_notes: notes,
      redFlags,
    }
  }

  // Un seul candidat plausible
  const selected = plausibleCandidates[0]
  return {
    mileage_km_final: selected.value,
    mileage_confidence: age !== null && selected.value >= 500 ? 'high' : 'medium',
    mileage_notes: notes.length > 0 ? notes : [`Kilométrage sélectionné : ${selected.value} km (${selected.source})`],
    redFlags,
  }
}

