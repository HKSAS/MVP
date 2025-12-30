-- ============================================================================
-- SCRIPT DE VÉRIFICATION ET INITIALISATION DES QUOTAS
-- ============================================================================
-- Ce script vérifie et initialise les quotas pour tous les utilisateurs
-- ============================================================================

-- Vérifier et initialiser les quotas pour tous les utilisateurs
DO $$
DECLARE
    v_user RECORD;
    v_count INT;
BEGIN
    -- Compter les utilisateurs sans quotas initialisés
    SELECT COUNT(*) INTO v_count
    FROM auth.users u
    LEFT JOIN profiles p ON p.id = u.id
    WHERE p.quota_recherches_free IS NULL 
       OR p.quota_analyses_free IS NULL
       OR p.recherches_utilisees IS NULL
       OR p.analyses_utilisees IS NULL;
    
    RAISE NOTICE 'Utilisateurs à initialiser: %', v_count;
    
    -- Initialiser les quotas pour tous les utilisateurs
    FOR v_user IN 
        SELECT u.id, u.email
        FROM auth.users u
        LEFT JOIN profiles p ON p.id = u.id
        WHERE p.quota_recherches_free IS NULL 
           OR p.quota_analyses_free IS NULL
           OR p.recherches_utilisees IS NULL
           OR p.analyses_utilisees IS NULL
    LOOP
        -- Créer ou mettre à jour le profil
        INSERT INTO profiles (
            id,
            email,
            quota_recherches_free,
            quota_analyses_free,
            recherches_utilisees,
            analyses_utilisees,
            quota_reset_date,
            subscription_status,
            plan_type,
            role,
            access_override,
            created_at,
            updated_at
        )
        VALUES (
            v_user.id,
            v_user.email,
            2,  -- quota_recherches_free
            2,  -- quota_analyses_free
            COALESCE((SELECT recherches_utilisees FROM profiles WHERE id = v_user.id), 0),
            COALESCE((SELECT analyses_utilisees FROM profiles WHERE id = v_user.id), 0),
            DATE_TRUNC('month', NOW()) + INTERVAL '1 month',  -- quota_reset_date (début du mois prochain)
            COALESCE((SELECT subscription_status FROM profiles WHERE id = v_user.id), 'free'),
            COALESCE((SELECT plan_type FROM profiles WHERE id = v_user.id), 'free'),
            COALESCE((SELECT role FROM profiles WHERE id = v_user.id), 'user'),
            COALESCE((SELECT access_override FROM profiles WHERE id = v_user.id), FALSE),
            NOW(),
            NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
            quota_recherches_free = COALESCE(profiles.quota_recherches_free, 2),
            quota_analyses_free = COALESCE(profiles.quota_analyses_free, 2),
            recherches_utilisees = COALESCE(profiles.recherches_utilisees, 0),
            analyses_utilisees = COALESCE(profiles.analyses_utilisees, 0),
            quota_reset_date = COALESCE(profiles.quota_reset_date, DATE_TRUNC('month', NOW()) + INTERVAL '1 month'),
            subscription_status = COALESCE(profiles.subscription_status, 'free'),
            plan_type = COALESCE(profiles.plan_type, 'free'),
            updated_at = NOW();
        
        RAISE NOTICE 'Quotas initialisés pour: % (%)', v_user.email, v_user.id;
    END LOOP;
    
    RAISE NOTICE 'Initialisation terminée';
END $$;

-- ============================================================================
-- VÉRIFICATION DES QUOTAS
-- ============================================================================

-- Afficher le statut de tous les utilisateurs
SELECT 
    p.id,
    p.email,
    p.plan_type,
    p.subscription_status,
    p.role,
    p.access_override,
    p.quota_recherches_free,
    p.recherches_utilisees,
    (p.quota_recherches_free - p.recherches_utilisees) as recherches_restantes,
    p.quota_analyses_free,
    p.analyses_utilisees,
    (p.quota_analyses_free - p.analyses_utilisees) as analyses_restantes,
    p.quota_reset_date,
    CASE 
        WHEN p.access_override = TRUE THEN 'VIP'
        WHEN p.role = 'admin' THEN 'Admin'
        WHEN p.subscription_status = 'active' THEN 'Abonnement actif'
        WHEN p.subscription_status = 'trialing' THEN 'Trial actif'
        ELSE 'Gratuit'
    END as statut_acces
FROM profiles p
ORDER BY p.created_at DESC
LIMIT 20;

-- ============================================================================
-- TEST DES FONCTIONS
-- ============================================================================

-- Tester check_user_access pour le premier utilisateur
SELECT 
    p.id,
    p.email,
    public.check_user_access(p.id) as access_info
FROM profiles p
LIMIT 1;

-- Tester can_perform_action pour une recherche
SELECT 
    p.id,
    p.email,
    public.can_perform_action(p.id, 'recherche') as can_search,
    public.can_perform_action(p.id, 'analyse') as can_analyze
FROM profiles p
LIMIT 1;

