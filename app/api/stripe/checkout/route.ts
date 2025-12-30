/**
 * Route API pour créer une session Stripe Checkout (abonnement)
 * POST /api/stripe/checkout
 */

export const runtime = "nodejs"

import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createRouteLogger } from '@/lib/logger'
import { getStripeSecretKey, getStripePriceId, NEXT_PUBLIC_SITE_URL } from '@/lib/env'

const log = createRouteLogger('stripe-checkout')

// Validation email
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export async function POST(req: NextRequest) {
  try {
    // Valider les variables d'environnement critiques
    try {
      getStripeSecretKey()
      if (!NEXT_PUBLIC_SITE_URL) {
        throw new Error('NEXT_PUBLIC_SITE_URL manquante')
      }
    } catch (envError: any) {
      log.error('[CHECKOUT] Configuration manquante', { error: envError.message })
      return NextResponse.json(
        { error: `Configuration incomplète: ${envError.message}. Contactez le support.` },
        { status: 500 }
      )
    }

    // Parser le body
    let body
    try {
      body = await req.json()
    } catch (parseError) {
      log.error('[CHECKOUT] Erreur parsing body', { error: parseError })
      return NextResponse.json(
        { error: 'Format de requête invalide' },
        { status: 400 }
      )
    }

    const { email, plan } = body

    // Validation email
    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email requis pour créer une session de paiement' },
        { status: 400 }
      )
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: 'Format d\'email invalide' },
        { status: 400 }
      )
    }

    // Validation plan
    if (!plan || typeof plan !== 'string') {
      return NextResponse.json(
        { error: 'Plan requis. Veuillez sélectionner un pack.' },
        { status: 400 }
      )
    }

    // Mapper le plan vers le Price ID (utilise le helper centralisé)
    const priceId = getStripePriceId(plan)
    
    if (!priceId) {
      log.error('[CHECKOUT] Price ID non trouvé', { plan })
      return NextResponse.json(
        { error: `Configuration Stripe incomplète: Price ID manquant pour le plan ${plan}. Vérifiez que STRIPE_PRICE_ID_${plan.replace('pack_', '')} est défini dans .env.local et redémarrez le serveur.` },
        { status: 500 }
      )
    }

    // Initialiser Stripe
    const stripeSecretKey = getStripeSecretKey()
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
      typescript: true,
    })

    // Créer la session Checkout
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL!
    
      log.info('[CHECKOUT] Création session', { email, plan, priceId })
    
    // Récupérer les détails du prix depuis Stripe pour déterminer son type
    let priceDetails: Stripe.Price
    try {
      priceDetails = await stripe.prices.retrieve(priceId)
    } catch (priceError: any) {
      log.error('[CHECKOUT] Erreur récupération prix', { error: priceError })
      return NextResponse.json(
        { error: `Erreur Stripe: Impossible de récupérer les détails du prix. Vérifiez que le Price ID est correct.` },
        { status: 400 }
      )
    }
    
    // Déterminer le mode selon le type de prix (recurring = subscription, one-time = payment)
    const isSubscription = priceDetails.type === 'recurring'
    
    log.info('[CHECKOUT] Type de prix', { type: priceDetails.type, mode: isSubscription ? 'subscription' : 'payment' })
    
    const session = await stripe.checkout.sessions.create({
      mode: isSubscription ? 'subscription' : 'payment',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      customer_email: email,
      allow_promotion_codes: true,
      success_url: `${siteUrl}/paiement/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/paiement?canceled=1`,
      metadata: {
        email: email,
        plan: plan,
      },
    })

    log.info('[CHECKOUT] Session créée', { sessionId: session.id, mode: isSubscription ? 'subscription' : 'payment' })

    if (!session.url) {
      log.error('[CHECKOUT] Session créée mais URL manquante')
      return NextResponse.json(
        { error: 'Erreur lors de la création de la session. Veuillez réessayer.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ url: session.url })
  } catch (error: any) {
    log.error('[CHECKOUT] Erreur inattendue', { error: error instanceof Error ? error.message : String(error) })
    
    // Messages d'erreur spécifiques
    if (error.type === 'StripeInvalidRequestError') {
      return NextResponse.json(
        { error: `Erreur Stripe: ${error.message}` },
        { status: 400 }
      )
    }
    
    if (error.type === 'StripeAPIError') {
      return NextResponse.json(
        { error: 'Erreur de communication avec Stripe. Veuillez réessayer dans quelques instants.' },
        { status: 500 }
      )
    }

    // Erreur générique
    return NextResponse.json(
      { error: error.message || 'Une erreur inattendue est survenue. Veuillez réessayer.' },
      { status: 500 }
    )
  }
}
