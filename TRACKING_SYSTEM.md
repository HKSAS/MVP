# Système de Tracking Automatique

## Vue d'ensemble

Le système de tracking automatique enregistre tous les événements utilisateur importants dans Supabase pour analyse et statistiques :

- **Recherches IA** → Table `ai_searches`
- **Analyses d'annonces** → Table `ai_analyses`
- **Demandes de contact** → Table `contact_requests`

## Architecture

### Helper de Tracking (`lib/tracking.ts`)

Le module `lib/tracking.ts` expose 3 fonctions :

#### `logAiSearch(params, options)`
Log une recherche IA effectuée par un utilisateur.

**Paramètres :**
- `params.userId` : ID de l'utilisateur (string | null)
- `params.queryText` : Texte de la recherche (string)
- `params.filters` : Filtres de recherche (Record<string, any>, optionnel)

**Exemple :**
```typescript
import { logAiSearch } from '@/lib/tracking'

await logAiSearch({
  userId: user.id,
  queryText: 'Audi A3 40000€',
  filters: { brand: 'Audi', model: 'A3', max_price: 40000 }
}, { useServiceRole: true })
```

#### `logAiAnalysis(params, options)`
Log une analyse d'annonce effectuée par un utilisateur.

**Paramètres :**
- `params.userId` : ID de l'utilisateur (string | null)
- `params.listingUrl` : URL de l'annonce (string)
- `params.listingSource` : Source de l'annonce (string, optionnel)
- `params.riskScore` : Score de risque (number, 0-100)
- `params.riskLevel` : Niveau de risque ('low' | 'medium' | 'high')

**Exemple :**
```typescript
import { logAiAnalysis } from '@/lib/tracking'

await logAiAnalysis({
  userId: user.id,
  listingUrl: 'https://www.leboncoin.fr/ad/1234567890',
  listingSource: 'LeBonCoin',
  riskScore: 75,
  riskLevel: 'high'
}, { useServiceRole: true })
```

#### `logContactRequest(params, options)`
Log une demande de contact.

**Paramètres :**
- `params.userId` : ID de l'utilisateur (string | null, peut être null pour contacts anonymes)
- `params.subject` : Sujet du message (string, optionnel)
- `params.message` : Message (string)

**Exemple :**
```typescript
import { logContactRequest } from '@/lib/tracking'

await logContactRequest({
  userId: user?.id || null,
  subject: 'Demande de contact',
  message: 'Bonjour, je souhaite...'
}, { useServiceRole: true })
```

### Intégration dans les Routes

Le tracking est automatiquement intégré dans :

1. **`/api/search`** (POST) : Log après chaque recherche IA réussie
2. **`/api/analyze-listing`** (POST) : Log après chaque analyse d'annonce réussie
3. **`/api/contact`** (POST) : Log après chaque demande de contact enregistrée

**Important :** Le tracking est **non-bloquant** (best effort). Si l'insertion échoue, la requête principale continue normalement.

## Tables Supabase

### `ai_searches`
```sql
CREATE TABLE ai_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  query_text TEXT NOT NULL,
  filters JSONB
);
```

### `ai_analyses`
```sql
CREATE TABLE ai_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  listing_url TEXT NOT NULL,
  listing_source TEXT,
  risk_score INTEGER NOT NULL CHECK (risk_score >= 0 AND risk_score <= 100),
  risk_level TEXT NOT NULL CHECK (risk_level IN ('low', 'medium', 'high'))
);
```

### `contact_requests`
```sql
CREATE TABLE contact_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  subject TEXT,
  message TEXT NOT NULL
);
```

## Endpoints Admin

### GET `/api/admin/stats/volumes`

Retourne les statistiques de volume globales.

**Protection :** Admin uniquement (vérifie `profiles.role = 'admin'`)

**Réponse :**
```json
{
  "success": true,
  "data": {
    "ai_searches": 1234,
    "ai_analyses": 567,
    "contact_requests": 89,
    "total": 1890
  }
}
```

**Exemple d'utilisation :**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://your-domain.com/api/admin/stats/volumes
```

### GET `/api/admin/users/[id]/activity`

Retourne les 20 dernières recherches et analyses d'un utilisateur.

**Protection :** Admin uniquement

**Paramètres :**
- `id` : ID de l'utilisateur (dans l'URL)

**Réponse :**
```json
{
  "success": true,
  "data": {
    "userId": "uuid-here",
    "searches": [
      {
        "id": "uuid",
        "query_text": "Audi A3 40000€",
        "filters": { "brand": "Audi", "model": "A3" },
        "created_at": "2024-01-15T10:30:00Z"
      }
    ],
    "analyses": [
      {
        "id": "uuid",
        "listing_url": "https://...",
        "risk_score": 75,
        "risk_level": "high",
        "created_at": "2024-01-15T11:00:00Z"
      }
    ],
    "total_searches": 20,
    "total_analyses": 15
  }
}
```

**Exemple d'utilisation :**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://your-domain.com/api/admin/users/USER_ID/activity
```

## Tests

### Tester le tracking d'une recherche

1. Connectez-vous à l'application
2. Effectuez une recherche (ex: Audi A3, 40000€)
3. Vérifiez dans Supabase SQL Editor :
```sql
SELECT * FROM ai_searches 
WHERE user_id = 'YOUR_USER_ID' 
ORDER BY created_at DESC 
LIMIT 1;
```

### Tester le tracking d'une analyse

1. Connectez-vous à l'application
2. Analysez une annonce
3. Vérifiez dans Supabase SQL Editor :
```sql
SELECT * FROM ai_analyses 
WHERE user_id = 'YOUR_USER_ID' 
ORDER BY created_at DESC 
LIMIT 1;
```

### Tester le tracking d'un contact

1. Envoyez un message via le formulaire de contact
2. Vérifiez dans Supabase SQL Editor :
```sql
SELECT * FROM contact_requests 
WHERE user_id = 'YOUR_USER_ID' 
ORDER BY created_at DESC 
LIMIT 1;
```

## Requêtes Retool Utiles

### Compter les recherches par jour
```sql
SELECT 
  DATE(created_at) as date,
  COUNT(*) as count
FROM ai_searches
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

### Compter les analyses par niveau de risque
```sql
SELECT 
  risk_level,
  COUNT(*) as count,
  AVG(risk_score) as avg_score
FROM ai_analyses
GROUP BY risk_level;
```

### Top 10 utilisateurs les plus actifs
```sql
SELECT 
  user_id,
  COUNT(*) FILTER (WHERE table_name = 'ai_searches') as searches_count,
  COUNT(*) FILTER (WHERE table_name = 'ai_analyses') as analyses_count
FROM (
  SELECT user_id, 'ai_searches' as table_name FROM ai_searches
  UNION ALL
  SELECT user_id, 'ai_analyses' as table_name FROM ai_analyses
) combined
GROUP BY user_id
ORDER BY (searches_count + analyses_count) DESC
LIMIT 10;
```

### Recherches les plus fréquentes
```sql
SELECT 
  query_text,
  COUNT(*) as count
FROM ai_searches
GROUP BY query_text
ORDER BY count DESC
LIMIT 20;
```

## Configuration

### Variables d'environnement requises

- `NEXT_PUBLIC_SUPABASE_URL` : URL de votre projet Supabase
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` : Clé anonyme Supabase
- `SUPABASE_SERVICE_ROLE_KEY` : Clé service role (pour bypass RLS, optionnel mais recommandé)

### RLS (Row Level Security)

Les tables doivent avoir des politiques RLS configurées :

- **`ai_searches`** : Les utilisateurs peuvent voir uniquement leurs propres recherches
- **`ai_analyses`** : Les utilisateurs peuvent voir uniquement leurs propres analyses
- **`contact_requests`** : Les utilisateurs peuvent voir uniquement leurs propres demandes

Les insertions utilisent le **service role key** pour bypass RLS, garantissant que le tracking fonctionne même si les politiques sont restrictives.

## Dépannage

### Le tracking ne fonctionne pas

1. **Vérifier les logs serveur** : Cherchez `[Tracking]` dans les logs
2. **Vérifier les variables d'environnement** : `SUPABASE_SERVICE_ROLE_KEY` doit être définie
3. **Vérifier les tables** : Les tables doivent exister dans Supabase
4. **Vérifier RLS** : Les politiques RLS doivent permettre les insertions (ou utiliser service role)

### Les endpoints admin retournent 401

1. **Vérifier l'authentification** : L'utilisateur doit être connecté
2. **Vérifier le rôle** : L'utilisateur doit avoir `role = 'admin'` dans la table `profiles`
3. **Vérifier le token** : Le token Bearer doit être valide

### Exemple de mise à jour du rôle admin

```sql
UPDATE profiles 
SET role = 'admin' 
WHERE id = 'USER_ID_HERE';
```

## Notes importantes

- Le tracking est **asynchrone et non-bloquant** : les erreurs de tracking n'affectent pas les requêtes principales
- Les données sont **nettoyées** avant insertion (limitation de longueur, validation)
- Le tracking utilise le **service role key** par défaut pour garantir la fiabilité
- Les utilisateurs **non authentifiés** ne sont pas trackés (sauf pour `contact_requests` qui accepte `user_id = NULL`)

