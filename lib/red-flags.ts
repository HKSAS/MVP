/**
 * Système de détection de Red Flags (alertes bloquantes)
 */

export interface RedFlag {
  type: 'mileage_inconsistent' | 'price_too_low' | 'missing_ct' | 'inconsistent_listing' | 'suspicious_seller'
  severity: 'high' | 'critical'
  message: string
  details: string
}

export interface RedFlagsInput {
  mileage_km?: number | null
  year?: number | null
  price_eur?: number | null
  marketMin?: number | null
  hasCT?: boolean | null
  description?: string | null
  title?: string | null
}

/**
 * Construit la liste des red flags pour une annonce
 */
export function buildRedFlags(input: RedFlagsInput): RedFlag[] {
  const flags: RedFlag[] = []
  const currentYear = new Date().getFullYear()

  // 1. Kilométrage incohérent (probable fraude/erreur)
  if (input.mileage_km !== null && input.mileage_km !== undefined && input.year) {
    const age = currentYear - input.year
    const avgYearlyKm = input.mileage_km / Math.max(1, age)
    
    // Si kilométrage très faible (< 500 km) sur véhicule de plus d'1 an
    if (input.mileage_km < 500 && age >= 1) {
      flags.push({
        type: 'mileage_inconsistent',
        severity: 'critical',
        message: 'Kilométrage incohérent',
        details: `Kilométrage anormalement faible (${input.mileage_km} km) pour un véhicule de ${age} an${age > 1 ? 's' : ''}. Probable erreur de saisie ou trafic du compteur.`,
      })
    }
    
    // Si kilométrage très faible (< 2000 km) sur véhicule de plus de 2 ans
    if (input.mileage_km < 2000 && age >= 2) {
      flags.push({
        type: 'mileage_inconsistent',
        severity: 'high',
        message: 'Kilométrage suspect',
        details: `Kilométrage très faible (${input.mileage_km} km) pour un véhicule de ${age} ans. Vérification impérative du compteur.`,
      })
    }
    
    // Si kilométrage anormalement élevé pour l'âge (> 300k km sur < 5 ans = >60k km/an)
    if (input.mileage_km > 300000 && age < 5 && avgYearlyKm > 60000) {
      flags.push({
        type: 'mileage_inconsistent',
        severity: 'high',
        message: 'Kilométrage anormalement élevé',
        details: `Kilométrage très élevé (${input.mileage_km.toLocaleString('fr-FR')} km) pour un véhicule de ${age} an${age > 1 ? 's' : ''}. Usage intensif suspect.`,
      })
    }
  }

  // 2. Prix anormalement bas (< 75% du marché minimum)
  if (input.price_eur !== null && input.price_eur !== undefined && input.marketMin) {
    const priceRatio = input.price_eur / input.marketMin
    if (priceRatio < 0.75) {
      flags.push({
        type: 'price_too_low',
        severity: 'high',
        message: 'Prix anormalement bas',
        details: `Prix (${input.price_eur.toLocaleString('fr-FR')} €) significativement en-dessous du marché estimé (min: ${input.marketMin.toLocaleString('fr-FR')} €). Risque d'arnaque ou vice caché majeur.`,
      })
    }
  }

  // 3. Contrôle technique manquant (si mentionné dans la description)
  if (input.hasCT === false || (input.description && !input.description.toLowerCase().match(/contrôle technique|ct|ct ok/i))) {
    // Pas de flag automatique car CT peut ne pas être mentionné
    // Mais si explicitement mentionné comme absent, flag
    if (input.description?.toLowerCase().includes('sans ct') || input.description?.toLowerCase().includes('ct expiré')) {
      flags.push({
        type: 'missing_ct',
        severity: 'high',
        message: 'Contrôle technique absent ou expiré',
        details: 'Le contrôle technique est absent ou expiré. Vérification légale obligatoire avant achat.',
      })
    }
  }

  // 4. Incohérences dans l'annonce
  if (input.description && input.title) {
    const descLower = input.description.toLowerCase()
    const titleLower = input.title.toLowerCase()
    
    // Incohérence marque/modèle entre titre et description
    const titleBrand = titleLower.match(/\b(volkswagen|vw|renault|peugeot|citroën|bmw|audi|mercedes|ford|opel|fiat|seat|skoda)\b/)
    const descBrand = descLower.match(/\b(volkswagen|vw|renault|peugeot|citroën|bmw|audi|mercedes|ford|opel|fiat|seat|skoda)\b/)
    
    if (titleBrand && descBrand && titleBrand[0] !== descBrand[0]) {
      flags.push({
        type: 'inconsistent_listing',
        severity: 'high',
        message: 'Incohérence dans l\'annonce',
        details: 'Marque différente entre titre et description. Annonce suspecte.',
      })
    }
  }

  return flags
}

/**
 * Calcule le risk score ajusté avec les red flags
 */
export function adjustRiskScoreWithRedFlags(baseRiskScore: number, redFlags: RedFlag[]): number {
  if (redFlags.length === 0) return baseRiskScore
  
  // Si flags critiques, forcer risk score minimum à 80
  const hasCritical = redFlags.some(flag => flag.severity === 'critical')
  if (hasCritical) {
    return Math.max(80, baseRiskScore)
  }
  
  // Si flags high, augmenter le risk score
  const highFlags = redFlags.filter(flag => flag.severity === 'high')
  if (highFlags.length >= 2) {
    return Math.max(75, baseRiskScore)
  } else if (highFlags.length === 1) {
    return Math.max(65, baseRiskScore)
  }
  
  return baseRiskScore
}

/**
 * Détermine le risk level basé sur le risk score
 */
export function getRiskLevelFromScore(riskScore: number): 'low' | 'medium' | 'high' {
  if (riskScore >= 70) return 'high'
  if (riskScore >= 40) return 'medium'
  return 'low'
}












