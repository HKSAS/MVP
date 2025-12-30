# PLAN D'INTÉGRATION DU DESIGN FIGMA

## 📋 ÉTAPE 1 - ANALYSE COMPLÈTE

### Pages du Design Figma (project (2)/pages)
✅ **Pages disponibles dans le design :**
1. `HomePage.tsx` → `/` (app/page.tsx)
2. `SearchPage.tsx` → `/recherche` (app/recherche/page.tsx)
3. `AnalyzePage.tsx` → `/analyser` (app/analyser/page.tsx)
4. `DashboardPage.tsx` → `/dashboard` (app/dashboard/page.tsx)
5. `MySearchesPage.tsx` → `/dashboard/recherches` (app/dashboard/recherches/page.tsx)
6. `AnalyzedAdsPage.tsx` → Nouvelle page à créer `/annonces-analysees`
7. `FavoritesPage.tsx` → Nouvelle page à créer `/favoris`
8. `ProfilePage.tsx` → Nouvelle page à créer `/profil`
9. `AboutPage.tsx` → Nouvelle page à créer `/a-propos`
10. `FAQPage.tsx` → `/faq` (app/faq/page.tsx)
11. `ContactPage.tsx` → `/contact` (app/contact/page.tsx)
12. `LoginPage.tsx` → `/login` (app/login/page.tsx)
13. `SignupPage.tsx` → `/signup` (app/signup/page.tsx)
14. `PricingPage.tsx` → `/tarif` (app/tarif/page.tsx)
15. `NotFoundPage.tsx` → `/not-found` (app/not-found.tsx)
16. `MentionsLegalesPage.tsx` → Nouvelle page à créer `/mentions-legales`
17. `CGUPage.tsx` → Nouvelle page à créer `/cgu`
18. `PolitiqueConfidentialitePage.tsx` → Nouvelle page à créer `/politique-confidentialite`

### Pages existantes SANS équivalent Figma (à adapter)
⚠️ **Pages à recréer avec le design system Figma :**
1. `app/dashboard/recherches/[id]/page.tsx` → Détail d'une recherche
2. `app/resultats/page.tsx` → Résultats de recherche (peut-être fusionner avec SearchPage)
3. `app/paiement/page.tsx` → Page de paiement
4. `app/paiement/success/page.tsx` → Page de succès paiement

### Composants Figma à intégrer
✅ **Nouveaux composants à créer :**
1. `components/TypewriterText.tsx` - Texte animé typewriter
2. `components/FloatingParticles.tsx` - Particules flottantes
3. `components/ScanLineEffect.tsx` - Effet de ligne de scan
4. `components/ScrollReveal.tsx` - Animation au scroll
5. `components/AnimatedGrid.tsx` - Grille animée
6. `components/Navigation.tsx` - Navigation (remplacer TopNav)
7. `components/figma/ImageWithFallback.tsx` - Image avec fallback

### Design System à extraire
🎨 **Variables CSS et tokens :**
- Palette de couleurs : `bg-[#0a0a0a]`, `bg-white/5`, `border-white/10`, `text-blue-400`
- Typographie : Police Inter, tailles de texte standardisées
- Espacements : System cohérent (p-4, p-6, p-8, gap-4, gap-6, gap-8)
- Composants UI : Button, Card, Input, Select, etc. (déjà dans components/ui/)

---

## 📋 ÉTAPE 2 - EXTRACTION DU DESIGN SYSTEM

### 2.1 Mettre à jour globals.css
- Intégrer les variables CSS du design Figma
- Ajouter les animations personnalisées
- Conserver les utilitaires Tailwind existants

### 2.2 Vérifier/Créer les composants UI manquants
- Vérifier que tous les composants de `project (2)/components/ui/` sont dans `components/ui/`
- S'assurer de la compatibilité Next.js

### 2.3 Installer les dépendances manquantes
- `framer-motion` (pour `motion/react` dans le design)
- Vérifier les autres dépendances

---

## 📋 ÉTAPE 3 - REMPLACEMENT DES PAGES EXISTANTES

### 3.1 Conversion React Router → Next.js
**Modifications systématiques :**
- `import { Link } from "react-router"` → `import Link from "next/link"`
- `import { useNavigate } from "react-router"` → `import { useRouter } from "next/navigation"`
- `navigate("/path")` → `router.push("/path")`
- `to="/path"` → `href="/path"`
- `useLocation()` → `usePathname()` (from next/navigation)

### 3.2 Conversion motion/react → framer-motion
**Modifications :**
- `import { motion } from 'motion/react'` → `import { motion } from 'framer-motion'`
- Les props et API sont compatibles

### 3.3 Pages prioritaires (ordre d'exécution)

#### PRIORITÉ 1 - Pages publiques principales
1. **HomePage** (`app/page.tsx`)
   - Remplacer complètement
   - Préserver : aucun état/complexité
   - Ajouter : TypewriterText, animations

2. **Navigation** (`components/layout/TopNav.tsx`)
   - Remplacer par `components/Navigation.tsx` (adapté Next.js)
   - Préserver : logique auth, UserStatusBadge, handleLogout
   - Convertir : React Router → Next.js

3. **LoginPage** (`app/login/page.tsx`)
   - Remplacer le design
   - Préserver : toute la logique Supabase, gestion d'erreurs, redirections
   - Convertir : React Router → Next.js

4. **SignupPage** (`app/signup/page.tsx`)
   - Remplacer le design
   - Préserver : toute la logique Supabase
   - Convertir : React Router → Next.js

5. **Footer** (`components/Footer.tsx`)
   - Mettre à jour avec le design Figma
   - Convertir : React Router → Next.js

#### PRIORITÉ 2 - Pages fonctionnelles critiques
6. **SearchPage** (`app/recherche/page.tsx`)
   - Remplacer le design
   - Préserver : TOUTE la logique (checkQuota, handleSearch, appels API, Calendly)
   - Convertir : React Router → Next.js

7. **AnalyzePage** (`app/analyser/page.tsx`)
   - Remplacer le design
   - Préserver : TOUTE la logique métier
   - Convertir : React Router → Next.js

8. **DashboardPage** (`app/dashboard/page.tsx`)
   - Remplacer le design
   - Préserver : TOUTE la logique (hooks, données, appels API)
   - Convertir : React Router → Next.js

#### PRIORITÉ 3 - Pages secondaires
9. **FAQPage** (`app/faq/page.tsx`)
10. **ContactPage** (`app/contact/page.tsx`)
11. **PricingPage** (`app/tarif/page.tsx`)
12. **NotFoundPage** (`app/not-found.tsx`)

---

## 📋 ÉTAPE 4 - CRÉATION DES PAGES MANQUANTES

### 4.1 Pages à créer avec le design system Figma

1. **MySearchesPage** → `app/mes-recherches/page.tsx`
   - Utiliser le design de `project (2)/pages/MySearchesPage.tsx`
   - Connecter aux hooks existants : `useSearchHistory`
   - Préserver la logique de récupération des recherches

2. **AnalyzedAdsPage** → `app/annonces-analysees/page.tsx`
   - Utiliser le design de `project (2)/pages/AnalyzedAdsPage.tsx`
   - Connecter aux hooks existants : données analysées
   - Préserver la logique de filtrage

3. **FavoritesPage** → `app/favoris/page.tsx`
   - Utiliser le design de `project (2)/pages/FavoritesPage.tsx`
   - Connecter au hook : `useFavorites`
   - Préserver toute la logique de favoris

4. **ProfilePage** → `app/profil/page.tsx`
   - Utiliser le design de `project (2)/pages/ProfilePage.tsx`
   - Connecter à l'auth et aux données utilisateur

5. **AboutPage** → `app/a-propos/page.tsx`
   - Utiliser le design de `project (2)/pages/AboutPage.tsx`

6. **MentionsLegalesPage** → `app/mentions-legales/page.tsx`
7. **CGUPage** → `app/cgu/page.tsx`
8. **PolitiqueConfidentialitePage** → `app/politique-confidentialite/page.tsx`

### 4.2 Pages à adapter (design system uniquement)

1. **Dashboard Recherches Detail** → `app/dashboard/recherches/[id]/page.tsx`
   - Adapter avec le design system Figma
   - Préserver toute la logique

2. **Paiement** → `app/paiement/page.tsx`
   - Créer avec le design system (style cohérent)
   - Préserver toute la logique Stripe

3. **Paiement Success** → `app/paiement/success/page.tsx`
   - Créer avec le design system
   - Préserver la logique de vérification

4. **Resultats** → `app/resultats/page.tsx` (si différent de recherche)
   - Évaluer si nécessaire ou fusionner avec SearchPage

---

## 📋 ÉTAPE 5 - CALIBRATION FONCTIONNELLE

### 5.1 Checklist par page
Pour chaque page remplacée/créée :

- [ ] Tous les formulaires soumettent aux bons endpoints
- [ ] Authentification fonctionne (Supabase)
- [ ] Navigation entre pages opérationnelle
- [ ] États React (useState, useEffect) préservés
- [ ] Hooks personnalisés connectés (useAuth, useQuota, useFavorites, etc.)
- [ ] Appels API fonctionnels
- [ ] Gestion d'erreurs préservée
- [ ] Loading states préservés
- [ ] Redirections fonctionnelles

### 5.2 Tests critiques

1. **Flux d'authentification**
   - Connexion → Dashboard
   - Déconnexion → Home
   - Protection des routes

2. **Flux de recherche**
   - Formulaire → API → Résultats
   - Quota check fonctionnel
   - Redirections paywall si nécessaire

3. **Flux de paiement**
   - Checkout Stripe
   - Webhook traitement
   - Success page

4. **Navigation**
   - Tous les liens fonctionnent
   - Navigation mobile responsive
   - Active states corrects

---

## 📋 ÉTAPE 6 - RESPONSIVE & POLISH

### 6.1 Responsive Design
- Vérifier mobile (< 768px)
- Vérifier tablet (768px - 1024px)
- Vérifier desktop (> 1024px)

### 6.2 Performance
- Lazy loading des images
- Code splitting automatique (Next.js)
- Optimisation des animations

### 6.3 Accessibilité (a11y)
- Attributs ARIA
- Navigation au clavier
- Contraste des couleurs

---

## 🔧 ACTIONS TECHNIQUES SPÉCIFIQUES

### A. Gestion des images Figma
Le design utilise `figma:asset/...` - À convertir :
- Trouver les images dans les imports Figma
- Les déplacer dans `/public/`
- Remplacer les références

### B. Variables CSS
Le design utilise des classes Tailwind avec opacités :
- `bg-[#0a0a0a]` (couleur de base)
- `bg-white/5` (white avec 5% opacity)
- `border-white/10` (border avec 10% opacity)
- À vérifier dans tailwind.config.cjs

### C. Animations
- Utiliser `framer-motion` (installer si absent)
- Convertir `motion/react` → `framer-motion`
- Préserver les animations d'entrée/sortie

### D. Layout Next.js
- S'assurer que le RootLayout est bien utilisé
- Navigation fixe avec `fixed top-0`
- Footer toujours en bas

---

## ⚠️ RISQUES ET PRÉCAUTIONS

### Risque 1 : Casser la logique métier
**Solution :** Toujours préserver les fonctions existantes, seulement changer le JSX/CSS

### Risque 2 : Oublier des appels API
**Solution :** Vérifier chaque page pour les `fetch`, `supabase`, etc.

### Risque 3 : Routes Next.js incorrectes
**Solution :** Tester chaque navigation après conversion

### Risque 4 : État React perdu
**Solution :** Comparer les `useState`, `useEffect` avant/après

---

## 📝 ORDRE D'EXÉCUTION RECOMMANDÉ

1. **Installation dépendances** (framer-motion si nécessaire)
2. **Mise à jour globals.css** (design tokens)
3. **Création composants réutilisables** (TypewriterText, etc.)
4. **Remplacement Navigation + Footer** (base de toutes les pages)
5. **HomePage** (page publique simple)
6. **Login/Signup** (test auth)
7. **SearchPage** (logique complexe)
8. **AnalyzePage** (logique complexe)
9. **Dashboard** (logique complexe)
10. **Pages secondaires** (FAQ, Contact, Tarif)
11. **Création pages manquantes**
12. **Tests finaux**
13. **Polish et responsive**

---

## ✅ VALIDATION FINALE

- [ ] Toutes les pages fonctionnent
- [ ] Design 100% cohérent
- [ ] Aucune logique métier cassée
- [ ] Responsive sur tous les devices
- [ ] Navigation fluide
- [ ] Pas de console errors
- [ ] Performance acceptable
- [ ] Accessibilité de base respectée

---

## 📅 ESTIMATION

**Temps estimé :** 4-6 heures de travail minutieux

**Complexité :** Moyenne à élevée (nombreux fichiers, logique métier à préserver)

---

**PRÊT À COMMENCER ?**
Ce plan garantit une intégration complète sans casser l'existant.

