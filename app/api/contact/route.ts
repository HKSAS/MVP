import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { contactSchema, type ContactInput } from '@/lib/validation'
import type { ContactResponse } from '@/lib/types'
import { createRouteLogger } from '@/lib/logger'
import { createErrorResponse, ValidationError, InternalServerError } from '@/lib/errors'
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { logContactRequest } from '@/lib/tracking'
import { getAuthenticatedUser } from '@/lib/auth'
import { Resend } from 'resend'

export const dynamic = 'force-dynamic'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
const CONTACT_EMAIL = process.env.CONTACT_EMAIL || 'contact@autovalia.fr'

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
    // Construire l'objet d'insertion avec seulement les champs disponibles
    const insertData: any = {
      name: input.name,
      email: input.email,
      message: input.message,
      status: 'pending',
    }

    // Ajouter les champs optionnels s'ils existent dans la table
    if (input.phone) {
      insertData.phone = input.phone
    }
    if (input.subject) {
      insertData.subject = input.subject
    }

    log.info('Insertion message contact', {
      hasPhone: !!input.phone,
      hasSubject: !!input.subject,
      insertDataKeys: Object.keys(insertData),
    })

    const { data, error } = await supabase
      .from('contact_messages')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      log.error('Erreur Supabase', { 
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      })
      
      // Si les colonnes phone ou subject n'existent pas, réessayer sans
      if (error.message.includes('phone') || error.message.includes('subject') || error.code === '42703') {
        log.warn('Colonnes phone/subject manquantes, réessai sans ces champs')
        const fallbackData = {
          name: input.name,
          email: input.email,
          message: input.message,
          status: 'pending',
        }
        
        const { data: fallbackResult, error: fallbackError } = await supabase
          .from('contact_messages')
          .insert(fallbackData)
          .select()
          .single()
        
        if (fallbackError) {
          log.error('Erreur Supabase (fallback)', { error: fallbackError.message })
          throw new InternalServerError('Erreur lors de l\'enregistrement du message', {
            dbError: fallbackError.message,
          })
        }
        
        // Utiliser le résultat du fallback
        // @ts-ignore
        const data = fallbackResult
      } else {
        throw new InternalServerError('Erreur lors de l\'enregistrement du message', {
          dbError: error.message,
        })
      }
    }

    log.info('Message enregistré', { messageId: data.id })

    // Envoyer un email avec Resend si configuré
    if (resend) {
      try {
        const emailSubject = input.subject || `Nouveau message de contact de ${input.name}`
        const emailBody = `
Bonjour,

Vous avez reçu un nouveau message de contact depuis le site Autoval IA :

Nom: ${input.name}
Email: ${input.email}
${input.phone ? `Téléphone: ${input.phone}` : ''}
${input.subject ? `Sujet: ${input.subject}` : ''}

Message:
${input.message}

---
Ce message a été envoyé depuis le formulaire de contact du site.
        `.trim()

        await resend.emails.send({
          from: 'Autoval IA <noreply@autovalia.fr>',
          to: CONTACT_EMAIL,
          replyTo: input.email,
          subject: emailSubject,
          text: emailBody,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #3b82f6;">Nouveau message de contact</h2>
              <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p><strong>Nom:</strong> ${input.name}</p>
                <p><strong>Email:</strong> <a href="mailto:${input.email}">${input.email}</a></p>
                ${input.phone ? `<p><strong>Téléphone:</strong> <a href="tel:${input.phone}">${input.phone}</a></p>` : ''}
                ${input.subject ? `<p><strong>Sujet:</strong> ${input.subject}</p>` : ''}
              </div>
              <div style="margin: 20px 0;">
                <h3 style="color: #1f2937;">Message:</h3>
                <p style="white-space: pre-wrap; background: #ffffff; padding: 15px; border-left: 4px solid #3b82f6; border-radius: 4px;">${input.message}</p>
              </div>
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
              <p style="color: #6b7280; font-size: 12px;">Ce message a été envoyé depuis le formulaire de contact du site Autoval IA.</p>
            </div>
          `,
        })

        log.info('Email envoyé avec succès', { to: CONTACT_EMAIL })
      } catch (emailError: any) {
        log.warn('Erreur envoi email (non-bloquant)', { 
          error: emailError?.message || String(emailError),
          hasResend: !!resend,
        })
        // Ne pas bloquer la réponse si l'email échoue
      }
    } else {
      log.warn('Resend non configuré, email non envoyé', { 
        hasApiKey: !!process.env.RESEND_API_KEY,
      })
    }

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

