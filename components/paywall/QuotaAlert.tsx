/**
 * Composant d'alerte pour quotas épuisés
 * Affiche un message informatif au lieu de bloquer
 */

'use client'

import { useRouter } from 'next/navigation'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Sparkles, AlertTriangle, X, ArrowRight } from 'lucide-react'
import { useState } from 'react'
import { motion } from 'framer-motion'

type Props = {
  actionType?: 'recherche' | 'analyse'
  onDismiss?: () => void
  variant?: 'inline' | 'banner'
}

export function QuotaAlert({ actionType, onDismiss, variant = 'inline' }: Props) {
  const router = useRouter()
  const [dismissed, setDismissed] = useState(false)

  const handleDismiss = () => {
    setDismissed(true)
    onDismiss?.()
  }

  if (dismissed) return null

  if (variant === 'banner') {
    return (
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Alert className="bg-gradient-to-r from-purple-600/20 via-blue-600/20 to-purple-600/10 border-purple-500/30 mb-6 backdrop-blur-xl">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-purple-500/30">
              <AlertTriangle className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1">
              <AlertTitle className="text-white font-semibold mb-2">Quota épuisé</AlertTitle>
              <AlertDescription className="text-gray-300">
                <strong className="text-white">Vous avez utilisé toutes vos {actionType === 'recherche' ? 'recherches' : actionType === 'analyse' ? 'analyses' : 'actions'} gratuites ce mois-ci.</strong>
        <br />
        <br />
                Pour continuer à utiliser Autoval IA et bénéficier d&apos;un accès illimité, passez à un abonnement Premium.
      </AlertDescription>
        <div className="flex gap-3 mt-4">
          <Button
            onClick={() => router.push('/tarif')}
                  className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white shadow-lg shadow-purple-500/25"
          >
            <Sparkles className="w-4 h-4 mr-2" />
                  Voir les tarifs Premium
                  <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
          <Button
            variant="ghost"
            onClick={handleDismiss}
                  className="text-gray-400 hover:text-white hover:bg-white/10"
          >
            <X className="w-4 h-4 mr-2" />
            Fermer
          </Button>
              </div>
            </div>
        </div>
      </Alert>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Alert className="bg-gradient-to-r from-purple-600/20 via-blue-600/20 to-purple-600/10 border-purple-500/30 backdrop-blur-xl">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-purple-500/30">
            <AlertTriangle className="h-4 w-4 text-white" />
          </div>
          <div className="flex-1">
            <AlertTitle className="text-white font-semibold flex items-center justify-between mb-2">
        <span>Quota épuisé</span>
        {onDismiss && (
          <button
            onClick={handleDismiss}
                  className="text-gray-400 hover:text-white hover:bg-white/10 rounded-full p-1 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </AlertTitle>
            <AlertDescription className="text-gray-300">
              <strong className="text-white">Vous avez utilisé toutes vos {actionType === 'recherche' ? 'recherches' : actionType === 'analyse' ? 'analyses' : 'actions'} gratuites ce mois-ci.</strong>
        <br />
        <br />
              Pour continuer à utiliser Autoval IA, <strong className="text-white">passez à un abonnement Premium</strong> et bénéficiez d&apos;un accès illimité à toutes les fonctionnalités.
      </AlertDescription>
      <div className="mt-4">
        <Button
          onClick={() => router.push('/tarif')}
          size="sm"
                className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white shadow-lg shadow-purple-500/25"
        >
          <Sparkles className="w-4 h-4 mr-2" />
                Voir les tarifs Premium
                <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
            </div>
          </div>
      </div>
    </Alert>
    </motion.div>
  )
}

