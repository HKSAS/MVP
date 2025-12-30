#!/bin/bash
# Script pour vérifier les logs du service

echo "📋 Logs du service Playwright (dernières 50 lignes):"
echo ""
ssh root@51.158.67.43 "journalctl -u autoia-scraper -n 50 --no-pager"

echo ""
echo "📋 Fichiers debug (si 0 résultats):"
ssh root@51.158.67.43 "ls -lh /tmp/lbc-debug-* 2>/dev/null | tail -5 || echo 'Aucun fichier debug trouvé'"

echo ""
echo "📊 Statut du service:"
ssh root@51.158.67.43 "systemctl status autoia-scraper --no-pager -l | head -15"

