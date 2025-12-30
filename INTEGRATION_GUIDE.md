# 📘 Guide d'Intégration - Pages Recherche et Analyser

## 🎯 Objectif

Intégrer le système de quotas dans les pages `/recherche` et `/analyser` existantes.

---

## 🔧 Intégration dans `/app/recherche/page.tsx`

### Étape 1 : Imports

```tsx
import { useQuotaCheck } from '@/lib/auth/with-quota-check'
import { QuotaExceeded } from '@/components/paywall/QuotaExceeded'
```

### Étape 2 : Ajouter le hook

```tsx
export default function SearchPage() {
  const { checkAndTrack, showPaywall, setShowPaywall, PaywallModal } = useQuotaCheck('recherche')
  // ... reste du code
```

### Étape 3 : Modifier handleSearch

```tsx
const handleSearch = async (e: React.FormEvent) => {
  e.preventDefault()
  
  // Validation existante
  if (!brand.trim() || !model.trim()) {
    setError("Veuillez remplir au moins la marque et le modèle")
    return
  }
  
  // Vérifier et tracker le quota
  const result = await checkAndTrack(
    async () => {
      // Votre logique de recherche existante
      const params = new URLSearchParams({
        brand: brand.trim(),
        model: model.trim(),
      })
      
      if (budget.trim()) {
        params.set("max_price", budget.trim())
      }
      
      if (fuel && fuel !== "all") {
        params.set("fuelType", fuel)
      }
      
      router.push(`/resultats?${params.toString()}`)
      return { success: true }
    },
    {
      brand: brand.trim(),
      model: model.trim(),
      budget: budget.trim(),
      fuel: fuel
    }
  )
  
  if (!result.success) {
    // Le paywall s'affiche automatiquement
    setError(result.error || 'Quota épuisé')
    return
  }
  
  // Succès - la recherche a été effectuée
  setSearching(false)
}
```

### Étape 4 : Ajouter le modal

```tsx
return (
  <div>
    {/* Votre formulaire existant */}
    
    {/* Modal paywall */}
    <PaywallModal />
  </div>
)
```

---

## 🔧 Intégration dans `/app/analyser/page.tsx`

### Étape 1 : Imports

```tsx
import { useQuotaCheck } from '@/lib/auth/with-quota-check'
import { QuotaExceeded } from '@/components/paywall/QuotaExceeded'
```

### Étape 2 : Ajouter le hook

```tsx
export default function AnalyzePage() {
  const { checkAndTrack, showPaywall, setShowPaywall, PaywallModal } = useQuotaCheck('analyse')
  // ... reste du code
```

### Étape 3 : Modifier la fonction d'analyse

```tsx
const handleAnalyze = async () => {
  // Validation existante
  if (!url.trim() && !description.trim()) {
    setError("Veuillez fournir une URL ou une description")
    return
  }
  
  setAnalyzing(true)
  setError(null)
  
  // Vérifier et tracker le quota
  const result = await checkAndTrack(
    async () => {
      // Votre logique d'analyse existante
      const response = await fetch('/api/analyze-listing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: url.trim(),
          description: description.trim(),
          // ... autres champs
        })
      })
      
      if (!response.ok) {
        throw new Error('Erreur lors de l\'analyse')
      }
      
      const data = await response.json()
      setAnalysisResult(data)
      setHasAnalyzed(true)
      
      return data
    },
    {
      url: url.trim(),
      hasDescription: !!description.trim()
    }
  )
  
  if (!result.success) {
    // Le paywall s'affiche automatiquement
    setError(result.error || 'Quota épuisé')
    setAnalyzing(false)
    return
  }
  
  // Succès
  setAnalyzing(false)
}
```

### Étape 4 : Ajouter le modal

```tsx
return (
  <div>
    {/* Votre formulaire existant */}
    
    {/* Modal paywall */}
    <PaywallModal />
  </div>
)
```

---

## 🎨 Optionnel : Afficher les quotas dans la page

### Ajouter QuotaDisplay

```tsx
import { QuotaDisplay } from '@/components/dashboard/QuotaDisplay'

// Dans le JSX
<div className="mb-6">
  <QuotaDisplay />
</div>
```

---

## ✅ Checklist d'Intégration

- [ ] ✅ Imports ajoutés
- [ ] ✅ Hook `useQuotaCheck` utilisé
- [ ] ✅ Fonction de recherche/analyse modifiée
- [ ] ✅ Modal `PaywallModal` ajouté
- [ ] ✅ Gestion des erreurs de quota
- [ ] ✅ Test effectué (quota épuisé)
- [ ] ✅ Test effectué (quota disponible)

---

## 🧪 Tests

### Test 1 : Quota disponible

1. Connectez-vous avec un utilisateur ayant des quotas
2. Effectuez une recherche/analyse
3. ✅ L'action doit fonctionner
4. ✅ Le quota doit diminuer

### Test 2 : Quota épuisé

1. Épuisez les quotas (2 recherches + 2 analyses)
2. Tentez une nouvelle action
3. ✅ Le paywall doit s'afficher
4. ✅ L'action ne doit pas être exécutée

### Test 3 : Accès VIP

1. Activez VIP pour un utilisateur (via Retool)
2. Effectuez des actions
3. ✅ Aucune limite ne doit s'appliquer
4. ✅ Le badge VIP doit s'afficher

---

## 💡 Notes

- Le tracking est automatique après succès de l'action
- Le paywall s'affiche automatiquement si le quota est épuisé
- Les admins et VIP ont un accès illimité
- Les quotas se réinitialisent le 1er du mois

---

✨ **Intégration simple et non-intrusive !**

