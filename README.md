# 🚗 MVP Conciergerie Automobile

Plateforme de recherche et d'analyse de véhicules d'occasion avec intelligence artificielle.

## 📋 Description

Application Next.js permettant de :
- 🔍 Rechercher des véhicules sur plusieurs sites (LeBonCoin, ParuVendu, AutoScout24, etc.)
- 🤖 Analyser les annonces avec l'IA pour détecter les arnaques
- ⭐ Sauvegarder des favoris
- 📊 Consulter l'historique de ses recherches et analyses

## 🛠️ Technologies

- **Frontend/Backend** : Next.js 14 (App Router)
- **Base de données** : Supabase (PostgreSQL)
- **Authentification** : Supabase Auth
- **Scraping** : ZenRows
- **IA** : OpenAI (GPT-4o-mini)
- **Validation** : Zod
- **TypeScript** : Strict mode

## 🚀 Installation

1. **Cloner le dépôt**
```bash
git clone https://github.com/HKSAS/MVP.git
cd MVP
```

2. **Installer les dépendances**
```bash
npm install
```

3. **Configurer les variables d'environnement**

Créer un fichier `.env.local` à la racine :

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# OpenAI
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-4o-mini

# ZenRows
ZENROWS_API_KEY=your_zenrows_api_key
```

4. **Initialiser la base de données**

Exécuter le script SQL dans Supabase :
```bash
# Copier le contenu de supabase-schema.sql dans l'éditeur SQL de Supabase
```

5. **Lancer le serveur de développement**
```bash
npm run dev
```

L'application sera accessible sur [http://localhost:3000](http://localhost:3000)

## 📚 Documentation API

Voir [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) pour la documentation complète des endpoints.

## 🏗️ Architecture

```
/app/api/          # Routes API Next.js
  ├── search/      # Recherche multi-sites avec scoring
  ├── analyze-listing/  # Analyse anti-arnaque IA
  ├── me/          # Endpoints utilisateur (searches, listings, favorites)
  ├── favorites/   # Gestion des favoris
  └── contact/     # Formulaire de contact

/lib/              # Utilitaires partagés
  ├── auth.ts      # Authentification Supabase
  ├── openai.ts    # Client OpenAI
  ├── zenrows.ts   # Client ZenRows
  ├── scoring.ts   # Système de scoring des annonces
  ├── types.ts     # Types TypeScript partagés
  └── validation.ts # Schémas Zod
```

## 🎯 Fonctionnalités principales

### Recherche intelligente
- Scraping parallèle sur plusieurs sites
- Scoring automatique des annonces (0-100)
- Tri par pertinence
- Déduplication automatique

### Analyse anti-arnaque
- Détection de risques (low/medium/high)
- Estimation du prix du marché
- Points positifs et alertes
- Recommandations personnalisées

### Dashboard utilisateur
- Historique des recherches
- Liste des annonces analysées
- Gestion des favoris

## 🔒 Sécurité

- Authentification via Supabase Auth
- Row Level Security (RLS) activé
- Validation des inputs avec Zod
- Filtrage par `user_id` sur toutes les routes protégées
- Protection contre les secrets dans Git

## 📝 License

Ce projet est privé.

## 👤 Auteur

HKSAS

---

**Note** : Ce projet est en cours de développement. Le frontend est en cours de design sur Figma.

