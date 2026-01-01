#!/bin/bash

# Script pour pousser vers GitHub
# Usage: ./push-to-github.sh [GITHUB_TOKEN]

set -e

cd "$(dirname "$0")"

echo "🚀 Préparation du push vers GitHub..."

# Vérifier l'état git
if ! git status &>/dev/null; then
    echo "❌ Erreur: Ce n'est pas un dépôt git"
    exit 1
fi

# Vérifier s'il y a des commits à pousser
COMMITS_AHEAD=$(git rev-list --count origin/main..HEAD 2>/dev/null || echo "0")

if [ "$COMMITS_AHEAD" = "0" ]; then
    echo "✅ Aucun commit à pousser. Tout est à jour!"
    exit 0
fi

echo "📦 $COMMITS_AHEAD commit(s) à pousser"

# Méthode 1: Token fourni en argument
if [ -n "$1" ]; then
    echo "🔑 Utilisation du token fourni..."
    git remote set-url origin "https://$1@github.com/HKSAS/MVP.git"
    git push origin main
    echo "✅ Push réussi!"
    exit 0
fi

# Méthode 2: Token dans variable d'environnement
if [ -n "$GITHUB_TOKEN" ]; then
    echo "🔑 Utilisation du token depuis GITHUB_TOKEN..."
    git remote set-url origin "https://$GITHUB_TOKEN@github.com/HKSAS/MVP.git"
    git push origin main
    echo "✅ Push réussi!"
    exit 0
fi

# Méthode 3: Essayer avec GitHub CLI
if command -v gh &> /dev/null; then
    echo "🔐 Tentative d'authentification avec GitHub CLI..."
    if gh auth status &>/dev/null; then
        echo "✅ GitHub CLI authentifié, push en cours..."
        git push origin main
        echo "✅ Push réussi!"
        exit 0
    else
        echo "⚠️  GitHub CLI n'est pas authentifié"
        echo "💡 Exécutez: gh auth login"
    fi
fi

# Méthode 4: Instructions pour créer un token
echo ""
echo "📝 Pour pousser vers GitHub, vous avez besoin d'un Personal Access Token:"
echo ""
echo "1. Allez sur: https://github.com/settings/tokens"
echo "2. Cliquez sur 'Generate new token (classic)'"
echo "3. Donnez-lui un nom (ex: 'MVP Push')"
echo "4. Cochez la permission 'repo'"
echo "5. Copiez le token généré"
echo ""
echo "Ensuite, exécutez une de ces commandes:"
echo "  ./push-to-github.sh VOTRE_TOKEN"
echo "  ou"
echo "  GITHUB_TOKEN=VOTRE_TOKEN ./push-to-github.sh"
echo "  ou"
echo "  gh auth login"
echo "  git push origin main"
echo ""
exit 1

