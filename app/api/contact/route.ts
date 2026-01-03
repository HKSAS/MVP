import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { contactSchema, vehicleRequestSchema, type ContactInput, type VehicleRequestInput } from '@/lib/validation'
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
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8584759319:AAFUSPrif9fXpjJCULuCF0YVsC4MFJqRQkk'
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || ''

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseAnonKey)

/**
 * Envoie un message vers Telegram
 */
async function sendTelegramMessage(message: string): Promise<void> {
  if (!TELEGRAM_BOT_TOKEN) {
    console.warn('[TELEGRAM] Token non configuré')
    return
  }

  try {
    // Essayer d'obtenir le chat_id
    let chatId = TELEGRAM_CHAT_ID
    
    // Si le chat_id n'est pas défini dans les variables d'environnement,
    // essayer de le récupérer depuis les mises à jour du bot
    if (!chatId) {
      console.log('[TELEGRAM] Chat ID non défini, tentative de récupération depuis getUpdates...')
      chatId = await getTelegramChatId()
    }
    
    if (!chatId) {
      console.warn('[TELEGRAM] Chat ID non disponible. Veuillez définir TELEGRAM_CHAT_ID dans les variables d\'environnement.')
      console.warn('[TELEGRAM] Pour obtenir votre chat_id:')
      console.warn('[TELEGRAM] 1. Envoyez un message à votre bot sur Telegram')
      console.warn('[TELEGRAM] 2. Visitez: https://api.telegram.org/bot' + TELEGRAM_BOT_TOKEN + '/getUpdates')
      console.warn('[TELEGRAM] 3. Cherchez "chat":{"id": dans la réponse et copiez le numéro')
      return
    }

    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(`Telegram API error: ${errorData.description || response.statusText}`)
    }

    console.log('[TELEGRAM] Message envoyé avec succès au chat_id:', chatId)
  } catch (error: any) {
    console.error('[TELEGRAM] Erreur envoi message:', error.message || error)
    // Ne pas throw pour ne pas bloquer la réponse si Telegram échoue
  }
}

/**
 * Récupère le chat_id depuis les mises à jour du bot (méthode alternative)
 * Note: Cette méthode nécessite que le bot ait reçu au moins un message
 * Pour obtenir votre chat_id manuellement:
 * 1. Envoyez un message à votre bot sur Telegram
 * 2. Visitez: https://api.telegram.org/bot<TOKEN>/getUpdates
 * 3. Cherchez "chat":{"id": dans la réponse
 */
async function getTelegramChatId(): Promise<string | null> {
  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates`
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    if (!response.ok) {
      console.error('[TELEGRAM] Erreur lors de la récupération des mises à jour:', response.statusText)
      return null
    }
    
    const data = await response.json()
    
    if (data.ok && data.result && data.result.length > 0) {
      // Prendre le dernier chat_id (le plus récent)
      const lastUpdate = data.result[data.result.length - 1]
      const chatId = lastUpdate.message?.chat?.id || lastUpdate.channel_post?.chat?.id || lastUpdate.edited_message?.chat?.id
      
      if (chatId) {
        console.log('[TELEGRAM] Chat ID récupéré depuis getUpdates:', chatId)
        return chatId.toString()
      }
    }
    
    console.warn('[TELEGRAM] Aucun chat_id trouvé dans les mises à jour. Le bot doit avoir reçu au moins un message.')
    return null
  } catch (error: any) {
    console.error('[TELEGRAM] Erreur récupération chat_id:', error.message || error)
    return null
  }
}

/**
 * Formate les données du formulaire de véhicule pour Telegram
 */
function formatVehicleRequestForTelegram(data: VehicleRequestInput): string {
  const formatValue = (value: any, defaultValue = 'Non renseigné') => {
    if (value === null || value === undefined || value === '') return defaultValue
    if (typeof value === 'boolean') return value ? 'Oui' : 'Non'
    if (Array.isArray(value)) return value.length > 0 ? value.join(', ') : defaultValue
    return String(value)
  }

  const requestTypeLabels: Record<string, string> = {
    achat: 'Achat de véhicule',
    recherche_personnalisee: 'Recherche personnalisée (sur mesure)',
  }

  const deadlineLabels: Record<string, string> = {
    immediat: 'Immédiat',
    moins_1_mois: 'Moins de 1 mois',
    '1_3_mois': '1 à 3 mois',
    pas_presse: 'Pas pressé',
  }

  const fuelTypeLabels: Record<string, string> = {
    essence: 'Essence',
    diesel: 'Diesel',
    hybride: 'Hybride',
    electrique: 'Électrique',
  }

  const transmissionLabels: Record<string, string> = {
    manuelle: 'Manuelle',
    automatique: 'Automatique',
    indifferent: 'Indifférent',
  }

  const countryLabels: Record<string, string> = {
    france: 'France',
    allemagne: 'Allemagne',
    belgique: 'Belgique',
    autre: data.otherCountry || 'Autre',
  }

  const criteriaLabels: Record<string, string> = {
    faible_kilometrage: 'Faible kilométrage',
    historique_clair: 'Historique clair / non accidenté',
    entretien_complet: 'Entretien complet',
    premiere_main: 'Première main',
    vehicule_francais: 'Véhicule français',
    importe_accepte: 'Véhicule importé accepté',
  }

  let message = `🚗 <b>NOUVELLE DEMANDE DE VÉHICULE</b>\n\n`
  
  message += `📋 <b>1. Informations de contact</b>\n`
  message += `Nom & Prénom: ${data.name}\n`
  message += `Email: ${data.email}\n`
  message += `Téléphone: ${formatValue(data.phone)}\n\n`
  
  message += `🔍 <b>2. Type de recherche</b>\n`
  message += `Demande: ${requestTypeLabels[data.requestType] || data.requestType}\n`
  message += `Délai souhaité: ${deadlineLabels[data.deadline] || data.deadline}\n\n`
  
  message += `🚙 <b>3. Véhicule recherché</b>\n`
  message += `Marque: ${formatValue(data.brand)}\n`
  message += `Modèle: ${formatValue(data.model)}\n`
  message += `Année min: ${formatValue(data.yearMin)}\n`
  message += `Année max: ${formatValue(data.yearMax)}\n`
  message += `Motorisation: ${data.fuelType ? fuelTypeLabels[data.fuelType] : 'Non renseigné'}\n`
  message += `Boîte de vitesse: ${data.transmission ? transmissionLabels[data.transmission] : 'Non renseigné'}\n`
  message += `Kilométrage max: ${formatValue(data.maxMileage, 'Non renseigné')} km\n\n`
  
  message += `💰 <b>4. Budget</b>\n`
  message += `Budget maximum: ${formatValue(data.maxBudget, 'Non renseigné')} €\n`
  message += `Budget flexible: ${formatValue(data.flexibleBudget)}\n\n`
  
  if (data.importantCriteria && data.importantCriteria.length > 0) {
    message += `⭐ <b>5. Critères importants</b>\n`
    message += `${data.importantCriteria.map(c => criteriaLabels[c] || c).join(', ')}\n\n`
  }
  
  if (data.requiredOptions || data.appreciatedOptions) {
    message += `⚙️ <b>6. Options souhaitées</b>\n`
    if (data.requiredOptions) {
      message += `Indispensables: ${data.requiredOptions}\n`
    }
    if (data.appreciatedOptions) {
      message += `Appréciées: ${data.appreciatedOptions}\n`
    }
    message += `\n`
  }
  
  message += `🌍 <b>7. Pays de recherche</b>\n`
  message += `${data.searchCountry ? countryLabels[data.searchCountry] : 'Non renseigné'}\n\n`
  
  if (data.comments) {
    message += `💬 <b>8. Commentaires complémentaires</b>\n`
    message += `${data.comments}\n\n`
  }
  
  message += `✅ <b>9. Validation</b>\n`
  message += `Informations confirmées: Oui\n`
  message += `Accepte d'être recontacté: ${formatValue(data.acceptContact)}\n\n`
  
  message += `━━━━━━━━━━━━━━━━━━━━\n`
  message += `📅 Date: ${new Date().toLocaleString('fr-FR')}\n`
  
  return message
}

/**
 * POST /api/contact
 * Enregistre un message de contact ou une demande de véhicule
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

    // Détecter le type de formulaire (ancien contact ou nouveau formulaire de véhicule)
    const isVehicleRequest = body.requestType !== undefined || body.deadline !== undefined

    let input: ContactInput | VehicleRequestInput
    let isVehicleForm = false

    if (isVehicleRequest) {
      // Nouveau formulaire de demande de véhicule
      const validationResult = vehicleRequestSchema.safeParse(body)
      if (!validationResult.success) {
        log.error('Validation échouée (véhicule)', { errors: validationResult.error.errors })
        throw new ValidationError('Données de demande de véhicule invalides', validationResult.error.errors)
      }
      input = validationResult.data
      isVehicleForm = true
    } else {
      // Ancien formulaire de contact
      const validationResult = contactSchema.safeParse(body)
      if (!validationResult.success) {
        log.error('Validation échouée (contact)', { errors: validationResult.error.errors })
        throw new ValidationError('Données de contact invalides', validationResult.error.errors)
      }
      input = validationResult.data
    }

    // Récupérer l'utilisateur si authentifié (optionnel pour contact)
    const user = await getAuthenticatedUser(request)

    // Log de diagnostic tracking (AU DÉBUT de la requête)
    console.log('[Tracking] Route /api/contact appelée', {
      userId: user?.id || 'anonymous',
      name: input.name,
      email: input.email,
      isVehicleForm,
      timestamp: new Date().toISOString(),
    })

    if (isVehicleForm) {
      log.info('Nouvelle demande de véhicule', {
        name: input.name,
        email: input.email,
        requestType: (input as VehicleRequestInput).requestType,
        userId: user?.id || null,
      })
    } else {
      log.info('Nouveau message de contact', {
        name: input.name,
        email: input.email,
        messageLength: (input as ContactInput).message.length,
        userId: user?.id || null,
      })
    }

    // ========================================================================
    // ENREGISTREMENT
    // ========================================================================
    // Construire l'objet d'insertion avec seulement les champs disponibles
    let insertData: any

    if (isVehicleForm) {
      // Pour le formulaire de véhicule, on stocke les données en JSON dans le champ message
      const vehicleData = input as VehicleRequestInput
      insertData = {
        name: vehicleData.name,
        email: vehicleData.email,
        phone: vehicleData.phone || null,
        subject: `Demande de véhicule - ${vehicleData.requestType === 'achat' ? 'Achat' : 'Recherche personnalisée'}`,
        message: JSON.stringify(vehicleData), // Stocker toutes les données en JSON
        status: 'pending',
      }
    } else {
      // Ancien formulaire de contact
      const contactData = input as ContactInput
      insertData = {
        name: contactData.name,
        email: contactData.email,
        message: contactData.message,
        status: 'pending',
      }

      // Ajouter les champs optionnels s'ils existent dans la table
      if (contactData.phone) {
        insertData.phone = contactData.phone
      }
      if (contactData.subject) {
        insertData.subject = contactData.subject
      }
    }

    log.info('Insertion message contact', {
      hasPhone: !!input.phone,
      hasSubject: !!input.subject,
      insertDataKeys: Object.keys(insertData),
    })

    let data: any
    let error: any

    // Essayer d'insérer avec tous les champs
    console.log('[CONTACT] Tentative insertion avec données:', {
      hasPhone: !!insertData.phone,
      hasSubject: !!insertData.subject,
      insertKeys: Object.keys(insertData),
    })

    const insertResult = await supabase
      .from('contact_messages')
      .insert(insertData)
      .select()
      .single()

    data = insertResult.data
    error = insertResult.error

    // Si erreur due à des colonnes manquantes, réessayer sans phone et subject
    if (error && (error.message?.includes('phone') || error.message?.includes('subject') || error.code === '42703')) {
      log.warn('Colonnes phone/subject manquantes, réessai sans ces champs', {
        error: error.message,
        code: error.code,
      })
      console.warn('[CONTACT] Colonnes manquantes, fallback sans phone/subject:', error.message)
      
      const fallbackData = {
        name: input.name,
        email: input.email,
        message: input.message,
        status: 'pending',
      }
      
      const fallbackResult = await supabase
        .from('contact_messages')
        .insert(fallbackData)
        .select()
        .single()
      
      if (fallbackResult.error) {
        log.error('Erreur Supabase (fallback)', { 
          error: fallbackResult.error.message,
          code: fallbackResult.error.code,
        })
        console.error('[CONTACT] Erreur fallback:', fallbackResult.error)
        throw new InternalServerError('Erreur lors de l\'enregistrement du message', {
          dbError: fallbackResult.error.message,
        })
      }
      
      data = fallbackResult.data
      error = null
      console.log('[CONTACT] Message enregistré avec succès (fallback), ID:', data?.id)
    } else if (error) {
      log.error('Erreur Supabase', { 
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      })
      console.error('[CONTACT] Erreur Supabase:', error)
      throw new InternalServerError('Erreur lors de l\'enregistrement du message', {
        dbError: error.message,
      })
    } else {
      console.log('[CONTACT] Message enregistré avec succès, ID:', data?.id)
    }

    log.info('Message enregistré', { messageId: data?.id })

    // ========================================================================
    // ENVOI VERS TELEGRAM
    // ========================================================================
    try {
      if (isVehicleForm) {
        const telegramMessage = formatVehicleRequestForTelegram(input as VehicleRequestInput)
        await sendTelegramMessage(telegramMessage)
        log.info('Message Telegram envoyé avec succès (demande véhicule)')
      } else {
        const contactData = input as ContactInput
        const telegramMessage = `📧 <b>NOUVEAU MESSAGE DE CONTACT</b>\n\n` +
          `👤 <b>Nom:</b> ${contactData.name}\n` +
          `📧 <b>Email:</b> ${contactData.email}\n` +
          (contactData.phone ? `📱 <b>Téléphone:</b> ${contactData.phone}\n` : '') +
          (contactData.subject ? `📌 <b>Sujet:</b> ${contactData.subject}\n` : '') +
          `\n💬 <b>Message:</b>\n${contactData.message}\n\n` +
          `━━━━━━━━━━━━━━━━━━━━\n` +
          `📅 Date: ${new Date().toLocaleString('fr-FR')}`
        await sendTelegramMessage(telegramMessage)
        log.info('Message Telegram envoyé avec succès (contact)')
      }
    } catch (telegramError: any) {
      log.error('Erreur envoi Telegram (non-bloquant)', {
        error: telegramError?.message || String(telegramError),
      })
      console.error('[CONTACT] Erreur envoi Telegram:', telegramError)
      // Ne pas bloquer la réponse si Telegram échoue
    }

    // ========================================================================
    // ENVOI EMAIL (optionnel, gardé pour compatibilité)
    // ========================================================================
    // Envoyer un email avec Resend si configuré
    if (resend) {
      try {
        let emailSubject: string
        let emailBody: string

        if (isVehicleForm) {
          const vehicleData = input as VehicleRequestInput
          emailSubject = `Nouvelle demande de véhicule de ${vehicleData.name}`
          emailBody = formatVehicleRequestForTelegram(vehicleData).replace(/<[^>]*>/g, '') // Retirer les balises HTML pour le texte
        } else {
          const contactData = input as ContactInput
          emailSubject = contactData.subject || `Nouveau message de contact de ${contactData.name}`
          emailBody = `
Bonjour,

Vous avez reçu un nouveau message de contact depuis le site Autoval IA :

Nom: ${contactData.name}
Email: ${contactData.email}
${contactData.phone ? `Téléphone: ${contactData.phone}` : ''}
${contactData.subject ? `Sujet: ${contactData.subject}` : ''}

Message:
${contactData.message}

---
Ce message a été envoyé depuis le formulaire de contact du site.
          `.trim()
        }

        log.info('Tentative envoi email Resend', {
          from: 'Autoval IA <noreply@autovalia.fr>',
          to: CONTACT_EMAIL,
          replyTo: input.email,
          subject: emailSubject,
        })

        let htmlContent: string
        if (isVehicleForm) {
          htmlContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #3b82f6;">Nouvelle demande de véhicule</h2>
              <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p><strong>Nom:</strong> ${input.name}</p>
                <p><strong>Email:</strong> <a href="mailto:${input.email}">${input.email}</a></p>
                ${(input as VehicleRequestInput).phone ? `<p><strong>Téléphone:</strong> <a href="tel:${(input as VehicleRequestInput).phone}">${(input as VehicleRequestInput).phone}</a></p>` : ''}
              </div>
              <div style="margin: 20px 0;">
                <p style="white-space: pre-wrap; background: #ffffff; padding: 15px; border-left: 4px solid #3b82f6; border-radius: 4px;">${emailBody.replace(/\n/g, '<br>')}</p>
              </div>
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
              <p style="color: #6b7280; font-size: 12px;">Ce message a été envoyé depuis le formulaire de demande de véhicule du site Autoval IA.</p>
            </div>
          `
        } else {
          const contactData = input as ContactInput
          htmlContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #3b82f6;">Nouveau message de contact</h2>
              <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p><strong>Nom:</strong> ${contactData.name}</p>
                <p><strong>Email:</strong> <a href="mailto:${contactData.email}">${contactData.email}</a></p>
                ${contactData.phone ? `<p><strong>Téléphone:</strong> <a href="tel:${contactData.phone}">${contactData.phone}</a></p>` : ''}
                ${contactData.subject ? `<p><strong>Sujet:</strong> ${contactData.subject}</p>` : ''}
              </div>
              <div style="margin: 20px 0;">
                <h3 style="color: #1f2937;">Message:</h3>
                <p style="white-space: pre-wrap; background: #ffffff; padding: 15px; border-left: 4px solid #3b82f6; border-radius: 4px;">${contactData.message.replace(/\n/g, '<br>')}</p>
              </div>
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
              <p style="color: #6b7280; font-size: 12px;">Ce message a été envoyé depuis le formulaire de contact du site Autoval IA.</p>
            </div>
          `
        }

        const emailResult = await resend.emails.send({
          from: 'Autoval IA <noreply@autovalia.fr>',
          to: CONTACT_EMAIL,
          replyTo: input.email,
          subject: emailSubject,
          text: emailBody,
          html: htmlContent,
        })

        log.info('Email envoyé avec succès', { 
          to: CONTACT_EMAIL,
          emailId: emailResult.data?.id,
        })
      } catch (emailError: any) {
        log.error('Erreur envoi email Resend', { 
          error: emailError?.message || String(emailError),
          stack: emailError?.stack,
          hasResend: !!resend,
          hasApiKey: !!process.env.RESEND_API_KEY,
        })
        // Ne pas bloquer la réponse si l'email échoue, mais logger l'erreur
        console.error('[CONTACT] Erreur envoi email:', emailError)
      }
    } else {
      log.warn('Resend non configuré, email non envoyé', { 
        hasApiKey: !!process.env.RESEND_API_KEY,
        contactEmail: CONTACT_EMAIL,
      })
      console.warn('[CONTACT] Resend non configuré. Variables:', {
        hasApiKey: !!process.env.RESEND_API_KEY,
        contactEmail: CONTACT_EMAIL,
      })
    }

    // Logging automatique dans contact_requests (non-bloquant)
    if (!isVehicleForm) {
      const contactData = input as ContactInput
      console.log('[Tracking] Appel logContactRequest', {
        userId: user?.id || null,
        subject: contactData.name ? `Contact de ${contactData.name}` : 'Demande de contact',
        messageLength: contactData.message.length,
      })

      logContactRequest(
        {
          userId: user?.id || null,
          subject: contactData.name ? `Contact de ${contactData.name}` : 'Demande de contact',
          message: contactData.message,
        },
        { useServiceRole: true }
      ).catch(err => {
        log.warn('Erreur tracking contact (non-bloquant)', { error: err })
        console.error('[Tracking] Exception dans logContactRequest:', err)
      })
    }

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

