# 📚 Documentation API - Conciergerie Automobile

Documentation des endpoints backend pour le frontend React/Next.js.

## 🔐 Authentification

Toutes les routes `/api/me/*` et `/api/favorites` nécessitent une authentification via Supabase Auth.

**Header requis :**
```
Authorization: Bearer <supabase_access_token>
```

## 📋 Endpoints

### 1. POST `/api/search`

Recherche de véhicules sur plusieurs sites avec scoring IA.

**Body :**
```typescript
{
  brand: string          // Ex: "AUDI"
  model: string          // Ex: "A3"
  max_price: number      // Ex: 25000
  fuelType?: string      // Optionnel: "essence" | "diesel" | "hybride" | "electrique"
  page?: number          // Optionnel, défaut: 1
  limit?: number         // Optionnel, défaut: 30, max: 100
}
```

**Réponse (200) :**
```typescript
{
  success: true,
  query: {
    brand: string,
    model: string,
    maxPrice: number,
    fuelType?: string
  },
  listings: Listing[],  // Triées par score_final DESC
  sites: {
    [siteName]: { count: number }
  },
  stats: {
    total: number,
    sites_scraped: number,
    sites_failed: number
  },
  pagination: {
    page: number,
    limit: number,
    total: number,
    totalPages: number
  }
}
```

**Type Listing :**
```typescript
{
  id: string,                    // external_id
  title: string,
  price_eur: number | null,
  mileage_km: number | null,
  year: number | null,
  source: string,                // "LeBonCoin" | "ParuVendu" | etc.
  url: string,
  imageUrl: string | null,
  score_ia: number | null,        // Score brut de l'IA (0-100)
  score_final: number             // Score de pertinence final (0-100)
}
```

**Erreurs :**
- `400` : Validation échouée
- `500` : Erreur serveur

---

### 2. POST `/api/analyze-listing`

Analyse détaillée d'une annonce avec détection d'arnaques.

**Body :**
```typescript
{
  url?: string,           // URL de l'annonce à scraper
  title?: string,         // Titre de l'annonce
  description?: string,   // Description
  price_eur?: number,
  mileage_km?: number,
  year?: number
}
```

**Note :** Au moins `url` ou `title` doit être fourni.

**Réponse (200) :**
```typescript
{
  success: true,
  data: {
    summary: string,              // Résumé de l'analyse
    risk_score: number,           // 0-100 (100 = très risqué)
    risk_level: "low" | "medium" | "high",
    market_price_estimate: {
      min: number | null,
      max: number | null,
      comment: string
    },
    positives: string[],          // Points favorables
    warnings: string[],           // Points à surveiller
    final_recommendation: string, // Conseil clair
    technical_notes?: string      // Remarques techniques
  }
}
```

**Erreurs :**
- `400` : Validation échouée ou contenu insuffisant
- `500` : Erreur serveur ou scraping

---

### 3. GET `/api/me/searches`

Liste des recherches effectuées par l'utilisateur authentifié.

**Query params :**
- `limit?: number` (défaut: 20, max: 100)
- `offset?: number` (défaut: 0)

**Réponse (200) :**
```typescript
{
  success: true,
  data: UserSearch[],
  pagination: {
    limit: number,
    offset: number,
    total: number
  }
}
```

**Type UserSearch :**
```typescript
{
  id: string,
  brand: string,
  model: string,
  max_price: number,
  total_results: number,
  created_at: string
}
```

**Erreurs :**
- `401` : Non authentifié
- `500` : Erreur serveur

---

### 4. GET `/api/me/listings`

Liste des annonces associées aux recherches de l'utilisateur.

**Query params :**
- `limit?: number` (défaut: 30, max: 100)
- `offset?: number` (défaut: 0)
- `search_id?: string` (optionnel : filtrer par recherche)

**Réponse (200) :**
```typescript
{
  success: true,
  data: Listing[],
  pagination: {
    limit: number,
    offset: number,
    total: number
  }
}
```

**Erreurs :**
- `401` : Non authentifié
- `500` : Erreur serveur

---

### 5. GET `/api/me/analyzed-listings`

Liste des analyses effectuées par l'utilisateur.

**Query params :**
- `limit?: number` (défaut: 20, max: 100)
- `offset?: number` (défaut: 0)

**Réponse (200) :**
```typescript
{
  success: true,
  data: UserAnalyzedListing[],
  pagination: {
    limit: number,
    offset: number,
    total: number
  }
}
```

**Type UserAnalyzedListing :**
```typescript
{
  id: string,
  url: string | null,
  risk_score: number,
  risk_level: "low" | "medium" | "high",
  summary: string,
  created_at: string
}
```

**Erreurs :**
- `401` : Non authentifié
- `500` : Erreur serveur

---

### 6. GET `/api/me/favorites`

Liste des annonces favorites de l'utilisateur.

**Query params :**
- `limit?: number` (défaut: 30, max: 100)
- `offset?: number` (défaut: 0)

**Réponse (200) :**
```typescript
{
  success: true,
  data: Favorite[]
}
```

**Type Favorite :**
```typescript
{
  id: string,
  user_id: string,
  listing_id: string,
  created_at: string,
  listing?: Listing  // Populé via JOIN
}
```

**Erreurs :**
- `401` : Non authentifié
- `500` : Erreur serveur

---

### 7. POST `/api/favorites`

Ajoute une annonce aux favoris.

**Body :**
```typescript
{
  listing_id: string  // UUID interne ou external_id
}
```

**Réponse (200) :**
```typescript
{
  success: true,
  message: "Annonce ajoutée aux favoris",
  data: Favorite
}
```

**Erreurs :**
- `400` : Validation échouée
- `401` : Non authentifié
- `404` : Annonce introuvable
- `409` : Déjà en favoris
- `500` : Erreur serveur

---

### 8. DELETE `/api/favorites`

Supprime une annonce des favoris.

**Body :**
```typescript
{
  listing_id: string  // UUID interne ou external_id
}
```

**Réponse (200) :**
```typescript
{
  success: true,
  message: "Annonce retirée des favoris"
}
```

**Erreurs :**
- `400` : Validation échouée
- `401` : Non authentifié
- `404` : Annonce introuvable
- `500` : Erreur serveur

---

### 9. POST `/api/contact`

Envoie un message de contact.

**Body :**
```typescript
{
  name: string,      // Min 2 caractères, max 100
  email: string,     // Format email valide
  message: string    // Min 10 caractères, max 2000
}
```

**Réponse (200) :**
```typescript
{
  success: true,
  message: "Votre message a été envoyé avec succès..."
}
```

**Erreurs :**
- `400` : Validation échouée
- `500` : Erreur serveur

---

## 📊 Système de Scoring

Le `score_final` (0-100) est calculé à partir de 6 critères :

1. **Prix vs marché** (0-30 points) : Compare le prix à la moyenne des annonces similaires
2. **Kilométrage** (0-20 points) : Moins de km = meilleur score
3. **Année** (0-15 points) : Véhicule plus récent = meilleur score
4. **Source** (0-10 points) : Sites professionnels = meilleur score
5. **Complétude** (0-15 points) : Présence de prix, km, année, image, titre descriptif
6. **Score IA brut** (0-10 points) : Score fourni par le modèle IA

Les annonces sont **automatiquement triées par `score_final` décroissant** dans `/api/search`.

---

## 🔒 Sécurité

- Toutes les routes `/api/me/*` et `/api/favorites` vérifient l'authentification
- Les données sont filtrées par `user_id` côté serveur
- Row Level Security (RLS) activé sur toutes les tables Supabase
- Validation des inputs avec Zod
- Gestion d'erreurs standardisée

---

## 📝 Types TypeScript

Tous les types sont définis dans `/lib/types.ts` et peuvent être importés côté frontend :

```typescript
import type {
  ListingResponse,
  SearchResponse,
  AnalyzeListingResponse,
  UserSearch,
  UserAnalyzedListing,
  Favorite,
  ContactResponse
} from '@/lib/types'
```

---

## 🚨 Format d'erreur standard

Toutes les erreurs suivent ce format :

```typescript
{
  success: false,
  error: string,        // Message lisible pour l'utilisateur
  details?: any         // Détails techniques (uniquement en développement)
}
```

Status HTTP :
- `400` : Erreur de validation
- `401` : Non authentifié
- `404` : Ressource introuvable
- `409` : Conflit (ex: déjà en favoris)
- `500` : Erreur serveur

