# 📋 PROMPT CURSOR - TRANSFORMATION AUTOVAL EN SERVICE PREMIUM RÉMUNÉRABLE

## 📋 CONTEXTE DU PROJET

Vous travaillez sur AutoVal, une plateforme de recherche de véhicules d'occasion qui agrège les annonces de plusieurs sites (LeBonCoin, LaCentrale, TransakAuto, ProCarLease, AutoScout24, LeParking).

## 🏗️ ARCHITECTURE ACTUELLE IDENTIFIÉE

### STRUCTURE DU PROJET:

```
├── app/
│   ├── resultats/
│   │   └── page.tsx                    # Page de résultats de recherche (EXISTANT)
│   ├── api/
│   │   ├── search/
│   │   │   └── route.ts                 # API route pour le scraping (EXISTANT)
│   │   └── chat/
│   │       └── route.ts                 # API chatbot (EXISTANT)
│   └── layout.tsx                       # Layout avec ChatBotWrapper
├── lib/
│   ├── scrapers/
│   │   ├── parallel-scraper.ts          # Scraping parallèle multi-sites (EXISTANT)
│   │   ├── run-site-search.ts           # Orchestration recherche par site (EXISTANT)
│   │   └── scraper-config.ts            # Configuration des scrapers (EXISTANT)
│   ├── supabase/
│   │   └── browser.ts                   # Client Supabase browser (EXISTANT)
│   └── types.ts                         # Types TypeScript (EXISTANT)
├── src/
│   ├── core/
│   │   └── config/
│   │       └── constants.ts             # Constantes (timeouts, ZenRows config) (EXISTANT)
│   └── modules/
│       └── scraping/
│           └── sites/
│               ├── leboncoin/
│               │   └── scraper.ts       # Scraper LeBonCoin (HTML brut) ⚠️ NE PAS TOUCHER
│               ├── lacentrale/
│               │   └── scraper.ts       # Scraper LaCentrale (EXISTANT)
│               └── transakauto/
│                   └── scraper.ts       # Scraper TransakAuto (EXISTANT)
├── components/
│   ├── favorites/
│   │   └── FavoriteButton.tsx           # Bouton favoris (EXISTANT)
│   └── Footer.tsx                       # Footer avec Calendly (EXISTANT)
└── hooks/
    ├── useFavorites.ts                  # Hook favoris (EXISTANT)
    └── useSearchHistory.ts              # Hook historique recherches (EXISTANT)
```

### ⚠️ IMPORTANT - NE PAS TOUCHER:
- **`src/modules/scraping/sites/leboncoin/scraper.ts`** - Scraper LeBonCoin optimisé, ne pas modifier
- **`src/core/config/constants.ts`** - Timeouts optimisés, ne pas modifier les valeurs
- **`lib/scrapers/run-site-search.ts`** - Logique de scraping existante, adapter seulement

### 🔧 TECHNOLOGIES ACTUELLES:
- **Auth**: Supabase Auth (pas NextAuth)
- **Database**: Supabase PostgreSQL (pas Prisma directement)
- **Frontend**: Next.js 14+ (App Router), React, TypeScript, Tailwind CSS
- **UI**: Radix UI, shadcn/ui, Sonner (toasts)
- **Scraping**: ZenRows API

## ✅ ÉTAT ACTUEL DES PERFORMANCES

### Optimisations déjà réalisées:
- ✅ LeBonCoin: HTML brut sans JS (ultra-rapide: 45s max)
- ✅ LaCentrale: HTML brut d'abord, JS en fallback (30-40s)
- ✅ TransakAuto: HTML brut d'abord, JS en fallback (30-40s)
- ✅ Timeouts réduits: 30-45s par site (était 4-6min)
- ✅ Wait times ZenRows optimisés: 8-10s (était 20s)
- ✅ Skip passes intelligentes si ≥10 résultats
- ✅ Gestion erreurs améliorée avec toasts
- ✅ Système de favoris existant (useFavorites.ts)
- ✅ Historique de recherches (useSearchHistory.ts)

### ⚠️ Points d'amélioration identifiés:
- ❌ Pas de scoring/ranking des résultats
- ❌ Pas de détection des bonnes affaires
- ❌ Pas d'alertes ou de monitoring
- ❌ Pas d'analyse de prix par IA
- ❌ UX basique sans comparaison avancée
- ❌ Pas de modèle de monétisation
- ❌ Pas de limites par abonnement

## 🎯 OBJECTIF DE LA TRANSFORMATION

Transformer AutoVal en service premium rémunérable avec 3 niveaux d'abonnement:

```
┌─────────────────┬──────────────────┬──────────────────┬──────────────────┐
│  GRATUIT        │  STANDARD        │  PREMIUM         │  PRO             │
│  0€             │  9.99€/mois      │  19.99€/mois     │  49.99€/mois     │
├─────────────────┼──────────────────┼──────────────────┼──────────────────┤
│ 5 recherches/j  │ Illimité         │ Illimité         │ Illimité         │
│ Résultats base  │ + Alertes email  │ + Alertes temps  │ + API Access     │
│ 10 résultats    │ + Favoris        │   réel (push)    │ + White label    │
│                 │ + Export CSV     │ + IA Prix        │ + Support priorité│
│                 │ 50 résultats     │ + Score confiance│ + Données enrichies│
│                 │                  │ + Rapports PDF   │ + Webhooks       │
│                 │                  │ + Comparaison 4x │ + Analytics      │
│                 │                  │ 100 résultats    │ Illimité         │
└─────────────────┴──────────────────┴──────────────────┴──────────────────┘
```

## 📐 ARCHITECTURE CIBLE DÉTAILLÉE

### 1. Structure Base de Données (Supabase SQL)

**Option A: Utiliser Supabase Tables directement (recommandé)**

Créer les tables via Supabase Dashboard ou migrations SQL:

```sql
-- ═══════════════════════════════════════════════════════════════
-- USERS & SUBSCRIPTIONS (Extension de la table auth.users)
-- ═══════════════════════════════════════════════════════════════

-- Table pour étendre auth.users (Supabase gère déjà id, email, etc.)
CREATE TABLE public.user_profiles (
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

CREATE INDEX idx_user_profiles_subscription_tier ON public.user_profiles(subscription_tier);
CREATE INDEX idx_user_profiles_subscription_ends ON public.user_profiles(subscription_ends_at);

-- ═══════════════════════════════════════════════════════════════
-- SAVED SEARCHES & ALERTS
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE public.saved_searches (
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
  alert_frequency TEXT DEFAULT 'DAILY' CHECK (alert_frequency IN ('INSTANT', 'DAILY', 'WEEKLY'))
);

CREATE INDEX idx_saved_searches_user_id ON public.saved_searches(user_id);
CREATE INDEX idx_saved_searches_brand_model ON public.saved_searches(brand, model);

CREATE TABLE public.alerts (
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

CREATE INDEX idx_alerts_user_seen ON public.alerts(user_id, seen);
CREATE INDEX idx_alerts_saved_search ON public.alerts(saved_search_id);

-- ═══════════════════════════════════════════════════════════════
-- LISTINGS & FAVORITES
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE public.listings (
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

CREATE INDEX idx_listings_brand_model ON public.listings(brand, model);
CREATE INDEX idx_listings_price ON public.listings(price);
CREATE INDEX idx_listings_source ON public.listings(source);
CREATE INDEX idx_listings_active ON public.listings(is_active);

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

CREATE TABLE public.price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  price INTEGER NOT NULL,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_price_history_listing ON public.price_history(listing_id);
CREATE INDEX idx_price_history_recorded ON public.price_history(recorded_at);

-- ═══════════════════════════════════════════════════════════════
-- ANALYTICS & MARKET DATA
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE public.market_analytics (
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

CREATE INDEX idx_market_analytics_brand_model ON public.market_analytics(brand, model);

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
CREATE POLICY "Users can view own profile" ON public.user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.user_profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view own saved searches" ON public.saved_searches
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own saved searches" ON public.saved_searches
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own alerts" ON public.alerts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own favorites" ON public.favorites
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own price history" ON public.price_history
  FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);
```

**Option B: Utiliser Prisma avec Supabase (alternative)**

Si vous préférez Prisma pour le type-safety, créer `prisma/schema.prisma` et utiliser `@prisma/client` avec la connection string Supabase.

### 2. Services Backend à Créer

#### A. Service de Scoring IA (`lib/services/scoring-service.ts`)

```typescript
// ═══════════════════════════════════════════════════════════════
// SCORING SERVICE - Analyse intelligente des annonces
// ═══════════════════════════════════════════════════════════════

import type { ListingResponse } from '@/lib/types'

export interface ScoringResult {
  aiScore: number          // Score global 0-100
  priceScore: number       // Score prix (100 = excellent prix, 0 = trop cher)
  dealScore: number        // Score bonne affaire 0-100
  sellerScore: number      // Score confiance vendeur 0-100
  negotiationMargin: number // % de marge de négociation
  insights: string[]       // ["Prix 15% sous le marché", "Kilométrage faible pour l'année"]
  badges: Badge[]          // ["GOOD_DEAL", "LOW_MILEAGE", "RECENT"]
}

export enum Badge {
  GOOD_DEAL = 'BONNE_AFFAIRE',
  EXCELLENT_DEAL = 'EXCELLENTE_AFFAIRE',
  LOW_MILEAGE = 'FAIBLE_KILOMETRAGE',
  RECENT = 'RECENTE',
  VERIFIED_SELLER = 'VENDEUR_VERIFIE',
  PRICE_DROP = 'BAISSE_DE_PRIX',
  NEGOTIABLE = 'NEGOCIABLE',
  HIGH_DEMAND = 'FORTE_DEMANDE'
}

export interface ScoredListing extends ListingResponse {
  aiScore: number
  priceScore: number
  dealScore: number
  sellerScore: number
  negotiationMargin: number
  insights: string[]
  badges: Badge[]
}

export interface MarketData {
  brand: string
  model: string
  averagePrice: number
  medianPrice: number
  minPrice: number
  maxPrice: number
  totalListings: number
}

export class ScoringService {
  
  /**
   * Score complet d'une annonce
   */
  async scoreListings(listings: ListingResponse[], marketData: MarketData): Promise<ScoredListing[]> {
    return await Promise.all(
      listings.map(listing => this.scoreSingleListing(listing, marketData))
    )
  }
  
  /**
   * Score individuel
   */
  private async scoreSingleListing(
    listing: ListingResponse, 
    marketData: MarketData
  ): Promise<ScoredListing> {
    
    // 1. PRICE SCORE (40% du score final)
    const priceScore = this.calculatePriceScore(listing, marketData)
    
    // 2. MILEAGE SCORE (25% du score final)
    const mileageScore = this.calculateMileageScore(listing)
    
    // 3. LISTING QUALITY SCORE (20% du score final)
    const qualityScore = this.calculateQualityScore(listing)
    
    // 4. SELLER SCORE (15% du score final)
    const sellerScore = this.calculateSellerScore(listing)
    
    // Score global pondéré
    const aiScore = Math.round(
      priceScore * 0.40 +
      mileageScore * 0.25 +
      qualityScore * 0.20 +
      sellerScore * 0.15
    )
    
    // Détection bonne affaire (prix < -15% marché + bon état)
    const dealScore = this.calculateDealScore(priceScore, mileageScore, qualityScore)
    
    // Marge de négociation estimée
    const negotiationMargin = this.estimateNegotiationMargin(listing, marketData)
    
    // Insights textuels
    const insights = this.generateInsights(listing, marketData, {
      priceScore,
      mileageScore,
      dealScore
    })
    
    // Badges
    const badges = this.assignBadges(dealScore, priceScore, mileageScore, listing)
    
    return {
      ...listing,
      aiScore,
      priceScore,
      dealScore,
      sellerScore,
      negotiationMargin,
      insights,
      badges
    }
  }
  
  /**
   * PRICE SCORE: Compare le prix au marché
   * 100 = prix excellent (bien sous le marché)
   * 50 = prix correct (dans la moyenne)
   * 0 = prix élevé (au-dessus du marché)
   */
  private calculatePriceScore(listing: ListingResponse, marketData: MarketData): number {
    const { averagePrice } = marketData
    const price = listing.price_eur || 0
    
    if (!price || !averagePrice) return 50 // Score neutre si données manquantes
    
    // Calcul de la différence en %
    const priceVsAverage = ((price - averagePrice) / averagePrice) * 100
    
    // Scoring inversé (plus c'est cher, moins bon le score)
    if (priceVsAverage <= -20) return 100  // 20% moins cher = excellent
    if (priceVsAverage <= -15) return 90   // 15% moins cher = très bon
    if (priceVsAverage <= -10) return 80   // 10% moins cher = bon
    if (priceVsAverage <= -5) return 70    // 5% moins cher = correct
    if (priceVsAverage <= 0) return 60     // Prix moyen
    if (priceVsAverage <= 5) return 50      // 5% plus cher
    if (priceVsAverage <= 10) return 40    // 10% plus cher
    if (priceVsAverage <= 15) return 30    // 15% plus cher
    if (priceVsAverage <= 20) return 20    // 20% plus cher
    return 10 // >20% plus cher = mauvais
  }
  
  /**
   * MILEAGE SCORE: Évalue le kilométrage par rapport à l'âge
   * Règle: ~15000 km/an est la moyenne
   */
  private calculateMileageScore(listing: ListingResponse): number {
    if (!listing.mileage_km || !listing.year) return 50 // Score neutre si données manquantes
    
    const currentYear = new Date().getFullYear()
    const age = currentYear - listing.year
    if (age <= 0) return 50
    
    const expectedMileage = age * 15000 // 15k km/an en moyenne
    
    const mileageRatio = listing.mileage_km / expectedMileage
    
    if (mileageRatio <= 0.5) return 100   // Moitié moins que prévu = excellent
    if (mileageRatio <= 0.7) return 90    // 30% moins = très bon
    if (mileageRatio <= 0.9) return 80    // 10% moins = bon
    if (mileageRatio <= 1.1) return 70    // Dans la moyenne
    if (mileageRatio <= 1.3) return 50    // 30% plus = moyen
    if (mileageRatio <= 1.5) return 30    // 50% plus = élevé
    return 10 // Très élevé
  }
  
  /**
   * QUALITY SCORE: Qualité de l'annonce
   */
  private calculateQualityScore(listing: ListingResponse): number {
    let score = 50 // Base
    
    // Bonus: Description détaillée (si disponible dans listing)
    // Note: ListingResponse n'a pas de description, mais on peut checker d'autres champs
    
    // Bonus: Photo
    if (listing.imageUrl) score += 15
    
    // Bonus: Informations complètes
    if (listing.year) score += 5
    if (listing.mileage_km) score += 5
    if (listing.city) score += 5
    
    // Bonus: Annonce récente (si scrapedAt disponible)
    // On peut estimer depuis le score_ia ou autres métadonnées
    
    return Math.min(score, 100)
  }
  
  /**
   * SELLER SCORE: Analyse basique du vendeur
   */
  private calculateSellerScore(listing: ListingResponse): number {
    let score = 50 // Base neutre
    
    // LaCentrale: Concessionnaires généralement plus fiables
    if (listing.source === 'LaCentrale') {
      score += 15
    }
    
    // LeBonCoin: Score neutre (mix pro/particulier)
    if (listing.source === 'LeBonCoin') {
      score += 5
    }
    
    return Math.min(score, 100)
  }
  
  /**
   * DEAL SCORE: Score bonne affaire
   */
  private calculateDealScore(
    priceScore: number, 
    mileageScore: number, 
    qualityScore: number
  ): number {
    // Bonne affaire = bon prix + bon kilométrage + bonne qualité
    const avgScore = (priceScore * 0.5 + mileageScore * 0.3 + qualityScore * 0.2)
    
    // Seulement si le prix est vraiment bon (>70)
    if (priceScore < 70) return 0
    
    return Math.round(avgScore)
  }
  
  /**
   * NEGOTIATION MARGIN: Estime la marge de négociation possible
   */
  private estimateNegotiationMargin(listing: ListingResponse, marketData: MarketData): number {
    const price = listing.price_eur || 0
    if (!price || !marketData.averagePrice) return 5
    
    const priceVsMarket = ((price - marketData.averagePrice) / marketData.averagePrice) * 100
    
    // Si déjà bien en dessous du marché, marge faible
    if (priceVsMarket < -10) return 2 // 2% max
    
    // Si dans la moyenne
    if (priceVsMarket >= -10 && priceVsMarket <= 10) {
      // Particulier: 5-8%, Pro: 3-5%
      return listing.source === 'LeBonCoin' ? 7 : 4
    }
    
    // Si au-dessus du marché, marge plus grande
    if (priceVsMarket > 10) return 10
    
    return 5
  }
  
  /**
   * INSIGHTS: Génère des insights textuels
   */
  private generateInsights(
    listing: ListingResponse,
    marketData: MarketData,
    scores: { priceScore: number; mileageScore: number; dealScore: number }
  ): string[] {
    const insights: string[] = []
    
    const price = listing.price_eur || 0
    if (!price || !marketData.averagePrice) return insights
    
    const priceVsMarket = ((price - marketData.averagePrice) / marketData.averagePrice) * 100
    
    // Insight prix
    if (priceVsMarket <= -15) {
      insights.push(`💰 Prix ${Math.abs(Math.round(priceVsMarket))}% sous le marché`)
    } else if (priceVsMarket >= 15) {
      insights.push(`⚠️ Prix ${Math.round(priceVsMarket)}% au-dessus du marché`)
    } else {
      insights.push(`📊 Prix dans la moyenne du marché`)
    }
    
    // Insight kilométrage
    if (scores.mileageScore >= 80 && listing.mileage_km && listing.year) {
      const currentYear = new Date().getFullYear()
      const age = currentYear - listing.year
      if (age > 0) {
        const kmPerYear = Math.round(listing.mileage_km / age)
        insights.push(`🚗 Kilométrage faible: ${kmPerYear.toLocaleString()} km/an en moyenne`)
      }
    }
    
    // Insight bonne affaire
    if (scores.dealScore >= 80) {
      insights.push(`⭐ Excellente opportunité détectée!`)
    } else if (scores.dealScore >= 70) {
      insights.push(`✨ Bonne affaire potentielle`)
    }
    
    return insights
  }
  
  /**
   * BADGES: Attribue des badges visuels
   */
  private assignBadges(
    dealScore: number,
    priceScore: number,
    mileageScore: number,
    listing: ListingResponse
  ): Badge[] {
    const badges: Badge[] = []
    
    if (dealScore >= 85) badges.push(Badge.EXCELLENT_DEAL)
    else if (dealScore >= 75) badges.push(Badge.GOOD_DEAL)
    
    if (mileageScore >= 85) badges.push(Badge.LOW_MILEAGE)
    
    // TODO: Ajouter RECENT si données disponibles
    // TODO: Ajouter VERIFIED_SELLER si données disponibles
    // TODO: Ajouter PRICE_DROP si historique prix disponible
    
    return badges
  }
}

export default new ScoringService()
```

#### B. Service Market Data (`lib/services/market-service.ts`)

```typescript
// ═══════════════════════════════════════════════════════════════
// MARKET SERVICE - Analyse du marché et statistiques
// ═══════════════════════════════════════════════════════════════

import { getSupabaseServerClient } from '@/lib/supabase/server'
import type { MarketData } from './scoring-service'

export class MarketService {
  
  /**
   * Récupère ou calcule les stats marché pour un véhicule
   */
  async getMarketData(brand: string, model: string, year?: number): Promise<MarketData | null> {
    const supabase = getSupabaseServerClient()
    
    // Chercher dans le cache (table market_analytics)
    const { data: cached } = await supabase
      .from('market_analytics')
      .select('*')
      .eq('brand', brand)
      .eq('model', model)
      .eq('year', year || null)
      .single()
    
    // Si cache récent (<24h), le retourner
    if (cached && this.isCacheValid(cached.calculated_at)) {
      return {
        brand: cached.brand,
        model: cached.model,
        averagePrice: cached.average_price,
        medianPrice: cached.median_price,
        minPrice: cached.min_price,
        maxPrice: cached.max_price,
        totalListings: cached.total_listings
      }
    }
    
    // Sinon, recalculer depuis les listings actuels
    return await this.calculateMarketData(brand, model, year)
  }
  
  /**
   * Calcule les stats marché en temps réel depuis les résultats de recherche
   * Note: On peut utiliser les listings déjà scrapés plutôt que la DB
   */
  private async calculateMarketData(
    brand: string, 
    model: string, 
    year?: number,
    listings?: any[] // Si on passe les listings directement depuis la recherche
  ): Promise<MarketData | null> {
    const supabase = getSupabaseServerClient()
    
    // Si listings fournis, utiliser ceux-ci (plus rapide)
    if (listings && listings.length > 0) {
      const prices = listings
        .filter(l => l.price_eur && l.price_eur > 0)
        .map(l => l.price_eur)
        .sort((a, b) => a - b)
      
      if (prices.length === 0) return null
      
      const analytics = {
        brand,
        model,
        year: year || null,
        averagePrice: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length),
        medianPrice: prices[Math.floor(prices.length / 2)],
        minPrice: prices[0],
        maxPrice: prices[prices.length - 1],
        totalListings: prices.length,
        calculatedAt: new Date()
      }
      
      // Sauvegarder en cache (optionnel, peut être async)
      this.saveMarketData(analytics)
      
      return {
        brand,
        model,
        averagePrice: analytics.averagePrice,
        medianPrice: analytics.medianPrice,
        minPrice: analytics.minPrice,
        maxPrice: analytics.maxPrice,
        totalListings: analytics.totalListings
      }
    }
    
    // Sinon, chercher dans la DB (si listings sauvegardés)
    const { data: dbListings } = await supabase
      .from('listings')
      .select('price')
      .eq('brand', brand)
      .eq('model', model)
      .eq('is_active', true)
      .gt('price', 0)
    
    if (!dbListings || dbListings.length === 0) return null
    
    const prices = dbListings.map(l => l.price).sort((a, b) => a - b)
    
    const analytics = {
      brand,
      model,
      year: year || null,
      averagePrice: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length),
      medianPrice: prices[Math.floor(prices.length / 2)],
      minPrice: prices[0],
      maxPrice: prices[prices.length - 1],
      totalListings: prices.length,
      calculatedAt: new Date()
    }
    
    // Sauvegarder en cache
    await this.saveMarketData(analytics)
    
    return {
      brand,
      model,
      averagePrice: analytics.averagePrice,
      medianPrice: analytics.medianPrice,
      minPrice: analytics.minPrice,
      maxPrice: analytics.maxPrice,
      totalListings: analytics.totalListings
    }
  }
  
  /**
   * Sauvegarde les stats marché en cache
   */
  private async saveMarketData(analytics: any) {
    const supabase = getSupabaseServerClient()
    
    await supabase
      .from('market_analytics')
      .upsert({
        brand: analytics.brand,
        model: analytics.model,
        year: analytics.year,
        average_price: analytics.averagePrice,
        median_price: analytics.medianPrice,
        min_price: analytics.minPrice,
        max_price: analytics.maxPrice,
        total_listings: analytics.totalListings,
        calculated_at: analytics.calculatedAt
      }, {
        onConflict: 'brand,model,year'
      })
  }
  
  /**
   * Vérifie si le cache est valide (<24h)
   */
  private isCacheValid(calculatedAt: string | Date): boolean {
    const ageInHours = (Date.now() - new Date(calculatedAt).getTime()) / (1000 * 60 * 60)
    return ageInHours < 24
  }
}

export default new MarketService()
```

### 3. API Routes à Créer

#### A. API Scoring (`app/api/scoring/route.ts`)

```typescript
import { NextRequest, NextResponse } from 'next/server'
import scoringService from '@/lib/services/scoring-service'
import marketService from '@/lib/services/market-service'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import type { ListingResponse } from '@/lib/types'

export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabaseServerClient()
    
    // Vérifier l'authentification
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { listings, brand, model, year } = await req.json()
    
    if (!listings || !Array.isArray(listings) || listings.length === 0) {
      return NextResponse.json({ listings: [] }, { status: 200 })
    }
    
    // Récupérer les données marché (depuis les listings fournis pour être rapide)
    const marketData = await marketService.getMarketData(brand, model, year, listings as ListingResponse[])
    
    if (!marketData) {
      // Si pas de données marché, retourner les listings sans scoring
      return NextResponse.json({ 
        listings: listings.map((l: ListingResponse) => ({
          ...l,
          aiScore: 50,
          priceScore: 50,
          dealScore: 0,
          sellerScore: 50,
          negotiationMargin: 5,
          insights: [],
          badges: []
        }))
      }, { status: 200 })
    }
    
    // Scorer les annonces
    const scoredListings = await scoringService.scoreListings(listings as ListingResponse[], marketData)
    
    // Trier par score décroissant
    scoredListings.sort((a, b) => b.aiScore - a.aiScore)
    
    return NextResponse.json({ 
      listings: scoredListings,
      marketData 
    })
    
  } catch (error) {
    console.error('[API SCORING ERROR]', error)
    return NextResponse.json(
      { error: 'Erreur lors du scoring' },
      { status: 500 }
    )
  }
}
```

#### B. API Usage Tracking (`app/api/usage/route.ts`)

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'

// GET: Vérifier les limites d'usage
export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Récupérer le profil utilisateur
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    
    if (!profile) {
      // Créer le profil si n'existe pas
      const { data: newProfile } = await supabase
        .from('user_profiles')
        .insert({
          id: user.id,
          subscription_tier: 'FREE'
        })
        .select()
        .single()
      
      return NextResponse.json({
        tier: 'FREE',
        searchesToday: 0,
        searchesLimit: 5,
        canSearch: true
      })
    }
    
    // Réinitialiser le compteur si nouveau jour
    const now = new Date()
    const lastReset = new Date(profile.last_search_reset || now)
    const isNewDay = now.toDateString() !== lastReset.toDateString()
    
    if (isNewDay) {
      await supabase
        .from('user_profiles')
        .update({
          searches_today: 0,
          last_search_reset: now
        })
        .eq('id', user.id)
    }
    
    const searchesLimit = {
      FREE: 5,
      STANDARD: Infinity,
      PREMIUM: Infinity,
      PRO: Infinity
    }[profile.subscription_tier] || 5
    
    const canSearch = profile.searches_today < searchesLimit
    
    return NextResponse.json({
      tier: profile.subscription_tier,
      searchesToday: profile.searches_today || 0,
      searchesLimit,
      canSearch
    })
    
  } catch (error) {
    console.error('[API USAGE GET ERROR]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// POST: Incrémenter le compteur de recherches
export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Incrémenter searches_today et total_searches
    const { error } = await supabase.rpc('increment_user_searches', {
      user_id: user.id
    })
    
    if (error) {
      // Fallback si la fonction RPC n'existe pas
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('searches_today, total_searches')
        .eq('id', user.id)
        .single()
      
      await supabase
        .from('user_profiles')
        .update({
          searches_today: (profile?.searches_today || 0) + 1,
          total_searches: (profile?.total_searches || 0) + 1
        })
        .eq('id', user.id)
    }
    
    return NextResponse.json({ success: true })
    
  } catch (error) {
    console.error('[API USAGE POST ERROR]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
```

### 4. Modification de la Page Résultats

Modifier `app/resultats/page.tsx` pour intégrer le scoring:

```typescript
// Dans la fonction performSearch, après le scraping:

// 1. SCRAPING (existant)
const searchResponse = await fetch('/api/search', { ... })
const searchData: SearchResponse = await searchResponse.json()

// 2. SCORING IA (nouveau) - seulement si utilisateur connecté
let scoredListings = searchData.listings || []

if (user) {
  try {
    const scoringResponse = await fetch('/api/scoring', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        listings: scoredListings,
        brand: searchCriteria.brand,
        model: searchCriteria.model,
        year: searchCriteria.year
      })
    })
    
    if (scoringResponse.ok) {
      const scoringData = await scoringResponse.json()
      scoredListings = scoringData.listings || scoredListings
    }
  } catch (error) {
    console.error('Erreur scoring:', error)
    // Continuer sans scoring en cas d'erreur
  }
}

// 3. Limiter les résultats selon l'abonnement
const { data: usageData } = await fetch('/api/usage').then(r => r.json())
const maxResults = {
  FREE: 10,
  STANDARD: 50,
  PREMIUM: 100,
  PRO: Infinity
}[usageData?.tier || 'FREE'] || 10

scoredListings = scoredListings.slice(0, maxResults)

// 4. Trier par score IA (déjà fait côté API, mais on peut re-trier)
scoredListings.sort((a, b) => (b.aiScore || 0) - (a.aiScore || 0))
```

### 5. Composants Frontend à Créer

#### A. Carte d'Annonce Premium (`components/listings/ListingCardPremium.tsx`)

Voir le code complet dans le prompt original, mais adapter pour utiliser:
- `useFavorites` hook existant au lieu de créer un nouveau
- Types `ListingResponse` existants
- Composants UI existants (shadcn/ui)

#### B. Badge Component (`components/listings/Badge.tsx`)

```typescript
'use client'

import { Badge as BadgeType } from '@/lib/services/scoring-service'
import { Badge } from '@/components/ui/badge'

const BADGE_CONFIG = {
  [BadgeType.EXCELLENT_DEAL]: {
    label: '🔥 Excellente affaire',
    variant: 'default' as const,
    className: 'bg-gradient-to-r from-orange-500 to-red-500 text-white'
  },
  [BadgeType.GOOD_DEAL]: {
    label: '✨ Bonne affaire',
    variant: 'default' as const,
    className: 'bg-gradient-to-r from-green-500 to-emerald-600 text-white'
  },
  [BadgeType.LOW_MILEAGE]: {
    label: '🚗 Faible km',
    variant: 'secondary' as const
  },
  [BadgeType.RECENT]: {
    label: '🆕 Récent',
    variant: 'outline' as const
  },
  // ... autres badges
}

export function ListingBadge({ badge }: { badge: BadgeType }) {
  const config = BADGE_CONFIG[badge]
  if (!config) return null
  
  return (
    <Badge className={config.className} variant={config.variant}>
      {config.label}
    </Badge>
  )
}
```

## 🎬 PLAN D'IMPLÉMENTATION DÉTAILLÉ

### Phase 1: Base de Données & Auth (Jours 1-2)

1. **Créer les tables Supabase**:
   - Exécuter le SQL fourni dans Supabase Dashboard → SQL Editor
   - Vérifier les RLS policies
   - Tester les permissions

2. **Créer le client Supabase server**:
   ```typescript
   // lib/supabase/server.ts
   import { createClient } from '@supabase/supabase-js'
   
   export function getSupabaseServerClient() {
     return createClient(
       process.env.NEXT_PUBLIC_SUPABASE_URL!,
       process.env.SUPABASE_SERVICE_ROLE_KEY!
     )
   }
   ```

3. **Adapter le hook useFavorites existant** pour utiliser les nouvelles tables si nécessaire

### Phase 2: Services Backend (Jours 3-5)

1. Créer `lib/services/scoring-service.ts`
2. Créer `lib/services/market-service.ts`
3. Créer `app/api/scoring/route.ts`
4. Créer `app/api/usage/route.ts`
5. Tester les services avec des données réelles

### Phase 3: Intégration Frontend (Jours 6-8)

1. Modifier `app/resultats/page.tsx` pour intégrer le scoring
2. Créer `components/listings/ListingCardPremium.tsx`
3. Créer `components/listings/Badge.tsx`
4. Adapter `components/favorites/FavoriteButton.tsx` si nécessaire
5. Tester l'affichage des scores et badges

### Phase 4: Système de Paiement (Jours 9-10)

1. Installer Stripe: `npm install stripe @stripe/stripe-js`
2. Créer la page `/pricing/page.tsx`
3. Implémenter Stripe Checkout
4. Configurer les webhooks Stripe
5. Créer la page `/dashboard/page.tsx` (gestion abonnement)

### Phase 5: Alertes & Notifications (Jours 11-12)

1. Créer `lib/services/alert-service.ts`
2. Créer `app/api/alerts/route.ts`
3. Configurer les cron jobs (Vercel Cron)
4. Implémenter le service d'email (Resend recommandé)
5. Tester les alertes

### Phase 6: Tests & Optimisations (Jours 13-14)

1. Tester tous les flux utilisateur
2. Optimiser les requêtes Supabase
3. Ajouter des indices si nécessaire
4. Tests de charge
5. Monitoring (Sentry)

### Phase 7: Déploiement (Jour 15)

1. Pousser vers GitHub
2. Déployer sur Vercel
3. Configurer les variables d'environnement production
4. Activer les cron jobs
5. Configurer le domaine custom

## 🚀 PROMPTS CURSOR SPÉCIFIQUES PAR TÂCHE

### Pour créer le schema Supabase:

```
Crée les tables Supabase suivantes via SQL:
1. user_profiles: Extension de auth.users avec subscription_tier (FREE/STANDARD/PREMIUM/PRO), subscription_id, subscription_ends_at, searches_today, last_search_reset, total_searches
2. saved_searches: Critères de recherche sauvegardés avec alert_enabled, alert_frequency
3. alerts: Notifications avec type (NEW_LISTING/PRICE_DROP/GOOD_DEAL/BACK_IN_STOCK)
4. listings: Annonces avec enrichissement IA (ai_score, price_score, deal_score, seller_score, negotiation_margin)
5. favorites: Favoris utilisateur (peut déjà exister, vérifier)
6. price_history: Historique des prix
7. market_analytics: Cache des stats marché

Active RLS sur toutes les tables et crée les policies pour que les utilisateurs ne voient/modifient que leurs propres données.
Utilise les bons index pour les performances (brand+model, user_id, etc.).
```

### Pour créer le ScoringService:

```
Crée lib/services/scoring-service.ts qui:
1. Exporte une classe ScoringService avec méthode scoreListings(listings, marketData)
2. Calcule un aiScore de 0-100 basé sur:
   - priceScore (40%): Compare prix vs marché, 100 = 20% sous marché, 0 = 20%+ au-dessus
   - mileageScore (25%): Compare km vs âge, règle 15000km/an
   - qualityScore (20%): Évalue photos, données complètes
   - sellerScore (15%): Score vendeur basique selon source
3. Calcule dealScore: Uniquement si priceScore > 70, moyenne pondérée
4. Estime negotiationMargin: 2% si déjà bon prix, 7% si moyenne, 10% si cher
5. Génère insights textuels: ["Prix 15% sous marché", "Kilométrage faible", etc.]
6. Attribue badges: GOOD_DEAL, EXCELLENT_DEAL, LOW_MILEAGE, RECENT, etc.
Retourne ScoredListing avec tous ces champs.
Utilise les types ListingResponse existants de @/lib/types.
Utilise TypeScript avec types stricts.
```

### Pour intégrer le scoring dans /resultats:

```
Modifie app/resultats/page.tsx pour:
1. Après le scraping (fetch '/api/search'), appeler fetch '/api/scoring' avec { listings, brand, model, year }
2. Récupérer scoredListings depuis la réponse
3. Limiter les résultats selon l'abonnement (FREE: 10, STANDARD: 50, PREMIUM: 100, PRO: illimité)
4. Afficher avec <ListingCardPremium> au lieu de l'ancienne carte
5. Trier par aiScore décroissant
6. Afficher les badges et insights sur chaque carte
Ne pas modifier la logique de scraping existante.
Ne pas toucher LeBonCoin scraper.
```

### Pour créer ListingCardPremium:

```
Crée components/listings/ListingCardPremium.tsx qui:
1. Reçoit en props: listing (ScoredListing), onCompare (optional), showComparison (boolean)
2. Affiche:
   - Badges en haut à gauche (badges du listing)
   - Score IA en haut à droite (gradient purple/blue avec étoile)
   - Image avec overlay au survol (boutons Favori + Comparaison)
   - Titre, specs (année, km, carburant)
   - Localisation avec icône MapPin
   - Section insights avec gradient purple/blue background
   - Prix en gros + indication marge négociation si > 0
   - Bouton "Voir l'annonce" externe
   - Source en bas
3. Utilise hook useFavorites EXISTANT pour gérer les favoris
4. Au clic sur comparaison, appelle onCompare
5. Style: Tailwind, carte rounded-xl avec shadow-md hover:shadow-xl
6. Composant Badge pour afficher les badges avec icônes et couleurs
Responsive, animation smooth sur hover.
Utilise les composants UI existants (shadcn/ui).
```

## ⚠️ RÈGLES IMPORTANTES

1. **NE PAS TOUCHER** `src/modules/scraping/sites/leboncoin/scraper.ts`
2. **NE PAS MODIFIER** les timeouts dans `src/core/config/constants.ts`
3. **UTILISER** Supabase au lieu de Prisma (sauf si vous préférez Prisma)
4. **ADAPTER** les hooks existants (`useFavorites`, `useSearchHistory`) plutôt que de les recréer
5. **RESPECTER** l'architecture Next.js App Router existante
6. **UTILISER** les types existants (`ListingResponse` de `@/lib/types`)
7. **TESTER** chaque fonctionnalité avant de passer à la suivante

## 📊 MÉTRIQUES DE SUCCÈS

KPIs à suivre:
- **Acquisition**: Taux de conversion visiteur → utilisateur inscrit: >15%
- **Monétisation**: Taux de conversion gratuit → payant: >5%
- **Engagement**: Nombre de recherches / utilisateur / mois: >10
- **Rétention**: Churn rate mensuel: <10%
- **Produit**: Score IA moyen: >75/100

---

**Note**: Ce prompt est adapté à l'architecture actuelle d'AutoVal. Tous les chemins de fichiers et technologies correspondent à ce qui existe déjà dans le projet.

