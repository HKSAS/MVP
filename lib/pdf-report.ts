/**
 * 📄 GÉNÉRATION DE RAPPORTS PDF DÉTAILLÉS
 * Crée des rapports PDF professionnels pour les analyses d'annonces
 */

import type { AnalyzeListingResponse } from '@/lib/types'

interface PDFReportOptions {
  includeImages?: boolean
  includeCharts?: boolean
  language?: 'fr' | 'en'
}

/**
 * Génère un rapport PDF depuis les résultats d'analyse
 * Note: Cette fonction nécessite une bibliothèque PDF côté serveur
 * Pour Next.js, on peut utiliser pdfkit, jsPDF, ou puppeteer
 */
export async function generatePDFReport(
  analysisData: AnalyzeListingResponse['data'],
  options: PDFReportOptions = {}
): Promise<Buffer | string> {
  // Pour l'instant, on génère un HTML qui peut être converti en PDF
  // En production, utiliser pdfkit ou puppeteer pour générer directement le PDF
  
  const html = generateReportHTML(analysisData, options)
  
  // Si on a puppeteer disponible, convertir en PDF
  try {
    const puppeteer = await import('puppeteer').catch(() => null)
    if (puppeteer) {
      return await convertHTMLToPDF(html)
    }
  } catch (error) {
    console.warn('Puppeteer non disponible, retour HTML uniquement')
  }
  
  // Sinon, retourner le HTML (peut être converti côté client)
  return html
}

/**
 * Génère le HTML du rapport
 */
function generateReportHTML(
  analysisData: AnalyzeListingResponse['data'],
  options: PDFReportOptions
): string {
  const date = new Date().toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Rapport d'analyse - ${analysisData.extractedData?.title || 'Annonce'}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background: #fff;
      padding: 40px;
    }
    .header {
      border-bottom: 3px solid #2563eb;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header h1 {
      color: #1e40af;
      font-size: 28px;
      margin-bottom: 10px;
    }
    .header .date {
      color: #666;
      font-size: 14px;
    }
    .section {
      margin-bottom: 30px;
      page-break-inside: avoid;
    }
    .section-title {
      font-size: 20px;
      color: #1e40af;
      margin-bottom: 15px;
      padding-bottom: 10px;
      border-bottom: 2px solid #e5e7eb;
    }
    .score-box {
      display: inline-block;
      padding: 20px 30px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border-radius: 10px;
      margin: 20px 0;
    }
    .score-value {
      font-size: 48px;
      font-weight: bold;
      margin-bottom: 5px;
    }
    .score-label {
      font-size: 14px;
      opacity: 0.9;
    }
    .risk-badge {
      display: inline-block;
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 14px;
      font-weight: 600;
      margin: 10px 5px;
    }
    .risk-low { background: #10b981; color: white; }
    .risk-medium { background: #f59e0b; color: white; }
    .risk-high { background: #ef4444; color: white; }
    .risk-critical { background: #dc2626; color: white; }
    .red-flag {
      background: #fee2e2;
      border-left: 4px solid #ef4444;
      padding: 15px;
      margin: 10px 0;
      border-radius: 4px;
    }
    .red-flag.critical {
      background: #fecaca;
      border-left-color: #dc2626;
    }
    .red-flag-title {
      font-weight: 600;
      color: #991b1b;
      margin-bottom: 5px;
    }
    .red-flag-details {
      color: #7f1d1d;
      font-size: 14px;
    }
    .positive {
      background: #d1fae5;
      border-left: 4px solid #10b981;
      padding: 15px;
      margin: 10px 0;
      border-radius: 4px;
    }
    .positive-title {
      font-weight: 600;
      color: #065f46;
      margin-bottom: 5px;
    }
    .market-price {
      background: #eff6ff;
      border: 2px solid #3b82f6;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
    }
    .market-price-title {
      font-size: 18px;
      font-weight: 600;
      color: #1e40af;
      margin-bottom: 15px;
    }
    .price-comparison {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin: 15px 0;
    }
    .price-item {
      text-align: center;
    }
    .price-label {
      font-size: 12px;
      color: #666;
      margin-bottom: 5px;
    }
    .price-value {
      font-size: 24px;
      font-weight: bold;
      color: #1e40af;
    }
    .breakdown-item {
      display: flex;
      justify-content: space-between;
      padding: 12px;
      margin: 8px 0;
      background: #f9fafb;
      border-radius: 6px;
    }
    .breakdown-criterion {
      flex: 1;
    }
    .breakdown-points {
      font-weight: 600;
      font-size: 18px;
    }
    .breakdown-points.positive {
      color: #10b981;
    }
    .breakdown-points.negative {
      color: #ef4444;
    }
    .checklist-item {
      padding: 10px;
      margin: 5px 0;
      background: #f3f4f6;
      border-radius: 4px;
      display: flex;
      align-items: center;
    }
    .checklist-item::before {
      content: "☐";
      margin-right: 10px;
      font-size: 18px;
    }
    .footer {
      margin-top: 50px;
      padding-top: 20px;
      border-top: 2px solid #e5e7eb;
      text-align: center;
      color: #666;
      font-size: 12px;
    }
    @media print {
      body { padding: 20px; }
      .section { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>📊 Rapport d'analyse d'annonce</h1>
    <div class="date">Généré le ${date}</div>
  </div>

  <div class="section">
    <div class="section-title">Résumé de l'analyse</div>
    <div class="score-box">
      <div class="score-value">${analysisData.reliabilityScore}/100</div>
      <div class="score-label">Score de fiabilité</div>
    </div>
    <div style="margin-top: 20px;">
      <span class="risk-badge risk-${analysisData.riskLevel}">
        Risque: ${analysisData.riskLevel === 'low' ? 'Faible' : analysisData.riskLevel === 'medium' ? 'Moyen' : 'Élevé'}
      </span>
      ${analysisData.fraudDetection ? `
        <span class="risk-badge risk-${analysisData.fraudDetection.riskLevel}">
          Fraude: ${analysisData.fraudDetection.fraudScore}/100
        </span>
      ` : ''}
    </div>
    <div style="margin-top: 20px; font-size: 18px; font-weight: 600;">
      Recommandation: ${analysisData.recommendation}
    </div>
  </div>

  ${analysisData.redFlags && analysisData.redFlags.length > 0 ? `
    <div class="section">
      <div class="section-title">⚠️ Drapeaux rouges détectés</div>
      ${analysisData.redFlags.map(flag => `
        <div class="red-flag ${flag.severity === 'critical' ? 'critical' : ''}">
          <div class="red-flag-title">${flag.message}</div>
          <div class="red-flag-details">${flag.details}</div>
        </div>
      `).join('')}
    </div>
  ` : ''}

  ${analysisData.marketPrice ? `
    <div class="section">
      <div class="section-title">💰 Analyse de prix marché</div>
      <div class="market-price">
        <div class="market-price-title">Estimation prix marché</div>
        <div class="price-comparison">
          <div class="price-item">
            <div class="price-label">Minimum</div>
            <div class="price-value">${analysisData.marketPrice.min.toLocaleString('fr-FR')} €</div>
          </div>
          <div class="price-item">
            <div class="price-label">Maximum</div>
            <div class="price-value">${analysisData.marketPrice.max.toLocaleString('fr-FR')} €</div>
          </div>
        </div>
        ${analysisData.marketPrice.negotiationAdvice ? `
          <div style="margin-top: 15px; padding: 15px; background: white; border-radius: 6px;">
            <strong>Conseil de négociation:</strong> ${analysisData.marketPrice.negotiationAdvice}
          </div>
        ` : ''}
      </div>
    </div>
  ` : ''}

  ${analysisData.scoreBreakdown && analysisData.scoreBreakdown.length > 0 ? `
    <div class="section">
      <div class="section-title">📈 Détail du score</div>
      ${analysisData.scoreBreakdown.map(item => `
        <div class="breakdown-item">
          <div class="breakdown-criterion">
            <div style="font-weight: 600; margin-bottom: 5px;">${item.criterion}</div>
            <div style="font-size: 12px; color: #666;">${item.details}</div>
          </div>
          <div class="breakdown-points ${item.points >= 0 ? 'positive' : 'negative'}">
            ${item.points >= 0 ? '+' : ''}${item.points}
          </div>
        </div>
      `).join('')}
    </div>
  ` : ''}

  ${analysisData.positives && analysisData.positives.length > 0 ? `
    <div class="section">
      <div class="section-title">✅ Points positifs</div>
      ${analysisData.positives.map(point => `
        <div class="positive">
          <div class="positive-title">${point}</div>
        </div>
      `).join('')}
    </div>
  ` : ''}

  ${analysisData.watchouts && analysisData.watchouts.length > 0 ? `
    <div class="section">
      <div class="section-title">⚠️ Points à surveiller</div>
      ${analysisData.watchouts.map(watchout => `
        <div class="red-flag">
          <div class="red-flag-details">${watchout}</div>
        </div>
      `).join('')}
    </div>
  ` : ''}

  ${analysisData.buyerChecklist && analysisData.buyerChecklist.length > 0 ? `
    <div class="section">
      <div class="section-title">✅ Checklist avant achat</div>
      ${analysisData.buyerChecklist.map(item => `
        <div class="checklist-item">${item}</div>
      `).join('')}
    </div>
  ` : ''}

  ${analysisData.finalVerdict ? `
    <div class="section">
      <div class="section-title">🎯 Verdict final</div>
      <div style="padding: 20px; background: #f3f4f6; border-radius: 8px; font-size: 16px; line-height: 1.8;">
        ${analysisData.finalVerdict}
      </div>
    </div>
  ` : ''}

  <div class="footer">
    <p>Rapport généré par Autoval IA - Analyse intelligente de véhicules d'occasion</p>
    <p>Ce rapport est fourni à titre informatif et ne remplace pas une inspection professionnelle</p>
  </div>
</body>
</html>
  `.trim()
}

/**
 * Convertit le HTML en PDF avec Puppeteer
 */
async function convertHTMLToPDF(html: string): Promise<Buffer> {
  const puppeteer = await import('puppeteer')
  const browser = await puppeteer.default.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })
  
  try {
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'networkidle0' })
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm',
      },
    })
    return Buffer.from(pdf)
  } finally {
    await browser.close()
  }
}

/**
 * Génère un rapport simplifié en texte (fallback)
 */
export function generateTextReport(analysisData: AnalyzeListingResponse['data']): string {
  const lines: string[] = []
  
  lines.push('='.repeat(60))
  lines.push('RAPPORT D\'ANALYSE D\'ANNONCE')
  lines.push('='.repeat(60))
  lines.push('')
  lines.push(`Score de fiabilité: ${analysisData.reliabilityScore}/100`)
  lines.push(`Niveau de risque: ${analysisData.riskLevel}`)
  lines.push(`Recommandation: ${analysisData.recommendation}`)
  lines.push('')
  
  if (analysisData.redFlags && analysisData.redFlags.length > 0) {
    lines.push('Drapeaux rouges:')
    analysisData.redFlags.forEach(flag => {
      lines.push(`  - ${flag.message}: ${flag.details}`)
    })
    lines.push('')
  }
  
  if (analysisData.marketPrice) {
    lines.push('Prix marché:')
    lines.push(`  Min: ${analysisData.marketPrice.min.toLocaleString('fr-FR')} €`)
    lines.push(`  Max: ${analysisData.marketPrice.max.toLocaleString('fr-FR')} €`)
    lines.push('')
  }
  
  if (analysisData.finalVerdict) {
    lines.push('Verdict final:')
    lines.push(analysisData.finalVerdict)
    lines.push('')
  }
  
  lines.push('='.repeat(60))
  
  return lines.join('\n')
}

