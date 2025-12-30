-- ============================================================================
-- CORRECTION POLITIQUE RLS INSERT pour search_queries
-- ============================================================================
-- À exécuter dans Supabase SQL Editor
-- ============================================================================

-- Supprimer l'ancienne politique INSERT si elle existe
DROP POLICY IF EXISTS "Users can create their own search queries" ON search_queries;

-- Recréer la politique INSERT avec WITH CHECK
CREATE POLICY "Users can create their own search queries"
  ON search_queries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Vérifier que la politique est correcte
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'search_queries'
ORDER BY cmd;



