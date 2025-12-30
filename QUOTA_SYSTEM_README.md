# 🚀 Système Complet de Quotas et Gestion d'Accès - Autoval IA

## 📋 Vue d'ensemble

Système complet de gestion d'accès avec :
- ✅ Authentification obligatoire pour les routes protégées
- ✅ Système de quotas : 2 recherches + 2 analyses gratuites par mois
- ✅ Paywall automatique après épuisement des quotas
- ✅ Accès VIP illimité pour les admins
- ✅ Tracking en temps réel des utilisations
- ✅ Reset automatique mensuel des quotas

---

## 🗄️ ÉTAPE 1 : Configuration Base de Données

### Exécuter le script SQL

1. Ouvrez **Supabase Dashboard** → **SQL Editor**
2. Copiez-collez le contenu de `supabase-quota-system.sql`
3. Exécutez le script

### Vérification

```sql
-- Vérifier que les colonnes existent
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name IN (
    'quota_recherches_free', 
    'quota_analyses_free', 
    'recherches_utilisees', 
    'analyses_utilisees',
    'access_override',
    'plan_type'
);

-- Tester la fonction
SELECT public.check_user_access(id) as access_info
FROM profiles LIMIT 1;
```

---

## 📁 Structure des Fichiers Créés

```
lib/
├── auth/
│   ├── access-control.ts      # Vérification d'accès
│   ├── usage-tracker.ts       # Tracking des utilisations
│   ├── quota-checker.ts       # Helpers pour quotas
│   └── with-quota-check.tsx   # HOC pour protection

hooks/
├── useAuth.ts                 # Hook authentification
├── useQuota.ts                # Hook quotas
└── useAccess.ts               # Hook vérification accès

components/
├── dashboard/
│   └── QuotaDisplay.tsx       # Affichage des quotas
└── paywall/
    ├── QuotaExceeded.tsx      # Modal quota épuisé
    └── UpgradePrompt.tsx       # Invitation upgrade

app/api/
├── track-usage/route.ts       # API tracking
├── check-access/route.ts      # API vérification accès
└── cron/
    └── reset-quotas/route.ts  # Cron reset mensuel

middleware.ts                   # Protection des routes
```

---

## 🎯 Utilisation

### 1. Dans un composant React

#### Afficher les quotas

```tsx
'use client'

import { QuotaDisplay } from '@/components/dashboard/QuotaDisplay'

export default function DashboardPage() {
  return (
    <div>
      <QuotaDisplay />
      {/* Reste du contenu */}
    </div>
  )
}
```

#### Protéger une action

```tsx
'use client'

import { useQuotaCheck } from '@/lib/auth/with-quota-check'
import { QuotaExceeded } from '@/components/paywall/QuotaExceeded'

export default function RecherchePage() {
  const { checkAndTrack, showPaywall, setShowPaywall, PaywallModal } = useQuotaCheck('recherche')
  
  const handleSearch = async () => {
    const result = await checkAndTrack(
      async () => {
        // Votre logique de recherche
        const response = await fetch('/api/search', { method: 'POST' })
        return response.json()
      },
      { brand: 'Audi', model: 'A3' } // Données à tracker
    )
    
    if (!result.success) {
      // Le paywall s'affiche automatiquement
      return
    }
    
    // Succès, continuer...
  }
  
  return (
    <div>
      <button onClick={handleSearch}>Rechercher</button>
      <PaywallModal />
    </div>
  )
}
```

#### Utiliser les hooks

```tsx
'use client'

import { useQuota } from '@/hooks/useQuota'
import { useAccess } from '@/hooks/useAccess'

export default function MyComponent() {
  const { quotaRecherches, quotaAnalyses, isUnlimited, isAdmin } = useQuota()
  const { hasAccess, loading } = useAccess()
  
  if (loading) return <div>Chargement...</div>
  if (!hasAccess) return <div>Accès refusé</div>
  
  return (
    <div>
      {isUnlimited ? (
        <p>Accès illimité</p>
      ) : (
        <p>Recherches: {quotaRecherches} / Analyses: {quotaAnalyses}</p>
      )}
    </div>
  )
}
```

### 2. Dans une API Route

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { canPerformAction, trackUsage } from '@/lib/auth'

export async function POST(request: NextRequest) {
  // Vérifier l'authentification
  const user = await requireAuth(request)
  
  // Vérifier si l'action est possible
  const accessCheck = await canPerformAction('recherche', user.id)
  
  if (!accessCheck.canPerform) {
    return NextResponse.json(
      { error: accessCheck.message },
      { status: 403 }
    )
  }
  
  // Effectuer l'action
  // ...
  
  // Tracker l'utilisation
  await trackUsage('recherche', { /* données */ }, user.id)
  
  return NextResponse.json({ success: true })
}
```

---

## 🔐 Protection des Routes

Le middleware protège automatiquement :
- `/dashboard`
- `/recherche`
- `/analyser`
- `/favoris`

Les utilisateurs non authentifiés sont redirigés vers `/login`.

---

## ⚙️ Configuration Vercel Cron

### Créer `vercel.json`

```json
{
  "crons": [
    {
      "path": "/api/cron/reset-quotas",
      "schedule": "0 0 1 * *"
    }
  ]
}
```

### Variable d'environnement

Ajoutez dans Vercel :
```
CRON_SECRET=votre-secret-aleatoire
```

Le cron reset les quotas le 1er de chaque mois à minuit.

---

## 🎛️ Gestion VIP via Retool

### Query pour lister les utilisateurs

```sql
SELECT 
    p.id,
    p.email,
    p.role,
    p.plan_type,
    p.access_override,
    p.quota_recherches_free - p.recherches_utilisees as recherches_restantes,
    p.quota_analyses_free - p.analyses_utilisees as analyses_restantes,
    CASE
        WHEN p.access_override = TRUE THEN '⭐ VIP'
        WHEN p.role = 'admin' THEN '👑 Admin'
        WHEN p.subscription_status = 'active' THEN '✅ Premium'
        ELSE '⚪ Free'
    END AS status_badge
FROM profiles p
ORDER BY p.created_at DESC;
```

### Activer VIP pour un utilisateur

```sql
UPDATE profiles
SET 
    access_override = TRUE,
    plan_type = 'lifetime_free'
WHERE email = 'user@example.com';
```

---

## 🧪 Tests

### Test 1 : Quotas gratuits

```bash
# 1. Créer un utilisateur test
# 2. Effectuer 2 recherches
# 3. Vérifier que le compteur passe à 0
# 4. Tenter une 3ème recherche
# ✅ Le paywall doit s'afficher
```

### Test 2 : Accès VIP

```sql
-- Activer VIP
UPDATE profiles 
SET access_override = TRUE 
WHERE email = 'test@example.com';

-- Vérifier
SELECT public.check_user_access(id) 
FROM profiles 
WHERE email = 'test@example.com';
-- Devrait retourner has_access = true, reason = 'vip_access'
```

### Test 3 : Reset mensuel

```bash
# Appeler manuellement le cron
curl -X GET "https://your-domain.com/api/cron/reset-quotas" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

---

## 📊 Logique de Vérification

La fonction `check_user_access()` vérifie dans cet ordre :

1. **VIP Override** (`access_override = TRUE`)
   - Priorité absolue
   - Accès illimité

2. **Admin** (`role = 'admin'`)
   - Accès illimité

3. **Abonnement actif** (`subscription_status = 'active'`)
   - Accès illimité

4. **Trial actif** (`subscription_status = 'trialing'`)
   - Accès illimité pendant la période

5. **Quotas gratuits**
   - 2 recherches / mois
   - 2 analyses / mois
   - Reset le 1er du mois

---

## 🔄 Intégration avec Stripe

Le système s'intègre automatiquement avec votre table `subscriptions` existante :

- Si `subscription_status = 'active'` → Accès illimité
- Si `subscription_status = 'trialing'` → Accès illimité pendant la période
- Sinon → Quotas gratuits

---

## 🛠️ Dépannage

### Les quotas ne se mettent pas à jour

1. Vérifier que la fonction `track_usage()` est appelée
2. Vérifier les logs Supabase
3. Vérifier que l'utilisateur est bien authentifié

### Le paywall ne s'affiche pas

1. Vérifier que `useQuotaCheck` est utilisé
2. Vérifier que `QuotaExceeded` est rendu
3. Vérifier la console pour les erreurs

### Le reset mensuel ne fonctionne pas

1. Vérifier que `vercel.json` est configuré
2. Vérifier que `CRON_SECRET` est défini
3. Vérifier les logs Vercel

---

## 📝 Checklist de Déploiement

- [ ] ✅ Script SQL exécuté dans Supabase
- [ ] ✅ Fonctions SQL testées
- [ ] ✅ Middleware activé
- [ ] ✅ Composants intégrés dans le dashboard
- [ ] ✅ Routes API testées
- [ ] ✅ Vercel cron configuré
- [ ] ✅ Variables d'environnement définies
- [ ] ✅ Tests effectués (quotas, VIP, reset)

---

## 🎉 Résultat Final

Votre SaaS a maintenant :
- ✅ Authentification obligatoire
- ✅ Quotas gratuits (2+2)
- ✅ Paywall automatique
- ✅ Accès VIP pour admins
- ✅ Tracking complet
- ✅ Reset automatique mensuel
- ✅ Intégration Stripe

**Temps de dev : ~2-3 heures avec Cursor**

---

✨ **Système production-ready et prêt à l'emploi !**

