/**
 * Système de tracking des événements utilisateur
 * Log automatique des recherches IA, analyses d'annonces et demandes de contact
 */

import { getSupabaseAdminClient } from './supabase/server'
import { createClient } from '@supabase/supabase-js'

// Vérification des variables d'environnement au chargement du module
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl) {
  console.error('[Tracking] ❌ ERREUR CRITIQUE: NEXT_PUBLIC_SUPABASE_URL manquant')
  console.error('[Tracking] Ajoutez dans .env.local: NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co')
}

if (!supabaseAnonKey) {
  console.error('[Tracking] ❌ ERREUR CRITIQUE: NEXT_PUBLIC_SUPABASE_ANON_KEY manquant')
  console.error('[Tracking] Ajoutez dans .env.local: NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key')
}

if (!supabaseServiceKey) {
  console.warn('[Tracking] ⚠️  SUPABASE_SERVICE_ROLE_KEY manquant - le tracking utilisera anon key (peut échouer avec RLS)')
  console.warn('[Tracking] Ajoutez dans .env.local: SUPABASE_SERVICE_ROLE_KEY=your-service-role-key')
} else {
  console.log('[Tracking] ✅ Configuration OK: Service role key présente')
}

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('[Tracking] Variables d\'environnement Supabase manquantes. Voir les logs ci-dessus.')
}

// Après la vérification, on sait que ces valeurs ne sont pas undefined
// On les cast en string pour TypeScript
const SUPABASE_URL: string = supabaseUrl
const SUPABASE_ANON_KEY: string = supabaseAnonKey

/**
 * Options pour le logging (utiliser service role ou user session)
 */
interface TrackingOptions {
  useServiceRole?: boolean // Si true, utilise service role (bypass RLS). Si false, utilise user session.
  userId?: string // Optionnel : si fourni, sera utilisé même si useServiceRole=true
}

/**
 * Log une recherche IA dans ai_searches
 * @param params - Paramètres de la recherche
 * @param options - Options de tracking
 */
export async function logAiSearch(
  params: {
    userId: string | null
    queryText: string
    filters?: Record<string, any>
  },
  options: TrackingOptions = { useServiceRole: true }
): Promise<void> {
  // Si pas d'utilisateur, on ne log pas (les tables requièrent user_id NOT NULL)
  if (!params.userId) {
    console.warn('[Tracking] logAiSearch: userId manquant, skip logging')
    return
  }

  try {
    // Valider les inputs
    if (!params.queryText || typeof params.queryText !== 'string') {
      console.error('[Tracking] logAiSearch: queryText invalide', params)
      return
    }

    // Nettoyer queryText (limiter la longueur, éviter les caractères dangereux)
    const cleanQueryText = params.queryText.trim().slice(0, 1000)
    const cleanFilters = params.filters ? JSON.stringify(params.filters).slice(0, 5000) : null

    // Utiliser service role pour bypass RLS (best effort, ne doit pas bloquer)
    const useServiceRole = options.useServiceRole && !!supabaseServiceKey
    const supabase = useServiceRole
      ? getSupabaseAdminClient()
      : createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

    console.log('[Tracking] logAiSearch: Tentative insertion', {
      userId: params.userId,
      queryText: cleanQueryText.slice(0, 50),
      useServiceRole,
      hasServiceKey: !!supabaseServiceKey,
    })

    const { data, error } = await supabase
      .from('ai_searches')
      .insert({
        user_id: params.userId,
        query_text: cleanQueryText,
        filters: cleanFilters ? JSON.parse(cleanFilters) : null,
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error('[Tracking] ❌ Erreur logAiSearch:', {
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        userId: params.userId,
        useServiceRole,
      })
      // Ne pas throw - best effort
    } else {
      console.log('[Tracking] ✅ logAiSearch réussi', {
        insertedId: data?.id,
        userId: params.userId,
        queryText: cleanQueryText.slice(0, 50),
        useServiceRole,
      })
    }
  } catch (error) {
    console.error('[Tracking] Exception logAiSearch:', {
      error: error instanceof Error ? error.message : String(error),
      userId: params.userId,
    })
    // Ne pas throw - best effort
  }
}

/**
 * Log une analyse d'annonce dans ai_analyses
 * @param params - Paramètres de l'analyse
 * @param options - Options de tracking
 */
export async function logAiAnalysis(
  params: {
    userId: string | null
    listingUrl: string
    listingSource?: string
    riskScore: number
    riskLevel: 'low' | 'medium' | 'high'
  },
  options: TrackingOptions = { useServiceRole: true }
): Promise<void> {
  // Si pas d'utilisateur, on ne log pas
  if (!params.userId) {
    console.warn('[Tracking] logAiAnalysis: userId manquant, skip logging')
    return
  }

  try {
    // Valider les inputs
    if (!params.listingUrl || typeof params.listingUrl !== 'string') {
      console.error('[Tracking] logAiAnalysis: listingUrl invalide', params)
      return
    }

    if (typeof params.riskScore !== 'number' || params.riskScore < 0 || params.riskScore > 100) {
      console.error('[Tracking] logAiAnalysis: riskScore invalide', params)
      return
    }

    // Nettoyer les strings
    const cleanUrl = params.listingUrl.trim().slice(0, 2000)
    const cleanSource = params.listingSource ? params.listingSource.trim().slice(0, 100) : null

    // Valider riskLevel
    const validRiskLevel = ['low', 'medium', 'high'].includes(params.riskLevel)
      ? params.riskLevel
      : 'medium'

    const useServiceRole = options.useServiceRole && !!supabaseServiceKey
    const supabase = useServiceRole
      ? getSupabaseAdminClient()
      : createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

    console.log('[Tracking] logAiAnalysis: Tentative insertion', {
      userId: params.userId,
      listingUrl: cleanUrl.slice(0, 50),
      riskScore: params.riskScore,
      riskLevel: validRiskLevel,
      useServiceRole,
      hasServiceKey: !!supabaseServiceKey,
    })

    const { data, error } = await supabase
      .from('ai_analyses')
      .insert({
        user_id: params.userId,
        listing_url: cleanUrl,
        listing_source: cleanSource,
        risk_score: Math.round(params.riskScore),
        risk_level: validRiskLevel,
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error('[Tracking] ❌ Erreur logAiAnalysis:', {
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        userId: params.userId,
        useServiceRole,
      })
    } else {
      console.log('[Tracking] ✅ logAiAnalysis réussi', {
        insertedId: data?.id,
        userId: params.userId,
        listingUrl: cleanUrl.slice(0, 50),
        riskScore: params.riskScore,
        riskLevel: validRiskLevel,
        useServiceRole,
      })
    }
  } catch (error) {
    console.error('[Tracking] Exception logAiAnalysis:', {
      error: error instanceof Error ? error.message : String(error),
      userId: params.userId,
    })
  }
}

/**
 * Log une demande de contact dans contact_requests
 * @param params - Paramètres de la demande
 * @param options - Options de tracking
 */
export async function logContactRequest(
  params: {
    userId: string | null
    subject?: string
    message: string
  },
  options: TrackingOptions = { useServiceRole: true }
): Promise<void> {
  // Note: contact_requests peut accepter user_id NULL (demandes anonymes)
  // Mais pour cohérence, on log seulement si userId fourni
  // Si besoin de logger les anonymes, décommenter la ligne ci-dessous
  // if (!params.userId) { console.warn('[Tracking] logContactRequest: userId manquant, skip logging'); return; }

  try {
    // Valider les inputs
    if (!params.message || typeof params.message !== 'string') {
      console.error('[Tracking] logContactRequest: message invalide', params)
      return
    }

    // Nettoyer les strings
    const cleanSubject = params.subject ? params.subject.trim().slice(0, 500) : null
    const cleanMessage = params.message.trim().slice(0, 10000)

    const useServiceRole = options.useServiceRole && !!supabaseServiceKey
    const supabase = useServiceRole
      ? getSupabaseAdminClient()
      : createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

    console.log('[Tracking] logContactRequest: Tentative insertion', {
      userId: params.userId || 'anonymous',
      subject: cleanSubject?.slice(0, 30),
      messageLength: cleanMessage.length,
      useServiceRole,
      hasServiceKey: !!supabaseServiceKey,
    })

    const { data, error } = await supabase
      .from('contact_requests')
      .insert({
        user_id: params.userId, // Peut être null pour contacts anonymes
        subject: cleanSubject,
        message: cleanMessage,
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error('[Tracking] ❌ Erreur logContactRequest:', {
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        userId: params.userId || 'anonymous',
        useServiceRole,
      })
    } else {
      console.log('[Tracking] ✅ logContactRequest réussi', {
        insertedId: data?.id,
        userId: params.userId || 'anonymous',
        subject: cleanSubject?.slice(0, 30),
        useServiceRole,
      })
    }
  } catch (error) {
    console.error('[Tracking] Exception logContactRequest:', {
      error: error instanceof Error ? error.message : String(error),
      userId: params.userId || 'anonymous',
    })
  }
}

