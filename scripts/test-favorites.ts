/**
 * Script de test pour vérifier les favoris
 * Usage: npx tsx scripts/test-favorites.ts
 */

import dotenv from 'dotenv'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

// Charger les variables d'environnement
dotenv.config({ path: path.join(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

async function testFavorites() {
  console.log('🔍 Test Favoris\n')
  console.log('='.repeat(60))
  
  const supabase = createClient(supabaseUrl, supabaseAnonKey)
  
  // 1. Vérifier si la table existe
  console.log('\n1️⃣ Vérification de la table favorites...')
  try {
    const { data, error } = await supabase
      .from('favorites')
      .select('id')
      .limit(1)
    
    if (error) {
      if (error.code === '42P01') {
        console.log('❌ La table favorites n\'existe pas !')
        console.log('📝 Exécutez le SQL dans supabase-favorites-recommendations.sql')
        return
      } else {
        console.log('❌ Erreur:', error.message)
        console.log('   Code:', error.code)
        console.log('   Détails:', error.details)
        return
      }
    }
    
    console.log('✅ La table favorites existe')
  } catch (err) {
    console.log('❌ Erreur:', err instanceof Error ? err.message : String(err))
    return
  }
  
  // 2. Vérifier la structure de la table
  console.log('\n2️⃣ Vérification de la structure...')
  try {
    const { data: columns, error } = await supabase
      .rpc('get_table_columns', { table_name: 'favorites' })
      .catch(() => ({ data: null, error: { message: 'Fonction RPC non disponible' } }))
    
    // Alternative: essayer une requête SELECT pour voir les colonnes
    const { data: sample, error: sampleError } = await supabase
      .from('favorites')
      .select('*')
      .limit(1)
    
    if (sampleError && sampleError.code !== 'PGRST116') {
      console.log('⚠️ Erreur lors de la vérification:', sampleError.message)
    } else {
      console.log('✅ Structure de la table OK')
      if (sample && sample.length > 0) {
        console.log('   Colonnes détectées:', Object.keys(sample[0]).join(', '))
      }
    }
  } catch (err) {
    console.log('⚠️ Impossible de vérifier la structure:', err instanceof Error ? err.message : String(err))
  }
  
  // 3. Compter les favoris
  console.log('\n3️⃣ Nombre de favoris...')
  try {
    const { count, error } = await supabase
      .from('favorites')
      .select('*', { count: 'exact', head: true })
    
    if (error) {
      console.log('❌ Erreur comptage:', error.message)
      if (error.code === '42501') {
        console.log('   ⚠️ Problème de permissions RLS - vérifiez les policies')
      }
    } else {
      console.log(`✅ Nombre total de favoris: ${count || 0}`)
    }
  } catch (err) {
    console.log('❌ Erreur:', err instanceof Error ? err.message : String(err))
  }
  
  // 4. Vérifier les index
  console.log('\n4️⃣ Vérification des index...')
  console.log('   (À vérifier manuellement dans Supabase → Table Editor → Indexes)')
  console.log('   Index attendus:')
  console.log('   - idx_favorites_user_id')
  console.log('   - idx_favorites_source_listing_id')
  console.log('   - idx_favorites_created_at')
  
  // 5. Vérifier RLS
  console.log('\n5️⃣ Vérification RLS...')
  console.log('   (À vérifier manuellement dans Supabase → Authentication → Policies)')
  console.log('   Policies attendues:')
  console.log('   - Users can view their own favorites (SELECT)')
  console.log('   - Users can create their own favorites (INSERT)')
  console.log('   - Users can delete their own favorites (DELETE)')
  
  console.log('\n' + '='.repeat(60))
  console.log('✅ Diagnostic terminé')
  console.log('\n💡 Prochaines étapes:')
  console.log('   1. Si la table n\'existe pas, exécutez supabase-favorites-recommendations.sql')
  console.log('   2. Vérifiez que vous êtes connecté dans l\'application')
  console.log('   3. Testez en cliquant sur une étoile')
  console.log('   4. Regardez les logs dans le terminal (npm run dev)')
}

testFavorites().catch(console.error)



