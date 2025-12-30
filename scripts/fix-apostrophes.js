#!/usr/bin/env node

/**
 * Script pour corriger les apostrophes non échappées dans les fichiers TSX
 * Remplace les apostrophes dans les chaînes JSX par &apos;
 */

const fs = require('fs');
const path = require('path');

const filesToFix = [
  'app/analyser/page.tsx',
  'app/contact/page.tsx',
  'app/dashboard/page.tsx',
  'app/dashboard/recherches/[id]/page.tsx',
  'app/faq/page.tsx',
  'app/login/page.tsx',
  'app/not-found.tsx',
  'app/page.tsx',
  'app/recherche/page.tsx',
  'app/resultats/page.tsx',
  'app/signup/page.tsx',
  'app/tarif/page.tsx',
  'components/Footer.tsx',
];

function fixApostrophes(filePath) {
  const fullPath = path.join(process.cwd(), filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  Fichier non trouvé: ${filePath}`);
    return;
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  const originalContent = content;

  // Remplacer les apostrophes dans les chaînes JSX (entre guillemets dans les attributs ou dans le contenu JSX)
  // Pattern: trouver les apostrophes dans les chaînes JSX (pas dans les commentaires, pas dans les strings JS)
  // On remplace les apostrophes simples par &apos; dans les chaînes JSX
  
  // Remplacer dans les attributs JSX: className="..." ou text="..."
  content = content.replace(/(<[^>]+(?:className|text|title|placeholder|aria-label|alt|value)="[^"]*)'([^"]*")/g, '$1&apos;$2');
  
  // Remplacer dans le contenu JSX entre balises: >...'...<
  // On évite de toucher aux strings JavaScript (entre backticks ou dans les expressions {})
  // On remplace seulement les apostrophes dans le texte JSX pur
  content = content.replace(/(>)([^<{`]*?)'([^<{`]*?)(<)/g, (match, p1, p2, p3, p4) => {
    // Vérifier qu'on n'est pas dans une expression JS
    if (p2.includes('{') || p3.includes('}')) {
      return match;
    }
    return p1 + p2 + '&apos;' + p3 + p4;
  });

  // Remplacer les apostrophes simples dans les chaînes JSX (approche plus simple)
  // On remplace les apostrophes qui sont dans du texte JSX (pas dans des expressions JS)
  // Pattern: texte entre > et < qui contient des apostrophes
  const lines = content.split('\n');
  const fixedLines = lines.map((line, index) => {
    // Si la ligne contient du JSX avec apostrophes
    if (line.includes("'") && (line.includes('<') || line.includes('>'))) {
      // Remplacer les apostrophes dans les chaînes de texte JSX
      // Mais pas dans les expressions { } ou les backticks
      let fixed = line;
      
      // Remplacer dans les attributs
      fixed = fixed.replace(/(="[^"]*)'([^"]*")/g, '$1&apos;$2');
      
      // Remplacer dans le contenu texte JSX (entre > et <)
      fixed = fixed.replace(/(>)([^<{`]*?)'([^<{`]*?)(<)/g, (match, p1, p2, p3, p4) => {
        // Éviter les expressions JS
        if (!p2.includes('{') && !p3.includes('}')) {
          return p1 + p2 + '&apos;' + p3 + p4;
        }
        return match;
      });
      
      return fixed;
    }
    return line;
  });

  content = fixedLines.join('\n');

  if (content !== originalContent) {
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`✅ Corrigé: ${filePath}`);
  } else {
    console.log(`⏭️  Aucun changement: ${filePath}`);
  }
}

// Exécuter pour tous les fichiers
console.log('🔧 Correction des apostrophes non échappées...\n');
filesToFix.forEach(fixApostrophes);
console.log('\n✨ Terminé!');

