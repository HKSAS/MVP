# 🔧 Instructions pour appliquer le schéma Supabase

## Problème détecté

L'erreur `Could not find the 'mileage_km' column` indique que le schéma Supabase n'a pas été appliqué.

## Solution

### Option 1 : Via l'interface Supabase (Recommandé)

1. **Connectez-vous à votre projet Supabase** : https://supabase.com/dashboard
2. **Allez dans l'éditeur SQL** : Menu de gauche → "SQL Editor"
3. **Créez une nouvelle requête**
4. **Copiez-collez le contenu complet de `supabase-schema.sql`**
5. **Exécutez la requête** (bouton "Run" ou Cmd/Ctrl + Enter)

### Option 2 : Via Supabase CLI

Si vous avez installé Supabase CLI :

```bash
supabase db push
```

### Vérification

Après avoir appliqué le schéma, vérifiez que les tables existent :

1. Allez dans **Table Editor** dans Supabase
2. Vous devriez voir les tables suivantes :
   - `searches`
   - `listings`
   - `analyzed_listings`
   - `favorites`
   - `profiles`
   - `contact_messages`

### Colonnes attendues dans `listings`

La table `listings` doit contenir :
- `id` (UUID)
- `external_id` (TEXT, UNIQUE)
- `title` (TEXT)
- `price_eur` (NUMERIC)
- `mileage_km` (NUMERIC) ← **Cette colonne doit exister**
- `year` (INTEGER)
- `source` (TEXT)
- `url` (TEXT)
- `image_url` (TEXT)
- `score_ia` (NUMERIC)
- `score_final` (NUMERIC)
- `created_at` (TIMESTAMPTZ)
- `search_id` (UUID, FK)
- `user_id` (UUID, FK)

### Si le schéma existe déjà

Si les tables existent mais que certaines colonnes manquent, vous pouvez exécuter uniquement les commandes ALTER TABLE nécessaires :

```sql
-- Ajouter mileage_km si elle n'existe pas
ALTER TABLE listings 
ADD COLUMN IF NOT EXISTS mileage_km NUMERIC;

-- Ajouter score_final si elle n'existe pas
ALTER TABLE listings 
ADD COLUMN IF NOT EXISTS score_final NUMERIC DEFAULT 0;
```

---

**Note** : Après avoir appliqué le schéma, redémarrez votre serveur Next.js pour que les changements soient pris en compte.

