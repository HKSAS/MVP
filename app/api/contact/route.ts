import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { contactSchema, type ContactInput } from '@/lib/validation'
import type { ContactResponse } from '@/lib/types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseAnonKey)

/**
 * POST /api/contact
 * Enregistre un message de contact
 */
export async function POST(request: NextRequest) {
  const routePrefix = '[API /api/contact]'
  
  try {
    const body = await request.json()

    // Validation avec Zod
    const validationResult = contactSchema.safeParse(body)

    if (!validationResult.success) {
      console.error(`${routePrefix} ❌ Validation échouée:`, validationResult.error.errors)
      return NextResponse.json(
        {
          success: false,
          error: 'Validation échouée',
          details: validationResult.error.errors,
        },
        { status: 400 }
      )
    }

    const input: ContactInput = validationResult.data

    console.log(`${routePrefix} 📧 Nouveau message de ${input.name} (${input.email})`)

    // Enregistrement dans Supabase
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
      console.error(`${routePrefix} ❌ Erreur Supabase:`, error)
      return NextResponse.json(
        {
          success: false,
          error: 'Erreur lors de l\'enregistrement du message',
        },
        { status: 500 }
      )
    }

    // Optionnel : Envoi d'email via Resend ou autre service
    // Pour l'instant, on enregistre juste dans la base

    console.log(`${routePrefix} ✅ Message enregistré (ID: ${data.id})`)

    const response: ContactResponse = {
      success: true,
      message: 'Votre message a été envoyé avec succès. Nous vous répondrons dans les plus brefs délais.',
    }

    return NextResponse.json(response)
  } catch (error: any) {
    console.error(`${routePrefix} ❌ Erreur serveur:`, error)
    return NextResponse.json(
      {
        success: false,
        error: 'Erreur serveur',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    )
  }
}

