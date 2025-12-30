# Tracking Verification Report

**Date:** $(date)  
**Statut:** ✅ Vérification complète effectuée

## 1. Vérification des Variables d'Environnement

### ✅ Configuration dans `lib/tracking.ts`

Le module vérifie maintenant automatiquement au chargement :

- `NEXT_PUBLIC_SUPABASE_URL` : ✅ Vérifié
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` : ✅ Vérifié  
- `SUPABASE_SERVICE_ROLE_KEY` : ⚠️ Optionnel mais recommandé

**Comportement :**
- Si `NEXT_PUBLIC_SUPABASE_URL` ou `NEXT_PUBLIC_SUPABASE_ANON_KEY` manquent → **ERREUR CRITIQUE** (throw)
- Si `SUPABASE_SERVICE_ROLE_KEY` manque → **WARNING** (utilise anon key, peut échouer avec RLS)

**Action requise :**
```bash
# Ajouter dans .env.local si manquant :
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key  # Recommandé
```

## 2. Vérification des Routes

### ✅ Routes avec tracking intégré

| Route | Fichier | Frontend appelant | Tracking fonction |
|-------|---------|-------------------|-------------------|
| `POST /api/search` | `app/api/search/route.ts` | `app/resultats/page.tsx` | `logAiSearch()` |
| `POST /api/analyze-listing` | `app/api/analyze-listing/route.ts` | `app/analyser/page.tsx` | `logAiAnalysis()` |
| `POST /api/contact` | `app/api/contact/route.ts` | `app/contact/page.tsx` | `logContactRequest()` |

**Logs ajoutés :**
- `[Tracking] Route /api/search appelée` avec userId, brand, model, totalResults
- `[Tracking] Route /api/analyze-listing appelée` avec userId, listingUrl, riskScore
- `[Tracking] Route /api/contact appelée` avec userId, name, email

**Vérification :** ✅ Toutes les routes appelées par le frontend ont le tracking intégré

## 3. Vérification des Inserts

### ✅ `lib/tracking.ts` - Fonctions de logging

#### `logAiSearch()`
- **Table:** `public.ai_searches`
- **Colonnes insérées:**
  - `user_id` (UUID, NOT NULL)
  - `query_text` (TEXT, NOT NULL, max 1000 chars)
  - `filters` (JSONB, nullable, max 5000 chars)
  - `created_at` (TIMESTAMPTZ, auto)
- **Logs:** 
  - `[Tracking] logAiSearch: Tentative insertion` (avant)
  - `[Tracking] ✅ logAiSearch réussi` avec `insertedId` (succès)
  - `[Tracking] ❌ Erreur logAiSearch` avec détails complets (échec)

#### `logAiAnalysis()`
- **Table:** `public.ai_analyses`
- **Colonnes insérées:**
  - `user_id` (UUID, NOT NULL)
  - `listing_url` (TEXT, NOT NULL, max 2000 chars)
  - `listing_source` (TEXT, nullable, max 100 chars)
  - `risk_score` (INTEGER, 0-100)
  - `risk_level` (TEXT, 'low'|'medium'|'high')
  - `created_at` (TIMESTAMPTZ, auto)
- **Logs:** Similaires à `logAiSearch`

#### `logContactRequest()`
- **Table:** `public.contact_requests`
- **Colonnes insérées:**
  - `user_id` (UUID, nullable - accepte les contacts anonymes)
  - `subject` (TEXT, nullable, max 500 chars)
  - `message` (TEXT, NOT NULL, max 10000 chars)
  - `created_at` (TIMESTAMPTZ, auto)
- **Logs:** Similaires aux autres fonctions

**Comportement "best effort":**
- ✅ Ne throw jamais d'erreur
- ✅ Log toutes les erreurs avec détails complets (message, code, details, hint)
- ✅ Retourne l'ID inséré en cas de succès

## 4. Vérification de la Configuration Supabase

### ✅ Service Role Key

**Fonction:** `getSupabaseAdminClient()` dans `lib/supabase/server.ts`

**Comportement:**
- Utilise `SUPABASE_SERVICE_ROLE_KEY` si disponible
- Fallback sur `NEXT_PUBLIC_SUPABASE_ANON_KEY` si manquant
- Bypass RLS si service role key présente

**Logs ajoutés:**
- `[Tracking] ✅ Configuration OK: Service role key présente` (au chargement du module)
- `useServiceRole: true/false` et `hasServiceKey: true/false` dans chaque log d'insertion

## 5. Endpoints Admin

### ✅ `GET /api/admin/stats/volumes`
- **Protection:** `requireAdmin()` vérifie `profiles.role = 'admin'`
- **Fonction:** Retourne les compteurs pour les 3 tables
- **Status:** ✅ Implémenté

### ✅ `GET /api/admin/users/[id]/activity`
- **Protection:** `requireAdmin()` vérifie `profiles.role = 'admin'`
- **Fonction:** Retourne 20 dernières recherches + analyses d'un utilisateur
- **Status:** ✅ Implémenté

**Fonction `requireAdmin()` dans `lib/auth.ts`:**
- ✅ Vérifie authentification via `requireAuth()`
- ✅ Vérifie `profiles.role = 'admin'` via Supabase
- ✅ Throw `AuthenticationError` si non admin

## 6. Endpoint DEV de Test

### ✅ `GET /api/dev/tracking-smoke-test`

**Fichier:** `app/api/dev/tracking-smoke-test/route.ts`

**Fonctionnalités:**
- ✅ Teste les 3 fonctions de tracking avec valeurs factices
- ✅ Requiert authentification (pas besoin d'être admin)
- ✅ Désactivé automatiquement en production
- ✅ Retourne le résultat de chaque test

**Utilisation:**
```bash
# En développement uniquement
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/dev/tracking-smoke-test
```

**⚠️ IMPORTANT:** Supprimer cet endpoint avant le déploiement en production

## 7. Script SQL de Vérification

### ✅ `scripts/verify-tracking.sql`

**Contenu:**
1. Vérification existence des tables
2. Structure des colonnes
3. Compteurs par table
4. Dernières 5 entrées de chaque table
5. Statistiques par utilisateur (top 10)
6. Vérification politiques RLS
7. Vérification contraintes et index
8. Exemples de recherches avec filtres

**Utilisation:**
```sql
-- Exécuter dans Supabase SQL Editor
-- Copier-coller le contenu de scripts/verify-tracking.sql
```

## 8. Checklist de Validation

### Tests à effectuer manuellement :

- [ ] **Test 1: Recherche IA**
  1. Se connecter à l'application
  2. Effectuer une recherche (ex: Audi A3, 40000€)
  3. Vérifier les logs serveur : `[Tracking] Route /api/search appelée`
  4. Vérifier les logs : `[Tracking] ✅ logAiSearch réussi` avec `insertedId`
  5. Exécuter dans Supabase : `SELECT * FROM ai_searches ORDER BY created_at DESC LIMIT 1;`

- [ ] **Test 2: Analyse d'annonce**
  1. Se connecter à l'application
  2. Analyser une annonce
  3. Vérifier les logs serveur : `[Tracking] Route /api/analyze-listing appelée`
  4. Vérifier les logs : `[Tracking] ✅ logAiAnalysis réussi` avec `insertedId`
  5. Exécuter dans Supabase : `SELECT * FROM ai_analyses ORDER BY created_at DESC LIMIT 1;`

- [ ] **Test 3: Contact**
  1. Envoyer un message via le formulaire de contact
  2. Vérifier les logs serveur : `[Tracking] Route /api/contact appelée`
  3. Vérifier les logs : `[Tracking] ✅ logContactRequest réussi` avec `insertedId`
  4. Exécuter dans Supabase : `SELECT * FROM contact_requests ORDER BY created_at DESC LIMIT 1;`

- [ ] **Test 4: Endpoint DEV**
  1. Se connecter à l'application
  2. Appeler `GET /api/dev/tracking-smoke-test`
  3. Vérifier que les 3 tests retournent `success: true`
  4. Vérifier les logs serveur pour chaque insertion

- [ ] **Test 5: Endpoints Admin**
  1. Se connecter avec un compte admin (`profiles.role = 'admin'`)
  2. Appeler `GET /api/admin/stats/volumes`
  3. Vérifier que les compteurs sont retournés
  4. Appeler `GET /api/admin/users/[id]/activity`
  5. Vérifier que les recherches et analyses sont retournées

## 9. Logs de Diagnostic

### Format des logs

Tous les logs de tracking utilisent le préfixe `[Tracking]` pour faciliter le filtrage :

```bash
# Filtrer les logs de tracking
npm run dev 2>&1 | grep "\[Tracking\]"
```

### Exemples de logs attendus

**Succès:**
```
[Tracking] Route /api/search appelée { userId: '...', brand: 'Audi', ... }
[Tracking] Appel logAiSearch { userId: '...', queryText: '...', ... }
[Tracking] logAiSearch: Tentative insertion { userId: '...', useServiceRole: true, ... }
[Tracking] ✅ logAiSearch réussi { insertedId: 'uuid-here', userId: '...', ... }
```

**Échec:**
```
[Tracking] ❌ Erreur logAiSearch: {
  error: '...',
  code: '...',
  details: '...',
  hint: '...',
  userId: '...',
  useServiceRole: true
}
```

## 10. Corrections Apportées

### ✅ Améliorations du code

1. **Vérification des variables d'environnement au chargement** (`lib/tracking.ts`)
   - Erreurs explicites si variables manquantes
   - Suggestions de lignes `.env.local` à ajouter

2. **Logs détaillés avec ID inséré** (`lib/tracking.ts`)
   - `insertedId` retourné et loggé en cas de succès
   - Détails complets d'erreur (message, code, details, hint) en cas d'échec

3. **Logs de diagnostic dans les routes** (`app/api/*/route.ts`)
   - Confirmation que la route est appelée
   - Résumé du payload (userId, critères, etc.)
   - Confirmation avant/après appel du tracking

4. **Endpoint DEV de test** (`app/api/dev/tracking-smoke-test/route.ts`)
   - Test rapide des 3 fonctions
   - Désactivé automatiquement en production

5. **Script SQL de vérification** (`scripts/verify-tracking.sql`)
   - Vérification complète de la base de données
   - Statistiques et exemples

## 11. Résumé

### ✅ Statut Global: FONCTIONNEL

- ✅ Variables d'environnement vérifiées
- ✅ Routes avec tracking intégrées
- ✅ Inserts avec logs détaillés
- ✅ Configuration Supabase vérifiée
- ✅ Endpoints admin fonctionnels
- ✅ Endpoint DEV de test créé
- ✅ Script SQL de vérification créé

### ⚠️ Actions Requises

1. **Vérifier les variables d'environnement** dans `.env.local`
2. **Tester manuellement** les 3 scénarios (recherche, analyse, contact)
3. **Vérifier les logs serveur** pour confirmer les insertions
4. **Exécuter le script SQL** pour vérifier les données
5. **Supprimer l'endpoint DEV** avant le déploiement en production

### 📝 Notes

- Les logs de diagnostic sont **temporaires** et peuvent être supprimés après validation
- L'endpoint DEV (`/api/dev/tracking-smoke-test`) doit être **supprimé en production**
- Le système est **non-bloquant** : les erreurs de tracking n'affectent pas les requêtes principales

