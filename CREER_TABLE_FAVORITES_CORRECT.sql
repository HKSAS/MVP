-- ============================================================================
-- CRÉATION TABLE FAVORITES - SQL CORRECT
-- ============================================================================
-- ⚠️ IMPORTANT : Utilisez ce SQL si la table n'existe pas encore
-- Copiez-collez TOUT ce fichier dans Supabase SQL Editor
-- ============================================================================

-- Supprimer l'ancienne table si elle existe
DROP TABLE IF EXISTS favorites CASCADE;

-- Créer la table favorites
CREATE TABLE favorites (
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
  
  -- Un utilisateur ne peut pas avoir le même favori deux fois
  UNIQUE(user_id, source, listing_id)
);

-- Créer les index pour améliorer les performances
CREATE INDEX idx_favorites_user_id ON favorites(user_id);
CREATE INDEX idx_favorites_source_listing_id ON favorites(source, listing_id);
CREATE INDEX idx_favorites_created_at ON favorites(created_at DESC);

-- Activer Row Level Security (RLS)
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

-- Supprimer les anciennes policies si elles existent
DROP POLICY IF EXISTS "Users can view their own favorites" ON favorites;
DROP POLICY IF EXISTS "Users can create their own favorites" ON favorites;
DROP POLICY IF EXISTS "Users can update their own favorites" ON favorites;
DROP POLICY IF EXISTS "Users can delete their own favorites" ON favorites;

-- Policy: Les utilisateurs peuvent voir leurs propres favoris
CREATE POLICY "Users can view their own favorites"
  ON favorites FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Les utilisateurs peuvent créer leurs propres favoris
CREATE POLICY "Users can create their own favorites"
  ON favorites FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Les utilisateurs peuvent mettre à jour leurs propres favoris
CREATE POLICY "Users can update their own favorites"
  ON favorites FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Les utilisateurs peuvent supprimer leurs propres favoris
CREATE POLICY "Users can delete their own favorites"
  ON favorites FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- ✅ TERMINÉ !
-- ============================================================================
-- Après avoir exécuté ce SQL :
-- 1. Vérifiez dans "Table Editor" que la table "favorites" existe
-- 2. Rechargez votre application (F5)
-- 3. Testez en cliquant sur une étoile (favori)
-- ============================================================================



