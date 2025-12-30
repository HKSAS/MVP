-- ============================================================================
-- VÉRIFICATION TABLE FAVORITES
-- ============================================================================
-- Exécutez ce SQL pour vérifier que la table favorites existe et est bien configurée
-- ============================================================================

-- 1. Vérifier si la table existe
SELECT 
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name = 'favorites';

-- 2. Vérifier les colonnes de la table
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'favorites'
ORDER BY ordinal_position;

-- 3. Vérifier les index
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'favorites';

-- 4. Vérifier les politiques RLS
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'favorites';

-- 5. Vérifier si RLS est activé
SELECT 
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'favorites';



