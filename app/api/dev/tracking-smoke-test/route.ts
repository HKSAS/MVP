/**
 * ⚠️ ENDPOINT DEV UNIQUEMENT - À SUPPRIMER EN PRODUCTION
 * 
 * GET /api/dev/tracking-smoke-test
 * 
 * Teste les 3 fonctions de tracking avec des valeurs factices
 * Utile pour valider rapidement que le système fonctionne
 * 
 * Protection : Requiert authentification (mais pas admin)
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { logAiSearch, logAiAnalysis, logContactRequest } from '@/lib/tracking'
import { createRouteLogger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

const log = createRouteLogger('/api/dev/tracking-smoke-test')

export async function GET(request: NextRequest) {
  // ⚠️ DÉSACTIVER EN PRODUCTION
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { success: false, error: 'Endpoint désactivé en production' },
      { status: 403 }
    )
  }

  try {
    // Vérifier authentification
    const user = await requireAuth(request)

    log.info('Smoke test tracking démarré', { userId: user.id })

    const results: {
      logAiSearch: { success: boolean; error?: string; insertedId?: string }
      logAiAnalysis: { success: boolean; error?: string; insertedId?: string }
      logContactRequest: { success: boolean; error?: string; insertedId?: string }
    } = {
      logAiSearch: { success: false },
      logAiAnalysis: { success: false },
      logContactRequest: { success: false },
    }

    // Test 1: logAiSearch
    try {
      await logAiSearch(
        {
          userId: user.id,
          queryText: '[TEST] Audi A3 40000€',
          filters: {
            brand: 'Audi',
            model: 'A3',
            max_price: 40000,
            test: true,
          },
        },
        { useServiceRole: true }
      )
      results.logAiSearch.success = true
      log.info('✅ logAiSearch test réussi')
    } catch (error) {
      results.logAiSearch.error = error instanceof Error ? error.message : String(error)
      log.error('❌ logAiSearch test échoué', { error: results.logAiSearch.error })
    }

    // Test 2: logAiAnalysis
    try {
      await logAiAnalysis(
        {
          userId: user.id,
          listingUrl: 'https://www.leboncoin.fr/ad/test-1234567890',
          listingSource: 'LeBonCoin',
          riskScore: 75,
          riskLevel: 'high',
        },
        { useServiceRole: true }
      )
      results.logAiAnalysis.success = true
      log.info('✅ logAiAnalysis test réussi')
    } catch (error) {
      results.logAiAnalysis.error = error instanceof Error ? error.message : String(error)
      log.error('❌ logAiAnalysis test échoué', { error: results.logAiAnalysis.error })
    }

    // Test 3: logContactRequest
    try {
      await logContactRequest(
        {
          userId: user.id,
          subject: '[TEST] Demande de contact test',
          message: 'Ceci est un message de test pour valider le tracking.',
        },
        { useServiceRole: true }
      )
      results.logContactRequest.success = true
      log.info('✅ logContactRequest test réussi')
    } catch (error) {
      results.logContactRequest.error = error instanceof Error ? error.message : String(error)
      log.error('❌ logContactRequest test échoué', { error: results.logContactRequest.error })
    }

    const allSuccess =
      results.logAiSearch.success &&
      results.logAiAnalysis.success &&
      results.logContactRequest.success

    return NextResponse.json({
      success: allSuccess,
      message: allSuccess
        ? 'Tous les tests de tracking ont réussi ✅'
        : 'Certains tests ont échoué ❌',
      userId: user.id,
      results,
      note: '⚠️ Vérifiez les logs serveur pour les IDs insérés. Supprimez cet endpoint en production.',
    })
  } catch (error) {
    log.error('Erreur smoke test', {
      error: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

