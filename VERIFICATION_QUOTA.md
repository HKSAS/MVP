# ✅ Vérification du système de quotas

## 🔍 Problème identifié

L'utilisateur peut toujours effectuer des analyses même après avoir épuisé son quota de recherches.

## ✅ Corrections apportées

### 1. Intégration dans les pages
- ✅ Page `/recherche` : Utilise maintenant `useQuotaCheck('recherche')`
- ✅ Page `/analyser` : Utilise maintenant `useQuotaCheck('analyse')`
- ✅ Modal `PaywallModal` ajouté dans les deux pages

### 2. Correction du tracker
- ✅ `usage-tracker.ts` : Corrigé pour vérifier `data.success` au lieu de `data.can_perform`

### 3. SQL de mise à jour
- ✅ `can_perform_action()` : Retourne `can_perform: false` si quota épuisé
- ✅ `track_usage()` : Retourne `success: false` si quota épuisé

## 🚀 Actions requises

### Étape 1 : Exécuter le SQL de mise à jour

**IMPORTANT** : Vous devez exécuter le fichier `supabase-quota-system-update.sql` dans Supabase SQL Editor.

1. Ouvrir Supabase Dashboard
2. Aller dans SQL Editor
3. Copier-coller le contenu de `supabase-quota-system-update.sql`
4. Exécuter le script

### Étape 2 : Vérifier que le SQL a été exécuté

```sql
-- Vérifier que la fonction retourne bien false pour quota épuisé
SELECT public.can_perform_action(
    (SELECT id FROM profiles WHERE recherches_utilisees >= quota_recherches_free LIMIT 1),
    'recherche'
);
-- Devrait retourner: {"can_perform": false, "reason": "quota_exceeded", ...}
```

### Étape 3 : Tester

1. Connectez-vous
2. Effectuez 2 recherches (quota épuisé)
3. Tentez une 3ème recherche → **DOIT être bloquée** + modal affiché
4. Tentez une analyse → **DOIT être bloquée** + modal affiché

## 🔧 Si ça ne fonctionne toujours pas

### Vérifier les quotas dans la base de données

```sql
-- Voir les quotas actuels
SELECT 
    id,
    email,
    quota_recherches_free,
    recherches_utilisees,
    quota_analyses_free,
    analyses_utilisees,
    subscription_status,
    role,
    access_override
FROM profiles
WHERE id = 'VOTRE_USER_ID';
```

### Vérifier que les fonctions SQL sont à jour

```sql
-- Vérifier la fonction can_perform_action
SELECT pg_get_functiondef(oid) 
FROM pg_proc 
WHERE proname = 'can_perform_action';

-- Vérifier la fonction track_usage
SELECT pg_get_functiondef(oid) 
FROM pg_proc 
WHERE proname = 'track_usage';
```

### Vérifier les logs

Ouvrir la console du navigateur (F12) et vérifier :
- Les appels à `canPerformAction`
- Les réponses de `trackUsage`
- Les erreurs éventuelles

## 📝 Notes

- Le système vérifie le quota **AVANT** d'exécuter l'action
- Si quota épuisé, l'action est **bloquée** et le modal s'affiche
- Une fois l'abonnement pris, l'accès est automatiquement débloqué

