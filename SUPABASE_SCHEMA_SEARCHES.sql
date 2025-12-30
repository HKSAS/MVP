-- Schéma pour les recherches et résultats
-- À exécuter dans Supabase SQL Editor

-- Table searches
CREATE TABLE IF NOT EXISTS searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  brand TEXT NOT NULL,
  model TEXT,
  max_price INTEGER NOT NULL,
  fuel_type TEXT,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'done', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index pour recherches fréquentes
CREATE INDEX IF NOT EXISTS idx_searches_user_id ON searches(user_id);
CREATE INDEX IF NOT EXISTS idx_searches_status ON searches(status);
CREATE INDEX IF NOT EXISTS idx_searches_created_at ON searches(created_at DESC);

-- Table site_runs
CREATE TABLE IF NOT EXISTS site_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  search_id UUID NOT NULL REFERENCES searches(id) ON DELETE CASCADE,
  site TEXT NOT NULL,
  pass TEXT NOT NULL CHECK (pass IN ('strict', 'relaxed', 'opportunity')),
  status TEXT NOT NULL CHECK (status IN ('ok', 'failed')),
  items_count INTEGER NOT NULL DEFAULT 0,
  duration_ms INTEGER NOT NULL,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_site_runs_search_id ON site_runs(search_id);
CREATE INDEX IF NOT EXISTS idx_site_runs_site ON site_runs(site);

-- Table listings_raw (données brutes)
CREATE TABLE IF NOT EXISTS listings_raw (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  search_id UUID NOT NULL REFERENCES searches(id) ON DELETE CASCADE,
  site TEXT NOT NULL,
  url TEXT NOT NULL,
  raw JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_listings_raw_search_id ON listings_raw(search_id);
CREATE INDEX IF NOT EXISTS idx_listings_raw_site ON listings_raw(site);

-- Table listings (finale, dédupliquée et scorée)
CREATE TABLE IF NOT EXISTS listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  search_id UUID NOT NULL REFERENCES searches(id) ON DELETE CASCADE,
  canonical_id TEXT NOT NULL, -- Pour déduplication
  site TEXT NOT NULL,
  title TEXT NOT NULL,
  price INTEGER,
  year INTEGER,
  mileage INTEGER,
  fuel TEXT,
  city TEXT,
  url TEXT NOT NULL,
  score INTEGER,
  risk INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(search_id, canonical_id) -- Éviter doublons par recherche
);

CREATE INDEX IF NOT EXISTS idx_listings_search_id ON listings(search_id);
CREATE INDEX IF NOT EXISTS idx_listings_canonical_id ON listings(canonical_id);
CREATE INDEX IF NOT EXISTS idx_listings_score ON listings(search_id, score DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_listings_site ON listings(site);

-- Trigger pour updated_at automatique
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_searches_updated_at BEFORE UPDATE ON searches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS (Row Level Security) - À activer selon besoin
-- ALTER TABLE searches ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Users can view their own searches" ON searches FOR SELECT USING (auth.uid() = user_id);

