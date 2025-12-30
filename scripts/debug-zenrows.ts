// scripts/debug-zenrows.ts
// ⚡ Script pour diagnostiquer ZenRows + LeBonCoin

import fs from 'fs'
import dotenv from 'dotenv'
import path from 'path'

// Charger les variables d'environnement
dotenv.config({ path: path.join(process.cwd(), '.env.local') })

const ZENROWS_API_KEY = process.env.ZENROWS_API_KEY || ''

/**
 * 🔍 TEST 1 : Vérifier que ZenRows fonctionne basiquement
 */
async function test1_BasicZenRows() {
  console.log('\n🔍 TEST 1 : Basic ZenRows')
  console.log('='.repeat(50))
  
  if (!ZENROWS_API_KEY) {
    console.log('❌ ZENROWS_API_KEY manquant dans .env.local')
    return false
  }
  
  const testUrl = 'https://httpbin.org/html'
  const zenrowsUrl = new URL('https://api.zenrows.com/v1/')
  zenrowsUrl.searchParams.set('url', testUrl)
  zenrowsUrl.searchParams.set('apikey', ZENROWS_API_KEY)
  // Activer js_render même pour le test basique (certains plans le nécessitent)
  zenrowsUrl.searchParams.set('js_render', 'true')
  
  try {
    const response = await fetch(zenrowsUrl.toString())
    const html = await response.text()
    
    if (!response.ok) {
      console.log(`❌ ZenRows HTTP ${response.status}`)
      console.log('Response:', html.substring(0, 500))
      
      // Si c'est une erreur RESP001, continuer quand même (c'est normal pour certains sites)
      if (response.status === 422 && html.includes('RESP001')) {
        console.log('⚠️ Erreur RESP001 - Normal pour certains sites, on continue...')
        return true // On continue quand même
      }
      return false
    }
    
    if (html.includes('Herman Melville')) {
      console.log('✅ ZenRows fonctionne !')
      console.log(`📊 Status: ${response.status}`)
      return true
    } else {
      console.log('⚠️ Réponse ZenRows reçue mais contenu inattendu')
      console.log('Response preview:', html.substring(0, 200))
      // On continue quand même
      return true
    }
  } catch (error) {
    console.error('❌ Erreur:', error)
    return false
  }
}

/**
 * 🔍 TEST 2 : LeBonCoin SANS JS rendering (HTML brut)
 */
async function test2_LeBonCoinBasic() {
  console.log('\n🔍 TEST 2 : LeBonCoin HTML brut (sans JS)')
  console.log('='.repeat(50))
  
  const lbcUrl = 'https://www.leboncoin.fr/recherche?category=2&text=peugeot+208'
  const zenrowsUrl = new URL('https://api.zenrows.com/v1/')
  
  zenrowsUrl.searchParams.set('url', lbcUrl)
  zenrowsUrl.searchParams.set('apikey', ZENROWS_API_KEY)
  zenrowsUrl.searchParams.set('premium_proxy', 'true')
  zenrowsUrl.searchParams.set('proxy_country', 'fr')
  
  try {
    const response = await fetch(zenrowsUrl.toString())
    const html = await response.text()
    
    console.log(`📊 Status: ${response.status}`)
    console.log(`📏 Taille HTML: ${(html.length / 1024).toFixed(2)} KB`)
    
    // Sauvegarder pour inspection
    fs.writeFileSync('debug-lbc-basic.html', html)
    console.log('💾 HTML sauvegardé → debug-lbc-basic.html')
    
    // Analyser le contenu
    if (html.includes('leboncoin')) {
      console.log('✅ Page LeBonCoin chargée')
      
      if (html.includes('data-qa-id="aditem')) {
        console.log('✅ Annonces détectées dans HTML')
        const matches = html.match(/data-qa-id="aditem/g)
        console.log(`📊 ${matches?.length || 0} annonces trouvées`)
      } else {
        console.log('⚠️ Pas d\'annonces dans HTML (JS requis)')
      }
      
      if (html.includes('cloudflare') || html.includes('challenge')) {
        console.log('🚨 Défi Cloudflare détecté')
      }
      
      return true
    } else {
      console.log('❌ Pas du HTML LeBonCoin')
      return false
    }
  } catch (error) {
    console.error('❌ Erreur:', error)
    return false
  }
}

/**
 * 🔍 TEST 3 : LeBonCoin AVEC JS rendering
 */
async function test3_LeBonCoinWithJS() {
  console.log('\n🔍 TEST 3 : LeBonCoin avec JS rendering')
  console.log('='.repeat(50))
  
  const lbcUrl = 'https://www.leboncoin.fr/recherche?category=2&text=peugeot+208'
  const zenrowsUrl = new URL('https://api.zenrows.com/v1/')
  
  zenrowsUrl.searchParams.set('url', lbcUrl)
  zenrowsUrl.searchParams.set('apikey', ZENROWS_API_KEY)
  
  // 🔥 PARAMÈTRES POUR LEBONCOIN
  zenrowsUrl.searchParams.set('js_render', 'true')              // ⚡ CRITIQUE
  zenrowsUrl.searchParams.set('premium_proxy', 'true')          // ⚡ CRITIQUE
  zenrowsUrl.searchParams.set('proxy_country', 'fr')            // ⚡ CRITIQUE
  zenrowsUrl.searchParams.set('wait', '8000')                   // Attendre 8s
  zenrowsUrl.searchParams.set('wait_for', '.styles_adCard__yVfDO') // Attendre annonces
  zenrowsUrl.searchParams.set('block_resources', 'image,media,font') // Faster
  
  try {
    console.log('⏳ Requête en cours (peut prendre 10-15s)...')
    
    const startTime = Date.now()
    const response = await fetch(zenrowsUrl.toString())
    const html = await response.text()
    const duration = ((Date.now() - startTime) / 1000).toFixed(1)
    
    console.log(`📊 Status: ${response.status}`)
    console.log(`⏱️ Durée: ${duration}s`)
    console.log(`📏 Taille HTML: ${(html.length / 1024).toFixed(2)} KB`)
    
    // Sauvegarder
    fs.writeFileSync('debug-lbc-js.html', html)
    console.log('💾 HTML sauvegardé → debug-lbc-js.html')
    
    // Vérifications
    const checks = {
      'Page LBC': html.includes('leboncoin'),
      'Annonces (data-qa-id)': html.includes('data-qa-id="aditem'),
      'JSON __NEXT_DATA__': html.includes('__NEXT_DATA__'),
      'API search': html.includes('api.leboncoin.fr'),
      'Cloudflare': html.includes('cloudflare') || html.includes('challenge'),
      'Consent/RGPD': html.includes('didomi') || html.includes('consent')
    }
    
    console.log('\n📋 Checks:')
    for (const [check, result] of Object.entries(checks)) {
      console.log(`${result ? '✅' : '❌'} ${check}`)
    }
    
    // Compter les annonces
    const annoncesMatches = html.match(/data-qa-id="aditem_container"/g)
    if (annoncesMatches) {
      console.log(`\n🎯 ${annoncesMatches.length} annonces détectées !`)
    }
    
    // Chercher JSON
    const jsonMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s)
    if (jsonMatch) {
      try {
        const jsonData = JSON.parse(jsonMatch[1])
        fs.writeFileSync('debug-lbc-json.json', JSON.stringify(jsonData, null, 2))
        console.log('💾 JSON sauvegardé → debug-lbc-json.json')
        
        // Explorer structure
        const ads = 
          jsonData?.props?.pageProps?.searchData?.ads ||
          jsonData?.props?.pageProps?.ads ||
          jsonData?.props?.pageProps?.data?.ads ||
          []
        
        if (ads && Array.isArray(ads) && ads.length > 0) {
          console.log(`\n🎉 JSON TROUVÉ ! ${ads.length} annonces dans le JSON`)
          
          // Afficher première annonce
          if (ads[0]) {
            console.log('\n📄 Première annonce:')
            console.log('- Titre:', ads[0].subject || ads[0].title)
            console.log('- Prix:', ads[0].price?.[0] || ads[0].price, '€')
            console.log('- Ville:', ads[0].location?.city || ads[0].location?.city_label)
            console.log('- URL:', ads[0].url || `https://www.leboncoin.fr/ad/${ads[0].list_id || ads[0].id}`)
          }
          
          return { success: true, count: ads.length, json: jsonData }
        } else {
          console.log('⚠️ Structure JSON trouvée mais pas d\'annonces')
          console.log('Keys disponibles:', Object.keys(jsonData?.props?.pageProps || {}))
        }
      } catch (e) {
        console.error('❌ Erreur parsing JSON:', e)
      }
    } else {
      console.log('⚠️ __NEXT_DATA__ non trouvé')
    }
    
    return { success: false, count: 0 }
    
  } catch (error) {
    console.error('❌ Erreur:', error)
    return { success: false, count: 0 }
  }
}

/**
 * 🚀 RUNNER PRINCIPAL
 */
async function runAllTests() {
  console.log('🚀 DIAGNOSTIC ZENROWS + LEBONCOIN')
  console.log('='.repeat(50))
  console.log(`🔑 API Key: ${ZENROWS_API_KEY ? ZENROWS_API_KEY.substring(0, 10) + '...' : 'MANQUANTE'}`)
  console.log('')
  
  if (!ZENROWS_API_KEY) {
    console.log('❌ ZENROWS_API_KEY manquante dans .env.local')
    console.log('👉 Ajoute-la dans .env.local: ZENROWS_API_KEY=ta-clé-ici')
    return
  }
  
  // Test 1
  const test1 = await test1_BasicZenRows()
  if (!test1) {
    console.log('\n⚠️ Test 1 échoué, mais on continue avec les tests LeBonCoin...')
    console.log('(Certains plans ZenRows nécessitent js_render même pour les tests basiques)')
  }
  
  // Test 2
  await test2_LeBonCoinBasic()
  
  // Test 3 (le plus important)
  const test3 = await test3_LeBonCoinWithJS()
  
  // Résumé
  console.log('\n' + '='.repeat(50))
  console.log('📊 RÉSUMÉ')
  console.log('='.repeat(50))
  
  if (test3.success) {
    console.log(`✅ SUCCÈS ! ${test3.count} annonces trouvées`)
    console.log('👉 Le parsing fonctionne, vérifie ton code d\'intégration')
  } else {
    console.log('❌ Aucune annonce trouvée')
    console.log('📋 Actions suggérées:')
    console.log('  1. Ouvre debug-lbc-js.html dans un navigateur')
    console.log('  2. Cherche "peugeot" pour voir si annonces présentes')
    console.log('  3. Regarde dans la console ZenRows si requêtes bloquées')
    console.log('  4. Essaie d\'augmenter le "wait" à 10000ms')
  }
}

// Exécuter
runAllTests().catch(console.error)

