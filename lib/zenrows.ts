/**
 * Client ZenRows réutilisable
 * Gère l'appel à l'API ZenRows avec gestion d'erreurs robuste
 */

const ZENROWS_API_KEY = process.env.ZENROWS_API_KEY
const ZENROWS_BASE_URL = 'https://api.zenrows.com/v1'

if (!ZENROWS_API_KEY) {
  throw new Error('ZENROWS_API_KEY manquante. Ajoute-la dans ton .env.local')
}

/**
 * Scrape une URL via ZenRows
 * @param targetUrl - L'URL à scraper (doit être absolue et valide)
 * @param params - Paramètres ZenRows supplémentaires (js_render, premium_proxy, wait, etc.)
 * @returns Le HTML scrapé
 */
export async function scrapeWithZenRows(
  targetUrl: string,
  params: Record<string, any> = {}
): Promise<string> {
  // Validation de l'URL
  if (!targetUrl || typeof targetUrl !== 'string') {
    throw new Error(`URL cible vide ou invalide: ${targetUrl}`)
  }

  // Encoder l'URL (mais pas avec encodeURIComponent sur l'URL entière)
  const encodedTargetUrl = encodeURI(targetUrl)

  // Construction de l'URL ZenRows
  const url = new URL(ZENROWS_BASE_URL)
  url.searchParams.set('apikey', ZENROWS_API_KEY)
  url.searchParams.set('url', encodedTargetUrl)

  // Paramètres ZenRows par défaut
  const defaultParams = {
    js_render: 'true',
    premium_proxy: 'true',
    wait: '5000',
    // Optionnel : activer json_response pour voir les requêtes XHR (utile pour debug)
    // json_response: 'true', // Décommenter pour activer
  }

  // Fusion des paramètres (les params passés en argument écrasent les defaults)
  const finalParams = { ...defaultParams, ...params }

  // Ajout des paramètres à l'URL
  for (const [key, value] of Object.entries(finalParams)) {
    url.searchParams.set(key, String(value))
  }

  // Log de l'URL finale (sans la clé API pour la sécurité)
  const logUrl = url.toString().replace(/apikey=[^&]+/, 'apikey=***')
  console.log(`🔗 ZenRows URL: ${logUrl}`)

  try {
    const res = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    })

    const text = await res.text()

    if (!res.ok) {
      // Log détaillé de l'erreur
      console.error(`❌ ZenRows HTTP ${res.status} pour ${targetUrl}`)
      console.error(`❌ Réponse ZenRows: ${text.substring(0, 500)}`)
      
      throw new Error(`ZenRows HTTP ${res.status}: ${text.substring(0, 200)}`)
    }

    if (text.length < 100) {
      throw new Error(`HTML trop court (${text.length} caractères) - probablement bloqué ou erreur`)
    }

    return text
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error(`Erreur inconnue lors du scraping: ${String(error)}`)
  }
}

