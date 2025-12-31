-- ============================================================================
-- CORRECTION DES ERREURS RLS (ROW LEVEL SECURITY) DANS SUPABASE
-- ============================================================================
-- Ce fichier active RLS et crée les politiques de sécurité pour :
-- - public.contact_requests
-- - public.ai_searches
-- - public.ai_analyses
-- - public.subscriptions
-- ============================================================================

-- ============================================================================
-- ACTIVATION DE RLS SUR TOUTES LES TABLES CONCERNÉES
-- ============================================================================

ALTER TABLE public.contact_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- POLITIQUES POUR contact_requests
-- ============================================================================

-- Permettre l'insertion publique (formulaire de contact)
-- Note: Si la politique existe déjà, cette commande échouera mais ce n'est pas grave
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'contact_requests' 
        AND policyname = 'Autoriser insertion publique contact_requests'
    ) THEN
        CREATE POLICY "Autoriser insertion publique contact_requests"
        ON public.contact_requests
        FOR INSERT
        TO public
        WITH CHECK (true);
    END IF;
END $$;

-- Permettre la lecture seulement aux administrateurs authentifiés
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'contact_requests' 
        AND policyname = 'Lecture contact_requests pour admins'
    ) THEN
        CREATE POLICY "Lecture contact_requests pour admins"
        ON public.contact_requests
        FOR SELECT
        TO authenticated
        USING (true);
    END IF;
END $$;

-- ============================================================================
-- POLITIQUES POUR ai_searches
-- ============================================================================

-- Permettre aux utilisateurs authentifiés de voir leurs propres recherches
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'ai_searches' 
        AND policyname = 'Utilisateurs voient leurs recherches'
    ) THEN
        CREATE POLICY "Utilisateurs voient leurs recherches"
        ON public.ai_searches
        FOR SELECT
        TO authenticated
        USING (auth.uid() = user_id);
    END IF;
END $$;

-- Permettre aux utilisateurs authentifiés de créer des recherches
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'ai_searches' 
        AND policyname = 'Utilisateurs créent des recherches'
    ) THEN
        CREATE POLICY "Utilisateurs créent des recherches"
        ON public.ai_searches
        FOR INSERT
        TO authenticated
        WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- ============================================================================
-- POLITIQUES POUR ai_analyses
-- ============================================================================

-- Permettre aux utilisateurs authentifiés de voir leurs propres analyses
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'ai_analyses' 
        AND policyname = 'Utilisateurs voient leurs analyses'
    ) THEN
        CREATE POLICY "Utilisateurs voient leurs analyses"
        ON public.ai_analyses
        FOR SELECT
        TO authenticated
        USING (auth.uid() = user_id);
    END IF;
END $$;

-- Permettre aux utilisateurs authentifiés de créer des analyses
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'ai_analyses' 
        AND policyname = 'Utilisateurs créent des analyses'
    ) THEN
        CREATE POLICY "Utilisateurs créent des analyses"
        ON public.ai_analyses
        FOR INSERT
        TO authenticated
        WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- ============================================================================
-- POLITIQUES POUR subscriptions
-- ============================================================================

-- Permettre aux utilisateurs authentifiés de voir leur propre abonnement
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'subscriptions' 
        AND policyname = 'Utilisateurs voient leur abonnement'
    ) THEN
        CREATE POLICY "Utilisateurs voient leur abonnement"
        ON public.subscriptions
        FOR SELECT
        TO authenticated
        USING (auth.uid() = user_id);
    END IF;
END $$;

-- Permettre aux utilisateurs authentifiés de créer un abonnement
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'subscriptions' 
        AND policyname = 'Utilisateurs créent leur abonnement'
    ) THEN
        CREATE POLICY "Utilisateurs créent leur abonnement"
        ON public.subscriptions
        FOR INSERT
        TO authenticated
        WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- Permettre aux utilisateurs authentifiés de mettre à jour leur abonnement
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'subscriptions' 
        AND policyname = 'Utilisateurs mettent à jour leur abonnement'
    ) THEN
        CREATE POLICY "Utilisateurs mettent à jour leur abonnement"
        ON public.subscriptions
        FOR UPDATE
        TO authenticated
        USING (auth.uid() = user_id)
        WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- ============================================================================
-- VÉRIFICATION
-- ============================================================================

-- Afficher les politiques créées pour vérification
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public' 
AND tablename IN ('contact_requests', 'ai_searches', 'ai_analyses', 'subscriptions')
ORDER BY tablename, policyname;

-- ============================================================================
-- FIN DU SCRIPT
-- ============================================================================

