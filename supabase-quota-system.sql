-- ============================================================================
-- SYSTÈME COMPLET DE QUOTAS ET GESTION D'ACCÈS - Autoval IA
-- ============================================================================
-- Ce fichier étend la table profiles existante et ajoute le système de quotas
-- ============================================================================

-- ============================================================================
-- ÉTAPE 1 : EXTENSION DE LA TABLE PROFILES
-- ============================================================================

-- Ajouter les colonnes de quotas si elles n'existent pas
DO $$ 
BEGIN
    -- Quotas gratuits (reset chaque mois)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'quota_recherches_free'
    ) THEN
        ALTER TABLE public.profiles 
        ADD COLUMN quota_recherches_free INT DEFAULT 2;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'quota_analyses_free'
    ) THEN
        ALTER TABLE public.profiles 
        ADD COLUMN quota_analyses_free INT DEFAULT 2;
    END IF;
    
    -- Compteurs d'utilisation (ce mois-ci)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'recherches_utilisees'
    ) THEN
        ALTER TABLE public.profiles 
        ADD COLUMN recherches_utilisees INT DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'analyses_utilisees'
    ) THEN
        ALTER TABLE public.profiles 
        ADD COLUMN analyses_utilisees INT DEFAULT 0;
    END IF;
    
    -- Date de reset des quotas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'quota_reset_date'
    ) THEN
        ALTER TABLE public.profiles 
        ADD COLUMN quota_reset_date DATE DEFAULT DATE_TRUNC('month', NOW() + INTERVAL '1 month');
    END IF;
    
    -- Colonnes pour VIP (si pas déjà ajoutées par le système VIP précédent)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'access_override'
    ) THEN
        ALTER TABLE public.profiles 
        ADD COLUMN access_override BOOLEAN DEFAULT FALSE;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'plan_type'
    ) THEN
        ALTER TABLE public.profiles 
        ADD COLUMN plan_type TEXT DEFAULT 'free' 
        CHECK (plan_type IN ('free', 'starter', 'premium', 'enterprise', 'lifetime_free'));
    END IF;
    
    -- Modifier le rôle pour inclure 'admin' et 'moderator'
    -- Note: On ne peut pas modifier directement un CHECK, donc on le fait en deux étapes
    ALTER TABLE public.profiles 
    DROP CONSTRAINT IF EXISTS profiles_role_check;
    
    ALTER TABLE public.profiles 
    ADD CONSTRAINT profiles_role_check 
    CHECK (role IN ('user', 'pro', 'admin', 'moderator'));
    
    -- Colonnes d'abonnement (si pas déjà présentes)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'subscription_status'
    ) THEN
        ALTER TABLE public.profiles 
        ADD COLUMN subscription_status TEXT DEFAULT 'free' 
        CHECK (subscription_status IN ('free', 'active', 'canceled', 'past_due', 'trialing'));
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'subscription_end_date'
    ) THEN
        ALTER TABLE public.profiles 
        ADD COLUMN subscription_end_date TIMESTAMPTZ;
    END IF;
    
    -- Colonnes Stripe (si pas déjà présentes)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'stripe_customer_id'
    ) THEN
        ALTER TABLE public.profiles 
        ADD COLUMN stripe_customer_id TEXT;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'stripe_subscription_id'
    ) THEN
        ALTER TABLE public.profiles 
        ADD COLUMN stripe_subscription_id TEXT;
    END IF;
    
    -- Colonnes supplémentaires
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'full_name'
    ) THEN
        ALTER TABLE public.profiles 
        ADD COLUMN full_name TEXT;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'avatar_url'
    ) THEN
        ALTER TABLE public.profiles 
        ADD COLUMN avatar_url TEXT;
    END IF;
END $$;

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_subscription ON profiles(subscription_status);
CREATE INDEX IF NOT EXISTS idx_profiles_stripe ON profiles(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_profiles_access_override ON profiles(access_override) WHERE access_override = TRUE;
CREATE INDEX IF NOT EXISTS idx_profiles_quota_reset ON profiles(quota_reset_date);

-- ============================================================================
-- ÉTAPE 2 : TABLE DE TRACKING DES ACTIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.usage_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    action_type TEXT NOT NULL CHECK (action_type IN ('recherche', 'analyse')),
    action_data JSONB DEFAULT '{}'::jsonb, -- Détails de l'action (modèle voiture, budget, etc)
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_usage_user ON usage_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_date ON usage_tracking(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_type ON usage_tracking(action_type);

-- RLS pour usage_tracking
ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;

-- Supprimer les politiques existantes si elles existent
DROP POLICY IF EXISTS "Users can view their own usage" ON usage_tracking;
DROP POLICY IF EXISTS "Service can insert usage" ON usage_tracking;

CREATE POLICY "Users can view their own usage"
    ON usage_tracking FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Service can insert usage"
    ON usage_tracking FOR INSERT
    WITH CHECK (true);

-- ============================================================================
-- ÉTAPE 3 : FONCTIONS SQL ESSENTIELLES
-- ============================================================================

-- ================================================
-- FONCTION 1 : Vérifier l'accès utilisateur
-- ================================================

CREATE OR REPLACE FUNCTION public.check_user_access(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_profile RECORD;
BEGIN
    -- Récupérer le profil
    SELECT * INTO v_profile FROM profiles WHERE id = p_user_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'has_access', false,
            'reason', 'user_not_found',
            'message', 'Utilisateur non trouvé'
        );
    END IF;
    
    -- PRIORITÉ 1 : VIP override (access_override = TRUE)
    IF v_profile.access_override = TRUE THEN
        RETURN jsonb_build_object(
            'has_access', true,
            'reason', 'vip_access',
            'message', 'Accès VIP illimité',
            'plan', v_profile.plan_type,
            'is_admin', COALESCE(v_profile.role = 'admin', false),
            'is_vip', true,
            'quota_recherches_restantes', NULL,
            'quota_analyses_restantes', NULL,
            'unlimited', true
        );
    END IF;
    
    -- PRIORITÉ 2 : Admins ont toujours accès
    IF v_profile.role = 'admin' THEN
        RETURN jsonb_build_object(
            'has_access', true,
            'reason', 'admin_access',
            'message', 'Accès admin illimité',
            'plan', v_profile.plan_type,
            'is_admin', true,
            'is_vip', false,
            'quota_recherches_restantes', NULL,
            'quota_analyses_restantes', NULL,
            'unlimited', true
        );
    END IF;
    
    -- PRIORITÉ 3 : Abonnement actif
    IF v_profile.subscription_status = 'active' THEN
        RETURN jsonb_build_object(
            'has_access', true,
            'reason', 'subscription_active',
            'message', 'Abonnement actif',
            'plan', v_profile.plan_type,
            'is_admin', FALSE,
            'is_vip', FALSE,
            'quota_recherches_restantes', NULL,
            'quota_analyses_restantes', NULL,
            'unlimited', true
        );
    END IF;
    
    -- PRIORITÉ 4 : Trial actif
    IF v_profile.subscription_status = 'trialing' AND 
       (v_profile.subscription_end_date IS NULL OR v_profile.subscription_end_date > NOW()) THEN
        RETURN jsonb_build_object(
            'has_access', true,
            'reason', 'trial_active',
            'message', 'Période d''essai active',
            'plan', v_profile.plan_type,
            'is_admin', FALSE,
            'is_vip', FALSE,
            'trial_ends', v_profile.subscription_end_date,
            'quota_recherches_restantes', NULL,
            'quota_analyses_restantes', NULL,
            'unlimited', true
        );
    END IF;
    
    -- PRIORITÉ 5 : Quotas gratuits
    RETURN jsonb_build_object(
        'has_access', true,
        'reason', 'free_quota',
        'message', 'Quotas gratuits',
        'quota_recherches_restantes', GREATEST(0, COALESCE(v_profile.quota_recherches_free, 2) - COALESCE(v_profile.recherches_utilisees, 0)),
        'quota_analyses_restantes', GREATEST(0, COALESCE(v_profile.quota_analyses_free, 2) - COALESCE(v_profile.analyses_utilisees, 0)),
        'recherches_utilisees', COALESCE(v_profile.recherches_utilisees, 0),
        'analyses_utilisees', COALESCE(v_profile.analyses_utilisees, 0),
        'unlimited', false
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================
-- FONCTION 2 : Peut effectuer une action ?
-- ================================================

CREATE OR REPLACE FUNCTION public.can_perform_action(
    p_user_id UUID,
    p_action_type TEXT -- 'recherche' ou 'analyse'
)
RETURNS JSONB AS $$
DECLARE
    v_profile RECORD;
    v_remaining INT;
BEGIN
    SELECT * INTO v_profile FROM profiles WHERE id = p_user_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('can_perform', false, 'reason', 'user_not_found', 'message', 'Utilisateur non trouvé');
    END IF;
    
    -- VIP override : toujours OK
    IF v_profile.access_override = TRUE THEN
        RETURN jsonb_build_object(
            'can_perform', true, 
            'reason', 'vip',
            'unlimited', true,
            'message', 'Accès VIP illimité'
        );
    END IF;
    
    -- Admin : toujours OK
    IF v_profile.role = 'admin' THEN
        RETURN jsonb_build_object(
            'can_perform', true, 
            'reason', 'admin',
            'unlimited', true,
            'message', 'Accès admin illimité'
        );
    END IF;
    
    -- Abonnement actif : toujours OK
    IF v_profile.subscription_status IN ('active', 'trialing') THEN
        RETURN jsonb_build_object(
            'can_perform', true, 
            'reason', 'subscription',
            'unlimited', true,
            'message', 'Abonnement actif'
        );
    END IF;
    
    -- Vérifier les quotas
    IF p_action_type = 'recherche' THEN
        v_remaining := COALESCE(v_profile.quota_recherches_free, 2) - COALESCE(v_profile.recherches_utilisees, 0);
        IF v_remaining > 0 THEN
            RETURN jsonb_build_object(
                'can_perform', true,
                'reason', 'free_quota',
                'remaining', v_remaining,
                'unlimited', false,
                'message', format('%s recherches restantes', v_remaining)
            );
        ELSE
            RETURN jsonb_build_object(
                'can_perform', false,
                'reason', 'quota_exceeded',
                'message', 'Quota de recherches épuisé. Passez à un abonnement pour continuer.'
            );
        END IF;
    END IF;
    
    IF p_action_type = 'analyse' THEN
        v_remaining := COALESCE(v_profile.quota_analyses_free, 2) - COALESCE(v_profile.analyses_utilisees, 0);
        IF v_remaining > 0 THEN
            RETURN jsonb_build_object(
                'can_perform', true,
                'reason', 'free_quota',
                'remaining', v_remaining,
                'unlimited', false,
                'message', format('%s analyses restantes', v_remaining)
            );
        ELSE
            RETURN jsonb_build_object(
                'can_perform', false,
                'reason', 'quota_exceeded',
                'message', 'Quota d''analyses épuisé. Passez à un abonnement pour continuer.'
            );
        END IF;
    END IF;
    
    RETURN jsonb_build_object('can_perform', false, 'reason', 'unknown_action', 'message', 'Type d''action inconnu');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================
-- FONCTION 3 : Enregistrer une utilisation
-- ================================================

CREATE OR REPLACE FUNCTION public.track_usage(
    p_user_id UUID,
    p_action_type TEXT,
    p_action_data JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB AS $$
DECLARE
    v_can_perform JSONB;
    v_profile RECORD;
BEGIN
    -- Vérifier si l'action est possible
    v_can_perform := can_perform_action(p_user_id, p_action_type);
    
    IF NOT (v_can_perform->>'can_perform')::boolean THEN
        RETURN v_can_perform;
    END IF;
    
    -- Récupérer le profil pour vérifier si on doit incrémenter
    SELECT * INTO v_profile FROM profiles WHERE id = p_user_id;
    
    -- NE PAS incrémenter les compteurs si :
    -- 1. VIP (access_override = TRUE)
    -- 2. Admin (role = 'admin')
    -- 3. Abonnement actif (subscription_status = 'active' ou 'trialing')
    -- Incrémenter UNIQUEMENT pour les utilisateurs gratuits (free_quota)
    IF (v_can_perform->>'reason') = 'free_quota' THEN
        -- Vérifier une dernière fois qu'on n'est pas VIP ou abonné
        IF v_profile.access_override = FALSE 
           AND v_profile.role != 'admin'
           AND v_profile.subscription_status NOT IN ('active', 'trialing') THEN
            -- Incrémenter uniquement pour les utilisateurs vraiment gratuits
            IF p_action_type = 'recherche' THEN
                UPDATE profiles 
                SET recherches_utilisees = COALESCE(recherches_utilisees, 0) + 1,
                    updated_at = NOW()
                WHERE id = p_user_id;
            ELSIF p_action_type = 'analyse' THEN
                UPDATE profiles 
                SET analyses_utilisees = COALESCE(analyses_utilisees, 0) + 1,
                    updated_at = NOW()
                WHERE id = p_user_id;
            END IF;
        END IF;
    END IF;
    
    -- Logger l'action
    INSERT INTO usage_tracking (user_id, action_type, action_data)
    VALUES (p_user_id, p_action_type, p_action_data);
    
    -- Recalculer les restants
    IF (v_can_perform->>'reason') = 'free_quota' THEN
        IF p_action_type = 'recherche' THEN
            RETURN jsonb_build_object(
                'success', true,
                'action', p_action_type,
                'remaining', GREATEST(0, COALESCE((v_can_perform->>'remaining')::int, 0) - 1),
                'unlimited', false
            );
        ELSIF p_action_type = 'analyse' THEN
            RETURN jsonb_build_object(
                'success', true,
                'action', p_action_type,
                'remaining', GREATEST(0, COALESCE((v_can_perform->>'remaining')::int, 0) - 1),
                'unlimited', false
            );
        END IF;
    END IF;
    
    RETURN jsonb_build_object(
        'success', true,
        'action', p_action_type,
        'unlimited', true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================
-- FONCTION 4 : Reset quotas mensuels (cron)
-- ================================================

CREATE OR REPLACE FUNCTION public.reset_monthly_quotas()
RETURNS JSONB AS $$
DECLARE
    v_updated_count INT;
BEGIN
    UPDATE profiles
    SET 
        recherches_utilisees = 0,
        analyses_utilisees = 0,
        quota_reset_date = DATE_TRUNC('month', NOW() + INTERVAL '1 month'),
        updated_at = NOW()
    WHERE quota_reset_date <= CURRENT_DATE
      AND subscription_status = 'free';
    
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    
    RETURN jsonb_build_object(
        'success', true,
        'updated_profiles', v_updated_count,
        'reset_date', DATE_TRUNC('month', NOW() + INTERVAL '1 month')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.check_user_access(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_user_access(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.can_perform_action(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_perform_action(UUID, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.track_usage(UUID, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.track_usage(UUID, TEXT, JSONB) TO anon;
GRANT EXECUTE ON FUNCTION public.reset_monthly_quotas() TO authenticated;

-- ============================================================================
-- TRIGGER : Créer automatiquement un profil pour les nouveaux users
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (
        id, 
        email, 
        role,
        quota_recherches_free,
        quota_analyses_free,
        quota_reset_date
    )
    VALUES (
        NEW.id, 
        NEW.email,
        'user',
        2,
        2,
        DATE_TRUNC('month', NOW() + INTERVAL '1 month')
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Créer les profils pour les users existants (si pas déjà créés)
INSERT INTO public.profiles (
    id, 
    email, 
    role,
    quota_recherches_free,
    quota_analyses_free,
    quota_reset_date
)
SELECT 
    id, 
    email, 
    'user',
    2,
    2,
    DATE_TRUNC('month', NOW() + INTERVAL '1 month')
FROM auth.users
WHERE id NOT IN (SELECT id FROM profiles)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- VÉRIFICATION
-- ============================================================================

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
    'access_override',
    'plan_type',
    'subscription_status'
)
ORDER BY column_name;

