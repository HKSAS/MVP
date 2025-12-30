# Checklist de Déploiement - Formulaire de Contact

## Variables d'Environnement Requises dans Vercel

Assurez-vous que les variables suivantes sont configurées dans votre projet Vercel :

### 1. Variables Supabase (déjà configurées normalement)
- `NEXT_PUBLIC_SUPABASE_URL` - URL de votre instance Supabase
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Clé anonyme Supabase

### 2. Variables Resend (pour l'envoi d'emails)
- `RESEND_API_KEY` - Clé API Resend (obtenue sur https://resend.com/api-keys)
- `CONTACT_EMAIL` - Email de destination (défaut: `contact@autovalia.fr`)

## Comment Configurer Resend

1. **Créer un compte Resend** (si pas déjà fait)
   - Aller sur https://resend.com
   - Créer un compte gratuit

2. **Créer une clé API**
   - Aller dans "API Keys" dans le dashboard Resend
   - Cliquer sur "Create API Key"
   - Donner un nom (ex: "Autoval IA Production")
   - Copier la clé (commence par `re_...`)

3. **Vérifier le domaine d'envoi**
   - Dans Resend, aller dans "Domains"
   - Ajouter votre domaine `autovalia.fr` (ou utiliser le domaine par défaut de Resend)
   - Vérifier le domaine en ajoutant les enregistrements DNS requis
   - **Note:** Pour les tests, vous pouvez utiliser `onboarding@resend.dev` comme expéditeur temporaire

4. **Ajouter les variables dans Vercel**
   - Aller dans votre projet Vercel
   - Settings → Environment Variables
   - Ajouter `RESEND_API_KEY` avec la clé copiée
   - Ajouter `CONTACT_EMAIL` avec `contact@autovalia.fr` (ou votre email)
   - Sauvegarder et redéployer

## Vérification du Fonctionnement

### 1. Vérifier les logs dans Vercel
   - Aller dans Vercel → Votre projet → Logs
   - Chercher les logs `[CONTACT]` pour voir les erreurs détaillées

### 2. Tester le formulaire
   - Remplir le formulaire de contact sur le site
   - Vérifier les logs pour voir si :
     - Le message est bien enregistré en base
     - L'email est bien envoyé
     - S'il y a des erreurs, elles seront loggées avec `[CONTACT]`

### 3. Vérifier dans Resend
   - Aller dans Resend → Emails
   - Voir si les emails sont bien envoyés
   - Vérifier s'il y a des erreurs d'envoi

## Problèmes Courants

### "Resend non configuré"
- **Cause:** `RESEND_API_KEY` n'est pas définie dans Vercel
- **Solution:** Ajouter la variable d'environnement dans Vercel et redéployer

### "Erreur lors de l'enregistrement du message"
- **Cause:** Problème avec la base de données Supabase ou colonnes manquantes
- **Solution:** 
  - Vérifier que la table `contact_messages` existe
  - Exécuter le script SQL `add-contact-columns.sql` si les colonnes `phone` et `subject` manquent

### "Email non reçu"
- **Cause:** Problème avec Resend ou domaine non vérifié
- **Solution:**
  - Vérifier les logs dans Resend
  - Vérifier que le domaine d'envoi est bien vérifié
  - Pour les tests, utiliser `onboarding@resend.dev` comme expéditeur

## SQL Migration à Exécuter (si nécessaire)

Si vous voyez des erreurs concernant les colonnes `phone` ou `subject`, exécutez ce script dans Supabase :

```sql
-- Voir le fichier add-contact-columns.sql
```

Ou exécutez directement dans Supabase SQL Editor :

```sql
ALTER TABLE public.contact_messages 
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS subject TEXT;
```

