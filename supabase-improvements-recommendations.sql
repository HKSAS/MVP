-- ============================================
-- AMÉLIORATIONS TABLE LISTINGS POUR RECOMMENDATIONS
-- ============================================
-- À exécuter dans Supabase SQL Editor

-- 1. Ajouter colonnes pour le nettoyage automatique
ALTER TABLE listings 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- 2. Créer index pour performance
CREATE INDEX IF NOT EXISTS idx_listings_active_created 
ON listings(is_active, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_listings_url_not_null 
ON listings(url) WHERE url IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_listings_recent 
ON listings(created_at DESC) WHERE created_at > NOW() - INTERVAL '7 days';

-- 3. Nettoyer les vieilles annonces (optionnel - à exécuter manuellement)
-- Option A: Supprimer les annonces > 30 jours
-- DELETE FROM listings 
-- WHERE created_at < NOW() - INTERVAL '30 days';

-- Option B: Marquer comme inactives (recommandé)
-- UPDATE listings 
-- SET is_active = false, updated_at = NOW()
-- WHERE created_at < NOW() - INTERVAL '30 days';

-- 4. Vérification des données
SELECT 
  COUNT(*) as total_listings,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as recent_7d,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') as recent_30d,
  COUNT(*) FILTER (WHERE url IS NOT NULL) as with_url,
  COUNT(*) FILTER (WHERE is_active = true) as active_listings
FROM listings;

