/**
 * Composant d'affichage des quotas utilisateur
 * 
 * Affiche les quotas restants ou le statut VIP/Premium
 */

'use client'

import { useQuota } from '@/hooks/useQuota'
import { Search, FileText, Sparkles, Crown, Zap } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { QuotaAlert } from '@/components/paywall/QuotaAlert'

export function QuotaDisplay() {
  const { quota, loading, isUnlimited, isAdmin, isVip, quotaRecherches, quotaAnalyses } = useQuota()
  
  if (loading) {
    return (
      <div className="animate-pulse bg-gray-800 rounded-lg p-4 border border-gray-700">
        <div className="h-4 bg-gray-700 rounded w-1/2"></div>
      </div>
    )
  }
  
  // Admin ou VIP : Badge spécial
  if (isAdmin || isVip) {
    return (
      <Card className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-purple-500/30">
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            {isAdmin ? (
              <>
                <Crown className="w-5 h-5 text-yellow-400" />
                <span className="font-semibold text-white">Accès Admin Illimité</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 text-purple-400" />
                <span className="font-semibold text-white">Accès VIP Illimité</span>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }
  
  // Abonnement actif : Badge premium
  if (isUnlimited) {
    return (
      <Card className="bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border-blue-500/30">
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-blue-400" />
            <span className="font-semibold text-white">Abonnement actif - Illimité</span>
            {quota?.plan && (
              <Badge variant="outline" className="ml-2 border-blue-400 text-blue-300">
                {quota.plan}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }
  
  // Quotas gratuits : Affichage des compteurs
  const bothQuotasExhausted = quotaRecherches === 0 && quotaAnalyses === 0
  
  return (
    <div className="space-y-4">
      {/* Alerte si quotas épuisés */}
      {bothQuotasExhausted && (
        <QuotaAlert variant="banner" />
      )}
      
      <div className="grid grid-cols-2 gap-3">
        {/* Quota Recherches */}
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Search className="w-4 h-4 text-blue-400" />
              <span className="text-sm text-gray-400">Recherches</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-white">
                {quotaRecherches}
              </span>
              <span className="text-sm text-gray-400">/ 2</span>
            </div>
            {quotaRecherches === 0 && (
              <p className="text-xs text-yellow-400 mt-2">Quota épuisé</p>
            )}
            {quotaRecherches > 0 && quotaRecherches <= 1 && (
              <p className="text-xs text-yellow-400 mt-2">Dernière recherche</p>
            )}
          </CardContent>
        </Card>
        
        {/* Quota Analyses */}
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-purple-400" />
              <span className="text-sm text-gray-400">Analyses</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-white">
                {quotaAnalyses}
              </span>
              <span className="text-sm text-gray-400">/ 2</span>
            </div>
            {quotaAnalyses === 0 && (
              <p className="text-xs text-yellow-400 mt-2">Quota épuisé</p>
            )}
            {quotaAnalyses > 0 && quotaAnalyses <= 1 && (
              <p className="text-xs text-yellow-400 mt-2">Dernière analyse</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

