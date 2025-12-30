'use client'

/**
 * Composant de diagnostic pour vérifier les variables d'environnement
 * À utiliser temporairement pour déboguer les problèmes de connexion Supabase
 * 
 * Usage: Ajoutez <EnvDiagnostic /> dans votre page de login/signup temporairement
 */

import { useEffect, useState } from 'react'

export default function EnvDiagnostic() {
  const [diagnostics, setDiagnostics] = useState<any>(null)

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') {
      return // Ne rien afficher en production
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    const diag = {
      timestamp: new Date().toISOString(),
      origin: typeof window !== 'undefined' ? window.location.origin : 'N/A',
      hasUrl: !!supabaseUrl,
      url: supabaseUrl || 'NON DÉFINI',
      urlLength: supabaseUrl?.length || 0,
      hasKey: !!supabaseAnonKey,
      keyLength: supabaseAnonKey?.length || 0,
      keyPreview: supabaseAnonKey ? `${supabaseAnonKey.substring(0, 20)}...` : 'NON DÉFINI',
      nodeEnv: process.env.NODE_ENV,
    }

    setDiagnostics(diag)

    // Tester la connexion Supabase
    if (supabaseUrl && supabaseAnonKey) {
      fetch(`${supabaseUrl}/rest/v1/`, {
        method: 'HEAD',
        headers: {
          'apikey': supabaseAnonKey,
        },
      })
        .then(response => {
          setDiagnostics(prev => ({
            ...prev,
            connectionTest: {
              success: response.ok,
              status: response.status,
              statusText: response.statusText,
            },
          }))
        })
        .catch(error => {
          setDiagnostics(prev => ({
            ...prev,
            connectionTest: {
              success: false,
              error: error.message,
            },
          }))
        })
    }
  }, [])

  if (process.env.NODE_ENV !== 'development' || !diagnostics) {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 bg-gray-900 text-white p-4 rounded-lg shadow-lg text-xs max-w-md z-50">
      <div className="font-bold mb-2">🔍 Diagnostic Env (DEV)</div>
      <pre className="whitespace-pre-wrap overflow-auto max-h-96">
        {JSON.stringify(diagnostics, null, 2)}
      </pre>
    </div>
  )
}







