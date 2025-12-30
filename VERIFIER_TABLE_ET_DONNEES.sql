-- ============================================================================
-- VÉRIFICATION : Quelle table existe et contient des données ?
-- ============================================================================

-- 1. Vérifier si search_queries existe et compter les lignes
DO $$
DECLARE
  table_exists BOOLEAN;
  row_count INTEGER;
  last_entry TIMESTAMPTZ;
BEGIN
  -- Vérifier si la table existe
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'search_queries'
  ) INTO table_exists;
  
  IF table_exists THEN
    SELECT COUNT(*), MAX(created_at) INTO row_count, last_entry
    FROM search_queries;
    
    RAISE NOTICE 'Table search_queries existe: OUI';
    RAISE NOTICE 'Nombre de lignes: %', row_count;
    RAISE NOTICE 'Dernière entrée: %', last_entry;
  ELSE
    RAISE NOTICE 'Table search_queries existe: NON';
  END IF;
END $$;

-- 2. Lister toutes les tables qui contiennent "search" ou "recherche"
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND (
    table_name ILIKE '%search%' 
    OR table_name ILIKE '%recherche%'
    OR table_name ILIKE '%query%'
  )
ORDER BY table_name;

-- 3. Vérifier les données dans search_queries (si elle existe)
SELECT 
  id,
  user_id,
  criteria_json->>'brand' as brand,
  criteria_json->>'model' as model,
  results_count,
  created_at
FROM search_queries
ORDER BY created_at DESC
LIMIT 5;

-- 4. Vérifier les politiques RLS pour search_queries
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'search_queries'
ORDER BY cmd;

