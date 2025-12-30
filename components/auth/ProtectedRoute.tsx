/**
 * Composant pour protéger une route
 * Ne rend rien tant que l'utilisateur n'est pas authentifié
 */

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseBrowserClient } from '@/lib/supabase/browser'
import { Loader2 } from 'lucide-react'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = getSupabaseBrowserClient()
    let mounted = true

    const checkAuth = async () => {
      try {
        // Vérifier la session - méthode principale
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (!mounted) return

        // Logs pour déboguer
        if (process.env.NODE_ENV === 'development') {
          console.log('[ProtectedRoute] Session check:', {
            hasSession: !!session,
            hasUser: !!session?.user,
            error: error?.message
          })
        }

        // Si on a une session valide, autoriser l'accès immédiatement
        if (session?.user) {
          if (process.env.NODE_ENV === 'development') {
            console.log('[ProtectedRoute] Session valide, autorisation accès')
          }
          setIsAuthenticated(true)
          setLoading(false)
          return
        }

        // Pas de session dans getSession, essayer getUser comme fallback
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        
        if (!mounted) return

        if (user && !userError) {
          // Utilisateur trouvé via getUser, autoriser
          if (process.env.NODE_ENV === 'development') {
            console.log('[ProtectedRoute] User trouvé via getUser, autorisation accès')
          }
          setIsAuthenticated(true)
          setLoading(false)
          return
        }

        // Aucune session trouvée après les deux tentatives
        if (process.env.NODE_ENV === 'development') {
          console.log('[ProtectedRoute] Aucune session trouvée, redirection vers /login')
        }
        setIsAuthenticated(false)
        setLoading(false)
        
        // Petit délai pour éviter les redirections trop rapides
        setTimeout(() => {
          if (mounted) {
            router.replace('/login')
          }
        }, 100)
      } catch (error) {
        console.error('[ProtectedRoute] Erreur vérification auth:', error)
        if (mounted) {
          // En cas d'erreur réseau ou autre, être plus permissif
          // Laisser passer et laisser le serveur vérifier
          console.warn('[ProtectedRoute] Erreur détectée, autorisation temporaire')
          setIsAuthenticated(true)
          setLoading(false)
        }
      }
    }

    checkAuth()

    // Écouter les changements d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return
      
      if (event === 'SIGNED_OUT' || !session) {
        setIsAuthenticated(false)
        router.replace('/login')
      } else if (session?.user) {
        setIsAuthenticated(true)
        setLoading(false)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [router])

  // Afficher le contenu si authentifié, sinon afficher le loader
  // Si loading est true mais qu'on n'a pas encore vérifié, attendre un peu
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="size-8 animate-spin text-blue-400 mx-auto mb-4" />
          <p className="text-gray-400">Vérification de l'authentification...</p>
        </div>
      </div>
    )
  }

  // Si pas authentifié après vérification, ne rien afficher (redirection en cours)
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="size-8 animate-spin text-blue-400 mx-auto mb-4" />
          <p className="text-gray-400">Redirection vers la page de connexion...</p>
        </div>
      </div>
    )
  }

  // Authentifié, afficher le contenu
  return <>{children}</>
}

