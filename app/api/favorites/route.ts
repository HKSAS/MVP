import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '@/lib/auth'
import { z } from 'zod'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseAnonKey)

const favoriteSchema = z.object({
  listing_id: z.string().min(1, 'ID de listing requis'), // Accepte UUID ou external_id
})

/**
 * POST /api/favorites
 * Ajoute une annonce aux favoris de l'utilisateur
 */
export async function POST(request: NextRequest) {
  const routePrefix = '[API /api/favorites POST]'
  
  try {
    // Vérification de l'authentification
    const user = await requireAuth(request)
    console.log(`${routePrefix} 👤 Utilisateur: ${user.id}`)

    const body = await request.json()

    // Validation
    const validationResult = favoriteSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation échouée',
          details: validationResult.error.errors,
        },
        { status: 400 }
      )
    }

    const { listing_id } = validationResult.data

    // Vérifier que le listing existe
    // Note: listing_id peut être soit l'UUID interne (id) soit l'external_id
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select('id, external_id')
      .or(`id.eq.${listing_id},external_id.eq.${listing_id}`)
      .single()

    if (listingError || !listing) {
      console.error(`${routePrefix} ❌ Listing introuvable: ${listing_id}`)
      return NextResponse.json(
        { success: false, error: 'Annonce introuvable' },
        { status: 404 }
      )
    }

    // Utiliser l'UUID interne pour la référence
    const internalListingId = listing.id

    // Vérifier si déjà en favoris
    const { data: existing } = await supabase
      .from('favorites')
      .select('id')
      .eq('user_id', user.id)
      .eq('listing_id', internalListingId)
      .single()

    if (existing) {
      console.log(`${routePrefix} ⚠️ Déjà en favoris: ${internalListingId}`)
      return NextResponse.json(
        { success: false, error: 'Cette annonce est déjà dans vos favoris' },
        { status: 409 }
      )
    }

    // Ajouter aux favoris
    const { data, error } = await supabase
      .from('favorites')
      .insert({
        user_id: user.id,
        listing_id: internalListingId,
      })
      .select()
      .single()

    if (error) {
      console.error(`${routePrefix} ❌ Erreur Supabase:`, error)
      return NextResponse.json(
        { success: false, error: 'Erreur lors de l\'ajout aux favoris' },
        { status: 500 }
      )
    }

    console.log(`${routePrefix} ✅ Favori ajouté: ${internalListingId}`)

    return NextResponse.json({
      success: true,
      message: 'Annonce ajoutée aux favoris',
      data,
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized: Authentication required') {
      console.error(`${routePrefix} ❌ Non authentifié`)
      return NextResponse.json(
        { success: false, error: 'Authentification requise' },
        { status: 401 }
      )
    }

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

/**
 * DELETE /api/favorites
 * Supprime une annonce des favoris de l'utilisateur
 */
export async function DELETE(request: NextRequest) {
  const routePrefix = '[API /api/favorites DELETE]'
  
  try {
    // Vérification de l'authentification
    const user = await requireAuth(request)
    console.log(`${routePrefix} 👤 Utilisateur: ${user.id}`)

    const body = await request.json()

    // Validation
    const validationResult = favoriteSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation échouée',
          details: validationResult.error.errors,
        },
        { status: 400 }
      )
    }

    const { listing_id } = validationResult.data

    // Trouver l'UUID interne si listing_id est un external_id
    const { data: listing } = await supabase
      .from('listings')
      .select('id')
      .or(`id.eq.${listing_id},external_id.eq.${listing_id}`)
      .single()

    if (!listing) {
      console.error(`${routePrefix} ❌ Listing introuvable: ${listing_id}`)
      return NextResponse.json(
        { success: false, error: 'Annonce introuvable' },
        { status: 404 }
      )
    }

    // Supprimer des favoris (sécurité: filtre par user_id)
    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('user_id', user.id)  // SÉCURITÉ: Seul le propriétaire peut supprimer
      .eq('listing_id', listing.id)

    if (error) {
      console.error(`${routePrefix} ❌ Erreur Supabase:`, error)
      return NextResponse.json(
        { success: false, error: 'Erreur lors de la suppression des favoris' },
        { status: 500 }
      )
    }

    console.log(`${routePrefix} ✅ Favori supprimé: ${listing.id}`)

    return NextResponse.json({
      success: true,
      message: 'Annonce retirée des favoris',
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized: Authentication required') {
      console.error(`${routePrefix} ❌ Non authentifié`)
      return NextResponse.json(
        { success: false, error: 'Authentification requise' },
        { status: 401 }
      )
    }

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

