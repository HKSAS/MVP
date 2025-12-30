# ✅ Créer la table favorites dans Supabase

## 🎯 Solution Rapide

Le message "La table favorites n'existe pas dans la base de données" signifie que vous devez créer la table dans Supabase.

## 📝 Étapes à suivre

### 1️⃣ Ouvrir Supabase Dashboard

1. Allez sur **https://supabase.com**
2. Connectez-vous à votre compte
3. Sélectionnez votre projet

### 2️⃣ Ouvrir le SQL Editor

1. Dans le menu de gauche, cliquez sur **"SQL Editor"**
2. Cliquez sur **"New query"** (ou utilisez l'éditeur existant)

### 3️⃣ Copier-coller le SQL

Copiez-collez **TOUT** le contenu du fichier `supabase-favorites-recommendations.sql` dans l'éditeur SQL.

**OU** copiez-collez directement ce SQL :

```sql
-- ============================================================================
-- TABLES FAVORIS ET RECOMMANDATIONS - AUTOIA
-- ============================================================================
-- À exécuter dans Supabase SQL Editor
-- ============================================================================

-- Supprimer l'ancienne table favorites si elle existe (avec référence à listings)
DROP TABLE IF EXISTS favorites CASCADE;

-- Table: favorites (nouvelle structure avec données complètes)
CREATE TABLE IF NOT EXISTS favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source TEXT NOT NULL,
  listing_id TEXT NOT NULL,
  listing_url TEXT NOT NULL,
  title TEXT,
  price INTEGER,
  year INTEGER,
  mileage INTEGER,
  fuel TEXT,
  transmission TEXT,
  city TEXT,
  score INTEGER,
  risk_score INTEGER,
  extracted_features JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Contrainte unique: un utilisateur ne peut pas avoir le même favori deux fois
  UNIQUE(user_id, source, listing_id)
);

-- Index pour les favoris
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_source_listing_id ON favorites(source, listing_id);
CREATE INDEX IF NOT EXISTS idx_favorites_created_at ON favorites(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_favorites_price ON favorites(price) WHERE price IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_favorites_score ON favorites(score) WHERE score IS NOT NULL;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Activer RLS sur la table favorites
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

-- Policy: Les utilisateurs peuvent voir leurs propres favoris
DROP POLICY IF EXISTS "Users can view their own favorites" ON favorites;
CREATE POLICY "Users can view their own favorites"
  ON favorites FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Les utilisateurs peuvent créer leurs propres favoris
DROP POLICY IF EXISTS "Users can create their own favorites" ON favorites;
CREATE POLICY "Users can create their own favorites"
  ON favorites FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Les utilisateurs peuvent mettre à jour leurs propres favoris
DROP POLICY IF EXISTS "Users can update their own favorites" ON favorites;
CREATE POLICY "Users can update their own favorites"
  ON favorites FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Les utilisateurs peuvent supprimer leurs propres favoris
DROP POLICY IF EXISTS "Users can delete their own favorites" ON favorites;
CREATE POLICY "Users can delete their own favorites"
  ON favorites FOR DELETE
  USING (auth.uid() = user_id);
```

### 4️⃣ Exécuter le SQL

1. Cliquez sur le bouton **"Run"** (ou appuyez sur `Ctrl+Enter` / `Cmd+Enter`)
2. Attendez que le message de succès s'affiche
3. Vous devriez voir : **"Success. No rows returned"**

### 5️⃣ Vérifier que la table existe

1. Allez dans **"Table Editor"** (dans le menu de gauche)
2. Cherchez la table **`favorites`**
3. Vous devriez la voir dans la liste

## ✅ Test

Après avoir créé la table :

1. **Rechargez votre application** (F5)
2. **Connectez-vous** si vous n'êtes pas connecté
3. **Cliquez sur une étoile** (favori) sur une annonce
4. **Ça devrait fonctionner !** ✨

## 🐛 Si ça ne fonctionne toujours pas

1. Vérifiez que vous avez bien exécuté **TOUT** le SQL (pas seulement une partie)
2. Vérifiez que vous êtes **connecté** dans l'application
3. Regardez la console du navigateur (F12) pour voir s'il y a d'autres erreurs
4. Vérifiez les logs du serveur (terminal) pour voir les erreurs détaillées

## 📸 Capture d'écran

Si vous avez besoin d'aide, prenez une capture d'écran de :
- Le SQL Editor avec le message de succès
- La table `favorites` dans Table Editor
- L'erreur dans la console du navigateur (si elle persiste)



