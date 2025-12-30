/**
 * Modal de paywall quand le quota est épuisé
 */

'use client'

import { useRouter } from 'next/navigation'
import { X, Sparkles, Check, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { motion } from 'framer-motion'

type Props = {
  actionType: 'recherche' | 'analyse'
  open: boolean
  onClose: () => void
}

export function QuotaExceeded({ actionType, open, onClose }: Props) {
  const router = useRouter()
  
  const handleUpgrade = () => {
    onClose()
    router.push('/tarif')
  }
  
  const features = [
    'Recherches illimitées',
    'Analyses illimitées',
    'Fonctionnalités avancées',
    'Support prioritaire',
    'Rapports détaillés et analyses approfondies'
  ]
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-[#0a0a0a] border-white/10 max-w-2xl p-0 overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/2 w-[400px] h-[400px] bg-purple-600/20 rounded-full blur-[100px] animate-pulse"></div>
          <div className="absolute bottom-0 right-0 w-[300px] h-[300px] bg-blue-600/10 rounded-full blur-[80px]"></div>
        </div>

        <div className="relative z-10 bg-white/5 backdrop-blur-xl border-b border-white/10 p-6">
          <DialogHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.5, type: "spring" }}
                  className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/30"
                >
                  <Sparkles className="w-6 h-6 text-white" />
                </motion.div>
                <div>
                  <DialogTitle className="text-2xl md:text-3xl font-medium text-white mb-1">
                    Quota épuisé
                  </DialogTitle>
                  <DialogDescription className="text-gray-400 text-base">
                    Vous avez utilisé toutes vos {actionType === 'recherche' ? 'recherches' : 'analyses'} gratuites ce mois-ci
                  </DialogDescription>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="text-gray-400 hover:text-white hover:bg-white/10 rounded-full"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </DialogHeader>
        </div>
        
        <div className="relative z-10 p-6 space-y-6">
          {/* Main Message */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-center"
          >
            <p className="text-lg text-gray-300 mb-2">
              Pour continuer à utiliser Autoval IA, <strong className="text-white">passez à un abonnement Premium</strong> et bénéficiez d&apos;un accès illimité.
            </p>
          </motion.div>
          
          {/* Benefits Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="bg-gradient-to-br from-purple-600/20 via-blue-600/20 to-purple-600/10 backdrop-blur-xl rounded-2xl p-6 border border-purple-500/30"
          >
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-purple-400" />
              <span className="font-semibold text-white text-lg">Avec Premium, vous bénéficiez de :</span>
            </div>
            <ul className="space-y-3">
              {features.map((feature, index) => (
                <motion.li
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 0.3 + index * 0.1 }}
                  className="flex items-center gap-3 text-gray-200"
                >
                  <div className="w-8 h-8 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center flex-shrink-0">
                    <Check className="w-4 h-4 text-purple-400" />
                  </div>
                  <span>{feature}</span>
                </motion.li>
              ))}
            </ul>
          </motion.div>
          
          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="flex flex-col gap-3"
          >
            <Button
              onClick={handleUpgrade}
              size="lg"
              className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-medium py-6 rounded-xl shadow-lg shadow-purple-500/25 transition-all group"
            >
              <span className="flex items-center justify-center gap-2">
                Voir les tarifs Premium
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </span>
            </Button>
            
            <Button
              onClick={onClose}
              variant="outline"
              size="lg"
              className="w-full border-white/20 text-gray-300 hover:bg-white/10 hover:text-white py-6 rounded-xl"
            >
              Plus tard
            </Button>
          </motion.div>
          
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.7 }}
            className="text-center text-sm text-gray-500"
          >
            Vos quotas seront réinitialisés le 1er du mois prochain
          </motion.p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
