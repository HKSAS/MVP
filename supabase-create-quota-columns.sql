-- ============================================================================
-- CRÉATION DES COLONNES DE QUOTAS
-- ============================================================================
-- Ce script crée les colonnes nécessaires pour le système de quotas
-- À EXÉCUTER EN PREMIER avant les autres scripts
-- ============================================================================

-- Vérifier et créer les colonnes de quotas si elles n'existent pas
DO $$
BEGIN
    -- Colonne quota_recherches_free
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'quota_recherches_free'
    ) THEN
        ALTER TABLE public.profiles 
        ADD COLUMN quota_recherches_free INT DEFAULT 2;
        RAISE NOTICE 'Colonne quota_recherches_free créée';
    END IF;
    
    -- Colonne quota_analyses_free
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'quota_analyses_free'
    ) THEN
        ALTER TABLE public.profiles 
        ADD COLUMN quota_analyses_free INT DEFAULT 2;
        RAISE NOTICE 'Colonne quota_analyses_free créée';
    END IF;
    
    -- Colonne recherches_utilisees
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'recherches_utilisees'
    ) THEN
        ALTER TABLE public.profiles 
        ADD COLUMN recherches_utilisees INT DEFAULT 0;
        RAISE NOTICE 'Colonne recherches_utilisees créée';
    END IF;
    
    -- Colonne analyses_utilisees
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'analyses_utilisees'
    ) THEN
        ALTER TABLE public.profiles 
        ADD COLUMN analyses_utilisees INT DEFAULT 0;
        RAISE NOTICE 'Colonne analyses_utilisees créée';
    END IF;
    
    -- Colonne quota_reset_date
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'quota_reset_date'
    ) THEN
        ALTER TABLE public.profiles 
        ADD COLUMN quota_reset_date TIMESTAMPTZ DEFAULT (DATE_TRUNC('month', NOW()) + INTERVAL '1 month');
        RAISE NOTICE 'Colonne quota_reset_date créée';
    END IF;
    
    -- Colonne subscription_status (si pas déjà présente)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'subscription_status'
    ) THEN
        ALTER TABLE public.profiles 
        ADD COLUMN subscription_status TEXT DEFAULT 'free' 
        CHECK (subscription_status IN ('free', 'active', 'canceled', 'past_due', 'trialing'));
        RAISE NOTICE 'Colonne subscription_status créée';
    END IF;
    
    -- Colonne plan_type (si pas déjà présente)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'plan_type'
    ) THEN
        ALTER TABLE public.profiles 
        ADD COLUMN plan_type TEXT DEFAULT 'free' 
        CHECK (plan_type IN ('free', 'starter', 'essentiel', 'confort', 'premium', 'enterprise', 'lifetime_free'));
        RAISE NOTICE 'Colonne plan_type créée';
    END IF;
    
    -- Colonne subscription_end_date (si pas déjà présente)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'subscription_end_date'
    ) THEN
        ALTER TABLE public.profiles 
        ADD COLUMN subscription_end_date TIMESTAMPTZ;
        RAISE NOTICE 'Colonne subscription_end_date créée';
    END IF;
    
    -- Colonne role (si pas déjà présente)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'role'
    ) THEN
        ALTER TABLE public.profiles 
        ADD COLUMN role TEXT DEFAULT 'user' 
        CHECK (role IN ('user', 'admin'));
        RAISE NOTICE 'Colonne role créée';
    END IF;
    
    -- Colonne access_override (si pas déjà présente)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'access_override'
    ) THEN
        ALTER TABLE public.profiles 
        ADD COLUMN access_override BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Colonne access_override créée';
    END IF;
    
    RAISE NOTICE 'Toutes les colonnes de quotas ont été créées ou existaient déjà';
END $$;

-- Initialiser les valeurs par défaut pour les utilisateurs existants
UPDATE public.profiles
SET 
    quota_recherches_free = COALESCE(quota_recherches_free, 2),
    quota_analyses_free = COALESCE(quota_analyses_free, 2),
    recherches_utilisees = COALESCE(recherches_utilisees, 0),
    analyses_utilisees = COALESCE(analyses_utilisees, 0),
    quota_reset_date = COALESCE(quota_reset_date, DATE_TRUNC('month', NOW()) + INTERVAL '1 month'),
    subscription_status = COALESCE(subscription_status, 'free'),
    plan_type = COALESCE(plan_type, 'free'),
    role = COALESCE(role, 'user'),
    access_override = COALESCE(access_override, FALSE)
WHERE 
    quota_recherches_free IS NULL 
    OR quota_analyses_free IS NULL
    OR recherches_utilisees IS NULL
    OR analyses_utilisees IS NULL;

-- Vérifier que les colonnes existent
SELECT 
    column_name,
    data_type,
    column_default
FROM information_schema.columns
WHERE table_name = 'profiles' 
    AND column_name IN (
        'quota_recherches_free',
        'quota_analyses_free',
        'recherches_utilisees',
        'analyses_utilisees',
        'quota_reset_date',
        'subscription_status',
        'plan_type',
        'subscription_end_date',
        'role',
        'access_override'
    )
ORDER BY column_name;

