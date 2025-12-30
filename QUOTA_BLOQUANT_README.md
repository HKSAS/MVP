# 🔒 Système de Quotas Bloquant - Mode Paywall

## 📋 Vue d'ensemble

Le système **bloque** les actions quand le quota est atteint :
- ❌ Les recherches/analyses sont **bloquées** si quota épuisé
- ✅ Un **message clair** s'affiche pour encourager l'abonnement
- ✅ Une fois l'abonnement pris, l'accès est **automatiquement débloqué**

---

## 🔄 Changements apportés

### 1. Fonctions SQL modifiées

**Fichier** : `supabase-quota-system-update.sql`

- `can_perform_action()` : Retourne `can_perform: false` si quota épuisé
- `track_usage()` : Bloque l'action si quota épuisé (`success: false`)

### 2. Hook modifié

- `useQuotaCheck()` : Bloque l'action et affiche le modal `QuotaExceeded`

### 3. Composants

- `QuotaExceeded` : Modal qui s'affiche quand l'action est bloquée
- `QuotaAlert` : Alerte informative dans le dashboard

---

## 🚀 Installation

### Étape 1 : Exécuter le SQL de mise à jour

Dans Supabase SQL Editor :

```sql
-- Copier-coller le contenu de supabase-quota-system-update.sql
-- Exécuter le script
```

### Étape 2 : Vérifier

```sql
-- Tester avec un utilisateur ayant quota épuisé
SELECT public.can_perform_action(
    (SELECT id FROM profiles WHERE recherches_utilisees >= quota_recherches_free LIMIT 1),
    'recherche'
);
-- Devrait retourner can_perform: false, reason: 'quota_exceeded'
```

---

## 📖 Utilisation

### Dans une page de recherche

```tsx
'use client'

import { useQuotaCheck } from '@/lib/auth/with-quota-check'

export default function RecherchePage() {
  const { checkAndTrack, PaywallModal } = useQuotaCheck('recherche')
  
  const handleSearch = async () => {
    const result = await checkAndTrack(
      async () => {
        // Votre logique de recherche
        const response = await fetch('/api/search', { method: 'POST' })
        return response.json()
      },
      { brand: 'Audi', model: 'A3' }
    )
    
    // Si quota épuisé, result.success = false
    // Le modal s'affiche automatiquement
    if (!result.success) {
      // L'action est bloquée, le modal est déjà affiché
      return
    }
    
    // Succès, continuer...
  }
  
  return (
    <div>
      {/* Votre formulaire */}
      <button onClick={handleSearch}>Rechercher</button>
      
      {/* Modal qui s'affiche automatiquement si quota épuisé */}
      <PaywallModal />
    </div>
  )
}
```

---

## ✅ Comportement

### Quota disponible
- ✅ Action permise
- ✅ Compteur décrémenté
- ✅ Pas de modal

### Quota épuisé
- ❌ Action **bloquée** (ne s'exécute pas)
- ✅ Modal `QuotaExceeded` s'affiche automatiquement
- ✅ Message : "Vous avez utilisé toutes vos recherches/analyses gratuites. Pour continuer, passez à un abonnement Premium."
- ✅ Bouton "Voir les tarifs" vers `/tarif`

### Après abonnement
- ✅ `subscription_status = 'active'` dans `profiles`
- ✅ Accès illimité automatique
- ✅ Modal ne s'affiche plus
- ✅ Badge "Abonnement actif" affiché

---

## 🔄 Mise à jour automatique après abonnement

Le système vérifie automatiquement l'abonnement via :

1. **Webhook Stripe** : Met à jour `subscription_status` dans `profiles`
2. **Fonction `check_user_access()`** : Vérifie `subscription_status = 'active'`
3. **Hook `useQuota()`** : Rafraîchit automatiquement les quotas

**Pas besoin de recharger la page**, tout se met à jour automatiquement !

---

## 🧪 Test

### Test 1 : Quota épuisé

1. Épuisez vos quotas (2 recherches + 2 analyses)
2. Tentez une nouvelle action
3. ❌ L'action est **bloquée**
4. ✅ Le modal `QuotaExceeded` s'affiche
5. ✅ Message clair : "Pour continuer, passez à un abonnement Premium"

### Test 2 : Après abonnement

1. Prenez un abonnement via `/tarif`
2. Le webhook Stripe met à jour `subscription_status = 'active'`
3. ✅ Le modal ne s'affiche plus
4. ✅ Badge "Abonnement actif" s'affiche
5. ✅ Accès illimité - toutes les actions fonctionnent

---

## 📝 Notes importantes

- ⚠️ Les actions sont **bloquées** si quota épuisé
- ✅ Le modal s'affiche **automatiquement** pour encourager l'upgrade
- ✅ Message clair : "Pour continuer, passez à un abonnement Premium"
- ✅ Une fois l'abonnement pris, tout se débloque automatiquement

---

✨ **Système bloquant avec message clair pour encourager l'abonnement !**

