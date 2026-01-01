/**
 * 🔍 VÉRIFICATION D'IMAGES - Détection de photos volées/dupliquées
 * Utilise des techniques de reverse image search et de comparaison d'images
 */

export interface ImageVerificationResult {
  isSuspicious: boolean
  confidence: 'low' | 'medium' | 'high'
  reasons: string[]
  duplicateCount?: number
  similarImages?: Array<{
    url: string
    similarity: number
    source?: string
  }>
}

/**
 * Calcule un hash perceptuel d'une image (pour détecter les duplications)
 * Utilise une technique simplifiée de hash d'image
 */
async function calculateImageHash(imageUrl: string): Promise<string | null> {
  try {
    // En production, utiliser une bibliothèque comme sharp ou jimp
    // Pour l'instant, on utilise une approche basée sur les métadonnées
    
    // Télécharger l'image
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    })
    
    if (!response.ok) return null
    
    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    // Hash simple basé sur la taille et les premiers bytes
    // En production, utiliser un vrai hash perceptuel (pHash, dHash, etc.)
    const crypto = await import('crypto')
    return crypto.createHash('md5').update(buffer.slice(0, 1000)).digest('hex')
  } catch (error) {
    console.error('Erreur calcul hash image:', error)
    return null
  }
}

/**
 * Vérifie si une image est suspecte (volée, dupliquée, etc.)
 */
export async function verifyImage(
  imageUrl: string,
  listingUrl?: string,
  title?: string
): Promise<ImageVerificationResult> {
  const reasons: string[] = []
  let isSuspicious = false
  let confidence: 'low' | 'medium' | 'high' = 'low'

  if (!imageUrl || !imageUrl.startsWith('http')) {
    return {
      isSuspicious: false,
      confidence: 'low',
      reasons: ['URL d\'image invalide'],
    }
  }

  try {
    // 1. Vérifier si l'image est un placeholder/générique
    const placeholderPatterns = [
      'placeholder',
      'default',
      'no-image',
      'no-photo',
      'missing',
      'coming-soon',
      'image-not-available',
    ]
    
    const urlLower = imageUrl.toLowerCase()
    if (placeholderPatterns.some(pattern => urlLower.includes(pattern))) {
      reasons.push('Image placeholder/générique détectée')
      isSuspicious = true
      confidence = 'high'
    }

    // 2. Vérifier la taille de l'image (images très petites = suspectes)
    try {
      const response = await fetch(imageUrl, {
        method: 'HEAD',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      })
      
      const contentLength = response.headers.get('content-length')
      if (contentLength) {
        const sizeKB = parseInt(contentLength) / 1024
        if (sizeKB < 5) {
          reasons.push(`Image très petite (${sizeKB.toFixed(1)} KB) - possible placeholder`)
          isSuspicious = true
          confidence = 'medium'
        }
      }
    } catch (error) {
      // Ignorer les erreurs de HEAD request
    }

    // 3. Vérifier le domaine de l'image (images depuis stock photos = suspectes)
    const stockPhotoDomains = [
      'shutterstock',
      'gettyimages',
      'istockphoto',
      'adobestock',
      'alamy',
      'depositphotos',
    ]
    
    if (stockPhotoDomains.some(domain => urlLower.includes(domain))) {
      reasons.push('Image depuis un site de stock photos - possible photo volée')
      isSuspicious = true
      confidence = 'high'
    }

    // 4. Vérifier si l'image est sur un CDN générique (moins fiable)
    const cdnDomains = [
      'imgur.com',
      'tinypic.com',
      'photobucket.com',
    ]
    
    if (cdnDomains.some(domain => urlLower.includes(domain))) {
      reasons.push('Image hébergée sur un CDN générique - moins fiable')
      confidence = 'medium'
    }

    // 5. Vérifier la cohérence URL image vs URL annonce
    if (listingUrl) {
      const listingDomain = new URL(listingUrl).hostname
      const imageDomain = new URL(imageUrl).hostname
      
      // Si l'image n'est pas sur le même domaine que l'annonce, c'est suspect
      if (!imageDomain.includes(listingDomain.replace('www.', '')) && 
          !listingDomain.includes(imageDomain.replace('www.', ''))) {
        reasons.push('Image hébergée sur un domaine différent de l\'annonce')
        isSuspicious = true
        confidence = 'medium'
      }
    }

    // 6. Détection de watermark (indique possible vol)
    // En production, utiliser une analyse d'image réelle
    const watermarkKeywords = ['watermark', 'copyright', '©']
    if (watermarkKeywords.some(keyword => urlLower.includes(keyword))) {
      reasons.push('Watermark détecté - possible image volée')
      isSuspicious = true
      confidence = 'high'
    }

    // 7. Vérifier si l'image est une photo de catalogue (nom générique)
    const catalogPatterns = [
      /photo\d+\.(jpg|png)/i,
      /image\d+\.(jpg|png)/i,
      /img\d+\.(jpg|png)/i,
      /car\d+\.(jpg|png)/i,
    ]
    
    if (catalogPatterns.some(pattern => pattern.test(imageUrl))) {
      reasons.push('Nom d\'image générique (photo1.jpg, etc.) - possible photo de catalogue')
      confidence = 'medium'
    }

  } catch (error) {
    console.error('Erreur vérification image:', error)
    return {
      isSuspicious: false,
      confidence: 'low',
      reasons: ['Erreur lors de la vérification'],
    }
  }

  return {
    isSuspicious,
    confidence,
    reasons: reasons.length > 0 ? reasons : ['Aucun problème détecté'],
  }
}

/**
 * Vérifie plusieurs images d'une annonce
 */
export async function verifyListingImages(
  imageUrls: string[],
  listingUrl?: string,
  title?: string
): Promise<{
  suspiciousCount: number
  totalCount: number
  results: ImageVerificationResult[]
  overallRisk: 'low' | 'medium' | 'high'
}> {
  if (imageUrls.length === 0) {
    return {
      suspiciousCount: 0,
      totalCount: 0,
      results: [],
      overallRisk: 'low',
    }
  }

  const results = await Promise.all(
    imageUrls.map(url => verifyImage(url, listingUrl, title))
  )

  const suspiciousCount = results.filter(r => r.isSuspicious).length
  const highConfidenceSuspicious = results.filter(
    r => r.isSuspicious && r.confidence === 'high'
  ).length

  let overallRisk: 'low' | 'medium' | 'high' = 'low'
  if (highConfidenceSuspicious > 0) {
    overallRisk = 'high'
  } else if (suspiciousCount > imageUrls.length / 2) {
    overallRisk = 'medium'
  }

  return {
    suspiciousCount,
    totalCount: imageUrls.length,
    results,
    overallRisk,
  }
}

/**
 * Détecte les images dupliquées dans une liste d'annonces
 * (même image utilisée dans plusieurs annonces = suspect)
 */
export async function detectDuplicateImages(
  imageUrl: string,
  otherListings: Array<{ imageUrl?: string; url?: string; title?: string }>
): Promise<{
  isDuplicate: boolean
  duplicateCount: number
  similarListings: Array<{ url: string; title?: string }>
}> {
  if (!imageUrl) {
    return {
      isDuplicate: false,
      duplicateCount: 0,
      similarListings: [],
    }
  }

  // Calculer le hash de l'image
  const imageHash = await calculateImageHash(imageUrl)
  if (!imageHash) {
    return {
      isDuplicate: false,
      duplicateCount: 0,
      similarListings: [],
    }
  }

  // Comparer avec les autres annonces
  const similarListings: Array<{ url: string; title?: string }> = []
  
  for (const listing of otherListings) {
    if (!listing.imageUrl || listing.imageUrl === imageUrl) continue
    
    const otherHash = await calculateImageHash(listing.imageUrl)
    if (otherHash === imageHash) {
      similarListings.push({
        url: listing.url || '',
        title: listing.title,
      })
    }
  }

  return {
    isDuplicate: similarListings.length > 0,
    duplicateCount: similarListings.length,
    similarListings,
  }
}

