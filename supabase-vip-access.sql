-- ============================================================================
-- INTÉGRATION SYSTÈME D'ACCÈS VIP - Sans casser l'existant
-- ============================================================================
-- Ce fichier ajoute uniquement les colonnes et fonctions nécessaires
-- pour la gestion d'accès VIP via Retool, sans modifier l'existant
-- ============================================================================

-- ============================================================================
-- ÉTAPE 1 : AJOUT DES COLONNES À LA TABLE PROFILES
-- ============================================================================

-- 1. Ajouter la colonne plan_type (si elle n'existe pas déjà)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'plan_type'
    ) THEN
        ALTER TABLE public.profiles 
        ADD COLUMN plan_type TEXT DEFAULT 'free' 
        CHECK (plan_type IN ('free', 'premium', 'enterprise', 'lifetime_free'));
    END IF;
END $$;

-- 2. Ajouter la colonne access_override (le switch VIP)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'access_override'
    ) THEN
        ALTER TABLE public.profiles 
        ADD COLUMN access_override BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- 3. Créer un index pour la performance
CREATE INDEX IF NOT EXISTS idx_profiles_access_override 
ON public.profiles(access_override) WHERE access_override = TRUE;

-- 4. Vérification
SELECT 
    column_name, 
    data_type, 
    column_default 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name IN ('plan_type', 'access_override');

-- ============================================================================
-- ÉTAPE 2 : FONCTION DE VÉRIFICATION D'ACCÈS
-- ============================================================================
-- Cette fonction intègre le système Stripe existant avec le nouveau système VIP
-- ============================================================================

CREATE OR REPLACE FUNCTION public.check_user_has_access(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_profile RECORD;
    v_subscription RECORD;
BEGIN
    -- Récupérer le profil
    SELECT * INTO v_profile
    FROM public.profiles
    WHERE id = p_user_id;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- 1. VIP override = priorité absolue (contourne tout)
    IF v_profile.access_override = TRUE THEN
        RETURN TRUE;
    END IF;
    
    -- 2. Vérifier le plan_type dans profiles
    IF v_profile.plan_type IN ('premium', 'enterprise', 'lifetime_free') THEN
        RETURN TRUE;
    END IF;
    
    -- 3. Vérifier l'abonnement Stripe actif (système existant)
    SELECT * INTO v_subscription
    FROM public.subscriptions
    WHERE user_id = p_user_id
      AND subscription_status = 'active'
      AND (current_period_end IS NULL OR current_period_end > NOW())
    LIMIT 1;
    
    IF FOUND THEN
        RETURN TRUE;
    END IF;
    
    -- Sinon, pas d'accès
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================
-- Permettre aux utilisateurs authentifiés d'appeler la fonction
GRANT EXECUTE ON FUNCTION public.check_user_has_access(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_user_has_access(UUID) TO anon;

-- ============================================================================
-- TEST DE LA FONCTION
-- ============================================================================
-- Décommenter pour tester après l'exécution
-- SELECT 
--     id,
--     email,
--     access_override,
--     plan_type,
--     public.check_user_has_access(id) as has_access
-- FROM public.profiles
-- LIMIT 5;

