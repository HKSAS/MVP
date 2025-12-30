-- ============================================================================
-- MISE À JOUR : Mode bloquant pour les quotas
-- ============================================================================
-- Bloque les actions si quota épuisé et retourne un message pour encourager l'abonnement
-- Une fois l'abonnement pris, l'accès est automatiquement débloqué
-- ============================================================================

-- ================================================
-- MISE À JOUR FONCTION : can_perform_action
-- ================================================
-- Bloque l'action si quota épuisé (can_perform = false)
-- Retourne un message clair pour encourager l'abonnement

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
        RETURN jsonb_build_object(
            'can_perform', false, 
            'reason', 'user_not_found', 
            'message', 'Utilisateur non trouvé'
        );
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
    
    -- Vérifier les quotas (bloquer si épuisé)
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
            -- Quota épuisé : BLOQUER l'action
            RETURN jsonb_build_object(
                'can_perform', false,  -- BLOQUER l'action
                'reason', 'quota_exceeded',
                'remaining', 0,
                'unlimited', false,
                'message', 'Vous avez utilisé toutes vos recherches gratuites. Passez à un abonnement Premium pour continuer à utiliser Autoval IA.',
                'show_alert', true  -- Indicateur pour afficher l'alerte
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
            -- Quota épuisé : BLOQUER l'action
            RETURN jsonb_build_object(
                'can_perform', false,  -- BLOQUER l'action
                'reason', 'quota_exceeded',
                'remaining', 0,
                'unlimited', false,
                'message', 'Vous avez utilisé toutes vos analyses gratuites. Passez à un abonnement Premium pour continuer à utiliser Autoval IA.',
                'show_alert', true  -- Indicateur pour afficher l'alerte
            );
        END IF;
    END IF;
    
    RETURN jsonb_build_object(
        'can_perform', false,
        'reason', 'unknown_action', 
        'message', 'Type d''action inconnu'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================
-- MISE À JOUR FONCTION : track_usage
-- ================================================
-- Vérifie le quota AVANT de tracker
-- Bloque l'action si quota épuisé (success = false)

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
    -- Vérifier si l'action est possible (mais toujours permettre)
    v_can_perform := can_perform_action(p_user_id, p_action_type);
    
    -- Récupérer le profil pour vérifier si on doit incrémenter
    SELECT * INTO v_profile FROM profiles WHERE id = p_user_id;
    
    -- Incrémenter le compteur seulement si quota gratuit (pas pour admin/premium/vip)
    IF (v_can_perform->>'reason') = 'free_quota' THEN
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
    
    -- Logger l'action (toujours)
    INSERT INTO usage_tracking (user_id, action_type, action_data)
    VALUES (p_user_id, p_action_type, p_action_data);
    
    -- Si quota épuisé, NE PAS permettre l'action
    IF (v_can_perform->>'reason') = 'quota_exceeded' THEN
        RETURN jsonb_build_object(
            'success', false,  -- BLOQUER l'action
            'action', p_action_type,
            'remaining', 0,
            'unlimited', false,
            'show_alert', true,
            'message', v_can_perform->>'message',
            'error', 'quota_exceeded'
        );
    END IF;
    
    -- Recalculer les restants pour free_quota
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

