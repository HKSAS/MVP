# 🎯 Quotas non décomptés pour VIP et abonnés

## ✅ Modification apportée

Les quotas **ne sont plus décomptés** pour :
- ✅ **Utilisateurs VIP** (`access_override = TRUE`)
- ✅ **Administrateurs** (`role = 'admin'`)
- ✅ **Utilisateurs avec abonnement actif** (`subscription_status = 'active'` ou `'trialing'`)

## 🔄 Fonctionnement

### Pour les utilisateurs gratuits
- Les quotas sont **décomptés** à chaque recherche/analyse
- Quand le quota est épuisé, l'action est **bloquée**
- Le modal de paywall s'affiche

### Pour les VIP et abonnés
- Les quotas **ne sont PAS décomptés**
- Accès **illimité** sans impact sur les compteurs
- Les actions sont **toujours permises**

## 📝 Code modifié

### Fonction SQL `track_usage`

La fonction vérifie maintenant explicitement avant d'incrémenter :

```sql
-- NE PAS incrémenter si VIP, Admin ou Abonnement actif
IF v_profile.access_override = FALSE 
   AND v_profile.role != 'admin'
   AND v_profile.subscription_status NOT IN ('active', 'trialing') THEN
    -- Incrémenter uniquement pour les utilisateurs vraiment gratuits
    UPDATE profiles SET recherches_utilisees = ... WHERE id = p_user_id;
END IF;
```

## 🚀 Mise à jour requise

### Exécuter le script SQL mis à jour

1. **`supabase-quota-system-update-CLEAN.sql`** (déjà mis à jour)
   - Contient la logique pour ne pas décompter les quotas VIP/abonnés

2. Ou mettre à jour manuellement la fonction `track_usage` dans Supabase SQL Editor

## ✅ Vérification

### Tester avec un utilisateur VIP

```sql
-- Mettre un utilisateur en VIP
UPDATE profiles 
SET access_override = TRUE 
WHERE email = 'test@example.com';

-- Effectuer une action (via l'interface)
-- Vérifier que recherches_utilisees n'a pas augmenté
SELECT recherches_utilisees, analyses_utilisees 
FROM profiles 
WHERE email = 'test@example.com';
```

### Tester avec un utilisateur abonné

```sql
-- Mettre un utilisateur en abonnement actif
UPDATE profiles 
SET subscription_status = 'active',
    plan_type = 'premium'
WHERE email = 'test@example.com';

-- Effectuer une action (via l'interface)
-- Vérifier que recherches_utilisees n'a pas augmenté
SELECT recherches_utilisees, analyses_utilisees 
FROM profiles 
WHERE email = 'test@example.com';
```

## 📊 Résultat attendu

- **Utilisateur gratuit** : `recherches_utilisees` et `analyses_utilisees` augmentent
- **Utilisateur VIP** : Les compteurs **ne changent pas**
- **Utilisateur abonné** : Les compteurs **ne changent pas**

## 🎯 Avantages

1. ✅ Les VIP et abonnés ont un accès vraiment illimité
2. ✅ Les quotas gratuits restent intacts pour les utilisateurs payants
3. ✅ Pas de confusion : les compteurs reflètent uniquement l'usage gratuit

