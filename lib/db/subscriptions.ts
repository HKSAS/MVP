/**
 * Helpers de base de données pour les abonnements
 * Version Supabase
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { PlanType } from '../stripe'

// Créer le client Supabase de manière lazy pour éviter les erreurs au démarrage
let supabaseAdminInstance: SupabaseClient | null = null

function getSupabaseAdmin(): SupabaseClient {
  if (!supabaseAdminInstance) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error(
        'NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set in environment variables. ' +
        'Please add them to your .env.local file.'
      )
    }

    supabaseAdminInstance = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  }
  return supabaseAdminInstance
}

export interface Subscription {
  id: string
  user_id: string
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  plan: PlanType | null
  subscription_status: 'active' | 'canceled' | 'past_due' | 'trialing' | 'incomplete' | 'incomplete_expired' | null
  current_period_end: string | null
  created_at: string
  updated_at: string
}

/**
 * Récupère un utilisateur par email
 * Note: Cette fonction utilise l'API admin de Supabase et peut être coûteuse
 * Pour un usage en production, considérez d'utiliser une table de profils avec index sur email
 */
export async function getUserByEmail(email: string) {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const { data, error } = await supabaseAdmin.auth.admin.listUsers()
    if (error) {
      console.error('Error fetching user by email:', error)
      return null
    }
    const user = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())
    return user || null
  } catch (error) {
    console.error('Exception in getUserByEmail:', error)
    return null
  }
}

/**
 * Récupère ou crée un profil utilisateur
 */
export async function getOrCreateProfile(userId: string, email?: string) {
  const supabaseAdmin = getSupabaseAdmin()
  // Vérifier si le profil existe
  const { data: existingProfile, error: fetchError } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (existingProfile && !fetchError) {
    return existingProfile
  }

  // Créer le profil s'il n'existe pas
  const { data: newProfile, error: createError } = await supabaseAdmin
    .from('profiles')
    .insert({
      id: userId,
      email: email || null,
    })
    .select()
    .single()

  if (createError) {
    console.error('Error creating profile:', createError)
    return null
  }

  return newProfile
}

/**
 * Récupère la subscription d'un utilisateur
 */
export async function getUserSubscription(userId: string): Promise<Subscription | null> {
  const supabaseAdmin = getSupabaseAdmin()
  const { data, error } = await supabaseAdmin
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      // Pas de subscription trouvée
      return null
    }
    console.error('Error fetching subscription:', error)
    return null
  }

  return data as Subscription
}

/**
 * Met à jour ou crée une subscription par customer_id Stripe
 */
export async function upsertSubscriptionByCustomerId(
  customerId: string,
  subscriptionData: {
    stripe_subscription_id?: string | null
    plan?: PlanType
    subscription_status?: Subscription['subscription_status']
    current_period_end?: string | null
  }
) {
  const supabaseAdmin = getSupabaseAdmin()
  // Trouver l'utilisateur par customer_id
  const { data: existingSub, error: fetchError } = await supabaseAdmin
    .from('subscriptions')
    .select('*')
    .eq('stripe_customer_id', customerId)
    .single()

  const updateData = {
    ...subscriptionData,
    updated_at: new Date().toISOString(),
  }

  if (existingSub) {
    // Mettre à jour l'existant
    const { data, error } = await supabaseAdmin
      .from('subscriptions')
      .update(updateData)
      .eq('id', existingSub.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating subscription:', error)
      return null
    }
    return data as Subscription
  } else {
    // Créer une nouvelle subscription (nécessite user_id, donc on ne peut pas le faire ici)
    // Cette fonction est principalement pour les mises à jour
    console.warn('Cannot create subscription without user_id')
    return null
  }
}

/**
 * Crée ou met à jour une subscription pour un utilisateur
 */
export async function upsertUserSubscription(
  userId: string,
  subscriptionData: {
    stripe_customer_id?: string | null
    stripe_subscription_id?: string | null
    plan?: PlanType
    subscription_status?: Subscription['subscription_status']
    current_period_end?: string | null
  }
): Promise<Subscription | null> {
  const supabaseAdmin = getSupabaseAdmin()
  const { data: existingSub } = await supabaseAdmin
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  const updateData: any = {
    updated_at: new Date().toISOString(),
  }

  // Ajouter seulement les champs fournis
  if (subscriptionData.stripe_customer_id !== undefined) {
    updateData.stripe_customer_id = subscriptionData.stripe_customer_id
  }
  if (subscriptionData.stripe_subscription_id !== undefined) {
    updateData.stripe_subscription_id = subscriptionData.stripe_subscription_id
  }
  if (subscriptionData.plan !== undefined) {
    updateData.plan = subscriptionData.plan
  }
  if (subscriptionData.subscription_status !== undefined) {
    updateData.subscription_status = subscriptionData.subscription_status
  }
  if (subscriptionData.current_period_end !== undefined) {
    updateData.current_period_end = subscriptionData.current_period_end
  }

  if (existingSub) {
    // Mettre à jour
    const { data, error } = await supabaseAdmin
      .from('subscriptions')
      .update(updateData)
      .eq('id', existingSub.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating subscription:', error)
      return null
    }
    return data as Subscription
  } else {
    // Créer
    const { data, error } = await supabaseAdmin
      .from('subscriptions')
      .insert({
        user_id: userId,
        ...updateData,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating subscription:', error)
      return null
    }
    return data as Subscription
  }
}

/**
 * Vérifie si un utilisateur a un abonnement actif
 */
export async function hasActiveSubscription(userId: string): Promise<boolean> {
  const subscription = await getUserSubscription(userId)
  if (!subscription) return false

  if (subscription.subscription_status === 'active') {
    // Vérifier aussi si current_period_end n'est pas passé
    if (subscription.current_period_end) {
      const periodEnd = new Date(subscription.current_period_end)
      return periodEnd > new Date()
    }
    return true
  }

  return false
}

