-- ============================================================================
-- VÉRIFICATION DU STATUT VIP
-- ============================================================================
-- Ce script vérifie que le VIP est bien activé et détecté

-- 1. Vérifier le statut VIP dans la table profiles
SELECT 
    id,
    email,
    access_override as vip_status,
    role,
    subscription_status,
    plan_type
FROM profiles
WHERE email = 'kamelhadri@free.fr';

-- 2. Tester la fonction can_perform_action pour voir si le VIP est détecté
SELECT 
    email,
    public.can_perform_action(id, 'analyse') as can_analyze,
    public.can_perform_action(id, 'recherche') as can_search
FROM profiles
WHERE email = 'kamelhadri@free.fr';

-- 3. Si access_override n'est pas TRUE, l'activer manuellement :
-- UPDATE profiles 
-- SET access_override = TRUE 
-- WHERE email = 'kamelhadri@free.fr';

