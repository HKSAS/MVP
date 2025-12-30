# ⭐ Favoris & Recommandations - Documentation

## 📋 Vue d'ensemble

Fonctionnalité complète de favoris et recommandations personnalisées pour Autoval IA.

### Fonctionnalités
- ✅ Ajout/retrait de favoris depuis les résultats de recherche
- ✅ Liste des favoris dans le dashboard avec tri et pagination
- ✅ Recommandations personnalisées basées sur les favoris
- ✅ Cache automatique des annonces pour alimenter les recommandations

---

## 🗄️ Base de données (Supabase)

### SQL à exécuter

Exécuter le fichier `supabase-favorites-recommendations.sql` dans le SQL Editor de Supabase.

**Tables créées :**
- `favorites` : Favoris utilisateur avec données complètes
- `listings_cache` : Cache des annonces pour recommandations

**RLS activé :**
- Les utilisateurs ne peuvent voir/modifier que leurs propres favoris
- Le cache est accessible en lecture pour tous les utilisateurs authentifiés

---

## 🔌 API Routes

### POST /api/favorites/toggle

Ajoute ou supprime un favori.

**Body :**
```json
{
  "source": "LeBonCoin",
  "listing_id": "123456",
  "listing_url": "https://...",
  "title": "Peugeot 208 2020",
  "price": 15000,
  "year": 2020,
  "mileage": 50000,
  "score": 85,
  "extracted_features": {}
}
```

**Réponse :**
```json
{
  "success": true,
  "status": "added" | "removed",
  "data": { ... }
}
```

### GET /api/favorites

Récupère les favoris de l'utilisateur.

**Query params :**
- `limit` : Nombre de résultats (défaut: 50)
- `offset` : Pagination (défaut: 0)
- `sort` : `created_at` | `price` | `score` (défaut: `created_at`)

**Réponse :**
```json
{
  "success": true,
  "data": [...],
  "totalCount": 42
}
```

### GET /api/recommendations

Retourne les top 10 suggestions personnalisées.

**Réponse :**
```json
{
  "success": true,
  "data": [
    {
      "listing": { ... },
      "reason": "Budget proche + marque préférée + bon score",
      "matchScore": 85
    }
  ]
}
```

---

## 🎨 Composants UI

### FavoriteButton

Bouton toggle pour ajouter/retirer des favoris.

```tsx
<FavoriteButton 
  listing={listing} 
  variant="outline" 
  size="sm" 
/>
```

### FavoritesList

Liste complète des favoris avec tri et pagination.

```tsx
<FavoritesList 
  limit={20} 
  showPagination={true} 
/>
```

### RecommendationsList

Liste des recommandations personnalisées.

```tsx
<RecommendationsList />
```

---

## 🧠 Logique de recommandations

### buildUserPreferenceProfile()

Construit le profil utilisateur depuis ses favoris :
- Top marques (fréquences)
- Budget moyen/min/max
- Kilométrage moyen/max
- Année moyenne et préférence (récent/ancien/neutre)
- Top carburants, transmissions, segments

### scoreListingForUser()

Score une annonce selon le profil :
- +30 points si marque match
- +25 points si prix proche budget
- +20 points si score Autoval IA élevé
- +15 points si kilométrage faible
- -10 points si risque élevé
- etc.

Score final normalisé entre 0-100.

---

## 🔄 Cache automatique

Lors d'une recherche (`/api/search`), les résultats sont automatiquement mis en cache dans `listings_cache` pour alimenter les recommandations.

**Fonction :** `cacheSearchResults()` dans `lib/cache-listings.ts`

**Comportement :**
- UPSERT (insert ou update si existe)
- Non-bloquant (ne ralentit pas la recherche)
- Extraction automatique marque/modèle depuis le titre

---

## 📍 Intégration

### Résultats de recherche (`/resultats`)

Le bouton favori est ajouté sur chaque carte d'annonce.

### Dashboard (`/dashboard`)

Deux nouvelles sections :
1. **Mes favoris** : Liste avec tri et pagination
2. **Suggestions pour vous** : Top 10 recommandations

---

## 🔒 Sécurité

- ✅ RLS activé sur toutes les tables
- ✅ `user_id` toujours depuis la session, jamais depuis le client
- ✅ Validation Zod sur tous les inputs
- ✅ Gestion d'erreurs complète avec logs

---

## 🚀 Déploiement

1. Exécuter le SQL dans Supabase
2. Vérifier les variables d'environnement
3. Tester les endpoints API
4. Vérifier l'intégration UI

---

## 📝 Notes

- Les recommandations nécessitent au moins 1 favori
- Le cache est limité à 1000 annonces récentes pour performance
- Les recommandations sont calculées en temps réel (pas de cache)



