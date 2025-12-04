-- ============================================================================
-- VÉRIFIER LA STRUCTURE DE LA TABLE EXISTANTE
-- ============================================================================
-- Exécutez cette requête pour voir la structure exacte de votre table

-- Option 1: Voir toutes les colonnes de la table "listings" (ou son nom réel)
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'listings'
ORDER BY ordinal_position;

-- Option 2: Voir toutes les tables qui contiennent "listing" ou "annonce"
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND (table_name LIKE '%listing%' OR table_name LIKE '%annonce%' OR table_name LIKE '%boutique%')
ORDER BY table_name, ordinal_position;

-- Option 3: Lister toutes les tables de votre schéma
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

