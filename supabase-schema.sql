-- ═══════════════════════════════════════════════════════════════
-- SCHEMA SUPABASE POUR AUTOVAL PREMIUM
-- ═══════════════════════════════════════════════════════════════
-- Exécuter ce script dans Supabase Dashboard → SQL Editor

-- ═══════════════════════════════════════════════════════════════
-- USERS & SUBSCRIPTIONS (Extension de auth.users)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  subscription_tier TEXT DEFAULT 'FREE' CHECK (subscription_tier IN ('FREE', 'STANDARD', 'PREMIUM', 'PRO')),
  subscription_id TEXT, -- Stripe subscription ID
  subscription_ends_at TIMESTAMPTZ,
  searches_today INTEGER DEFAULT 0,
  last_search_reset TIMESTAMPTZ DEFAULT NOW(),
  total_searches INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_subscription_tier ON public.user_profiles(subscription_tier);
CREATE INDEX IF NOT EXISTS idx_user_profiles_subscription_ends ON public.user_profiles(subscription_ends_at);

-- ═══════════════════════════════════════════════════════════════
-- SAVED SEARCHES & ALERTS
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.saved_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Search Criteria
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  min_year INTEGER,
  max_year INTEGER,
  min_price INTEGER,
  max_price INTEGER,
  max_km INTEGER,
  fuel_type TEXT,
  gearbox TEXT,
  
  -- Metadata
  name TEXT, -- "Ma recherche BMW Série 3"
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_run TIMESTAMPTZ,
  results_count INTEGER DEFAULT 0,
  
  -- Alert Settings
  alert_enabled BOOLEAN DEFAULT false,
  alert_frequency TEXT DEFAULT 'DAILY' CHECK (alert_frequency IN ('INSTANT', 'HOURLY', 'DAILY', 'WEEKLY'))
);

CREATE INDEX IF NOT EXISTS idx_saved_searches_user_id ON public.saved_searches(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_searches_brand_model ON public.saved_searches(brand, model);

CREATE TABLE IF NOT EXISTS public.alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  saved_search_id UUID REFERENCES public.saved_searches(id) ON DELETE CASCADE,
  
  -- Alert Type
  type TEXT NOT NULL CHECK (type IN ('NEW_LISTING', 'PRICE_DROP', 'GOOD_DEAL', 'BACK_IN_STOCK')),
  
  -- Alert Data
  listing_id TEXT,
  listing_url TEXT,
  listing_title TEXT,
  price INTEGER,
  old_price INTEGER, -- Pour PRICE_DROP
  
  -- Status
  seen BOOLEAN DEFAULT false,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alerts_user_seen ON public.alerts(user_id, seen);
CREATE INDEX IF NOT EXISTS idx_alerts_saved_search ON public.alerts(saved_search_id);

-- ═══════════════════════════════════════════════════════════════
-- LISTINGS & FAVORITES
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identifiants externes
  external_id TEXT NOT NULL,
  source TEXT NOT NULL, -- LeBonCoin, LaCentrale, etc.
  url TEXT NOT NULL,
  
  -- Informations véhicule
  title TEXT NOT NULL,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  year INTEGER,
  mileage INTEGER,
  price INTEGER NOT NULL,
  fuel_type TEXT,
  gearbox TEXT,
  
  -- Localisation
  city TEXT,
  department TEXT,
  postal_code TEXT,
  
  -- Metadata
  description TEXT,
  image_url TEXT,
  published_at TIMESTAMPTZ,
  scraped_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  
  -- Enrichissement IA
  ai_score FLOAT,
  price_score FLOAT,
  deal_score FLOAT,
  seller_score FLOAT,
  negotiation_margin FLOAT,
  
  UNIQUE(external_id, source)
);

CREATE INDEX IF NOT EXISTS idx_listings_brand_model ON public.listings(brand, model);
CREATE INDEX IF NOT EXISTS idx_listings_price ON public.listings(price);
CREATE INDEX IF NOT EXISTS idx_listings_source ON public.listings(source);
CREATE INDEX IF NOT EXISTS idx_listings_active ON public.listings(is_active);

-- Table favoris (peut déjà exister, vérifier)
CREATE TABLE IF NOT EXISTS public.favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Tracking
  price_when_added INTEGER,
  still_available BOOLEAN DEFAULT true,
  
  UNIQUE(user_id, listing_id)
);

CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON public.favorites(user_id);

CREATE TABLE IF NOT EXISTS public.price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  price INTEGER NOT NULL,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_price_history_listing ON public.price_history(listing_id);
CREATE INDEX IF NOT EXISTS idx_price_history_recorded ON public.price_history(recorded_at);

-- ═══════════════════════════════════════════════════════════════
-- ANALYTICS & MARKET DATA
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.market_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Clé unique
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  year INTEGER,
  
  -- Statistiques marché
  average_price INTEGER NOT NULL,
  median_price INTEGER NOT NULL,
  min_price INTEGER NOT NULL,
  max_price INTEGER NOT NULL,
  total_listings INTEGER NOT NULL,
  
  -- Métadonnées
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(brand, model, year)
);

CREATE INDEX IF NOT EXISTS idx_market_analytics_brand_model ON public.market_analytics(brand, model);

-- ═══════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY (RLS)
-- ═══════════════════════════════════════════════════════════════

-- Activer RLS sur toutes les tables
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;

-- Policies: Les utilisateurs ne peuvent voir/modifier que leurs propres données
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
CREATE POLICY "Users can view own profile" ON public.user_profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
CREATE POLICY "Users can update own profile" ON public.user_profiles
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can view own saved searches" ON public.saved_searches;
CREATE POLICY "Users can view own saved searches" ON public.saved_searches
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own saved searches" ON public.saved_searches;
CREATE POLICY "Users can manage own saved searches" ON public.saved_searches
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own alerts" ON public.alerts;
CREATE POLICY "Users can view own alerts" ON public.alerts
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own favorites" ON public.favorites;
CREATE POLICY "Users can manage own favorites" ON public.favorites
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own price history" ON public.price_history;
CREATE POLICY "Users can view own price history" ON public.price_history
  FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);
