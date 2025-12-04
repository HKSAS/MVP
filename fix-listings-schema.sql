-- ============================================================================
-- FIX SCHEMA : Aligner la table listings avec le code backend
-- ============================================================================
-- À exécuter dans l'éditeur SQL de Supabase
-- Ce script ajoute les colonnes manquantes et renomme si nécessaire

-- ============================================================================
-- ÉTAPE 1 : Vérifier et renommer la colonne 'price' en 'price_eur' si nécessaire
-- ============================================================================
DO $$ 
BEGIN
  -- Si la colonne 'price' existe mais pas 'price_eur', on la renomme
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'listings' AND column_name = 'price'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'listings' AND column_name = 'price_eur'
  ) THEN
    ALTER TABLE listings RENAME COLUMN price TO price_eur;
  END IF;
END $$;

-- ============================================================================
-- ÉTAPE 2 : Ajouter les colonnes manquantes
-- ============================================================================
DO $$ 
BEGIN
  -- Ajouter mileage_km si elle n'existe pas
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'listings' AND column_name = 'mileage_km'
  ) THEN
    ALTER TABLE listings ADD COLUMN mileage_km NUMERIC;
  END IF;

  -- Ajouter score_final si elle n'existe pas
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'listings' AND column_name = 'score_final'
  ) THEN
    ALTER TABLE listings ADD COLUMN score_final NUMERIC DEFAULT 0;
  END IF;

  -- S'assurer que price_eur existe (si elle n'existe toujours pas après le rename)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'listings' AND column_name = 'price_eur'
  ) THEN
    ALTER TABLE listings ADD COLUMN price_eur NUMERIC;
  END IF;

  -- S'assurer que year existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'listings' AND column_name = 'year'
  ) THEN
    ALTER TABLE listings ADD COLUMN year INTEGER;
  END IF;

  -- S'assurer que score_ia existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'listings' AND column_name = 'score_ia'
  ) THEN
    ALTER TABLE listings ADD COLUMN score_ia NUMERIC DEFAULT 50;
  END IF;

  -- S'assurer que image_url existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'listings' AND column_name = 'image_url'
  ) THEN
    ALTER TABLE listings ADD COLUMN image_url TEXT;
  END IF;

  -- S'assurer que source existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'listings' AND column_name = 'source'
  ) THEN
    ALTER TABLE listings ADD COLUMN source TEXT;
  END IF;
END $$;

-- ============================================================================
-- ÉTAPE 3 : Créer les index pour les performances (si pas déjà créés)
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_listings_score_final ON listings(score_final DESC);
CREATE INDEX IF NOT EXISTS idx_listings_price_eur ON listings(price_eur);
CREATE INDEX IF NOT EXISTS idx_listings_source ON listings(source);

-- ============================================================================
-- VÉRIFICATION : Afficher la structure finale de la table
-- ============================================================================
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'listings' 
ORDER BY ordinal_position;

