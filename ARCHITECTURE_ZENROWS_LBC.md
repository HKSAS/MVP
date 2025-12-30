# 🏗️ ARCHITECTURE ZENROWS - LEBONCOIN

## 📋 Vue d'ensemble

Architecture simplifiée et optimisée pour le scraping LeBonCoin avec **ZenRows uniquement**. Toutes les anciennes méthodes (Playwright, XHR, API) ont été supprimées.

---

## 🎯 Stratégie de scraping

### Configuration ZenRows
- **Méthode principale** : HTML brut **SANS** `js_render` (LeBonCoin bloque avec JS rendering)
- **Proxy** : Premium proxy français (`premium_proxy: true`, `proxy_country: 'fr'`)
- **Fallback** : JS rendering uniquement si HTML brut échoue

### Pourquoi sans JS rendering ?
Le diagnostic a montré que :
- ✅ **HTML brut** : 42 annonces trouvées, Status 200
- ❌ **Avec JS rendering** : Erreur 422, LeBonCoin bloque

---

## 📁 Structure des fichiers

### 1. Scraper principal (ZenRows only)
```
src/modules/scraping/sites/leboncoin/scraper.ts
```
**Responsabilités** :
- Scraping LeBonCoin via ZenRows
- Extraction depuis HTML brut (priorité)
- Extraction depuis `__NEXT_DATA__` (JSON Next.js)
- Parsing des attributs `data-qa-id` (fallback)

**Fonctions principales** :
- `scrapeLeBonCoin(query, pass, abortSignal)` - Point d'entrée
- `extractFromHTMLBrut()` - HTML brut sans JS (priorité)
- `extractFromNextData()` - JSON __NEXT_DATA__ (fallback avec JS)
- `extractFromHTMLAttributes()` - Parsing data-qa-id
- `mapLBCAdToUnified()` - Mapping vers format unifié

### 2. Bridge de compatibilité
```
lib/scrapers/leboncoin.ts
```
**Responsabilités** :
- Interface de compatibilité avec l'ancien code
- Conversion `ListingResponse` → `LeBonCoinListing`
- Appel du nouveau scraper ZenRows

**Fonctions** :
- `scrapeLeBonCoin()` - Wrapper vers nouveau scraper
- `convertToListingResponse()` - Conversion de format

### 3. Scripts de diagnostic et test
```
scripts/debug-zenrows.ts    # Diagnostic complet ZenRows
scripts/test-scraper.ts      # Test simple du scraper
```

---

## 🔄 Flux de données

### 1. Requête utilisateur
```
API Route: /api/search
  ↓
runSiteSearch('LeBonCoin', query)
  ↓
lib/scrapers/run-site-search.ts
  ↓
scrapeLeBonCoin(query, pass, abortSignal)
  ↓
lib/scrapers/leboncoin.ts (bridge)
  ↓
scrapeLeBonCoin() (nouveau scraper)
  ↓
src/modules/scraping/sites/leboncoin/scraper.ts
```

### 2. Processus de scraping

```
┌─────────────────────────────────────┐
│  scrapeLeBonCoin(query, pass)      │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  STRATÉGIE 1: HTML Brut             │
│  - premium_proxy: true              │
│  - proxy_country: 'fr'              │
│  - SANS js_render                   │
└──────────────┬──────────────────────┘
               │
               ├─► Chercher __NEXT_DATA__
               │   └─► Si trouvé → Extraire JSON
               │
               └─► Parser data-qa-id
                   └─► Extraire annonces HTML
               │
               ▼
┌─────────────────────────────────────┐
│  Si 0 résultats → STRATÉGIE 2       │
│  - AVEC js_render (fallback)        │
│  - wait: 5000ms                     │
└─────────────────────────────────────┘
```

### 3. Extraction des données

**Méthode 1 : __NEXT_DATA__ (JSON Next.js)**
```javascript
jsonData?.props?.pageProps?.searchData?.ads
jsonData?.props?.pageProps?.ads
jsonData?.props?.pageProps?.data?.ads
jsonData?.props?.initialState?.ads
```

**Méthode 2 : Attributs HTML**
```html
<a data-qa-id="aditem_container" href="/ad/123456">
  <span data-qa-id="aditem_title">Titre</span>
  <span data-qa-id="aditem_price">15 000 €</span>
  <span data-qa-id="aditem_location">Paris</span>
</a>
```

---

## ⚙️ Configuration

### Variables d'environnement
```env
# .env.local
ZENROWS_API_KEY=be381bd55ac9fc1d52916c864a53dc61a103b869
```

### Paramètres ZenRows (HTML brut)
```typescript
{
  premium_proxy: 'true',      // Proxy premium
  proxy_country: 'fr',         // IP française
  block_resources: 'image,media,font'  // Optimisation
  // PAS de js_render (LeBonCoin bloque)
}
```

### Paramètres ZenRows (Fallback JS)
```typescript
{
  js_render: 'true',           // Seulement en fallback
  premium_proxy: 'true',
  proxy_country: 'fr',
  wait: '5000',
  wait_for: '.styles_adCard__yVfDO',
  block_resources: 'image,media,font'
}
```

---

## 🗂️ Fichiers supprimés (nettoyage)

Les anciens scrapers ont été supprimés :
- ❌ `lib/scrapers/leboncoin-xhr.ts`
- ❌ `lib/scrapers/leboncoin.playwright.ts`
- ❌ `lib/scrapers/leboncoin_playwright_remote.ts`
- ❌ `lib/scrapers/leboncoin-api.ts`

**Raison** : Simplification, une seule méthode (ZenRows)

---

## 📊 Format de données

### Input (ScrapeQuery)
```typescript
{
  brand: string
  model?: string
  maxPrice: number
  minPrice?: number
  maxMileage?: number
  minYear?: number
  zipCode?: string
  radiusKm?: number
}
```

### Output (ListingResponse)
```typescript
{
  id: string                    // "lbc_123456"
  title: string                 // "Peugeot 208"
  price_eur: number | null      // 15000
  year: number | null           // 2020
  mileage_km: number | null     // 50000
  url: string                   // "https://www.leboncoin.fr/ad/123456"
  imageUrl: string | null
  source: "LeBonCoin"
  city: string | null
  score_ia: number
  score_final: number
}
```

---

## 🧪 Tests et diagnostic

### Script de diagnostic
```bash
npx tsx scripts/debug-zenrows.ts
```
**Tests effectués** :
1. Test basique ZenRows (avec js_render)
2. LeBonCoin HTML brut (sans JS) ✅
3. LeBonCoin avec JS rendering (fallback)

### Script de test
```bash
npx tsx scripts/test-scraper.ts
```
**Teste** :
- Scraping direct avec query simple
- Affiche les résultats

---

## 🔗 Intégration avec le système existant

### Route API
```
app/api/search/route.ts
  ↓
lib/scrapers/run-site-search.ts
  ↓
lib/scrapers/leboncoin.ts (bridge)
  ↓
src/modules/scraping/sites/leboncoin/scraper.ts (nouveau)
```

### Système de passes
Le scraper supporte 3 passes :
- **strict** : Critères exacts
- **relaxed** : Budget +10%
- **opportunity** : Budget +20%

---

## 🎯 Points clés de l'architecture

### ✅ Avantages
1. **Simplicité** : Une seule méthode (ZenRows)
2. **Fiabilité** : HTML brut fonctionne (42 annonces trouvées)
3. **Performance** : Pas de JS rendering = plus rapide
4. **Coût** : Moins cher (pas de JS rendering)
5. **Maintenance** : Code simple et clair

### ⚠️ Limitations
1. **HTML brut** : Peut ne pas avoir toutes les données dynamiques
2. **Fallback JS** : Peut être bloqué (erreur 422)
3. **Parsing HTML** : Dépend de la structure HTML de LeBonCoin

### 🔧 Améliorations futures possibles
1. Proxies résidentiels si blocage fréquent
2. Cache des résultats
3. Retry automatique avec backoff
4. Parsing amélioré des attributs HTML

---

## 📝 Checklist de vérification

- [x] Scraper ZenRows créé
- [x] Bridge de compatibilité en place
- [x] Anciens scrapers supprimés
- [x] Scripts de diagnostic créés
- [x] Configuration .env.local vérifiée
- [x] HTML brut fonctionne (42 annonces)
- [x] Parsing __NEXT_DATA__ implémenté
- [x] Parsing data-qa-id implémenté
- [x] Intégration avec run-site-search.ts

---

## 🚀 Utilisation

### Pour développer
```bash
# Diagnostic
npx tsx scripts/debug-zenrows.ts

# Test scraper
npx tsx scripts/test-scraper.ts
```

### Pour l'API
```bash
# Lancer le serveur
npm run dev

# Tester l'API
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{
    "brand": "peugeot",
    "model": "208",
    "maxPrice": 20000
  }'
```

---

## 📚 Documentation

- **ZenRows Docs** : https://docs.zenrows.com/
- **Scripts** : `scripts/debug-zenrows.ts` et `scripts/test-scraper.ts`
- **Scraper** : `src/modules/scraping/sites/leboncoin/scraper.ts`

---

**Dernière mise à jour** : Après configuration ZenRows HTML brut
**Status** : ✅ Opérationnel



