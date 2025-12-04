-- ============================================================================
-- MIGRATION SIMPLE : Créer toutes les tables et politiques
-- ============================================================================
-- Version simplifiée qui ignore les erreurs "already exists"
-- À exécuter dans l'éditeur SQL de Supabase

-- ============================================================================
-- ÉTAPE 1 : Créer la table searches (doit être créée en premier)
-- ============================================================================
CREATE TABLE IF NOT EXISTS searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  max_price NUMERIC NOT NULL,
  total_results INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_searches_user_id ON searches(user_id);
CREATE INDEX IF NOT EXISTS idx_searches_created_at ON searches(created_at DESC);

-- ============================================================================
-- ÉTAPE 2 : Créer/modifier la table listings
-- ============================================================================
CREATE TABLE IF NOT EXISTS listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  price_eur NUMERIC,
  year INTEGER,
  source TEXT NOT NULL,
  url TEXT NOT NULL,
  image_url TEXT,
  score_ia NUMERIC DEFAULT 50,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ajouter les colonnes manquantes
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'listings' AND column_name = 'mileage_km'
  ) THEN
    ALTER TABLE listings ADD COLUMN mileage_km NUMERIC;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'listings' AND column_name = 'score_final'
  ) THEN
    ALTER TABLE listings ADD COLUMN score_final NUMERIC DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'listings' AND column_name = 'search_id'
  ) THEN
    ALTER TABLE listings ADD COLUMN search_id UUID REFERENCES searches(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'listings' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE listings ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_listings_external_id ON listings(external_id);
CREATE INDEX IF NOT EXISTS idx_listings_search_id ON listings(search_id);
CREATE INDEX IF NOT EXISTS idx_listings_user_id ON listings(user_id);
CREATE INDEX IF NOT EXISTS idx_listings_source ON listings(source);
CREATE INDEX IF NOT EXISTS idx_listings_created_at ON listings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_listings_score_final ON listings(score_final DESC);

-- ============================================================================
-- ÉTAPE 3 : Créer les autres tables
-- ============================================================================
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

CREATE INDEX IF NOT EXISTS idx_analyzed_listings_user_id ON analyzed_listings(user_id);
CREATE INDEX IF NOT EXISTS idx_analyzed_listings_created_at ON analyzed_listings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analyzed_listings_risk_level ON analyzed_listings(risk_level);

CREATE TABLE IF NOT EXISTS contact_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'read', 'replied'))
);

CREATE INDEX IF NOT EXISTS idx_contact_messages_created_at ON contact_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_messages_status ON contact_messages(status);

CREATE TABLE IF NOT EXISTS favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  listing_id UUID REFERENCES listings(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, listing_id)
);

CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_listing_id ON favorites(listing_id);
CREATE INDEX IF NOT EXISTS idx_favorites_created_at ON favorites(created_at DESC);

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'pro')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- ============================================================================
-- ÉTAPE 4 : Activer RLS
-- ============================================================================
ALTER TABLE searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE analyzed_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- ÉTAPE 5 : Créer les politiques RLS (avec gestion d'erreur)
-- ============================================================================
-- Note: Les erreurs "already exists" seront ignorées

-- Policies pour searches
DO $$ 
BEGIN
  CREATE POLICY "Users can view their own searches"
    ON searches FOR SELECT
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ 
BEGIN
  CREATE POLICY "Users can create their own searches"
    ON searches FOR INSERT
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Policies pour listings
DO $$ 
BEGIN
  CREATE POLICY "Users can view their own listings"
    ON listings FOR SELECT
    USING (auth.uid() = user_id OR user_id IS NULL);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ 
BEGIN
  CREATE POLICY "Service can insert listings"
    ON listings FOR INSERT
    WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ 
BEGIN
  CREATE POLICY "Service can update listings"
    ON listings FOR UPDATE
    USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Policies pour analyzed_listings
DO $$ 
BEGIN
  CREATE POLICY "Users can view their own analyzed listings"
    ON analyzed_listings FOR SELECT
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ 
BEGIN
  CREATE POLICY "Users can create their own analyzed listings"
    ON analyzed_listings FOR INSERT
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Policies pour contact_messages
DO $$ 
BEGIN
  CREATE POLICY "Anyone can create contact messages"
    ON contact_messages FOR INSERT
    WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Policies pour favorites
DO $$ 
BEGIN
  CREATE POLICY "Users can view their own favorites"
    ON favorites FOR SELECT
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ 
BEGIN
  CREATE POLICY "Users can create their own favorites"
    ON favorites FOR INSERT
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ 
BEGIN
  CREATE POLICY "Users can delete their own favorites"
    ON favorites FOR DELETE
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Policies pour profiles
DO $$ 
BEGIN
  CREATE POLICY "Users can view their own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ 
BEGIN
  CREATE POLICY "Users can update their own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ 
BEGIN
  CREATE POLICY "Users can insert their own profile"
    ON profiles FOR INSERT
    WITH CHECK (auth.uid() = id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- VÉRIFICATION
-- ============================================================================
SELECT 
  'searches' as table_name,
  COUNT(*) as column_count
FROM information_schema.columns
WHERE table_name = 'searches'
UNION ALL
SELECT 
  'listings' as table_name,
  COUNT(*) as column_count
FROM information_schema.columns
WHERE table_name = 'listings'
UNION ALL
SELECT 
  'analyzed_listings' as table_name,
  COUNT(*) as column_count
FROM information_schema.columns
WHERE table_name = 'analyzed_listings'
UNION ALL
SELECT 
  'favorites' as table_name,
  COUNT(*) as column_count
FROM information_schema.columns
WHERE table_name = 'favorites'
UNION ALL
SELECT 
  'contact_messages' as table_name,
  COUNT(*) as column_count
FROM information_schema.columns
WHERE table_name = 'contact_messages'
UNION ALL
SELECT 
  'profiles' as table_name,
  COUNT(*) as column_count
FROM information_schema.columns
WHERE table_name = 'profiles';

-- Afficher les colonnes de listings
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'listings'
ORDER BY ordinal_position;

