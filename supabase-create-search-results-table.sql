-- ============================================================================
-- CRÉATION DE LA TABLE search_results
-- ============================================================================
-- Cette table stocke les résultats détaillés de chaque recherche
-- Exécutez ce script dans Supabase SQL Editor si la table n'existe pas

-- Table: search_results (résultats d'une recherche)
CREATE TABLE IF NOT EXISTS search_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  search_id UUID REFERENCES search_queries(id) ON DELETE CASCADE NOT NULL,
  
  -- Données de l'annonce
  title TEXT NOT NULL,
  price NUMERIC,
  year INTEGER,
  mileage NUMERIC,
  source TEXT NOT NULL,
  score NUMERIC DEFAULT 0, -- Score IA ou score final
  url TEXT NOT NULL,
  image_url TEXT,
  
  -- Données brutes optionnelles (pour debug ou réanalyse)
  raw_json JSONB,
  
  -- Métadonnées
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Index pour performances
  CONSTRAINT search_results_score_check CHECK (score >= 0 AND score <= 100)
);

-- Index pour les résultats de recherche
CREATE INDEX IF NOT EXISTS idx_search_results_search_id ON search_results(search_id);
CREATE INDEX IF NOT EXISTS idx_search_results_created_at ON search_results(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_search_results_score ON search_results(score DESC);
CREATE INDEX IF NOT EXISTS idx_search_results_source ON search_results(source);

-- Index composite pour recherche rapide par recherche + score
CREATE INDEX IF NOT EXISTS idx_search_results_search_score ON search_results(search_id, score DESC);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Activer RLS sur la table
ALTER TABLE search_results ENABLE ROW LEVEL SECURITY;

-- Supprimer les anciennes policies si elles existent
DROP POLICY IF EXISTS "Users can view search results from their queries" ON search_results;
DROP POLICY IF EXISTS "Service can insert search results" ON search_results;
DROP POLICY IF EXISTS "Service can update search results" ON search_results;

-- Policies pour search_results
-- Les résultats sont accessibles via leur recherche parente
CREATE POLICY "Users can view search results from their queries"
  ON search_results FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM search_queries
      WHERE search_queries.id = search_results.search_id
      AND search_queries.user_id = auth.uid()
    )
  );

CREATE POLICY "Service can insert search results"
  ON search_results FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service can update search_results"
  ON search_results FOR UPDATE
  USING (true);

