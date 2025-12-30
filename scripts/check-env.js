#!/usr/bin/env node

/**
 * Script de diagnostic pour vérifier la configuration Supabase
 * Usage: node scripts/check-env.js
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Vérification de la configuration Supabase...\n');

// Vérifier si .env.local existe
const envPath = path.join(process.cwd(), '.env.local');
if (!fs.existsSync(envPath)) {
  console.error('❌ Fichier .env.local non trouvé!');
  console.log('📝 Créez un fichier .env.local à la racine du projet avec:');
  console.log('   NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co');
  console.log('   NEXT_PUBLIC_SUPABASE_ANON_KEY=votre-clé-anon');
  process.exit(1);
}

// Lire le fichier .env.local
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars = {};

envContent.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const [key, ...valueParts] = trimmed.split('=');
    if (key && valueParts.length > 0) {
      envVars[key.trim()] = valueParts.join('=').trim();
    }
  }
});

// Vérifier les variables requises
const requiredVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY'
];

let hasErrors = false;

requiredVars.forEach(varName => {
  const value = envVars[varName];
  if (!value) {
    console.error(`❌ ${varName} est manquant dans .env.local`);
    hasErrors = true;
  } else {
    console.log(`✅ ${varName} est défini`);
    
    // Validation spécifique
    if (varName === 'NEXT_PUBLIC_SUPABASE_URL') {
      try {
        const url = new URL(value);
        if (url.protocol !== 'https:') {
          console.warn(`⚠️  ${varName} devrait utiliser HTTPS: ${value}`);
        }
        console.log(`   URL: ${value}`);
      } catch (e) {
        console.error(`❌ ${varName} n'est pas une URL valide: ${value}`);
        hasErrors = true;
      }
    } else if (varName === 'NEXT_PUBLIC_SUPABASE_ANON_KEY') {
      if (value.length < 50) {
        console.warn(`⚠️  ${varName} semble trop court (${value.length} caractères)`);
      } else {
        console.log(`   Clé: ${value.substring(0, 20)}... (${value.length} caractères)`);
      }
    }
  }
});

console.log('\n📋 Résumé:');
if (hasErrors) {
  console.error('❌ Des erreurs ont été détectées. Corrigez-les avant de continuer.');
  process.exit(1);
} else {
  console.log('✅ Toutes les variables sont correctement configurées!');
  console.log('\n💡 Si vous rencontrez toujours des erreurs:');
  console.log('   1. Redémarrez le serveur: npm run dev');
  console.log('   2. Videz le cache du navigateur');
  console.log('   3. Vérifiez la console du navigateur (F12) pour les logs [DEV]');
}

