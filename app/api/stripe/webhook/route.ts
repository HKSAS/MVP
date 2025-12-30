/**
 * Route webhook Stripe
 * POST /api/stripe/webhook
 * 
 * IMPORTANT: Pour les webhooks, il faut utiliser req.text() et non req.json()
 * pour préserver la signature Stripe
 */

import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getStripeClient, type PlanType } from '@/lib/stripe'
import {
  getUserByEmail,
  getOrCreateProfile,
  upsertUserSubscription,
  upsertSubscriptionByCustomerId,
} from '@/lib/db/subscriptions'
import { createRouteLogger } from '@/lib/logger'

const logger = createRouteLogger('/api/stripe/webhook')

function getWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) {
    throw new Error(
      'STRIPE_WEBHOOK_SECRET is not set in environment variables. ' +
      'Please add it to your .env.local file. ' +
      'See STRIPE_SETUP.md for instructions.'
    )
  }
  return secret
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    logger.error('Missing stripe-signature header')
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    )
  }

  let event: Stripe.Event

  try {
    const stripe = getStripeClient()
    const webhookSecret = getWebhookSecret()
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (error: any) {
    logger.error('Webhook signature verification failed', { error: error.message })
    return NextResponse.json(
      { error: `Webhook Error: ${error.message}` },
      { status: 400 }
    )
  }

  logger.info('Webhook event received', { type: event.type, id: event.id })

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session

        logger.info('Processing checkout.session.completed', {
          sessionId: session.id,
          customerId: session.customer,
          subscriptionId: session.subscription,
        })

        // Récupérer les métadonnées
        const plan = session.metadata?.plan as PlanType | undefined
        const userIdMetadata = session.metadata?.userId
        const customerEmail = session.customer_email || session.customer_details?.email

        if (!plan) {
          logger.error('Missing plan in session metadata', { sessionId: session.id })
          break
        }

        // Récupérer le customer et la subscription
        const customerId =
          typeof session.customer === 'string'
            ? session.customer
            : session.customer?.id || null

        let subscriptionId: string | null = null
        let subscription: Stripe.Subscription | null = null

        if (session.subscription) {
          subscriptionId =
            typeof session.subscription === 'string'
              ? session.subscription
              : session.subscription.id || null

        if (subscriptionId) {
          const stripe = getStripeClient()
          subscription = await stripe.subscriptions.retrieve(subscriptionId)
        }
        }

        // Trouver ou créer l'utilisateur
        let userId: string | null = userIdMetadata && userIdMetadata !== 'pending' ? userIdMetadata : null

        if (!userId && customerEmail) {
          const user = await getUserByEmail(customerEmail)
          if (user) {
            userId = user.id
          } else {
            logger.warn('User not found by email, cannot create subscription record', {
              email: customerEmail,
            })
            // On continue quand même pour mettre à jour le customer_id si on peut
          }
        }

        if (!userId) {
          logger.error('Cannot process subscription without userId', {
            sessionId: session.id,
            customerEmail,
          })
          break
        }

        // Créer ou mettre à jour le profil
        await getOrCreateProfile(userId, customerEmail || undefined)

        // Déterminer le statut de la subscription
        let subscriptionStatus: 'active' | 'canceled' | 'past_due' | 'trialing' | 'incomplete' | 'incomplete_expired' | null = null
        let currentPeriodEnd: string | null = null

        if (subscription) {
          subscriptionStatus = subscription.status as any
          currentPeriodEnd = subscription.current_period_end
            ? new Date(subscription.current_period_end * 1000).toISOString()
            : null
        } else if (session.payment_status === 'paid') {
          // Pour les paiements one-time (packs), pas de subscription mais le paiement est validé
          subscriptionStatus = 'active'
        }

        // Créer ou mettre à jour la subscription en base
        await upsertUserSubscription(userId, {
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          plan: plan,
          subscription_status: subscriptionStatus,
          current_period_end: currentPeriodEnd,
        })

        logger.info('Subscription created/updated successfully', {
          userId,
          plan,
          subscriptionStatus,
          customerId,
          subscriptionId,
        })
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription

        logger.info('Processing customer.subscription.updated', {
          subscriptionId: subscription.id,
          customerId: subscription.customer,
          status: subscription.status,
        })

        const customerId =
          typeof subscription.customer === 'string'
            ? subscription.customer
            : subscription.customer?.id

        if (!customerId) {
          logger.error('Missing customer in subscription', { subscriptionId: subscription.id })
          break
        }

        // Mettre à jour la subscription en base
        const currentPeriodEnd = subscription.current_period_end
          ? new Date(subscription.current_period_end * 1000).toISOString()
          : null

        const plan = subscription.metadata?.plan as PlanType | undefined

        await upsertSubscriptionByCustomerId(customerId, {
          stripe_subscription_id: subscription.id,
          plan: plan || undefined,
          subscription_status: subscription.status as any,
          current_period_end: currentPeriodEnd,
        })

        logger.info('Subscription updated successfully', {
          subscriptionId: subscription.id,
          status: subscription.status,
        })
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription

        logger.info('Processing customer.subscription.deleted', {
          subscriptionId: subscription.id,
          customerId: subscription.customer,
        })

        const customerId =
          typeof subscription.customer === 'string'
            ? subscription.customer
            : subscription.customer?.id

        if (!customerId) {
          logger.error('Missing customer in subscription', { subscriptionId: subscription.id })
          break
        }

        // Désactiver l'abonnement
        await upsertSubscriptionByCustomerId(customerId, {
          subscription_status: 'canceled',
          stripe_subscription_id: null,
        })

        logger.info('Subscription canceled successfully', {
          subscriptionId: subscription.id,
        })
        break
      }

      default:
        logger.debug('Unhandled event type', { type: event.type })
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    logger.error('Error processing webhook', { error: error.message, type: event.type })
    return NextResponse.json(
      { error: `Webhook handler failed: ${error.message}` },
      { status: 500 }
    )
  }
}

// Désactiver le body parser par défaut de Next.js pour les webhooks
export const runtime = 'nodejs'

