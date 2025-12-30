#!/bin/bash
# Script de test du service Playwright

SERVER_IP="51.158.67.43"
API_KEY="${SCRAPER_API_KEY}"

if [ -z "$API_KEY" ]; then
  echo "❌ SCRAPER_API_KEY non défini"
  echo "   Définissez-le avec: export SCRAPER_API_KEY=your-key"
  exit 1
fi

echo "🧪 Test du service Playwright sur $SERVER_IP"
echo ""

# Test 1: Health check
echo "1️⃣  Health check..."
curl -s http://${SERVER_IP}:8787/health | jq .
echo ""

# Test 2: Scraping LeBonCoin
echo "2️⃣  Scraping LeBonCoin (AUDI A3)..."
curl -X POST http://${SERVER_IP}:8787/scrape/leboncoin \
  -H "Content-Type: application/json" \
  -H "x-api-key: ${API_KEY}" \
  -d '{"brand":"AUDI","model":"A3","maxPrice":25000}' \
  -s | jq '{
    ok: .ok,
    strategy: .strategy,
    itemsCount: (.items | length),
    ms: .ms,
    sampleItems: .items[0:3] | map({title, price, url})
  }'

echo ""
echo "✅ Test terminé"

