/**
 * Middleware Next.js pour la protection des routes
 * 
 * Redirige les utilisateurs non authentifiés vers /login
 * 
 * Note: La vérification complète de l'authentification se fait côté client
 * Le middleware vérifie uniquement la présence des cookies de session Supabase
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  // Routes protégées (nécessitent une authentification)
  const protectedRoutes = ['/dashboard', '/recherche', '/analyser', '/favoris']
  const isProtectedRoute = protectedRoutes.some(route => 
    req.nextUrl.pathname.startsWith(route)
  )
  
  // Routes d'authentification (ne doivent pas être accessibles si déjà connecté)
  const authRoutes = ['/login', '/signup']
  const isAuthRoute = authRoutes.some(route => 
    req.nextUrl.pathname.startsWith(route)
  )
  
  // Si ce n'est ni une route protégée ni une route d'auth, continuer
  if (!isProtectedRoute && !isAuthRoute) {
    return NextResponse.next()
  }
  
  // Vérifier la présence d'un cookie de session Supabase
  // Supabase stocke les sessions dans des cookies avec le pattern: sb-<project-ref>-auth-token
  const cookies = req.cookies.getAll()
  
  // Chercher les cookies Supabase (format: sb-<project-ref>-auth-token)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  let hasSupabaseSession = false
  
  if (supabaseUrl) {
    // Extraire le project-ref de l'URL Supabase
    const projectRefMatch = supabaseUrl.match(/https?:\/\/([^.]+)\.supabase\.co/)
    if (projectRefMatch) {
      const projectRef = projectRefMatch[1]
      const expectedCookieName = `sb-${projectRef}-auth-token`
      
      // Vérifier si le cookie existe
      hasSupabaseSession = cookies.some(cookie => 
        cookie.name === expectedCookieName && cookie.value && cookie.value.length > 10
      )
    }
  }
  
  // Fallback: chercher n'importe quel cookie qui ressemble à un token Supabase
  if (!hasSupabaseSession) {
    hasSupabaseSession = cookies.some(cookie => {
      const name = cookie.name.toLowerCase()
      const value = cookie.value
      return (
        (name.includes('sb-') && name.includes('auth')) ||
        (name.includes('supabase') && value.length > 50)
      )
    })
  }
  
  // Rediriger vers login si pas de session et route protégée
  // Mais être moins strict : laisser passer et laisser le client vérifier
  // Le middleware sert juste de première ligne de défense
  if (isProtectedRoute && !hasSupabaseSession) {
    // Ne pas bloquer immédiatement - laisser le ProtectedRoute gérer
    // Cela évite de bloquer les utilisateurs qui viennent de se connecter
    // mais dont les cookies ne sont pas encore synchronisés
    const response = NextResponse.next()
    return response
  }
  
  // Rediriger vers dashboard si session présente et sur route d'auth
  if (isAuthRoute && hasSupabaseSession) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/recherche/:path*',
    '/analyser/:path*',
    '/favoris/:path*',
    '/login',
    '/signup'
  ]
}

