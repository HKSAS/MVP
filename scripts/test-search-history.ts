/**
 * Script de test pour vérifier l'historique des recherches
 * Usage: npx tsx scripts/test-search-history.ts
 */

import dotenv from 'dotenv'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

// Charger les variables d'environnement
dotenv.config({ path: path.join(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

async function testSearchHistory() {
  console.log('🔍 Test historique des recherches\n')
  
  const supabase = createClient(supabaseUrl, supabaseAnonKey)
  
  // 1. Vérifier si la table existe
  console.log('1️⃣ Vérification de la table search_queries...')
  const { data: tables, error: tablesError } = await supabase
    .from('search_queries')
    .select('id')
    .limit(1)
  
  if (tablesError) {
    if (tablesError.code === '42P01') {
      console.log('❌ La table search_queries n\'existe pas !')
      console.log('📝 Exécutez le SQL dans supabase-create-search-queries.sql')
      return
    } else {
      console.log('❌ Erreur:', tablesError.message)
      return
    }
  }
  
  console.log('✅ La table search_queries existe\n')
  
  // 2. Compter les recherches
  const { count, error: countError } = await supabase
    .from('search_queries')
    .select('*', { count: 'exact', head: true })
  
  if (countError) {
    console.log('❌ Erreur comptage:', countError.message)
    return
  }
  
  console.log(`📊 Nombre total de recherches: ${count || 0}\n`)
  
  // 3. Afficher les 5 dernières recherches
  console.log('2️⃣ Dernières recherches...')
  const { data: searches, error: searchesError } = await supabase
    .from('search_queries')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5)
  
  if (searchesError) {
    console.log('❌ Erreur récupération:', searchesError.message)
    return
  }
  
  if (!searches || searches.length === 0) {
    console.log('⚠️ Aucune recherche trouvée')
    console.log('💡 Effectuez une recherche depuis l\'interface pour créer une entrée')
  } else {
    console.log(`✅ ${searches.length} recherche(s) trouvée(s):\n`)
    searches.forEach((search, index) => {
      const criteria = search.criteria_json || {}
      console.log(`${index + 1}. ${criteria.brand || 'N/A'} ${criteria.model || ''}`)
      console.log(`   - Date: ${new Date(search.created_at).toLocaleString('fr-FR')}`)
      console.log(`   - Résultats: ${search.results_count || 0}`)
      console.log(`   - User ID: ${search.user_id}`)
      console.log('')
    })
  }
}

testSearchHistory().catch(console.error)

