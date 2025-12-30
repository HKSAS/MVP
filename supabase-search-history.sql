-- ============================================================================
-- MIGRATION : HISTORIQUE DES RECHERCHES AVANCÉES
-- ============================================================================
-- Ce fichier ajoute les tables nécessaires pour sauvegarder l'historique
-- complet des recherches avec tous les critères et résultats

-- Table: search_queries (recherches avec critères complets)
CREATE TABLE IF NOT EXISTS search_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_run_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Critères de recherche (stockés en JSONB pour flexibilité)
  criteria_json JSONB NOT NULL,
  
  -- Métadonnées
  results_count INTEGER DEFAULT 0,
  platforms_json JSONB DEFAULT '[]'::jsonb, -- Liste des plateformes utilisées
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  
  -- Index pour performances
  CONSTRAINT search_queries_criteria_check CHECK (jsonb_typeof(criteria_json) = 'object')
);

-- Index pour les recherches utilisateur
CREATE INDEX IF NOT EXISTS idx_search_queries_user_id ON search_queries(user_id);
CREATE INDEX IF NOT EXISTS idx_search_queries_created_at ON search_queries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_search_queries_last_run_at ON search_queries(last_run_at DESC);
CREATE INDEX IF NOT EXISTS idx_search_queries_status ON search_queries(status);

-- Index GIN pour recherche dans criteria_json
CREATE INDEX IF NOT EXISTS idx_search_queries_criteria_gin ON search_queries USING GIN (criteria_json);

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

-- Activer RLS sur les nouvelles tables
ALTER TABLE search_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_results ENABLE ROW LEVEL SECURITY;

-- Policies pour search_queries
CREATE POLICY "Users can view their own search queries"
  ON search_queries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own search queries"
  ON search_queries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own search queries"
  ON search_queries FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own search queries"
  ON search_queries FOR DELETE
  USING (auth.uid() = user_id);

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

CREATE POLICY "Service can update search results"
  ON search_results FOR UPDATE
  USING (true);

-- ============================================================================
-- FONCTIONS UTILITAIRES
-- ============================================================================

-- Fonction pour nettoyer les anciennes recherches (optionnel, à exécuter périodiquement)
CREATE OR REPLACE FUNCTION cleanup_old_search_queries(days_to_keep INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM search_queries
  WHERE created_at < NOW() - (days_to_keep || ' days')::INTERVAL
  AND user_id IS NOT NULL;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour obtenir le résumé d'une recherche (pour affichage)
CREATE OR REPLACE FUNCTION get_search_summary(search_query_id UUID)
RETURNS TABLE (
  brand TEXT,
  model TEXT,
  max_price NUMERIC,
  fuel_type TEXT,
  year_min INTEGER,
  year_max INTEGER,
  mileage_max NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (criteria_json->>'brand')::TEXT as brand,
    (criteria_json->>'model')::TEXT as model,
    (criteria_json->>'max_price')::NUMERIC as max_price,
    (criteria_json->>'fuel_type')::TEXT as fuel_type,
    (criteria_json->>'year_min')::INTEGER as year_min,
    (criteria_json->>'year_max')::INTEGER as year_max,
    (criteria_json->>'mileage_max')::NUMERIC as mileage_max
  FROM search_queries
  WHERE id = search_query_id;
END;
$$ LANGUAGE plpgsql;

