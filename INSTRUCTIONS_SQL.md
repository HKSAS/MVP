# 📋 Instructions pour exécuter les scripts SQL

## ⚠️ Erreur "use client" dans SQL

Si vous voyez l'erreur `ERREUR : 42601 : erreur de syntaxe à proximité de « use client »`, cela signifie que vous avez copié un fichier TypeScript au lieu d'un fichier SQL.

## ✅ Solution

### Étape 1 : Utiliser le fichier SQL propre

Utilisez le fichier **`supabase-quota-system-update-CLEAN.sql`** qui contient uniquement du SQL pur.

### Étape 2 : Exécuter dans Supabase

1. Ouvrez **Supabase Dashboard**
2. Allez dans **SQL Editor** (menu de gauche)
3. Cliquez sur **New Query**
4. **Copiez-collez UNIQUEMENT le contenu du fichier `supabase-quota-system-update-CLEAN.sql`**
5. Cliquez sur **Run** (ou Ctrl+Enter)

### Étape 3 : Vérifier l'exécution

Vous devriez voir :
```
Success. No rows returned
```

## 📝 Fichiers SQL à exécuter (dans cet ordre)

### 1. `supabase-quota-system-update-CLEAN.sql`
- Met à jour `can_perform_action()` pour bloquer
- Met à jour `track_usage()` pour bloquer

### 2. `supabase-check-and-init-quotas.sql`
- Initialise les quotas pour tous les utilisateurs
- Affiche le statut de tous les utilisateurs
- Teste les fonctions

## ⚠️ Important

- **Ne copiez PAS** les fichiers TypeScript (`.ts`, `.tsx`)
- **Copiez UNIQUEMENT** les fichiers SQL (`.sql`)
- Les fichiers SQL commencent par `--` (commentaires SQL)
- Les fichiers TypeScript commencent par `'use client'` ou `import`

## 🔍 Comment reconnaître un fichier SQL

Un fichier SQL valide :
- Commence par des commentaires `--`
- Contient `CREATE OR REPLACE FUNCTION`
- Contient `$$` pour délimiter le code PL/pgSQL
- Ne contient **PAS** `'use client'`, `import`, `export`

## ✅ Exemple de début de fichier SQL correct

```sql
-- ============================================================================
-- MISE À JOUR : Mode bloquant pour les quotas
-- ============================================================================

CREATE OR REPLACE FUNCTION public.can_perform_action(
    p_user_id UUID,
    p_action_type TEXT
)
RETURNS JSONB AS $$
```

## ❌ Exemple de fichier TypeScript (NE PAS COPIER)

```typescript
'use client'

import { useQuota } from '@/hooks/useQuota'
```

**Ne copiez JAMAIS ce type de contenu dans SQL Editor !**

