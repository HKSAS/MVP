/**
 * Wrapper pour charger Playwright et le SDK ZenRows dynamiquement
 * Utilise require() pour éviter que Next.js ne parse ces packages lors du build
 */

export async function loadScrapingBrowserDeps() {
  try {
    // Utiliser require() au lieu d'import pour éviter l'analyse Next.js
    // Ces require() sont exécutés uniquement à l'exécution, pas au build
    const playwright = require('playwright')
    const zenrowsSDK = require('@zenrows/browser-sdk')
    
    return {
      chromium: playwright.chromium,
      ScrapingBrowser: zenrowsSDK.ScrapingBrowser,
      ProxyRegion: zenrowsSDK.ProxyRegion,
    }
  } catch (error) {
    throw new Error(`Failed to load scraping browser dependencies: ${error instanceof Error ? error.message : String(error)}`)
  }
}

