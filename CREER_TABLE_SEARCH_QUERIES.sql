-- ============================================================================
-- CRÉATION/MISE À JOUR TABLE search_queries
-- ============================================================================
-- À exécuter dans Supabase SQL Editor
-- ============================================================================

-- Vérifier si la table existe
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'search_queries') THEN
    -- Créer la table si elle n'existe pas
    CREATE TABLE search_queries (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      last_run_at TIMESTAMPTZ DEFAULT NOW(),
      
      -- Critères de recherche (stockés en JSONB)
      criteria_json JSONB NOT NULL,
      
      -- Métadonnées
      results_count INTEGER DEFAULT 0,
      platforms_json JSONB DEFAULT '[]'::jsonb,
      status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'running', 'completed', 'failed'))
    );

    -- Index
    CREATE INDEX idx_search_queries_user_id ON search_queries(user_id);
    CREATE INDEX idx_search_queries_created_at ON search_queries(created_at DESC);

    -- RLS
    ALTER TABLE search_queries ENABLE ROW LEVEL SECURITY;

    -- Policies
    CREATE POLICY "Users can view their own search queries"
      ON search_queries FOR SELECT
      USING (auth.uid() = user_id);

    CREATE POLICY "Users can create their own search queries"
      ON search_queries FOR INSERT
      WITH CHECK (auth.uid() = user_id); -- IMPORTANT: WITH CHECK pour INSERT

    CREATE POLICY "Users can update their own search queries"
      ON search_queries FOR UPDATE
      USING (auth.uid() = user_id);

    CREATE POLICY "Users can delete their own search queries"
      ON search_queries FOR DELETE
      USING (auth.uid() = user_id);

    RAISE NOTICE 'Table search_queries créée avec succès';
  ELSE
    RAISE NOTICE 'Table search_queries existe déjà';
  END IF;
END $$;

-- Vérifier la structure
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'search_queries'
ORDER BY ordinal_position;

-- Vérifier les politiques RLS
SELECT 
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'search_queries';

