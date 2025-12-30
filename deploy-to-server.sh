#!/bin/bash
# Script pour déployer server.js sur le serveur et configurer systemd
# Ce script vous guide étape par étape

set -e

SERVER_IP="51.158.67.43"
SERVER_USER="root"
SERVICE_DIR="/opt/autoia-scraper"

# Lire l'API key depuis .env.local
if [ -f ".env.local" ]; then
  API_KEY=$(grep "^SCRAPER_API_KEY=" .env.local | cut -d '=' -f2 | tr -d '"' | tr -d "'")
  if [ -z "$API_KEY" ]; then
    echo "❌ SCRAPER_API_KEY non trouvé dans .env.local"
    echo "   Exécutez d'abord: ./setup-env.sh"
    exit 1
  fi
else
  echo "❌ .env.local non trouvé"
  echo "   Exécutez d'abord: ./setup-env.sh"
  exit 1
fi

echo "🚀 Déploiement du service Playwright sur $SERVER_IP"
echo "📋 API Key: ${API_KEY:0:20}..."
echo ""

# 1. Copier server.js
echo "1️⃣  Copie de server.js sur le serveur..."
scp server.js ${SERVER_USER}@${SERVER_IP}:${SERVICE_DIR}/server.js
echo "   ✅ server.js copié"
echo ""

# 2. Créer le fichier systemd
echo "2️⃣  Création du fichier systemd..."
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
Environment=SCRAPER_API_KEY=${API_KEY}
LimitNOFILE=65535

[Install]
WantedBy=multi-user.target
EOF

# 3. Copier le fichier systemd
echo "3️⃣  Copie du fichier systemd sur le serveur..."
scp /tmp/autoia-scraper.service ${SERVER_USER}@${SERVER_IP}:/etc/systemd/system/autoia-scraper.service
echo "   ✅ Fichier systemd copié"
echo ""

# 4. Exécuter les commandes sur le serveur
echo "4️⃣  Configuration et démarrage du service..."
ssh ${SERVER_USER}@${SERVER_IP} << ENDSSH
  set -e
  
  echo "   → Rechargement de systemd..."
  systemctl daemon-reload
  
  echo "   → Redémarrage du service..."
  systemctl restart autoia-scraper
  
  echo "   → Activation au démarrage..."
  systemctl enable autoia-scraper
  
  echo "   → Vérification du statut..."
  systemctl status autoia-scraper --no-pager -l || true
  
  echo ""
  echo "   📋 Dernières lignes des logs:"
  journalctl -u autoia-scraper -n 20 --no-pager || true
ENDSSH

echo ""
echo "✅ Déploiement terminé!"
echo ""
echo "🧪 Pour tester le service:"
echo "   export SCRAPER_API_KEY=${API_KEY}"
echo "   ./test-scraper.sh"
echo ""

