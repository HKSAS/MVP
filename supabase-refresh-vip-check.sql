-- ============================================================================
-- SCRIPT DE VÉRIFICATION VIP
-- ============================================================================
-- Vérifie que le VIP est correctement détecté
-- ============================================================================

-- Vérifier le statut VIP d'un utilisateur
SELECT 
    id,
    email,
    access_override as vip_status,
    role,
    subscription_status,
    plan_type,
    -- Tester can_perform_action
    public.can_perform_action(id, 'recherche') as can_search,
    public.can_perform_action(id, 'analyse') as can_analyze,
    -- Tester check_user_access
    public.check_user_access(id) as access_info
FROM profiles
WHERE email = 'kamelhadri@free.fr';  -- Remplacez par votre email

-- Si access_override = TRUE mais que can_perform retourne false,
-- il y a un problème dans la fonction SQL

-- Pour forcer la mise à jour du cache, exécutez cette requête :
-- (Cela force Supabase à recalculer les fonctions)
SELECT public.can_perform_action(
    (SELECT id FROM profiles WHERE email = 'kamelhadri@free.fr'),
    'analyse'
);

-- Résultat attendu si VIP :
-- {
--   "can_perform": true,
--   "reason": "vip",
--   "unlimited": true,
--   "message": "Accès VIP illimité"
-- }

