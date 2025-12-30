# 🎯 Système de Quotas Non-Bloquant - Mode Alerte

## 📋 Vue d'ensemble

Le système a été modifié pour être **non-bloquant** :
- ✅ Les actions sont **toujours permises** même si quota épuisé
- ✅ Une **alerte informative** s'affiche pour encourager l'upgrade
- ✅ Une fois l'abonnement pris, l'accès est **automatiquement débloqué**

---

## 🔄 Changements apportés

### 1. Fonctions SQL modifiées

**Fichier** : `supabase-quota-system-update.sql`

- `can_perform_action()` : Retourne toujours `can_perform: true` mais avec `show_alert: true` si quota épuisé
- `track_usage()` : Permet toujours l'action mais retourne un message d'alerte

### 2. Composants créés

- `QuotaAlert.tsx` : Composant d'alerte non-bloquant
- Modifié `QuotaDisplay.tsx` : Affiche l'alerte quand quotas épuisés

### 3. Hook modifié

- `useQuotaCheck()` : Mode non-bloquant, affiche l'alerte au lieu de bloquer

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
-- Tester la fonction
SELECT public.can_perform_action(
    (SELECT id FROM profiles LIMIT 1),
    'recherche'
);
-- Devrait retourner can_perform: true même si quota épuisé
```

---

## 📖 Utilisation

### Dans une page de recherche/analyse

```tsx
'use client'

import { useQuotaCheck } from '@/lib/auth/with-quota-check'
import { QuotaAlert } from '@/components/paywall/QuotaAlert'

export default function RecherchePage() {
  const { checkAndTrack, QuotaAlertComponent } = useQuotaCheck('recherche')
  
  const handleSearch = async () => {
    const result = await checkAndTrack(
      async () => {
        // Votre logique de recherche
        const response = await fetch('/api/search', { method: 'POST' })
        return response.json()
      },
      { brand: 'Audi', model: 'A3' }
    )
    
    // L'action est toujours exécutée, même si quota épuisé
    // L'alerte s'affiche automatiquement si nécessaire
  }
  
  return (
    <div>
      {/* Afficher l'alerte si quota épuisé */}
      <QuotaAlertComponent />
      
      {/* Votre formulaire */}
      <button onClick={handleSearch}>Rechercher</button>
    </div>
  )
}
```

---

## 🎨 Affichage des alertes

### Dans le Dashboard

L'alerte s'affiche automatiquement dans `QuotaDisplay` quand les quotas sont épuisés :

```tsx
import { QuotaDisplay } from '@/components/dashboard/QuotaDisplay'

// Dans votre dashboard
<QuotaDisplay />
// Affiche automatiquement l'alerte si quotas épuisés
```

### Alerte inline

```tsx
import { QuotaAlert } from '@/components/paywall/QuotaAlert'

<QuotaAlert 
  actionType="recherche" 
  variant="inline"
  onDismiss={() => {}}
/>
```

### Alerte banner

```tsx
<QuotaAlert 
  actionType="analyse" 
  variant="banner"
/>
```

---

## ✅ Comportement

### Quota disponible
- ✅ Action permise
- ✅ Compteur décrémenté
- ✅ Pas d'alerte

### Quota épuisé
- ✅ Action **toujours permise** (non-bloquant)
- ✅ Alerte affichée
- ✅ Message : "Pour poursuivre votre expérience, passez à un abonnement Premium"
- ✅ Bouton "Voir les tarifs" vers `/tarif`

### Après abonnement
- ✅ `subscription_status = 'active'` dans `profiles`
- ✅ Accès illimité automatique
- ✅ Alerte disparaît
- ✅ Badge "Abonnement actif" affiché

---

## 🔄 Mise à jour automatique après abonnement

Le système vérifie automatiquement l'abonnement via :

1. **Webhook Stripe** : Met à jour `subscription_status` dans `profiles`
2. **Fonction `check_user_access()`** : Vérifie `subscription_status = 'active'`
3. **Hook `useQuota()`** : Rafraîchit automatiquement les quotas

Pas besoin de recharger la page, tout se met à jour automatiquement !

---

## 🧪 Test

### Test 1 : Quota épuisé

1. Épuisez vos quotas (2 recherches + 2 analyses)
2. Tentez une nouvelle action
3. ✅ L'action fonctionne quand même
4. ✅ L'alerte s'affiche

### Test 2 : Après abonnement

1. Prenez un abonnement via `/tarif`
2. Le webhook Stripe met à jour `subscription_status = 'active'`
3. ✅ L'alerte disparaît automatiquement
4. ✅ Badge "Abonnement actif" s'affiche
5. ✅ Accès illimité

---

## 📝 Notes importantes

- ⚠️ Les actions sont **toujours permises** même si quota épuisé
- ✅ L'alerte est **purement informative** pour encourager l'upgrade
- ✅ Le tracking continue même si quota épuisé (pour statistiques)
- ✅ Une fois l'abonnement pris, tout se débloque automatiquement

---

✨ **Système non-bloquant et user-friendly !**

