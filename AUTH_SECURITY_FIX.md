# 🔒 CORRECTIFS SÉCURITÉ AUTH SUPABASE

## 📋 Résumé des problèmes identifiés

1. ❌ **Pas de trigger automatique** : Le profil n'était pas créé automatiquement après signup
2. ❌ **Pas de contrainte UNIQUE sur email** : La table `profiles` permettait des emails dupliqués
3. ⚠️ **Gestion d'erreurs incomplète** : Les erreurs Supabase n'étaient pas toutes gérées
4. ⚠️ **Logs insuffisants** : Difficile de déboguer les problèmes d'authentification

## ✅ Correctifs appliqués

### 1. Script SQL (`fix-auth-security.sql`)

**Ce que fait le script :**
- ✅ Ajoute une contrainte `UNIQUE` sur `profiles.email`
- ✅ Crée un trigger `on_auth_user_created` qui crée automatiquement le profil après signup
- ✅ Met à jour les profils existants qui n'ont pas d'email
- ✅ Vérifie que toutes les colonnes nécessaires existent

**Comment l'exécuter :**
1. Ouvrez le **SQL Editor** dans Supabase Dashboard
2. Copiez-collez le contenu de `fix-auth-security.sql`
3. Exécutez le script
4. Vérifiez que le trigger est créé : `SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';`

### 2. Code Frontend (`app/signup/page.tsx`)

**Améliorations :**
- ✅ Meilleure gestion des erreurs Supabase (détection emails dupliqués)
- ✅ Logs détaillés pour le débogage
- ✅ Vérification automatique du profil après création
- ✅ Fallback : création manuelle du profil si le trigger échoue

**Messages d'erreur améliorés :**
- "Un compte existe déjà avec cette adresse email" → Si email dupliqué
- Messages plus clairs pour les erreurs réseau/config

## 🔍 Vérifications à faire dans Supabase Dashboard

### 1. Configuration Auth

1. Allez dans **Authentication → Settings**
2. Vérifiez :
   - ✅ **"Enable email confirmations"** : Activez si vous voulez que les utilisateurs confirment leur email
   - ✅ **"Disable sign ups"** : Désactivé (pour permettre les inscriptions)
   - ✅ **"Enable email change"** : Selon vos besoins

### 2. Providers Email

1. Allez dans **Authentication → Providers → Email**
2. Vérifiez :
   - ✅ **"Enable email provider"** : Activé
   - ✅ **"Confirm email"** : Selon vos besoins (recommandé en production)

### 3. Vérifier le trigger

Exécutez dans SQL Editor :
```sql
SELECT 
  tgname as trigger_name,
  tgrelid::regclass as table_name,
  proname as function_name
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgname = 'on_auth_user_created';
```

Vous devriez voir :
```
trigger_name          | table_name | function_name
----------------------+------------+------------------
on_auth_user_created  | users      | handle_new_user
```

### 4. Vérifier la contrainte UNIQUE

Exécutez dans SQL Editor :
```sql
SELECT 
  conname as constraint_name,
  contype as constraint_type
FROM pg_constraint
WHERE conname = 'profiles_email_unique';
```

Vous devriez voir :
```
constraint_name        | constraint_type
-----------------------|-----------------
profiles_email_unique  | u
```

## 🧪 Tests à effectuer

### Test 1 : Création de compte unique
1. Créez un compte avec `test@example.com`
2. ✅ Le compte doit être créé
3. ✅ Le profil doit être créé automatiquement dans `profiles`
4. Essayez de créer un autre compte avec `test@example.com`
5. ❌ **DOIT ÉCHOUER** avec le message "Un compte existe déjà avec cette adresse email"

### Test 2 : Vérification profil automatique
1. Créez un compte
2. Vérifiez dans Supabase Dashboard → Table Editor → `profiles`
3. ✅ Une ligne doit exister avec :
   - `id` = l'ID de l'utilisateur Auth
   - `email` = l'email de l'utilisateur
   - `role` = 'user'

### Test 3 : Logs
1. Ouvrez la console du navigateur
2. Créez un compte
3. ✅ Vous devriez voir :
   - `🔵 [SIGNUP] Début de l'inscription`
   - `🔵 [SIGNUP] Appel à supabase.auth.signUp`
   - `📋 [SIGNUP] Réponse Supabase`
   - `✅ [SIGNUP] Utilisateur créé`
   - `✅ [SIGNUP] Profil vérifié`

## 🚨 Problèmes connus et solutions

### Problème : "Email déjà utilisé" mais le compte est créé quand même

**Cause possible :**
- Le trigger n'est pas créé ou ne fonctionne pas
- La contrainte UNIQUE n'est pas active

**Solution :**
1. Vérifiez que le script SQL a été exécuté
2. Vérifiez que le trigger existe (voir section "Vérifier le trigger")
3. Vérifiez les logs Supabase pour voir si le trigger s'exécute

### Problème : Profil non créé automatiquement

**Cause possible :**
- Le trigger ne s'exécute pas
- Erreur dans la fonction `handle_new_user`

**Solution :**
1. Vérifiez les logs Supabase (Logs → Postgres Logs)
2. Le code frontend a un fallback qui crée le profil manuellement après 1 seconde
3. Si le problème persiste, vérifiez les permissions RLS sur `profiles`

### Problème : Plusieurs comptes avec le même email

**Cause possible :**
- Supabase Auth n'est pas configuré correctement
- Email confirmation désactivée et contournement

**Solution :**
1. Vérifiez la configuration Supabase Auth (voir section "Vérifications")
2. Activez "Enable email confirmations" en production
3. Vérifiez que la contrainte UNIQUE est active

## 📊 Résultat attendu

Après application des correctifs :

✅ **1 email = 1 utilisateur Auth** (garanti par Supabase Auth)
✅ **1 utilisateur Auth = 1 profil** (garanti par le trigger)
✅ **1 email = 1 profil** (garanti par la contrainte UNIQUE)
✅ **Logs clairs et exploitables** pour le débogage
✅ **Gestion d'erreurs robuste** avec messages utilisateur-friendly

## 🔄 Prochaines étapes

1. **Exécuter le script SQL** dans Supabase
2. **Tester la création de compte** avec un email existant
3. **Vérifier les logs** dans la console navigateur
4. **Vérifier les données** dans Supabase Dashboard
5. **Activer email confirmation** en production (recommandé)

## 📝 Notes importantes

- ⚠️ **En développement** : Email confirmation peut être désactivée pour faciliter les tests
- ⚠️ **En production** : Activez toujours email confirmation pour la sécurité
- ⚠️ **RLS** : Les policies RLS doivent permettre l'insertion du profil par le trigger (utilise `SECURITY DEFINER`)
- ⚠️ **Service Role** : Le trigger utilise `SECURITY DEFINER` pour bypasser RLS lors de la création du profil

