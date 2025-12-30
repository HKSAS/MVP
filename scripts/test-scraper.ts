// scripts/test-scraper.ts
// 🧪 Test ultra simple du scraper

import dotenv from 'dotenv'
import path from 'path'

// Charger les variables d'environnement
dotenv.config({ path: path.join(process.cwd(), '.env.local') })

import { scrapeLeBonCoin } from '../src/modules/scraping/sites/leboncoin/scraper'

async function test() {
  console.log('🧪 Test scraping LeBonCoin...')
  console.log('')
  
  const results = await scrapeLeBonCoin(
    {
      brand: 'peugeot',
      model: '208',
      maxPrice: 20000,
    },
    'strict'
  )
  
  console.log(`✅ ${results.listings.length} annonces trouvées`)
  console.log(`⏱️ Durée: ${results.ms}ms`)
  console.log(`🎯 Stratégie: ${results.strategy}`)
  console.log('')
  
  if (results.listings[0]) {
    console.log('📄 Première annonce:')
    console.log('- Titre:', results.listings[0].title)
    console.log('- Prix:', results.listings[0].price_eur, '€')
    console.log('- Ville:', results.listings[0].city)
    console.log('- URL:', results.listings[0].url)
    console.log('')
  }
  
  if (results.listings.length === 0) {
    console.log('⚠️ Aucune annonce trouvée')
    console.log('👉 Lance le diagnostic: npx tsx scripts/debug-zenrows.ts')
  }
}

test().catch(console.error)



