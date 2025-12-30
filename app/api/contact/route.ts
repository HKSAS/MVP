import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { contactSchema, type ContactInput } from '@/lib/validation'
import type { ContactResponse } from '@/lib/types'
import { createRouteLogger } from '@/lib/logger'
import { createErrorResponse, ValidationError, InternalServerError } from '@/lib/errors'
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { logContactRequest } from '@/lib/tracking'
import { getAuthenticatedUser } from '@/lib/auth'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseAnonKey)

/**
 * POST /api/contact
 * Enregistre un message de contact
 */
export async function POST(request: NextRequest) {
  const log = createRouteLogger('/api/contact')
  
  try {
    // ========================================================================
    // RATE LIMITING
    // ========================================================================
    try {
      checkRateLimit(request, RATE_LIMITS.CONTACT)
    } catch (rateLimitError) {
      log.warn('Rate limit dépassé')
      return createErrorResponse(rateLimitError)
    }

    // ========================================================================
    // VALIDATION
    // ========================================================================
    const body = await request.json()

    const validationResult = contactSchema.safeParse(body)

    if (!validationResult.success) {
      log.error('Validation échouée', { errors: validationResult.error.errors })
      throw new ValidationError('Données de contact invalides', validationResult.error.errors)
    }

    const input: ContactInput = validationResult.data

    // Récupérer l'utilisateur si authentifié (optionnel pour contact)
    const user = await getAuthenticatedUser(request)

    // Log de diagnostic tracking (AU DÉBUT de la requête)
    console.log('[Tracking] Route /api/contact appelée', {
      userId: user?.id || 'anonymous',
      name: input.name,
      email: input.email,
      timestamp: new Date().toISOString(),
    })

    log.info('Nouveau message de contact', {
      name: input.name,
      email: input.email,
      messageLength: input.message.length,
      userId: user?.id || null,
    })

    // ========================================================================
    // ENREGISTREMENT
    // ========================================================================
    const { data, error } = await supabase
      .from('contact_messages')
      .insert({
        name: input.name,
        email: input.email,
        message: input.message,
        status: 'pending',
      })
      .select()
      .single()

    if (error) {
      log.error('Erreur Supabase', { error: error.message })
      throw new InternalServerError('Erreur lors de l\'enregistrement du message', {
        dbError: error.message,
      })
    }

    log.info('Message enregistré', { messageId: data.id })

    // Logging automatique dans contact_requests (non-bloquant)
    console.log('[Tracking] Appel logContactRequest', {
      userId: user?.id || null,
      subject: input.name ? `Contact de ${input.name}` : 'Demande de contact',
      messageLength: input.message.length,
    })

    logContactRequest(
      {
        userId: user?.id || null,
        subject: input.name ? `Contact de ${input.name}` : 'Demande de contact',
        message: input.message,
      },
      { useServiceRole: true }
    ).catch(err => {
      log.warn('Erreur tracking contact (non-bloquant)', { error: err })
      console.error('[Tracking] Exception dans logContactRequest:', err)
    })

    const response: ContactResponse = {
      success: true,
      message: 'Votre message a été envoyé avec succès. Nous vous répondrons dans les plus brefs délais.',
    }

    return NextResponse.json(response)
  } catch (error) {
    log.error('Erreur serveur', {
      error: error instanceof Error ? error.message : String(error),
    })
    return createErrorResponse(error)
  }
}

