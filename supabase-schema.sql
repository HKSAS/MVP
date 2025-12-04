-- ============================================================================
-- SCHÉMA SUPABASE POUR MVP CONCIERGERIE AUTOMOBILE
-- ============================================================================

-- Table: searches (recherches effectuées)
CREATE TABLE IF NOT EXISTS searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  max_price NUMERIC NOT NULL,
  total_results INTEGER DEFAULT 0
);

-- Index pour les recherches utilisateur
CREATE INDEX IF NOT EXISTS idx_searches_user_id ON searches(user_id);
CREATE INDEX IF NOT EXISTS idx_searches_created_at ON searches(created_at DESC);

-- Table: listings (annonces extraites)
CREATE TABLE IF NOT EXISTS listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  price_eur NUMERIC,
  mileage_km NUMERIC,
  year INTEGER,
  source TEXT NOT NULL,
  url TEXT NOT NULL,
  image_url TEXT,
  score_ia NUMERIC DEFAULT 50,
  score_final NUMERIC DEFAULT 0, -- Score de pertinence final (0-100)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  search_id UUID REFERENCES searches(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Index pour les listings
CREATE INDEX IF NOT EXISTS idx_listings_external_id ON listings(external_id);
CREATE INDEX IF NOT EXISTS idx_listings_search_id ON listings(search_id);
CREATE INDEX IF NOT EXISTS idx_listings_user_id ON listings(user_id);
CREATE INDEX IF NOT EXISTS idx_listings_source ON listings(source);
CREATE INDEX IF NOT EXISTS idx_listings_created_at ON listings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_listings_score_final ON listings(score_final DESC);

-- Table: analyzed_listings (analyses anti-arnaque)
CREATE TABLE IF NOT EXISTS analyzed_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  url TEXT,
  raw_input JSONB,
  risk_score NUMERIC NOT NULL,
  risk_level TEXT NOT NULL CHECK (risk_level IN ('low', 'medium', 'high')),
  market_min NUMERIC,
  market_max NUMERIC,
  summary TEXT,
  recommendation TEXT,
  positives JSONB DEFAULT '[]'::jsonb,
  warnings JSONB DEFAULT '[]'::jsonb
);

-- Index pour les analyses
CREATE INDEX IF NOT EXISTS idx_analyzed_listings_user_id ON analyzed_listings(user_id);
CREATE INDEX IF NOT EXISTS idx_analyzed_listings_created_at ON analyzed_listings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analyzed_listings_risk_level ON analyzed_listings(risk_level);

-- Table: contact_messages (messages de contact)
CREATE TABLE IF NOT EXISTS contact_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'read', 'replied'))
);

-- Index pour les messages de contact
CREATE INDEX IF NOT EXISTS idx_contact_messages_created_at ON contact_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_messages_status ON contact_messages(status);

-- Table: favorites (favoris utilisateur)
CREATE TABLE IF NOT EXISTS favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  listing_id UUID REFERENCES listings(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, listing_id) -- Un utilisateur ne peut pas avoir le même favori deux fois
);

-- Index pour les favoris
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_listing_id ON favorites(listing_id);
CREATE INDEX IF NOT EXISTS idx_favorites_created_at ON favorites(created_at DESC);

-- Table: profiles (profils utilisateur étendus)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'pro')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour les profils
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Activer RLS sur toutes les tables
ALTER TABLE searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE analyzed_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policies pour searches
CREATE POLICY "Users can view their own searches"
  ON searches FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own searches"
  ON searches FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policies pour listings
CREATE POLICY "Users can view their own listings"
  ON listings FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Service can insert listings"
  ON listings FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service can update listings"
  ON listings FOR UPDATE
  USING (true);

-- Policies pour analyzed_listings
CREATE POLICY "Users can view their own analyzed listings"
  ON analyzed_listings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own analyzed listings"
  ON analyzed_listings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policies pour contact_messages (public read pour admin, public insert)
CREATE POLICY "Anyone can create contact messages"
  ON contact_messages FOR INSERT
  WITH CHECK (true);

-- Note: Pour lire les messages, vous devrez créer une policy admin séparée
-- ou utiliser le service role key côté backend

-- Policies pour favorites
CREATE POLICY "Users can view their own favorites"
  ON favorites FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own favorites"
  ON favorites FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own favorites"
  ON favorites FOR DELETE
  USING (auth.uid() = user_id);

-- Policies pour profiles
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ============================================================================
-- FONCTIONS UTILITAIRES
-- ============================================================================

-- Fonction pour nettoyer les anciennes recherches (optionnel)
CREATE OR REPLACE FUNCTION cleanup_old_searches()
RETURNS void AS $$
BEGIN
  DELETE FROM searches
  WHERE created_at < NOW() - INTERVAL '90 days'
  AND user_id IS NOT NULL;
END;
$$ LANGUAGE plpgsql;

