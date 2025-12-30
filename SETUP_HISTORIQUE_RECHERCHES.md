# 📋 Setup Historique des Recherches

## ⚠️ IMPORTANT : Créer la table dans Supabase

Pour que l'historique des recherches fonctionne, vous devez créer la table `search_queries` dans Supabase.

### Étape 1 : Exécuter le SQL

1. Ouvrez le **SQL Editor** dans votre dashboard Supabase
2. Copiez-collez le contenu du fichier `supabase-search-history.sql`
3. Exécutez le script

**OU** exécutez directement ce SQL :

```sql
-- Table: search_queries (recherches avec critères complets)
CREATE TABLE IF NOT EXISTS search_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_run_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Critères de recherche (stockés en JSONB pour flexibilité)
  criteria_json JSONB NOT NULL,
  
  -- Métadonnées
  results_count INTEGER DEFAULT 0,
  platforms_json JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  
  CONSTRAINT search_queries_criteria_check CHECK (jsonb_typeof(criteria_json) = 'object')
);

-- Index
CREATE INDEX IF NOT EXISTS idx_search_queries_user_id ON search_queries(user_id);
CREATE INDEX IF NOT EXISTS idx_search_queries_created_at ON search_queries(created_at DESC);

-- RLS
ALTER TABLE search_queries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own search queries"
  ON search_queries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own search queries"
  ON search_queries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own search queries"
  ON search_queries FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own search queries"
  ON search_queries FOR DELETE
  USING (auth.uid() = user_id);
```

### Étape 2 : Vérifier

Après avoir exécuté le SQL, testez une recherche depuis l'interface. L'historique devrait apparaître dans le dashboard.

## 🔍 Vérification

Pour vérifier que ça fonctionne :

1. Connectez-vous à votre application
2. Effectuez une recherche (marque + modèle)
3. Allez dans le dashboard
4. Vous devriez voir "Historique de mes recherches" avec votre recherche

## 🐛 Debug

Si l'historique n'apparaît toujours pas :

1. Vérifiez les logs du serveur (console terminal) pour voir les erreurs
2. Vérifiez dans Supabase que la table `search_queries` existe
3. Vérifiez que vous êtes bien connecté (session active)
4. Ouvrez la console du navigateur (F12) pour voir les erreurs

Les logs devraient afficher :
- `Sauvegarde recherche dans search_queries` si l'utilisateur est authentifié
- `Recherche sauvegardée avec succès` si la sauvegarde fonctionne
- `Erreur enregistrement search_queries` si il y a un problème



