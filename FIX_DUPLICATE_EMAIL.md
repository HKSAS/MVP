# 🔒 CORRECTION DU PROBLÈME DE DOUBLONS D'EMAIL

## 🐛 Problème identifié

Quand vous créez un compte avec un email qui existe déjà, le système affiche "créé avec succès" au lieu de bloquer la création.

## ✅ Correctifs appliqués

### 1. Route API de vérification (`/api/check-email`)

**Fonctionnalités :**
- ✅ Vérifie directement dans `auth.users` via `auth.admin.getUserByEmail` (plus fiable)
- ✅ Vérifie aussi dans la table `profiles` pour détecter les doublons
- ✅ Détecte les doublons (plusieurs comptes avec le même email)
- ✅ Utilise le service role pour bypasser RLS
- ✅ Retourne des informations détaillées : `existsInAuth`, `existsInProfiles`, `count`, `isDuplicate`

### 2. Vérification pré-signup

**Dans `app/signup/page.tsx` :**
- ✅ Vérifie l'email **AVANT** de créer le compte via `/api/check-email`
- ✅ Bloque la création si l'email existe déjà (dans `auth.users` OU `profiles`)
- ✅ Affiche un message clair : "Un compte existe déjà avec cette adresse email"
- ✅ **ARRÊTE** le processus de signup si l'email existe (ne continue pas avec Supabase Auth)
- ✅ Logs détaillés pour le débogage

### 3. Vérification post-signup (double sécurité)

**Dans `app/signup/page.tsx` :**
- ✅ Vérifie **IMMÉDIATEMENT APRÈS** le signup Supabase (avant d'afficher le succès)
- ✅ Vérifie **ENCORE** après 500ms pour laisser le trigger créer le profil
- ✅ Détecte si Supabase a créé un doublon malgré la vérification pré-signup
- ✅ Affiche une erreur si un doublon est détecté
- ✅ **EMPÊCHE** l'affichage du message "créé avec succès" si un doublon est détecté

## 🔧 Configuration Supabase REQUISE

### Étape 1 : Vérifier la configuration Auth

1. Allez dans **Supabase Dashboard → Authentication → Settings**
2. Vérifiez ces paramètres :

   **⚠️ IMPORTANT :**
   - ✅ **"Enable email confirmations"** : 
     - En **développement** : Peut être désactivé pour faciliter les tests
     - En **production** : DOIT être activé pour la sécurité
   
   - ✅ **"Disable sign ups"** : DOIT être **désactivé** (pour permettre les inscriptions)
   
   - ✅ **"Enable email change"** : Selon vos besoins

### Étape 2 : Vérifier les providers

1. Allez dans **Authentication → Providers → Email**
2. Vérifiez :
   - ✅ **"Enable email provider"** : Activé
   - ✅ **"Confirm email"** : 
     - En développement : Peut être désactivé
     - En production : Recommandé d'activer

### Étape 3 : Vérifier la contrainte UNIQUE

Exécutez dans **SQL Editor** :

```sql
-- Vérifier que la contrainte UNIQUE existe
SELECT 
  conname as constraint_name,
  contype as constraint_type,
  conrelid::regclass as table_name
FROM pg_constraint
WHERE conname = 'profiles_email_unique';
```

**Résultat attendu :**
```
constraint_name        | constraint_type | table_name
-----------------------|-----------------|------------
profiles_email_unique  | u              | profiles
```

**Si la contrainte n'existe pas**, exécutez :

```sql
ALTER TABLE profiles 
ADD CONSTRAINT profiles_email_unique UNIQUE (email);
```

### Étape 4 : Exécuter le script de sécurité

Exécutez le script `fix-auth-security.sql` si ce n'est pas déjà fait :

1. Ouvrez **SQL Editor** dans Supabase
2. Copiez-collez le contenu de `fix-auth-security.sql`
3. Exécutez le script

## 🧪 Tests à effectuer

### Test 1 : Email existant (doit être bloqué)

1. Créez un compte avec `test@example.com`
2. ✅ Le compte doit être créé
3. Essayez de créer un autre compte avec `test@example.com`
4. ❌ **DOIT AFFICHER** : "Un compte existe déjà avec cette adresse email. Connectez-vous ou utilisez un autre email."
5. ❌ **NE DOIT PAS** afficher "créé avec succès"

### Test 2 : Vérification dans la console

1. Ouvrez la console du navigateur (F12)
2. Créez un compte avec un email existant
3. ✅ Vous devriez voir dans les logs :
   ```
   🔍 [SIGNUP] Vérification si email existe déjà...
   ❌ [SIGNUP] Email déjà utilisé détecté avant signup
   ```

### Test 3 : Vérification post-signup

1. Si par erreur un doublon est créé, vous devriez voir :
   ```
   🔍 [SIGNUP] Vérification post-signup pour détecter les doublons...
   ❌ [SIGNUP] DOUBLON DÉTECTÉ ! Plusieurs comptes avec le même email
   ```

## 🚨 Problèmes possibles et solutions

### Problème : "Créé avec succès" s'affiche quand même

**Causes possibles :**
1. La route `/api/check-email` ne fonctionne pas
2. La contrainte UNIQUE n'est pas active
3. Supabase Auth n'est pas configuré correctement

**Solutions :**
1. Vérifiez les logs du serveur pour voir si `/api/check-email` est appelée
2. Vérifiez que la contrainte UNIQUE existe (voir Étape 3)
3. Vérifiez la configuration Supabase Auth (voir Étape 1)

### Problème : Erreur "Service role key manquante"

**Cause :**
La route `/api/check-email` nécessite `SUPABASE_SERVICE_ROLE_KEY`

**Solution :**
1. Vérifiez que `SUPABASE_SERVICE_ROLE_KEY` est défini dans `.env.local`
2. Redémarrez le serveur : `npm run dev`

### Problème : La vérification ne fonctionne pas

**Cause possible :**
RLS bloque l'accès à la table `profiles`

**Solution :**
La route API utilise `getSupabaseAdminClient()` qui utilise le service role, donc RLS est bypassé. Si ça ne fonctionne pas, vérifiez :
1. Que `SUPABASE_SERVICE_ROLE_KEY` est correct
2. Que la table `profiles` existe
3. Les logs du serveur pour voir les erreurs

## 📊 Résultat attendu

Après application des correctifs :

✅ **Vérification AVANT signup** : Bloque si email existe
✅ **Vérification APRÈS signup** : Détecte les doublons
✅ **Message d'erreur clair** : "Un compte existe déjà avec cette adresse email"
✅ **Logs détaillés** : Pour déboguer les problèmes
✅ **Contrainte UNIQUE** : Empêche les doublons en base de données

## 🔄 Prochaines étapes

1. ✅ **Exécuter le script SQL** `fix-auth-security.sql`
2. ✅ **Vérifier la configuration** Supabase Auth
3. ✅ **Tester** avec un email existant
4. ✅ **Vérifier les logs** dans la console navigateur
5. ✅ **Vérifier les données** dans Supabase Dashboard

## 📝 Notes importantes

- ⚠️ **En développement** : Email confirmation peut être désactivée
- ⚠️ **En production** : Activez toujours email confirmation
- ⚠️ **Service Role Key** : Nécessaire pour la route `/api/check-email`
- ⚠️ **RLS** : La route API utilise le service role pour bypasser RLS

## 🐛 Debug

Si le problème persiste, vérifiez dans la console navigateur :

1. **Logs de vérification pré-signup** :
   ```
   🔍 [SIGNUP] Vérification si email existe déjà...
   ```

2. **Réponse de l'API** :
   ```
   ✅ [SIGNUP] Email disponible, on peut continuer
   ```
   ou
   ```
   ❌ [SIGNUP] Email déjà utilisé détecté avant signup
   ```

3. **Logs de signup Supabase** :
   ```
   📋 [SIGNUP] Réponse Supabase: { hasError: true/false, ... }
   ```

4. **Logs de vérification post-signup** :
   ```
   🔍 [SIGNUP] Vérification post-signup pour détecter les doublons...
   ```

Si vous voyez "Email disponible" mais que le compte existe déjà, c'est que la route API ne fonctionne pas correctement. Vérifiez les logs du serveur.

