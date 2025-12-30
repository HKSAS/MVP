/**
 * Normalisation centralisée des URLs d'annonces
 * Garantit que toutes les URLs sont absolues et valides
 */

const DOMAIN_MAP: Record<string, string> = {
  LeBonCoin: 'https://www.leboncoin.fr',
  LaCentrale: 'https://www.lacentrale.fr',
  ParuVendu: 'https://www.paruvendu.fr',
  AutoScout24: 'https://www.autoscout24.fr',
  LeParking: 'https://www.leparking.fr',
  ProCarLease: 'https://procarlease.com',
  TransakAuto: 'https://annonces.transakauto.com',
}

/**
 * Normalise spécifiquement les URLs LeBonCoin
 * Corrige le bug des URLs avec double /ad/ad/ qui causent des 404
 * 
 * Règles:
 * - Si input est une URL complète leboncoin.fr -> retourner URL nettoyée (sans double /ad/)
 * - Si input commence par "/ad/" -> retourner "https://www.leboncoin.fr" + input (mais vérifier que ce n'est pas "/ad/ad/")
 * - Si input commence par "/ad/ad/" -> remplacer par "/ad/"
 * - Si input est un id numérique "309..." -> retourner "https://www.leboncoin.fr/ad/<id>"
 * - Dans tous les cas: supprimer les query params et fragments
 */
export function normalizeLeboncoinUrl(input: string): string {
  if (!input || typeof input !== 'string' || input.trim() === '') {
    throw new Error('Input URL cannot be empty')
  }

  let url = input.trim()
  
  // Enlever les query params et fragments dès le début
  url = url.split('?')[0].split('#')[0]
  
  // Cas 1: ID numérique pur -> construire l'URL
  if (/^\d+$/.test(url)) {
    return `https://www.leboncoin.fr/ad/${url}`
  }
  
  // Cas 2: Déjà une URL complète leboncoin.fr
  if (url.includes('leboncoin.fr')) {
    try {
      const urlObj = new URL(url)
      let pathname = urlObj.pathname
      
      // Corriger le double /ad/ad/ (peut apparaître plusieurs fois)
      while (pathname.includes('/ad/ad/')) {
        pathname = pathname.replace(/\/ad\/ad\//g, '/ad/')
      }
      
      // Si le pathname contient /ad/<id>, extraire et normaliser (même s'il y a des suffixes comme /404)
      const adIdMatch = pathname.match(/\/ad\/(\d{6,})/)
      if (adIdMatch && adIdMatch[1]) {
        return `https://www.leboncoin.fr/ad/${adIdMatch[1]}`
      }
      // Fallback pour IDs plus courts
      const anyIdMatch = pathname.match(/\/ad\/(\d+)/)
      if (anyIdMatch && anyIdMatch[1]) {
        return `https://www.leboncoin.fr/ad/${anyIdMatch[1]}`
      }
      
      // Normaliser le domaine
      return `https://www.leboncoin.fr${pathname}`
    } catch {
      // URL mal formée, essayer de corriger manuellement
      url = url.replace(/https?:\/\/[^/]*leboncoin\.fr/, 'https://www.leboncoin.fr')
      // Corriger les doubles /ad/
      url = url.replace(/\/ad\/ad\//g, '/ad/')
      // Extraire l'ID si présent
      const adIdMatch = url.match(/\/ad\/(\d+)/)
      if (adIdMatch && adIdMatch[1]) {
        return `https://www.leboncoin.fr/ad/${adIdMatch[1]}`
      }
      return url.startsWith('http') ? url : `https://www.leboncoin.fr${url}`
    }
  }
  
  // Cas 3: Path relatif qui commence par "/ad/ad/" -> corriger en "/ad/"
  if (url.startsWith('/ad/ad/')) {
    url = url.replace(/^\/ad\/ad\//, '/ad/')
  }
  
  // Cas 4: Path relatif qui commence par "/ad/" -> préfixer avec le domaine
  if (url.startsWith('/ad/')) {
    // Vérifier qu'il n'y a pas de double /ad/ caché dans le path
    url = url.replace(/\/ad\/ad\//g, '/ad/')
    // Extraire l'ID pour enlever les suffixes comme /404
    const adIdMatch = url.match(/^\/ad\/(\d{6,})/)
    if (adIdMatch && adIdMatch[1]) {
      return `https://www.leboncoin.fr/ad/${adIdMatch[1]}`
    }
    // Fallback pour IDs plus courts
    const anyIdMatch = url.match(/^\/ad\/(\d+)/)
    if (anyIdMatch && anyIdMatch[1]) {
      return `https://www.leboncoin.fr/ad/${anyIdMatch[1]}`
    }
    return `https://www.leboncoin.fr${url}`
  }
  
  // Cas 5: Path relatif sans /ad/ mais contient /ad/ quelque part -> extraire l'ID et reconstruire
  if (url.includes('/ad/')) {
    // D'abord corriger les doubles /ad/ad/
    url = url.replace(/\/ad\/ad\//g, '/ad/')
    // Extraire l'ID d'annonce (6+ chiffres) même s'il y a des suffixes après
    const adIdMatch = url.match(/\/ad\/(\d{6,})/)
    if (adIdMatch && adIdMatch[1]) {
      return `https://www.leboncoin.fr/ad/${adIdMatch[1]}`
    }
    // Sinon, extraire n'importe quel ID
    const anyIdMatch = url.match(/\/ad\/(\d+)/)
    if (anyIdMatch && anyIdMatch[1]) {
      return `https://www.leboncoin.fr/ad/${anyIdMatch[1]}`
    }
    // Fallback: construire avec le path nettoyé
    return url.startsWith('/') 
      ? `https://www.leboncoin.fr${url.split('/').slice(0, 3).join('/')}` // Limiter à /ad/<id>
      : `https://www.leboncoin.fr/${url}`
  }
  
  // Cas 6: Path relatif générique
  if (url.startsWith('/')) {
    return `https://www.leboncoin.fr${url}`
  }
  
  // Fallback: construire avec le domaine
  return `https://www.leboncoin.fr/${url}`
}

/**
 * Normalise une URL d'annonce pour un site donné
 * Retourne null si l'URL est invalide
 * 
 * Pour LeBonCoin, utilise normalizeLeboncoinUrl() pour corriger les bugs de double /ad/ad/
 */
export function normalizeListingUrl(url: string | null | undefined, siteName: string): string | null {
  if (!url || typeof url !== 'string' || url.trim() === '') {
    return null
  }

  // Cas spécial LeBonCoin : utiliser le normalizer dédié
  if (siteName === 'LeBonCoin') {
    try {
      return normalizeLeboncoinUrl(url)
    } catch (error) {
      // Si le normalizer dédié échoue, fallback sur la logique générique
      // mais cela ne devrait pas arriver avec une implémentation robuste
      console.warn('[URL Normalizer] Erreur dans normalizeLeboncoinUrl, fallback générique', { url, error })
    }
  }

  let normalized = url.trim()

  // Si c'est déjà une URL absolue valide, la retourner telle quelle
  if (normalized.startsWith('http://') || normalized.startsWith('https://')) {
    try {
      new URL(normalized)
      return normalized
    } catch {
      // URL mal formée
      return null
    }
  }

  // Récupérer le domaine de base
  const baseDomain = DOMAIN_MAP[siteName]
  if (!baseDomain) {
    // Site inconnu, essayer de construire une URL absolue
    if (normalized.startsWith('/')) {
      return null // Pas de domaine de base
    }
    return `https://${normalized}`
  }

  // Construire l'URL absolue
  if (normalized.startsWith('/')) {
    normalized = baseDomain + normalized
  } else {
    normalized = `${baseDomain}/${normalized}`
  }

  // Validation finale
  try {
    new URL(normalized)
    return normalized
  } catch {
    return null
  }
}

/**
 * Valide qu'une URL est valide (sans la normaliser)
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

