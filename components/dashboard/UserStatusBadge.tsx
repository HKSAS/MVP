/**
 * Composant pour afficher le statut de l'utilisateur
 * Affiche : VIP, Admin, Plan (free, Autoval IA Analyse, essentiel, confort, premium)
 */

'use client'

import { useQuota } from '@/hooks/useQuota'
import { Badge } from '@/components/ui/badge'
import { Crown, Sparkles, Zap, User, Loader2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

export function UserStatusBadge() {
  const { quota, loading, isAdmin, isVip, isUnlimited } = useQuota()
  
  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
        <span className="text-sm text-gray-400">Chargement...</span>
      </div>
    )
  }
  
  // Admin : Priorité maximale
  if (isAdmin) {
    return (
      <Card className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-yellow-500/30">
        <CardContent className="p-3">
          <div className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-yellow-400" />
            <div>
              <div className="font-semibold text-white text-sm">Administrateur</div>
              <div className="text-xs text-gray-400">Accès illimité</div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }
  
  // VIP : Priorité haute
  if (isVip) {
    return (
      <Card className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-purple-500/30">
        <CardContent className="p-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-400" />
            <div>
              <div className="font-semibold text-white text-sm">Accès VIP</div>
              <div className="text-xs text-gray-400">Illimité</div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }
  
  // Abonnement actif
  if (isUnlimited && quota?.plan) {
    const planNames: Record<string, string> = {
      'free': 'Gratuit',
      'starter': 'Autoval IA Analyse',
      'essentiel': 'Essentiel',
      'confort': 'Confort',
      'premium': 'Premium',
      'enterprise': 'Enterprise'
    }
    
    const planName = planNames[quota.plan] || quota.plan
    
    return (
      <Card className="bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border-blue-500/30">
        <CardContent className="p-3">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-blue-400" />
            <div>
              <div className="font-semibold text-white text-sm">{planName}</div>
              <div className="text-xs text-gray-400">Abonnement actif - Illimité</div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }
  
  // Plan gratuit
  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardContent className="p-3">
        <div className="flex items-center gap-2">
          <User className="w-5 h-5 text-gray-400" />
          <div>
            <div className="font-semibold text-white text-sm">Plan Gratuit</div>
            <div className="text-xs text-gray-400">
              {quota?.quotaRecherchesRestantes ?? 0} recherches, {quota?.quotaAnalysesRestantes ?? 0} analyses
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Version compacte pour la navigation
 */
export function UserStatusBadgeCompact() {
  const { quota, loading, isAdmin, isVip, isUnlimited } = useQuota()
  
  if (loading) {
    return <Badge variant="outline" className="border-gray-700 text-gray-400">...</Badge>
  }
  
  if (isAdmin) {
    return (
      <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0">
        <Crown className="w-3 h-3 mr-1" />
        Admin
      </Badge>
    )
  }
  
  if (isVip) {
    return (
      <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0">
        <Sparkles className="w-3 h-3 mr-1" />
        VIP
      </Badge>
    )
  }
  
  if (isUnlimited && quota?.plan) {
    const planNames: Record<string, string> = {
      'free': 'Gratuit',
      'starter': 'Autoval IA Analyse',
      'essentiel': 'Essentiel',
      'confort': 'Confort',
      'premium': 'Premium',
      'enterprise': 'Enterprise'
    }
    
    const planName = planNames[quota.plan] || quota.plan
    
    return (
      <Badge className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-0">
        <Zap className="w-3 h-3 mr-1" />
        {planName}
      </Badge>
    )
  }
  
  return (
    <Badge variant="outline" className="border-gray-700 text-gray-400">
      <User className="w-3 h-3 mr-1" />
      Gratuit
    </Badge>
  )
}

