# 🔧 Instructions pour résoudre le problème de schéma

## Situation actuelle

Vous avez une table existante avec des colonnes en français, mais notre code backend utilise des noms en anglais.

## Solutions possibles

### Option 1 : Vérifier d'abord la structure (RECOMMANDÉ)

1. **Exécutez `check-table-structure.sql`** dans Supabase SQL Editor
2. **Identifiez le nom réel de votre table** et ses colonnes
3. **Choisissez une des options ci-dessous**

### Option 2 : Renommer les colonnes existantes

Si votre table s'appelle `boutique_annonces` ou similaire :

```sql
-- Renommer la table vers "listings"
ALTER TABLE boutique_annonces RENAME TO listings;

-- Renommer les colonnes
ALTER TABLE listings RENAME COLUMN "kilométrage" TO mileage_km;
ALTER TABLE listings RENAME COLUMN "prix" TO price_eur;
ALTER TABLE listings RENAME COLUMN "année" TO year;
ALTER TABLE listings RENAME COLUMN "URL" TO url;
ALTER TABLE listings RENAME COLUMN "URL de l'imag" TO image_url;
ALTER TABLE listings RENAME COLUMN "id_externe" TO external_id;
ALTER TABLE listings RENAME COLUMN "identifiant" TO id;
```

### Option 3 : Créer une nouvelle table et migrer les données

Si vous préférez garder l'ancienne table :

1. **Exécutez `migration-simple.sql`** pour créer la nouvelle table `listings`
2. **Migrez les données** :

```sql
INSERT INTO listings (external_id, title, price_eur, mileage_km, year, source, url, image_url)
SELECT 
  id_externe,
  title,
  prix,
  kilométrage,
  année,
  'unknown' as source,
  "URL",
  "URL de l'imag"
FROM boutique_annonces;
```

### Option 4 : Adapter le code backend

Si vous préférez garder les noms français, je peux adapter le code backend pour utiliser vos noms de colonnes.

## Prochaines étapes

1. **Exécutez `check-table-structure.sql`** pour voir la structure exacte
2. **Dites-moi** :
   - Le nom réel de votre table
   - Les noms réels des colonnes
   - Si vous avez déjà des données importantes dans cette table

Ensuite, je pourrai vous donner le script SQL exact à exécuter.

