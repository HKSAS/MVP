-- ============================================================================
-- TABLES FAVORIS ET RECOMMANDATIONS - AUTOIA
-- ============================================================================
-- À exécuter dans Supabase SQL Editor
-- ============================================================================

-- Supprimer l'ancienne table favorites si elle existe (avec référence à listings)
DROP TABLE IF EXISTS favorites CASCADE;

-- Table: favorites (nouvelle structure avec données complètes)
CREATE TABLE IF NOT EXISTS favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source TEXT NOT NULL,
  listing_id TEXT NOT NULL,
  listing_url TEXT NOT NULL,
  title TEXT,
  price INTEGER,
  year INTEGER,
  mileage INTEGER,
  fuel TEXT,
  transmission TEXT,
  city TEXT,
  score INTEGER,
  risk_score INTEGER,
  extracted_features JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Contrainte unique: un utilisateur ne peut pas avoir le même favori deux fois
  UNIQUE(user_id, source, listing_id)
);

-- Index pour les favoris
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_source_listing_id ON favorites(source, listing_id);
CREATE INDEX IF NOT EXISTS idx_favorites_created_at ON favorites(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_favorites_price ON favorites(price) WHERE price IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_favorites_score ON favorites(score) WHERE score IS NOT NULL;

-- Table: listings_cache (cache des annonces pour recommandations)
CREATE TABLE IF NOT EXISTS listings_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,
  listing_id TEXT NOT NULL,
  listing_url TEXT NOT NULL,
  title TEXT,
  price INTEGER,
  year INTEGER,
  mileage INTEGER,
  fuel TEXT,
  transmission TEXT,
  city TEXT,
  score INTEGER,
  risk_score INTEGER,
  extracted_features JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Contrainte unique: une annonce par source
  UNIQUE(source, listing_id)
);

-- Index pour listings_cache
CREATE INDEX IF NOT EXISTS idx_listings_cache_source_listing_id ON listings_cache(source, listing_id);
CREATE INDEX IF NOT EXISTS idx_listings_cache_created_at ON listings_cache(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_listings_cache_price ON listings_cache(price) WHERE price IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_listings_cache_score ON listings_cache(score) WHERE score IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_listings_cache_extracted_features ON listings_cache USING GIN(extracted_features);

-- Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_listings_cache_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour updated_at
CREATE TRIGGER trigger_update_listings_cache_updated_at
  BEFORE UPDATE ON listings_cache
  FOR EACH ROW
  EXECUTE FUNCTION update_listings_cache_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Activer RLS sur favorites
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

-- Policies pour favorites
CREATE POLICY "Users can view their own favorites"
  ON favorites FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own favorites"
  ON favorites FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own favorites"
  ON favorites FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own favorites"
  ON favorites FOR DELETE
  USING (auth.uid() = user_id);

-- Activer RLS sur listings_cache (lecture publique, écriture service)
ALTER TABLE listings_cache ENABLE ROW LEVEL SECURITY;

-- Policies pour listings_cache
-- Lecture: tous les utilisateurs authentifiés peuvent lire
CREATE POLICY "Authenticated users can view listings cache"
  ON listings_cache FOR SELECT
  USING (auth.role() = 'authenticated');

-- Insertion: service role uniquement (via API avec service key)
-- Note: Pour permettre l'insertion depuis l'API, on peut soit:
-- 1. Utiliser service role key (recommandé)
-- 2. Créer une policy pour authenticated users
-- On choisit l'option 2 pour simplifier, mais idéalement utiliser service role
CREATE POLICY "Authenticated users can insert listings cache"
  ON listings_cache FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Mise à jour: service role uniquement
CREATE POLICY "Authenticated users can update listings cache"
  ON listings_cache FOR UPDATE
  USING (auth.role() = 'authenticated');

-- ============================================================================
-- FONCTIONS UTILITAIRES
-- ============================================================================

-- Fonction pour nettoyer les anciennes entrées du cache (optionnel)
CREATE OR REPLACE FUNCTION cleanup_old_listings_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM listings_cache
  WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTAIRES
-- ============================================================================

COMMENT ON TABLE favorites IS 'Favoris utilisateur avec données complètes de l''annonce';
COMMENT ON TABLE listings_cache IS 'Cache des annonces pour alimenter les recommandations';
COMMENT ON COLUMN favorites.extracted_features IS 'Caractéristiques extraites (marque, modèle, segment, etc.)';
COMMENT ON COLUMN listings_cache.extracted_features IS 'Caractéristiques extraites (marque, modèle, segment, etc.)';



