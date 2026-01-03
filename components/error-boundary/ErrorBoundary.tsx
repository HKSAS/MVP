'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, RefreshCw, Home } from 'lucide-react'
import Link from 'next/link'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    
    // Log to error tracking service (Sentry, etc.)
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center p-4">
          <Card className="max-w-md w-full bg-white/5 backdrop-blur-sm border-red-500/20">
            <CardHeader>
              <div className="flex items-center gap-3">
                <AlertCircle className="size-6 text-red-400" />
                <CardTitle className="text-red-400">Une erreur est survenue</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-300">
                {this.state.error?.message || 'Une erreur inattendue s\'est produite.'}
              </p>
              
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm text-gray-400 mb-2">
                    Détails techniques
                  </summary>
                  <pre className="text-xs bg-black/50 p-3 rounded overflow-auto max-h-40 text-red-300">
                    {this.state.error.stack}
                  </pre>
                </details>
              )}

              <div className="flex gap-3 pt-4">
                <Button
                  onClick={this.handleReset}
                  variant="outline"
                  className="flex-1"
                >
                  <RefreshCw className="size-4 mr-2" />
                  Réessayer
                </Button>
                <Button asChild variant="outline" className="flex-1">
                  <Link href="/">
                    <Home className="size-4 mr-2" />
                    Accueil
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}

