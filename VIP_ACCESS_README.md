# 🔧 Système d'Accès VIP - Documentation

## 📋 Vue d'ensemble

Ce système permet de gérer l'accès VIP (white-list) via Retool, **sans modifier l'infrastructure existante**. Il s'intègre avec votre système Stripe actuel.

## ✅ Ce qui a été ajouté

1. **Fichier SQL** : `supabase-vip-access.sql`
   - Ajoute les colonnes `plan_type` et `access_override` à la table `profiles`
   - Crée la fonction `check_user_has_access()` qui vérifie :
     - VIP override (priorité absolue)
     - Plan type dans profiles
     - Abonnements Stripe actifs

2. **Fichier Frontend** : `lib/checkAccess.ts`
   - Fonction `checkUserAccess()` pour vérifier l'accès
   - Compatible avec le système existant

3. **Hook React** : `hooks/useAccess.ts`
   - Hook `useAccess()` pour les composants React
   - Gère automatiquement le loading state

## 🚀 Installation

### Étape 1 : Exécuter le SQL dans Supabase

1. Ouvrez Supabase Dashboard → SQL Editor
2. Copiez-collez le contenu de `supabase-vip-access.sql`
3. Exécutez le script

### Étape 2 : Vérifier que tout fonctionne

```sql
-- Tester la fonction
SELECT 
    id,
    email,
    access_override,
    plan_type,
    public.check_user_has_access(id) as has_access
FROM public.profiles
LIMIT 5;
```

## 📖 Utilisation

### Dans un composant React (Client Component)

```tsx
'use client'

import { useAccess } from '@/hooks/useAccess'
import { useRouter } from 'next/navigation'

export default function ProtectedPage() {
  const { hasAccess, loading, reason, source } = useAccess()
  const router = useRouter()

  if (loading) {
    return <div>Chargement...</div>
  }

  if (!hasAccess) {
    return (
      <div>
        <h2>Abonnement requis</h2>
        <p>{reason}</p>
        <button onClick={() => router.push('/paiement')}>
          S'abonner
        </button>
      </div>
    )
  }

  return (
    <div>
      {/* Votre contenu protégé */}
      {source === 'vip' && <Badge>⭐ VIP</Badge>}
    </div>
  )
}
```

### Dans une API Route (Server Component)

```typescript
import { checkUserAccess } from '@/lib/checkAccess'
import { getAuthenticatedUser } from '@/lib/auth'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser(request)
  if (!user) {
    return new Response('Unauthorized', { status: 401 })
  }

  const access = await checkUserAccess(user.id)
  if (!access.hasAccess) {
    return new Response('Subscription required', { status: 403 })
  }

  // Votre logique protégée
  return Response.json({ data: '...' })
}
```

### Utilisation directe (sans hook)

```typescript
import { checkUserAccess } from '@/lib/checkAccess'

async function myFunction() {
  const result = await checkUserAccess()
  
  if (result.hasAccess) {
    console.log('Accès autorisé!', result.source)
    // source peut être: 'vip', 'plan_type', ou 'subscription'
  } else {
    console.log('Pas d\'accès:', result.reason)
  }
}
```

## 🎛️ Gestion via Retool

### Query pour lister les utilisateurs

```sql
SELECT 
    p.id,
    p.email,
    p.full_name,
    p.plan_type,
    p.access_override,
    
    CASE
        WHEN p.access_override = TRUE THEN '⭐ VIP'
        WHEN p.plan_type = 'premium' THEN '✅ Premium'
        WHEN p.plan_type = 'enterprise' THEN '👑 Enterprise'
        WHEN p.plan_type = 'lifetime_free' THEN '🎁 Lifetime'
        ELSE '⚪ Free'
    END AS status_badge,
    
    public.check_user_has_access(p.id) AS has_access

FROM public.profiles p
WHERE 1=1
    AND ({{ input_search.value }} IS NULL OR p.email ILIKE '%' || {{ input_search.value }} || '%')
ORDER BY p.created_at DESC;
```

### Query pour activer/désactiver VIP

```sql
UPDATE public.profiles
SET 
    access_override = {{ switch_vip_access.value }},
    plan_type = CASE 
        WHEN {{ switch_vip_access.value }} = TRUE THEN 'lifetime_free'
        ELSE plan_type
    END
WHERE id = {{ table_users.selectedRow.id }}
RETURNING *;
```

## 🔍 Logique de vérification

La fonction `check_user_has_access()` vérifie dans cet ordre :

1. **VIP Override** (`access_override = TRUE`)
   - Priorité absolue, contourne tout
   - Retourne `TRUE` immédiatement

2. **Plan Type** (`plan_type` dans profiles)
   - Si `plan_type IN ('premium', 'enterprise', 'lifetime_free')`
   - Retourne `TRUE`

3. **Abonnement Stripe** (système existant)
   - Vérifie la table `subscriptions`
   - `subscription_status = 'active'`
   - `current_period_end > NOW()` (si défini)
   - Retourne `TRUE` si actif

4. **Sinon** : Retourne `FALSE`

## 🧪 Tests

### Test 1 : Activer VIP pour un utilisateur

```sql
-- 1. Trouver un utilisateur
SELECT id, email FROM public.profiles LIMIT 1;

-- 2. Activer VIP
UPDATE public.profiles 
SET access_override = TRUE 
WHERE email = 'test@example.com';

-- 3. Vérifier
SELECT 
    email,
    access_override,
    public.check_user_has_access(id) as has_access
FROM public.profiles 
WHERE email = 'test@example.com';
-- Devrait retourner has_access = TRUE
```

### Test 2 : Désactiver VIP

```sql
UPDATE public.profiles 
SET access_override = FALSE 
WHERE email = 'test@example.com';

-- Vérifier (devrait retourner FALSE sauf si abonnement actif)
SELECT public.check_user_has_access(id) as has_access
FROM public.profiles 
WHERE email = 'test@example.com';
```

## 🔄 Compatibilité avec l'existant

✅ **Ce qui ne change pas** :
- Votre table `subscriptions` existante
- Votre système Stripe
- Vos autres tables et fonctions
- Votre système d'authentification

✅ **Ce qui s'ajoute** :
- 2 colonnes dans `profiles`
- 1 fonction SQL
- 2 fichiers TypeScript

## 🛠️ Rollback (si besoin)

Si vous voulez tout enlever :

```sql
-- Supprimer la fonction
DROP FUNCTION IF EXISTS public.check_user_has_access;

-- Supprimer les colonnes
ALTER TABLE public.profiles DROP COLUMN IF EXISTS access_override;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS plan_type;

-- Supprimer l'index
DROP INDEX IF EXISTS idx_profiles_access_override;
```

Puis supprimez les fichiers :
- `lib/checkAccess.ts`
- `hooks/useAccess.ts`

## 📝 Checklist d'intégration

- [ ] ✅ SQL exécuté dans Supabase
- [ ] ✅ Fonction `check_user_has_access` testée
- [ ] ✅ Fichiers TypeScript créés
- [ ] ✅ Testé dans un composant React
- [ ] ✅ Testé dans une API route
- [ ] ✅ Retool configuré (optionnel)
- [ ] ✅ Documentation lue

## 💡 Exemples d'utilisation

### Exemple 1 : Page protégée complète

Voir `app/dashboard/page.tsx` pour un exemple d'intégration.

### Exemple 2 : API protégée

```typescript
// app/api/premium-feature/route.ts
import { checkUserAccess } from '@/lib/checkAccess'
import { requireAuth } from '@/lib/auth'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const user = await requireAuth(request)
  const access = await checkUserAccess(user.id)
  
  if (!access.hasAccess) {
    return Response.json(
      { error: 'Subscription required' },
      { status: 403 }
    )
  }
  
  // Logique premium
  return Response.json({ data: 'Premium feature' })
}
```

## 🎯 Prochaines étapes

1. Exécutez le SQL dans Supabase
2. Testez avec un utilisateur
3. Intégrez dans vos pages protégées
4. Configurez Retool (optionnel)

---

✨ **Système non-destructif** : Aucune modification de l'existant, uniquement des ajouts !

