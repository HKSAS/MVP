-- ============================================================================
-- CRÉATION TABLE search_queries - HISTORIQUE DES RECHERCHES
-- ============================================================================
-- À exécuter dans Supabase SQL Editor
-- ============================================================================

-- Table: search_queries
CREATE TABLE IF NOT EXISTS search_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
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
CREATE INDEX IF NOT EXISTS idx_search_queries_user_id ON search_queries(user_id);
CREATE INDEX IF NOT EXISTS idx_search_queries_created_at ON search_queries(created_at DESC);

-- RLS
ALTER TABLE search_queries ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Users can view their own search queries" ON search_queries;
CREATE POLICY "Users can view their own search queries"
  ON search_queries FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own search queries" ON search_queries;
CREATE POLICY "Users can create their own search queries"
  ON search_queries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own search queries" ON search_queries;
CREATE POLICY "Users can update their own search queries"
  ON search_queries FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own search queries" ON search_queries;
CREATE POLICY "Users can delete their own search queries"
  ON search_queries FOR DELETE
  USING (auth.uid() = user_id);

