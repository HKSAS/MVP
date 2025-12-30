-- ============================================================================
-- VÉRIFICATION SIMPLE : Table search_queries
-- ============================================================================

-- 1. Vérifier si la table existe
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_name = 'search_queries';

-- 2. Compter les lignes dans search_queries
SELECT 
  COUNT(*) as total_recherches,
  COUNT(DISTINCT user_id) as utilisateurs_uniques,
  MAX(created_at) as derniere_recherche
FROM search_queries;

-- 3. Voir les 5 dernières recherches
SELECT 
  id,
  user_id,
  criteria_json->>'brand' as brand,
  criteria_json->>'model' as model,
  criteria_json->>'max_price' as max_price,
  results_count,
  created_at
FROM search_queries
ORDER BY created_at DESC
LIMIT 5;

-- 4. Vérifier les politiques RLS
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'search_queries'
ORDER BY cmd;
