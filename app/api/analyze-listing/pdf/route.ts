import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth'
import { generatePDFReport, generateTextReport } from '@/lib/pdf-report'
import { createRouteLogger } from '@/lib/logger'
import { createErrorResponse, ValidationError } from '@/lib/errors'

export const dynamic = 'force-dynamic'

/**
 * Génère un rapport PDF depuis une analyse existante
 */
export async function POST(request: NextRequest) {
  const log = createRouteLogger('/api/analyze-listing/pdf')
  
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { analysisData, format = 'pdf' } = body

    if (!analysisData) {
      throw new ValidationError('Données d\'analyse manquantes')
    }

    log.info('Génération rapport', {
      userId: user.id,
      format,
    })

    let report: Buffer | string

    if (format === 'pdf') {
      report = await generatePDFReport(analysisData)
    } else {
      report = generateTextReport(analysisData)
    }

    // Si c'est un Buffer (PDF), retourner comme fichier
    if (Buffer.isBuffer(report)) {
      return new NextResponse(report, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="rapport-analyse-${Date.now()}.pdf"`,
        },
      })
    }

    // Sinon, retourner le texte/HTML
    return NextResponse.json({
      success: true,
      report,
      format,
    })
  } catch (error) {
    log.error('Erreur génération rapport', {
      error: error instanceof Error ? error.message : String(error),
    })
    return createErrorResponse(error)
  }
}

