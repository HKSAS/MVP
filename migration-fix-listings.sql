-- ============================================================================
-- MIGRATION : Ajouter les colonnes manquantes à la table listings
-- ============================================================================
-- À exécuter dans l'éditeur SQL de Supabase si la table listings existe déjà
-- mais que certaines colonnes manquent

-- Vérifier et ajouter mileage_km si elle n'existe pas
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'listings' AND column_name = 'mileage_km'
  ) THEN
    ALTER TABLE listings ADD COLUMN mileage_km NUMERIC;
    RAISE NOTICE 'Colonne mileage_km ajoutée';
  ELSE
    RAISE NOTICE 'Colonne mileage_km existe déjà';
  END IF;
END $$;

-- Vérifier et ajouter score_final si elle n'existe pas
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'listings' AND column_name = 'score_final'
  ) THEN
    ALTER TABLE listings ADD COLUMN score_final NUMERIC DEFAULT 0;
    RAISE NOTICE 'Colonne score_final ajoutée';
  ELSE
    RAISE NOTICE 'Colonne score_final existe déjà';
  END IF;
END $$;

-- Vérifier et ajouter search_id si elle n'existe pas
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'listings' AND column_name = 'search_id'
  ) THEN
    ALTER TABLE listings ADD COLUMN search_id UUID REFERENCES searches(id) ON DELETE SET NULL;
    RAISE NOTICE 'Colonne search_id ajoutée';
  ELSE
    RAISE NOTICE 'Colonne search_id existe déjà';
  END IF;
END $$;

-- Vérifier et ajouter user_id si elle n'existe pas
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'listings' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE listings ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    RAISE NOTICE 'Colonne user_id ajoutée';
  ELSE
    RAISE NOTICE 'Colonne user_id existe déjà';
  END IF;
END $$;

-- Créer l'index sur score_final si nécessaire
CREATE INDEX IF NOT EXISTS idx_listings_score_final ON listings(score_final DESC);

-- Afficher la structure finale de la table
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'listings'
ORDER BY ordinal_position;

