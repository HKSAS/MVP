# 📦 Installation des Améliorations

## 🚀 Étapes d'Installation

### 1. Migration Base de Données

Exécutez le script SQL pour créer les tables d'alertes :

```bash
# Dans Supabase SQL Editor
# Exécutez le fichier: supabase-create-alerts-system.sql
```

Ou via psql :
```bash
psql -h [votre-host] -U postgres -d postgres -f supabase-create-alerts-system.sql
```

### 2. Dépendances Optionnelles

Pour la génération PDF native (optionnel) :
```bash
npm install puppeteer
```

**Note:** Puppeteer est optionnel - le système fonctionne sans (génère du HTML convertible en PDF).

### 3. Variables d'Environnement

Aucune nouvelle variable requise ! Les améliorations utilisent les variables existantes :
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`

### 4. Vérification

Testez les nouvelles fonctionnalités :

#### Détection de fraudes
```bash
# Testez via l'API d'analyse
POST /api/analyze-listing
# Vérifiez le champ "fraudDetection" dans la réponse
```

#### Recommandations personnalisées
```bash
# Après avoir fait quelques recherches et ajouté des favoris
GET /api/recommendations
```

#### Alertes
```bash
# Créer une alerte
POST /api/alerts
{
  "brand": "Renault",
  "model": "Clio",
  "maxPrice": 15000
}

# Récupérer les alertes
GET /api/alerts
```

#### Rapports PDF
```bash
# Générer un PDF depuis une analyse
POST /api/analyze-listing/pdf
{
  "analysisData": { ... },
  "format": "pdf"
}
```

## 📝 Notes Importantes

1. **Base de données:** Les tables `user_alerts` et `user_notifications` doivent être créées avant d'utiliser les alertes.

2. **Performance:** La vérification d'images peut être lente. Elle est exécutée en arrière-plan (non-bloquant).

3. **Alertes:** Les alertes sont vérifiées automatiquement lors de chaque recherche. Les notifications sont stockées dans `user_notifications`.

4. **Recommandations:** Nécessitent au moins quelques favoris ou recherches dans l'historique pour fonctionner.

## ✅ Checklist de Vérification

- [ ] Tables `user_alerts` et `user_notifications` créées
- [ ] API `/api/recommendations` fonctionne
- [ ] API `/api/alerts` fonctionne
- [ ] API `/api/analyze-listing/pdf` fonctionne
- [ ] Détection de fraudes visible dans les analyses
- [ ] Vérification d'images fonctionne (optionnel)

## 🐛 Dépannage

### Erreur "Table user_alerts does not exist"
→ Exécutez `supabase-create-alerts-system.sql`

### Erreur "Puppeteer not found"
→ Normal si vous n'avez pas installé puppeteer. Le système génère du HTML à la place.

### Alertes ne se déclenchent pas
→ Vérifiez que les alertes sont actives (`is_active = true`) et que les critères correspondent.

## 🎉 C'est prêt !

Toutes les fonctionnalités sont maintenant opérationnelles. Votre service est prêt pour la monétisation ! 🚀

