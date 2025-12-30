# 🚗 Autoval IA - Recherche Intelligente de Véhicules

Plateforme de recherche et d'analyse de véhicules d'occasion avec intelligence artificielle. Analysez des milliers d'annonces en quelques secondes et trouvez la voiture de vos rêves.

## ✨ Fonctionnalités

- 🔍 **Recherche multi-sites** : Recherchez sur plusieurs sites d'annonces en simultané (LeBonCoin, AutoScout24, LaCentrale, etc.)
- 🤖 **Analyse IA** : Analyse intelligente de chaque annonce avec scoring automatique
- 💰 **Gestion des prix** : Suivez l'évolution des prix et recevez des alertes
- ⭐ **Favoris** : Sauvegardez vos annonces favorites
- 📊 **Dashboard** : Historique complet de vos recherches et analyses
- 🔐 **Authentification sécurisée** : Système d'authentification complet avec Supabase
- 💳 **Paiements Stripe** : Abonnements et packs ponctuels

## 🚀 Démarrage rapide

### Prérequis

- **Node.js** 18+ ([télécharger](https://nodejs.org/))
- **npm** ou **yarn**
- Compte **Supabase** ([créer un compte](https://supabase.com))
- Clé API **OpenAI** ([obtenir une clé](https://platform.openai.com/api-keys))
- Clé API **ZenRows** ([inscription](https://www.zenrows.com/))
- Compte **Stripe** pour les paiements ([dashboard Stripe](https://dashboard.stripe.com))

### Installation

1. **Cloner le repository**

```bash
git clone https://github.com/HKSAS/MVP.git
cd MVP
```

2. **Installer les dépendances**

```bash
npm install
```

3. **Configurer les variables d'environnement**

Copiez le fichier d'exemple et configurez vos variables :

```bash
cp env.example .env.local
```

Éditez `.env.local` avec vos valeurs réelles :

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre-clé-anon
SUPABASE_SERVICE_ROLE_KEY=votre-clé-service

# OpenAI
OPENAI_API_KEY=sk-proj-votre-clé
OPENAI_MODEL=gpt-4o-mini

# Stripe
STRIPE_SECRET_KEY=sk_test_votre-clé
STRIPE_PRICE_ID_AUTOIA_ANALYSE=price_xxx
# ... autres produits Stripe

# ZenRows
ZENROWS_API_KEY=votre-clé-zenrows

# Cron
CRON_SECRET=votre-secret-securise
```

4. **Configurer Supabase**

Exécutez les migrations SQL dans l'ordre suivant :

1. `supabase-schema.sql` - Schéma de base
2. `supabase-quota-system.sql` - Système de quotas
3. `add-profile-columns.sql` - Colonnes de profil

Vous pouvez les exécuter depuis l'éditeur SQL de Supabase : https://app.supabase.com/project/[votre-projet]/sql

5. **Lancer en développement**

```bash
npm run dev
```

Le site sera accessible sur [http://localhost:3000](http://localhost:3000)

## 📦 Scripts disponibles

```bash
# Développement
npm run dev          # Lance le serveur de développement

# Build
npm run build        # Compile le projet pour la production
npm run start        # Lance le serveur de production (après build)

# Qualité de code
npm run lint         # Vérifie le code avec ESLint
```

## 🛠️ Technologies utilisées

- **Framework** : [Next.js 14](https://nextjs.org/) avec App Router
- **Base de données** : [Supabase](https://supabase.com) (PostgreSQL)
- **Authentification** : Supabase Auth
- **IA** : [OpenAI GPT-4](https://openai.com/)
- **Paiements** : [Stripe](https://stripe.com/)
- **Scraping** : [ZenRows](https://www.zenrows.com/)
- **UI** : [Tailwind CSS](https://tailwindcss.com/) + [Radix UI](https://www.radix-ui.com/)
- **Animations** : [Framer Motion](https://www.framer.com/motion/)
- **Langage** : TypeScript

## 📁 Structure du projet

```
MVP/
├── app/                    # Pages Next.js (App Router)
│   ├── api/               # API Routes
│   ├── dashboard/         # Pages du dashboard
│   └── ...
├── components/            # Composants React réutilisables
│   ├── ui/               # Composants UI (shadcn/ui)
│   └── ...
├── lib/                   # Bibliothèques et utilitaires
│   ├── supabase/         # Configuration Supabase
│   ├── scraping/         # Modules de scraping
│   └── ...
├── hooks/                 # Hooks React personnalisés
├── public/                # Assets statiques
└── scripts/               # Scripts utilitaires
```

## 🌐 Déploiement sur Vercel

### Étape 1 : Préparer le projet

Assurez-vous que votre code est sur GitHub et que le build fonctionne :

```bash
npm run build
```

### Étape 2 : Connecter à Vercel

1. Allez sur [vercel.com](https://vercel.com)
2. Connectez-vous avec votre compte GitHub
3. Cliquez sur **"New Project"**
4. Importez votre repository : `HKSAS/MVP`

### Étape 3 : Configurer les variables d'environnement

Dans les paramètres du projet Vercel, ajoutez toutes les variables depuis `.env.local` :

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `OPENAI_MODEL` (optionnel)
- `STRIPE_SECRET_KEY`
- `STRIPE_PRICE_ID_*` (tous les IDs de produits)
- `ZENROWS_API_KEY`
- `CRON_SECRET`

### Étape 4 : Déployer

Cliquez sur **"Deploy"** et attendez 2-5 minutes.

Votre site sera disponible sur `https://[nom-projet].vercel.app`

### 🔄 Déploiements automatiques

Chaque push sur la branche `main` déclenchera automatiquement un nouveau déploiement !

## 🔒 Sécurité

- ✅ Les clés API ne sont jamais exposées côté client
- ✅ Authentification sécurisée avec Supabase Auth
- ✅ Row Level Security (RLS) activé sur toutes les tables
- ✅ Validation des données avec Zod
- ✅ Protection CSRF intégrée
- ✅ Variables d'environnement sécurisées

## 📝 Migration SQL

Pour initialiser la base de données, exécutez ces fichiers SQL dans l'ordre :

1. `supabase-schema.sql` - Structure de base
2. `supabase-quota-system.sql` - Système de quotas et abonnements
3. `add-profile-columns.sql` - Colonnes utilisateur (nom, téléphone, adresse)

## 🤝 Contribution

Les contributions sont les bienvenues ! N'hésitez pas à ouvrir une issue ou une pull request.

## 📄 License

ISC

## 🆘 Support

Pour toute question ou problème :
- Ouvrez une [issue GitHub](https://github.com/HKSAS/MVP/issues)
- Consultez la [documentation Supabase](https://supabase.com/docs)

## 🎯 Roadmap

- [ ] Support de plus de sites d'annonces
- [ ] Notifications par email
- [ ] Application mobile
- [ ] API publique
- [ ] Intégration avec d'autres services de paiement

---

**Fait avec ❤️ par l'équipe Autoval IA**

