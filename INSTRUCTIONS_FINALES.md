# 🎯 Instructions finales : Historique de recherche

## ✅ CORRECTIONS APPLIQUÉES

1. ✅ **Boucle infinie corrigée** : `useFavorites` ne se recharge plus en boucle
2. ✅ **API corrigée** : Utilise le bon client Supabase avec authentification
3. ✅ **Redirection corrigée** : Va vers `/resultats` au lieu de `/recherche`
4. ✅ **Politique RLS INSERT** : Doit être corrigée (voir ci-dessous)

---

## 🔧 ACTION REQUISE : Corriger la politique RLS INSERT

**Problème détecté :** La politique INSERT a `qual: "NUL"` au lieu d'avoir une condition `WITH CHECK`.

### Solution :

Exécutez ce SQL dans Supabase SQL Editor :

```sql
-- Supprimer l'ancienne politique
DROP POLICY IF EXISTS "Users can create their own search queries" ON search_queries;

-- Recréer avec WITH CHECK
CREATE POLICY "Users can create their own search queries"
  ON search_queries FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

**OU** exécutez le fichier `CORRIGER_POLITIQUE_INSERT.sql` que j'ai créé.

---

## 📋 CHECKLIST COMPLÈTE

### Étape 1 : Créer la table (si pas déjà fait)
```sql
-- Exécutez CREER_TABLE_SEARCH_QUERIES.sql
```

### Étape 2 : Corriger la politique INSERT
```sql
-- Exécutez CORRIGER_POLITIQUE_INSERT.sql
```

### Étape 3 : Vérifier les politiques
```sql
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'search_queries';
```

**Résultat attendu :**
- INSERT : `with_check` = `(auth.uid() = user_id)` (pas NULL)
- SELECT : `qual` = `(auth.uid() = user_id)`
- UPDATE : `qual` = `(auth.uid() = user_id)`
- DELETE : `qual` = `(auth.uid() = user_id)`

### Étape 4 : Tester la sauvegarde

1. Faites une recherche (ex: Audi A3, 40000€)
2. Ouvrez la console (F12)
3. Vérifiez les logs :
   ```
   [Resultats] 🎯 Tentative sauvegarde recherche
   [SaveSearch] 🚀 Début sauvegarde recherche
   [SaveSearch] 📥 Réponse reçue: { status: 200 }
   [SaveSearch] ✅ Recherche sauvegardée avec succès
   ```

### Étape 5 : Vérifier en base

```sql
SELECT 
  id,
  user_id,
  criteria_json->>'brand' as brand,
  criteria_json->>'model' as model,
  results_count,
  created_at
FROM search_queries
WHERE user_id = 'VOTRE_USER_ID'
ORDER BY created_at DESC
LIMIT 5;
```

### Étape 6 : Tester la redirection

1. Allez sur `/dashboard`
2. Cliquez sur une recherche dans "Mes recherches récentes"
3. Vous devriez être redirigé vers `/resultats?brand=Audi&model=A3&max_price=40000`
4. La recherche devrait se relancer automatiquement

---

## 🐛 SI ÇA NE FONCTIONNE TOUJOURS PAS

### Vérifier les logs serveur

Dans votre terminal, cherchez :
```
[API /api/me/searches POST] Insertion recherche: ...
[API /api/me/searches POST] Recherche sauvegardée: ...
```

Si vous voyez une erreur RLS :
```
new row violates row-level security policy
```

→ C'est que la politique INSERT n'est pas correcte. Exécutez `CORRIGER_POLITIQUE_INSERT.sql`.

### Vérifier la console navigateur

Cherchez :
```
[SaveSearch] 📥 Réponse reçue: { status: 200, ok: true }
```

Si `status: 401` → Problème d'authentification
Si `status: 500` → Problème serveur (vérifiez les logs)
Si `status: 200` mais pas de données → Problème de format de réponse

---

## 📝 FICHIERS CRÉÉS/MODIFIÉS

1. ✅ `hooks/useFavorites.ts` - Boucle infinie corrigée
2. ✅ `app/api/me/searches/route.ts` - Client Supabase corrigé
3. ✅ `components/SearchHistoryList.tsx` - Redirection corrigée
4. ✅ `CREER_TABLE_SEARCH_QUERIES.sql` - Script de création table
5. ✅ `CORRIGER_POLITIQUE_INSERT.sql` - Script de correction politique

---

## 🚀 PROCHAINES ÉTAPES

1. **Exécutez `CORRIGER_POLITIQUE_INSERT.sql` dans Supabase**
2. **Faites une recherche et vérifiez les logs**
3. **Testez la redirection depuis le dashboard**

Si tout fonctionne, vous devriez voir vos recherches dans le dashboard et pouvoir cliquer dessus pour les relancer ! 🎉



