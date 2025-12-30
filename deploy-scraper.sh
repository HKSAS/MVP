#!/bin/bash
# Script de déploiement du service Playwright sur le serveur Scaleway
# À exécuter depuis votre Mac (il copiera les fichiers via SCP)

set -e

SERVER_IP="51.158.67.43"
SERVER_USER="root"
SERVICE_DIR="/opt/autoia-scraper"

echo "🚀 Déploiement du service Playwright sur $SERVER_IP"

# 1. Générer une API key si elle n'existe pas
if [ -z "$SCRAPER_API_KEY" ]; then
  echo "📝 Génération d'une nouvelle API key..."
  SCRAPER_API_KEY=$(openssl rand -hex 32)
  echo "✅ API Key générée: $SCRAPER_API_KEY"
  echo ""
  echo "⚠️  IMPORTANT: Sauvegardez cette clé, vous en aurez besoin pour .env.local"
  echo ""
else
  echo "✅ Utilisation de l'API key existante"
fi

# 2. Copier server.js sur le serveur
echo "📤 Copie de server.js sur le serveur..."
scp server.js ${SERVER_USER}@${SERVER_IP}:${SERVICE_DIR}/server.js

# 3. Créer le fichier systemd avec l'API key
echo "📝 Création du fichier systemd..."
cat > /tmp/autoia-scraper.service << EOF
[Unit]
Description=Autoval IA Scraper Service
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=${SERVICE_DIR}
ExecStart=/usr/bin/node ${SERVICE_DIR}/server.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=8787
Environment=SCRAPER_API_KEY=${SCRAPER_API_KEY}
LimitNOFILE=65535

[Install]
WantedBy=multi-user.target
EOF

# 4. Copier le fichier systemd
echo "📤 Copie du fichier systemd..."
scp /tmp/autoia-scraper.service ${SERVER_USER}@${SERVER_IP}:/etc/systemd/system/autoia-scraper.service

# 5. Commandes à exécuter sur le serveur
echo ""
echo "🔧 Exécution des commandes sur le serveur..."
ssh ${SERVER_USER}@${SERVER_IP} << 'ENDSSH'
  # Recharger systemd
  systemctl daemon-reload
  
  # Redémarrer le service
  systemctl restart autoia-scraper
  
  # Activer au démarrage
  systemctl enable autoia-scraper
  
  # Vérifier le statut
  systemctl status autoia-scraper --no-pager
  
  # Afficher les dernières lignes des logs
  echo ""
  echo "📋 Dernières lignes des logs:"
  journalctl -u autoia-scraper -n 20 --no-pager
ENDSSH

echo ""
echo "✅ Déploiement terminé!"
echo ""
echo "📝 API Key à ajouter dans .env.local:"
echo "SCRAPER_API_KEY=${SCRAPER_API_KEY}"
echo ""
echo "🧪 Test du service:"
echo "curl -X POST http://${SERVER_IP}:8787/scrape/leboncoin \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -H 'x-api-key: ${SCRAPER_API_KEY}' \\"
echo "  -d '{\"brand\":\"AUDI\",\"model\":\"A3\",\"maxPrice\":25000}'"

