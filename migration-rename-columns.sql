-- ============================================================================
-- MIGRATION : Renommer les colonnes françaises vers les noms anglais
-- ============================================================================
-- À utiliser si votre table a des colonnes en français et que vous voulez
-- les renommer pour correspondre au code backend

-- ATTENTION : Adaptez les noms de table et colonnes selon votre structure réelle
-- Remplacez "boutique_annonces" par le nom réel de votre table

-- Exemple de renommage (à adapter selon votre structure) :
-- ALTER TABLE boutique_annonces RENAME COLUMN "kilométrage" TO mileage_km;
-- ALTER TABLE boutique_annonces RENAME COLUMN "prix" TO price_eur;
-- ALTER TABLE boutique_annonces RENAME COLUMN "année" TO year;
-- ALTER TABLE boutique_annonces RENAME COLUMN "URL" TO url;
-- ALTER TABLE boutique_annonces RENAME COLUMN "URL de l'imag" TO image_url;
-- ALTER TABLE boutique_annonces RENAME COLUMN "id_externe" TO external_id;
-- ALTER TABLE boutique_annonces RENAME COLUMN "identifiant" TO id;

-- OU : Créer une nouvelle table avec les bons noms et migrer les données
-- (plus sûr si vous avez déjà des données)

