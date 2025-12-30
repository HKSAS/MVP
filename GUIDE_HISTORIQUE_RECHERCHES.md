# 🔍 Guide : Résoudre le problème d'historique des recherches

## ⚠️ Problème
Les recherches effectuées n'apparaissent pas dans le dashboard.

## ✅ Solution en 3 étapes

### Étape 1 : Créer la table dans Supabase

1. **Ouvrez Supabase Dashboard** → Votre projet → **SQL Editor**

2. **Copiez-collez ce SQL** (ou utilisez le fichier `supabase-create-search-queries.sql`) :

```sql
-- Table: search_queries
CREATE TABLE IF NOT EXISTS search_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_run_at TIMESTAMPTZ DEFAULT NOW(),
  criteria_json JSONB NOT NULL,
  results_count INTEGER DEFAULT 0,
  platforms_json JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'running', 'completed', 'failed'))
);

-- Index
CREATE INDEX IF NOT EXISTS idx_search_queries_user_id ON search_queries(user_id);
CREATE INDEX IF NOT EXISTS idx_search_queries_created_at ON search_queries(created_at DESC);

-- RLS
ALTER TABLE search_queries ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Users can view their own search queries" ON search_queries;
CREATE POLICY "Users can view their own search queries"
  ON search_queries FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own search queries" ON search_queries;
CREATE POLICY "Users can create their own search queries"
  ON search_queries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own search queries" ON search_queries;
CREATE POLICY "Users can update their own search queries"
  ON search_queries FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own search queries" ON search_queries;
CREATE POLICY "Users can delete their own search queries"
  ON search_queries FOR DELETE
  USING (auth.uid() = user_id);
```

3. **Cliquez sur "Run"** pour exécuter le SQL

### Étape 2 : Vérifier que vous êtes connecté

**Important** : Les recherches ne sont sauvegardées que si vous êtes **connecté** !

1. Vérifiez que vous êtes bien connecté (icône utilisateur en haut à droite)
2. Si vous n'êtes pas connecté, connectez-vous avant de faire une recherche

### Étape 3 : Effectuer une recherche et vérifier

1. **Effectuez une recherche** depuis l'interface (marque + modèle)
2. **Ouvrez la console du navigateur** (F12) → onglet "Console"
3. **Regardez les logs** :
   - Vous devriez voir : `✅ Recherche sauvegardée avec succès`
   - Si vous voyez une erreur, notez le message

4. **Allez dans le dashboard**
5. **Ouvrez la console** (F12) → onglet "Console"
6. **Regardez les logs** :
   - Vous devriez voir : `✅ Recherches chargées: X`
   - Si vous voyez une erreur, notez le message

## 🐛 Diagnostic

### Si la table n'existe pas
**Erreur dans les logs** : `relation "search_queries" does not exist`

**Solution** : Exécutez le SQL de l'Étape 1

### Si vous n'êtes pas authentifié
**Erreur dans les logs** : `Authentication required` ou `401`

**Solution** : Connectez-vous avant de faire une recherche

### Si RLS bloque l'insertion
**Erreur dans les logs** : `new row violates row-level security policy`

**Solution** : Vérifiez que les policies RLS sont bien créées (Étape 1)

### Si aucune recherche n'apparaît
**Vérifiez** :
1. ✅ Table créée
2. ✅ Vous êtes connecté
3. ✅ Vous avez effectué une recherche après vous être connecté
4. ✅ Regardez les logs serveur (terminal où tourne `npm run dev`)

## 📊 Vérification dans Supabase

Pour vérifier manuellement que les recherches sont sauvegardées :

1. **Supabase Dashboard** → **Table Editor**
2. **Sélectionnez la table** `search_queries`
3. **Vous devriez voir vos recherches** avec :
   - `user_id` : votre ID utilisateur
   - `criteria_json` : les critères de recherche (marque, modèle, etc.)
   - `results_count` : nombre de résultats
   - `created_at` : date de création

## 🔧 Test avec le script

Un script de test est disponible :

```bash
npx tsx scripts/test-search-history.ts
```

Ce script vérifie :
- ✅ Si la table existe
- ✅ Le nombre de recherches
- ✅ Les 5 dernières recherches

## 📝 Logs à surveiller

### Dans le terminal (serveur Next.js)
```
✅ Recherche sauvegardée avec succès { searchQueryId: '...', userId: '...', brand: 'Peugeot', model: '208', resultsCount: 42 }
```

### Dans la console navigateur (dashboard)
```
✅ Recherches chargées: 3 [Array(3)]
```

## ⚡ Solution rapide

Si rien ne fonctionne, exécutez ce SQL dans Supabase :

```sql
-- Vérifier si la table existe
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_name = 'search_queries'
);

-- Si retourne false, exécutez le SQL de l'Étape 1
```

Puis vérifiez que vous êtes bien connecté et refaites une recherche.

