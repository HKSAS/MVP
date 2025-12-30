/**
 * Base de données des faiblesses connues par modèle/motorisation
 */

export interface KnownIssue {
  category: string
  items: string[]
}

/**
 * Retourne les faiblesses connues pour un modèle/motorisation
 */
export function getKnownIssues(
  brand?: string,
  model?: string,
  fuel?: string,
  transmission?: string,
  mileage?: number
): KnownIssue[] {
  if (!brand || !model) return []

  const brandLower = brand.toLowerCase()
  const modelLower = model.toLowerCase()
  const fuelLower = fuel?.toLowerCase() || ''
  const transmissionLower = transmission?.toLowerCase() || ''
  const issues: KnownIssue[] = []

  // Volkswagen Golf
  if (brandLower.includes('volkswagen') || brandLower.includes('vw')) {
    if (modelLower.includes('golf')) {
      // Motorisation 1.6 TDI
      if (fuelLower.includes('diesel') || fuelLower.includes('tdi')) {
        issues.push({
          category: 'Moteur 1.6 TDI',
          items: [
            'Vanne EGR encrassée (fréquent après gros kilométrage, nettoyage nécessaire)',
            'FAP (Filtre à particules) à surveiller si usage urbain prédominant',
            'Turbo à vérifier au-delà de 180 000 km (risque de défaillance)',
          ],
        })
      }

      // Transmission DSG
      if (transmissionLower.includes('dsg') || transmissionLower.includes('automatique')) {
        issues.push({
          category: 'Transmission DSG',
          items: [
            'Vidange obligatoire tous les 60 000 km (preuves à demander impérativement)',
            'Embrayage DSG à surveiller au-delà de 150 000 km (coût de remplacement élevé ~1500-2000€)',
            'Mechatronique (unité de commande) sensible, réparations coûteuses si défaillance',
          ],
        })
      }

      // Embrayage manuel
      if (transmissionLower.includes('manuelle') || !transmissionLower.includes('dsg')) {
        if (mileage && mileage > 200000) {
          issues.push({
            category: 'Transmission',
            items: [
              'Embrayage/volant moteur possible fatigué au-delà de 200 000 km (coût ~800-1200€)',
              'Boîte de vitesses à vérifier (synchroniseurs, bruits)',
            ],
          })
        }
      }

      // Général Golf 7
      issues.push({
        category: 'Général Golf 7',
        items: [
          'Capteurs ABS/ESP parfois défaillants (vérifier voyants au tableau de bord)',
          'Rétroviseurs électriques fragiles (moteurs de pliage)',
        ],
      })
    }

    // Volkswagen Polo
    if (modelLower.includes('polo')) {
      if (fuelLower.includes('diesel')) {
        issues.push({
          category: 'Moteur Diesel',
          items: [
            'FAP à surveiller sur modèles récents',
            'EGR à nettoyer régulièrement',
          ],
        })
      }
    }
  }

  // Renault
  if (brandLower.includes('renault')) {
    if (modelLower.includes('clio')) {
      if (fuelLower.includes('diesel') || fuelLower.includes('dci')) {
        issues.push({
          category: 'Moteur DCI',
          items: [
            'Injecteurs à vérifier au-delà de 150 000 km',
            'Turbo sensible, contrôler fumées et bruits',
          ],
        })
      }
    }

    if (modelLower.includes('megane')) {
      issues.push({
        category: 'Général Mégane',
        items: [
          'Capteurs de pression des pneus parfois défaillants',
          'Électronique embarquée à vérifier (écran tactile)',
        ],
      })
    }
  }

  // Peugeot
  if (brandLower.includes('peugeot')) {
    if (modelLower.includes('208') || modelLower.includes('308')) {
      if (fuelLower.includes('diesel') || fuelLower.includes('hdi')) {
        issues.push({
          category: 'Moteur HDI',
          items: [
            'FAP à surveiller (nettoyage régulier nécessaire)',
            'Courroie de distribution à vérifier (remplacement tous les 160 000 km ou 10 ans)',
          ],
        })
      }
    }
  }

  // Audi
  if (brandLower.includes('audi')) {
    if (modelLower.includes('a3')) {
      if (fuelLower.includes('diesel') || fuelLower.includes('tdi')) {
        issues.push({
          category: 'Moteur TDI',
          items: [
            'FAP et EGR similaires aux VW (même groupe)',
            'Coûts d\'entretien plus élevés (pièces premium)',
          ],
        })
      }

      if (transmissionLower.includes('s-tronic') || transmissionLower.includes('dsg')) {
        issues.push({
          category: 'Transmission S-Tronic',
          items: [
            'Même technologie que DSG VW, mêmes précautions',
            'Vidanges régulières impératives',
          ],
        })
      }
    }
  }

  // BMW
  if (brandLower.includes('bmw')) {
    if (modelLower.includes('serie 3') || modelLower.includes('320') || modelLower.includes('318')) {
      issues.push({
        category: 'Général BMW Série 3',
        items: [
          'Coûts d\'entretien élevés (pièces et main d\'œuvre premium)',
          'Électronique complexe, diagnostics coûteux en cas de panne',
          'Suspensions à vérifier (amortisseurs, triangles)',
        ],
      })
    }
  }

  // Général Diesel
  if (fuelLower.includes('diesel')) {
    if (mileage && mileage > 150000) {
      issues.push({
        category: 'Moteur Diesel (général)',
        items: [
          'FAP (Filtre à particules) à vérifier impérativement au-delà de 150 000 km',
          'Turbo à contrôler (fumées, bruits, perte de puissance)',
          'Injecteurs à vérifier (bruit, consommation)',
        ],
      })
    }
  }

  // Général boîte automatique
  if (transmissionLower.includes('automatique') && !transmissionLower.includes('dsg') && !transmissionLower.includes('s-tronic')) {
    issues.push({
      category: 'Transmission Automatique',
      items: [
        'Vidange de boîte à vérifier (selon constructeur, tous les 60-100k km)',
        'Fluide de transmission à contrôler (couleur, niveau)',
      ],
    })
  }

  return issues
}












