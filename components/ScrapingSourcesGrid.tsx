'use client'

/**
 * Composant de grille de sources de scraping
 * 
 * Affiche les sources sous forme de bulles/cards arrondies avec le nouveau design Figma
 * avec des statuts stricts liés aux données réelles du backend
 * 
 * Règle UX : "Terminé" ne s'affiche QUE si le scraping backend est réellement terminé
 */

import { useState, useEffect, useRef } from 'react'
import { CheckCircle2, Loader2, Clock, AlertCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/components/ui/utils'
import type { SiteResult } from '@/lib/search-types'

interface ScrapingSource {
  name: string
  status: 'pending' | 'connecting' | 'analyzing' | 'completed' | 'error'
  startTime?: number
  completedTime?: number
  itemsCount?: number
  error?: string
}

interface ScrapingSourcesGridProps {
  /** Données réelles des sites (quand disponibles) */
  realSiteResults?: SiteResult[]
  /** Temps écoulé depuis le début (en secondes) */
  elapsedSeconds?: number
  /** Callback quand une source change de statut */
  onSourceStatusChange?: (source: string, status: ScrapingSource['status']) => void
  /** Liste des sites exclus (ne seront pas affichés) */
  excludedSites?: string[]
}

// Liste des plateformes dans l'ordre d'analyse
const PLATFORMS = [
  'LeBonCoin',
  'LaCentrale',
  'ParuVendu',
  'AutoScout24',
  'LeParking',
  'ProCarLease',
  'TransakAuto',
  'Kyump',
]

// Mapping des noms de sources (normalisation)
const normalizeSourceName = (name: string): string => {
  const normalized = name.toLowerCase().replace(/\s+/g, '')
  const mapping: Record<string, string> = {
    'leboncoin': 'LeBonCoin',
    'lacentrale': 'LaCentrale',
    'paruvendu': 'ParuVendu',
    'autoscout24': 'AutoScout24',
    'leparking': 'LeParking',
  'procarlease': 'ProCarLease',
  'transakauto': 'TransakAuto',
  'kyump': 'Kyump',
  }
  return mapping[normalized] || name
}

export function ScrapingSourcesGrid({
  realSiteResults = [],
  elapsedSeconds = 0,
  onSourceStatusChange,
  excludedSites = [],
}: ScrapingSourcesGridProps) {
  // Filtrer les plateformes selon les sites exclus
  const availablePlatforms = PLATFORMS.filter(platform => {
    const normalizedExcluded = excludedSites.map(s => normalizeSourceName(s))
    return !normalizedExcluded.includes(normalizeSourceName(platform))
  })
  
  const [sources, setSources] = useState<ScrapingSource[]>(
    availablePlatforms.map(name => ({ name, status: 'pending' }))
  )
  const previousStatusesRef = useRef<Map<string, ScrapingSource['status']>>(new Map())

  // Synchroniser avec les données réelles du backend
  useEffect(() => {
    if (realSiteResults.length === 0) return

    setSources((prev) => {
      const newSources = [...prev]
      const realResultsMap = new Map(
        realSiteResults.map(result => [
          normalizeSourceName(result.site),
          result
        ])
      )

      newSources.forEach((source) => {
        const realResult = realResultsMap.get(normalizeSourceName(source.name))

        if (realResult) {
          // Source réellement terminée - RÈGLE STRICTE : "Terminé" uniquement si ok === true
          if (realResult.ok) {
            // Toujours mettre à jour vers "completed" si on a les données réelles
            source.status = 'completed'
            source.completedTime = Date.now()
            source.itemsCount = Array.isArray(realResult.items) 
              ? realResult.items.length 
              : (typeof realResult.items === 'number' ? realResult.items : 0)
            
            // Callback si fourni
            if (onSourceStatusChange && previousStatusesRef.current.get(source.name) !== 'completed') {
              onSourceStatusChange(source.name, 'completed')
            }
          } else {
            // Source en erreur
            if (source.status !== 'error') {
              source.status = 'error'
              source.error = realResult.error
              
              if (onSourceStatusChange) {
                onSourceStatusChange(source.name, 'error')
              }
            }
          }
        } else {
          // Pas de données réelles pour cette source
          // RÈGLE STRICTE : Ne jamais marquer "completed" sans données réelles
          if (source.status === 'completed') {
            // Réinitialiser si on n'a plus de données réelles (ne devrait pas arriver)
            source.status = 'analyzing'
          }
        }
        
        // Mettre à jour le cache des statuts précédents
        previousStatusesRef.current.set(source.name, source.status)
      })

      return newSources
    })
  }, [realSiteResults, onSourceStatusChange])

  // Simulation réaliste de progression (uniquement si pas de données réelles)
  useEffect(() => {
    if (realSiteResults.length > 0) return // Ne pas simuler si on a des données réelles

    // Délai progressif pour chaque source (plus réaliste)
    const sourceDelays = [0, 1, 2, 3, 4, 5, 6] // secondes

    setSources((prev) => {
      const newSources = [...prev]

      newSources.forEach((source, index) => {
        const delay = sourceDelays[index]
        const timeSinceStart = elapsedSeconds - delay

        // Ne jamais marquer "completed" sans données réelles
        if (source.status === 'completed' && !realSiteResults.find(r => 
          normalizeSourceName(r.site) === normalizeSourceName(source.name)
        )) {
          // Réinitialiser si on n'a pas de données réelles
          source.status = 'analyzing'
        }

        if (timeSinceStart >= 0 && source.status === 'pending') {
          source.status = 'connecting'
          source.startTime = Date.now()
        }

        if (timeSinceStart >= 1 && source.status === 'connecting') {
          source.status = 'analyzing'
        }

        // Ne jamais passer à "completed" sans données réelles
        // On reste en "analyzing" jusqu'à recevoir les vraies données
      })

      return newSources
    })
  }, [elapsedSeconds, realSiteResults])

  // Fonction pour obtenir l'icône selon le statut
  const getStatusIcon = (status: ScrapingSource['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="size-5 text-green-400" />
      case 'analyzing':
        return <Loader2 className="size-5 text-blue-400 animate-spin" />
      case 'connecting':
        return <Loader2 className="size-5 text-blue-300 animate-spin" />
      case 'error':
        return <AlertCircle className="size-5 text-red-400" />
      case 'pending':
        return <Clock className="size-5 text-gray-500" />
    }
  }

  // Fonction pour obtenir le texte de statut
  const getStatusText = (source: ScrapingSource) => {
    switch (source.status) {
      case 'completed':
        return source.itemsCount !== undefined 
          ? `${source.itemsCount} résultat${source.itemsCount !== 1 ? 's' : ''}`
          : 'Terminé'
      case 'analyzing':
        return 'Analyse en cours'
      case 'connecting':
        return 'Connexion'
      case 'error':
        return 'Indisponible'
      case 'pending':
        return 'En attente'
    }
  }

  // Fonction pour obtenir les styles selon le statut (nouveau design dark)
  const getStyles = (status: ScrapingSource['status']) => {
    switch (status) {
      case 'completed':
        return {
          border: 'border-green-500/30',
          bg: 'bg-green-600/10',
          glow: 'shadow-green-500/20',
          text: 'text-green-400',
          textSecondary: 'text-green-300',
        }
      case 'analyzing':
        return {
          border: 'border-blue-500/50',
          bg: 'bg-blue-600/20',
          glow: 'shadow-blue-500/30',
          text: 'text-blue-400',
          textSecondary: 'text-blue-300',
        }
      case 'connecting':
        return {
          border: 'border-blue-400/30',
          bg: 'bg-blue-600/10',
          glow: 'shadow-blue-400/20',
          text: 'text-blue-300',
          textSecondary: 'text-blue-200',
        }
      case 'error':
        return {
          border: 'border-red-500/30',
          bg: 'bg-red-600/10',
          glow: 'shadow-red-500/20',
          text: 'text-red-400',
          textSecondary: 'text-red-300',
        }
      case 'pending':
        return {
          border: 'border-white/10',
          bg: 'bg-white/5',
          glow: '',
          text: 'text-gray-400',
          textSecondary: 'text-gray-500',
        }
    }
  }

  return (
    <div className="space-y-4">
      {/* Grille de bulles avec animations */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-4">
        {sources.map((source, index) => {
          const isActive = source.status === 'analyzing' || source.status === 'connecting'
          const styles = getStyles(source.status)
          
          return (
            <motion.div
              key={source.name}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className={cn(
                "relative rounded-xl border backdrop-blur-xl p-4 transition-all duration-300",
                styles.border,
                styles.bg,
                isActive && `shadow-lg ${styles.glow} animate-pulse`
              )}
            >
              {/* Effet de glow animé pour les sources actives */}
              {isActive && (
                <div className={cn(
                  "absolute inset-0 rounded-xl border-2 opacity-50",
                  styles.border,
                  "animate-ping"
                )} />
              )}

              {/* Contenu de la bulle */}
              <div className="relative z-10 flex flex-col items-center gap-3">
                {/* Logo/Icone avec fond glassmorphism */}
                <div className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center backdrop-blur-xl border",
                  source.status === 'completed' && "bg-green-500/20 border-green-500/30",
                  source.status === 'analyzing' && "bg-blue-500/20 border-blue-500/30",
                  source.status === 'connecting' && "bg-blue-500/10 border-blue-400/20",
                  source.status === 'error' && "bg-red-500/20 border-red-500/30",
                  source.status === 'pending' && "bg-white/5 border-white/10"
                )}>
                  {getStatusIcon(source.status)}
                </div>

                {/* Nom de la plateforme */}
                <div className="text-center">
                  <p className={cn(
                    "text-xs font-medium leading-tight",
                    styles.text
                  )}>
                    {source.name}
                  </p>
                  
                  {/* Statut */}
                  <p className={cn(
                    "text-xs mt-1",
                    styles.textSecondary
                  )}>
                    {getStatusText(source)}
                  </p>
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
