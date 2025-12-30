# 📋 Ordre d'exécution des scripts SQL

## ⚠️ IMPORTANT : Exécuter dans cet ordre exact

### Étape 1 : Créer les colonnes (OBLIGATOIRE EN PREMIER)

**Fichier** : `supabase-create-quota-columns.sql`

**Pourquoi** : Crée les colonnes nécessaires dans la table `profiles` :
- `quota_recherches_free`
- `quota_analyses_free`
- `recherches_utilisees`
- `analyses_utilisees`
- `quota_reset_date`
- `subscription_status`
- `plan_type`
- etc.

**Comment** :
1. Ouvrir Supabase Dashboard → SQL Editor
2. New Query
3. Copier-coller le contenu de `supabase-create-quota-columns.sql`
4. Run

**Résultat attendu** : `Success. No rows returned` + messages NOTICE

---

### Étape 2 : Créer la table usage_tracking (si pas déjà créée)

**Fichier** : `supabase-quota-system.sql` (première partie)

**Pourquoi** : Crée la table pour tracker les utilisations

**Comment** : Exécuter uniquement la partie création de table du fichier `supabase-quota-system.sql`

Ou créer manuellement :

```sql
CREATE TABLE IF NOT EXISTS public.usage_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    action_type TEXT NOT NULL CHECK (action_type IN ('recherche', 'analyse')),
    action_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_usage_user ON usage_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_date ON usage_tracking(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_type ON usage_tracking(action_type);
```

---

### Étape 3 : Créer les fonctions SQL

**Fichier** : `supabase-quota-system.sql` (fonctions)

**Pourquoi** : Crée les fonctions `check_user_access` et `can_perform_action`

**Comment** : Exécuter la partie fonctions du fichier `supabase-quota-system.sql`

---

### Étape 4 : Mettre à jour les fonctions pour bloquer

**Fichier** : `supabase-quota-system-update-CLEAN.sql`

**Pourquoi** : Met à jour `can_perform_action` et `track_usage` pour bloquer si quota épuisé

**Comment** :
1. SQL Editor → New Query
2. Copier-coller le contenu de `supabase-quota-system-update-CLEAN.sql`
3. Run

---

### Étape 5 : Initialiser les quotas pour tous les utilisateurs

**Fichier** : `supabase-check-and-init-quotas.sql`

**Pourquoi** : Initialise les quotas pour tous les utilisateurs existants

**Comment** :
1. SQL Editor → New Query
2. Copier-coller le contenu de `supabase-check-and-init-quotas.sql`
3. Run

**Résultat attendu** : Messages NOTICE avec le nombre d'utilisateurs initialisés

---

## ✅ Vérification finale

Après avoir exécuté tous les scripts, vérifier :

```sql
-- Vérifier que les colonnes existent
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
    AND column_name IN (
        'quota_recherches_free',
        'quota_analyses_free',
        'recherches_utilisees',
        'analyses_utilisees'
    );

-- Vérifier votre profil
SELECT 
    email,
    quota_recherches_free,
    recherches_utilisees,
    quota_analyses_free,
    analyses_utilisees,
    subscription_status,
    plan_type
FROM profiles
WHERE email = 'VOTRE_EMAIL';
```

---

## 🔧 Si vous avez déjà exécuté des scripts

Si vous avez déjà exécuté `supabase-check-and-init-quotas.sql` avant `supabase-create-quota-columns.sql`, vous avez eu l'erreur. 

**Solution** : Exécutez maintenant `supabase-create-quota-columns.sql` puis ré-exécutez `supabase-check-and-init-quotas.sql`.

---

## 📝 Résumé de l'ordre

1. ✅ `supabase-create-quota-columns.sql` (CRÉER LES COLONNES)
2. ✅ Créer la table `usage_tracking` (si pas déjà créée)
3. ✅ Créer les fonctions SQL (`supabase-quota-system.sql`)
4. ✅ `supabase-quota-system-update-CLEAN.sql` (METTRE À JOUR)
5. ✅ `supabase-check-and-init-quotas.sql` (INITIALISER)

