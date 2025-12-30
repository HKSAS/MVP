/**
 * Composant d'invitation à l'upgrade
 * Affiche un prompt discret pour encourager l'upgrade
 */

'use client'

import { useRouter } from 'next/navigation'
import { Sparkles, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

type Props = {
  variant?: 'inline' | 'banner'
  className?: string
}

export function UpgradePrompt({ variant = 'inline', className = '' }: Props) {
  const router = useRouter()
  
  if (variant === 'banner') {
    return (
      <Card className={`bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/20 ${className}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-purple-400" />
              <div>
                <p className="font-semibold text-white">Débloquez toutes les fonctionnalités</p>
                <p className="text-sm text-gray-400">Passez à Premium pour un accès illimité</p>
              </div>
            </div>
            <Button
              onClick={() => router.push('/tarif')}
              className="bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:opacity-90"
            >
              Voir les tarifs
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }
  
  return (
    <Card className={`bg-gray-800 border-gray-700 ${className}`}>
      <CardContent className="p-6 text-center">
        <Sparkles className="w-12 h-12 text-purple-400 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-white mb-2">
          Passez à Premium
        </h3>
        <p className="text-gray-400 mb-6">
          Débloquez toutes les fonctionnalités avec un abonnement Premium
        </p>
        <Button
          onClick={() => router.push('/tarif')}
          className="bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:opacity-90"
        >
          Voir les tarifs
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </CardContent>
    </Card>
  )
}

