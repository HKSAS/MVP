# 📋 Instructions pour afficher le statut et activer le blocage

## 🎯 Problème identifié

- Aucun blocage des actions quand quota épuisé
- Aucune indication du statut (VIP, plan, etc.)

## ✅ Solutions apportées

### 1. Composant de statut créé
- `UserStatusBadge.tsx` : Affiche le statut complet (Admin, VIP, Plan)
- `UserStatusBadgeCompact.tsx` : Version compacte pour la navigation

### 2. Intégration dans l'interface
- ✅ Dashboard : Badge de statut affiché au-dessus des quotas
- ✅ Navigation : Badge compact affiché dans le header

### 3. Scripts SQL créés
- `supabase-create-quota-columns.sql` : Crée les colonnes de quotas (À EXÉCUTER EN PREMIER)
- `supabase-quota-system.sql` : Crée les fonctions de base
- `supabase-quota-system-update-CLEAN.sql` : Met à jour les fonctions pour bloquer
- `supabase-check-and-init-quotas.sql` : Vérifie et initialise les quotas

## 🚀 Actions requises

### ⚠️ IMPORTANT : Exécuter dans cet ordre exact

**L'ordre est crucial** - ne pas respecter l'ordre causera des erreurs !

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

### Étape 2 : Créer les fonctions de base

**Fichier** : `supabase-quota-system.sql`

**Pourquoi** : Crée les fonctions `check_user_access` et `can_perform_action` de base

**Comment** : Exécuter le fichier `supabase-quota-system.sql` dans SQL Editor

---

### Étape 3 : Mettre à jour les fonctions pour bloquer

**Fichier** : `supabase-quota-system-update-CLEAN.sql`

**Pourquoi** : Met à jour `can_perform_action()` et `track_usage()` pour bloquer si quota épuisé

**Comment** :
1. SQL Editor → New Query
2. Copier-coller le contenu de `supabase-quota-system-update-CLEAN.sql`
3. Run

---

### Étape 4 : Initialiser les quotas

**Fichier** : `supabase-check-and-init-quotas.sql`

**Pourquoi** : Initialise les quotas pour tous les utilisateurs existants

**Comment** :
1. SQL Editor → New Query
2. Copier-coller le contenu de `supabase-check-and-init-quotas.sql`
3. Run

**Résultat attendu** : Messages NOTICE avec le nombre d'utilisateurs initialisés

### Étape 5 : Vérifier les quotas

Après avoir exécuté tous les scripts, vérifiez :

```sql
-- Voir votre statut
SELECT 
    email,
    plan_type,
    subscription_status,
    role,
    access_override,
    quota_recherches_free,
    recherches_utilisees,
    (quota_recherches_free - recherches_utilisees) as recherches_restantes,
    quota_analyses_free,
    analyses_utilisees,
    (quota_analyses_free - analyses_utilisees) as analyses_restantes
FROM profiles
WHERE email = 'VOTRE_EMAIL';
```

### Étape 6 : Tester le blocage

1. Connectez-vous
2. Vérifiez que le badge de statut s'affiche (Dashboard et Navigation)
3. Effectuez 2 recherches (quota épuisé)
4. Tentez une 3ème recherche → **DOIT être bloquée** + modal affiché
5. Tentez une analyse → **DOIT être bloquée** + modal affiché

## 📊 Affichage du statut

### Dans le Dashboard
- **Admin** : Badge jaune/orange avec couronne
- **VIP** : Badge violet/rose avec étoiles
- **Abonnement actif** : Badge bleu/cyan avec plan (Autoval IA Analyse, Essentiel, Confort, Premium)
- **Gratuit** : Badge gris avec quotas restants

### Dans la Navigation
- Badge compact affiché à côté de "Mon compte"
- Même code couleur que le dashboard

## 🔧 Plans disponibles

Les plans sont stockés dans `plan_type` :
- `free` → "Gratuit"
- `starter` → "Autoval IA Analyse"
- `essentiel` → "Essentiel"
- `confort` → "Confort"
- `premium` → "Premium"
- `enterprise` → "Enterprise"

## ⚠️ Si ça ne fonctionne toujours pas

### Vérifier que les colonnes existent

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
```

Si aucune colonne n'apparaît, exécutez d'abord `supabase-create-quota-columns.sql`.

### Vérifier que les quotas sont initialisés

```sql
-- Vérifier votre profil
SELECT * FROM profiles WHERE email = 'VOTRE_EMAIL';

-- Si NULL, initialiser manuellement
UPDATE profiles
SET 
    quota_recherches_free = COALESCE(quota_recherches_free, 2),
    quota_analyses_free = COALESCE(quota_analyses_free, 2),
    recherches_utilisees = COALESCE(recherches_utilisees, 0),
    analyses_utilisees = COALESCE(analyses_utilisees, 0),
    quota_reset_date = COALESCE(quota_reset_date, DATE_TRUNC('month', NOW()) + INTERVAL '1 month'),
    subscription_status = COALESCE(subscription_status, 'free'),
    plan_type = COALESCE(plan_type, 'free')
WHERE email = 'VOTRE_EMAIL';
```

### Vérifier les fonctions SQL

```sql
-- Tester can_perform_action
SELECT public.can_perform_action(
    (SELECT id FROM profiles WHERE email = 'VOTRE_EMAIL'),
    'recherche'
);

-- Devrait retourner can_perform: false si quota épuisé
```

### Vérifier les logs

Ouvrir la console du navigateur (F12) et vérifier :
- Les appels à `checkUserAccess`
- Les appels à `canPerformAction`
- Les erreurs éventuelles

## 📝 Notes

- Le badge de statut se met à jour automatiquement
- Le blocage fonctionne uniquement si le SQL a été exécuté **dans le bon ordre**
- Les quotas sont réinitialisés automatiquement chaque mois

## 🔄 Résumé de l'ordre d'exécution

1. ✅ `supabase-create-quota-columns.sql` (CRÉER LES COLONNES - OBLIGATOIRE EN PREMIER)
2. ✅ `supabase-quota-system.sql` (CRÉER LES FONCTIONS DE BASE)
3. ✅ `supabase-quota-system-update-CLEAN.sql` (METTRE À JOUR POUR BLOQUER)
4. ✅ `supabase-check-and-init-quotas.sql` (INITIALISER LES QUOTAS)

**⚠️ Ne pas respecter cet ordre causera des erreurs !**

