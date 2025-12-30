/**
 * Configuration Stripe
 */

import Stripe from 'stripe'

// Créer le client Stripe seulement si la clé est définie
// Cela permet au code de compiler même sans configuration complète
function createStripeClient(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) {
    throw new Error(
      'STRIPE_SECRET_KEY is not set in environment variables. ' +
      'Please add it to your .env.local file. ' +
      'See STRIPE_SETUP.md for instructions.'
    )
  }
  return new Stripe(secretKey, {
    apiVersion: '2023-10-16',
    typescript: true,
  })
}

// Créer le client de manière lazy pour éviter les erreurs au démarrage
let stripeInstance: Stripe | null = null

/**
 * Récupère le client Stripe (créé au premier appel)
 * @throws Error si STRIPE_SECRET_KEY n'est pas défini
 */
export function getStripeClient(): Stripe {
  if (!stripeInstance) {
    stripeInstance = createStripeClient()
  }
  return stripeInstance
}

// IDs des prix Stripe (à configurer dans votre dashboard Stripe)
export const STRIPE_PRICE_IDS = {
  autoia_analyse: process.env.STRIPE_PRICE_ID_AUTOIA_ANALYSE || '', // Abonnement 39€/mois
  pack_essentiel: process.env.STRIPE_PRICE_ID_PACK_ESSENTIEL || '', // 299€ one-time
  pack_confort: process.env.STRIPE_PRICE_ID_PACK_CONFORT || '', // 599€ one-time
  pack_premium: process.env.STRIPE_PRICE_ID_PACK_PREMIUM || '', // 999€ one-time
}

// Types de plans
export type PlanType = 'autoia_analyse' | 'pack_essentiel' | 'pack_confort' | 'pack_premium'

export interface PlanInfo {
  type: PlanType
  name: string
  price: number
  isSubscription: boolean
  stripePriceId: string
}

export const PLAN_INFO: Record<PlanType, PlanInfo> = {
  autoia_analyse: {
    type: 'autoia_analyse',
    name: 'Autoval IA Analyse',
    price: 39,
    isSubscription: true,
    stripePriceId: STRIPE_PRICE_IDS.autoia_analyse,
  },
  pack_essentiel: {
    type: 'pack_essentiel',
    name: 'Pack Essentiel',
    price: 299,
    isSubscription: false,
    stripePriceId: STRIPE_PRICE_IDS.pack_essentiel,
  },
  pack_confort: {
    type: 'pack_confort',
    name: 'Pack Confort',
    price: 599,
    isSubscription: false,
    stripePriceId: STRIPE_PRICE_IDS.pack_confort,
  },
  pack_premium: {
    type: 'pack_premium',
    name: 'Pack Premium',
    price: 999,
    isSubscription: false,
    stripePriceId: STRIPE_PRICE_IDS.pack_premium,
  },
}

