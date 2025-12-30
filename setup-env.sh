#!/bin/bash
# Script pour configurer .env.local avec SCRAPER_API_KEY

ENV_FILE=".env.local"

# Générer une API key si elle n'existe pas
if [ -z "$SCRAPER_API_KEY" ]; then
  echo "📝 Génération d'une nouvelle API key..."
  SCRAPER_API_KEY=$(openssl rand -hex 32)
  echo "✅ API Key générée: $SCRAPER_API_KEY"
else
  echo "✅ Utilisation de l'API key existante: $SCRAPER_API_KEY"
fi

# Vérifier si .env.local existe
if [ -f "$ENV_FILE" ]; then
  echo "📝 Mise à jour de $ENV_FILE..."
  
  # Vérifier si SCRAPER_SERVICE_URL existe déjà
  if grep -q "SCRAPER_SERVICE_URL" "$ENV_FILE"; then
    echo "   ✓ SCRAPER_SERVICE_URL déjà présent"
  else
    echo "" >> "$ENV_FILE"
    echo "# Scraper Service (Playwright distant)" >> "$ENV_FILE"
    echo "SCRAPER_SERVICE_URL=http://51.158.67.43:8787" >> "$ENV_FILE"
    echo "   ✓ SCRAPER_SERVICE_URL ajouté"
  fi
  
  # Vérifier si SCRAPER_API_KEY existe déjà
  if grep -q "SCRAPER_API_KEY" "$ENV_FILE"; then
    # Remplacer l'ancienne valeur
    if [[ "$OSTYPE" == "darwin"* ]]; then
      # macOS
      sed -i '' "s/^SCRAPER_API_KEY=.*/SCRAPER_API_KEY=${SCRAPER_API_KEY}/" "$ENV_FILE"
    else
      # Linux
      sed -i "s/^SCRAPER_API_KEY=.*/SCRAPER_API_KEY=${SCRAPER_API_KEY}/" "$ENV_FILE"
    fi
    echo "   ✓ SCRAPER_API_KEY mis à jour"
  else
    echo "" >> "$ENV_FILE"
    echo "SCRAPER_API_KEY=${SCRAPER_API_KEY}" >> "$ENV_FILE"
    echo "   ✓ SCRAPER_API_KEY ajouté"
  fi
else
  echo "📝 Création de $ENV_FILE..."
  cat > "$ENV_FILE" << EOF
# Scraper Service (Playwright distant)
SCRAPER_SERVICE_URL=http://51.158.67.43:8787
SCRAPER_API_KEY=${SCRAPER_API_KEY}
EOF
  echo "   ✓ Fichier créé"
fi

echo ""
echo "✅ Configuration terminée!"
echo ""
echo "📋 API Key à utiliser côté serveur (dans systemd):"
echo "   ${SCRAPER_API_KEY}"
echo ""
echo "⚠️  IMPORTANT: Utilisez la même API key dans:"
echo "   1. .env.local (Next.js)"
echo "   2. systemd service (serveur)"

