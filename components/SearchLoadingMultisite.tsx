'use client'

/**
 * Composant de chargement multisite pour la recherche
 * 
 * Design premium orienté sources multiples avec nouveau style Figma :
 * - Dark theme avec glassmorphism
 * - Animations framer-motion
 * - Liste des plateformes avec statuts dynamiques
 * - Progression crédible (max 85-90%)
 */

import { useState, useEffect, useRef } from 'react'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Search, 
  Loader2, 
  XCircle,
  AlertCircle,
  CheckCircle2,
  Clock
} from 'lucide-react'
import { ScrapingSourcesGrid } from '@/components/ScrapingSourcesGrid'
import type { SiteResult } from '@/lib/search-types'

interface SearchLoadingMultisiteProps {
  /** Job ID pour permettre l'annulation */
  jobId?: string | null
  /** Callback appelé lors de l'annulation */
  onCancel?: () => void
  /** Critères de recherche pour personnaliser les messages */
  searchCriteria?: {
    brand?: string
    model?: string
  }
  /** Données réelles des sites (quand disponibles) */
  realSiteResults?: SiteResult[]
  /** Liste des sites exclus (ne seront pas affichés) */
  excludedSites?: string[]
}

// Étapes du processus (une seule active à la fois)
const PROCESS_STEPS = [
  {
    id: 'connect',
    label: 'Connexion aux sources',
    description: 'Établissement des connexions avec les plateformes partenaires',
    icon: Search,
  },
  {
    id: 'analyze',
    label: 'Analyse des annonces',
    description: 'Extraction et analyse des données de chaque source',
    icon: Loader2,
  },
  {
    id: 'filter',
    label: 'Filtrage intelligent',
    description: 'Application des critères de recherche et déduplication',
    icon: Search,
  },
  {
    id: 'score',
    label: 'Calcul des scores',
    description: 'Évaluation de la fiabilité et pertinence de chaque annonce',
    icon: Loader2,
  },
]

export function SearchLoadingMultisite({ 
  jobId, 
  onCancel, 
  searchCriteria,
  realSiteResults = [],
  excludedSites = []
}: SearchLoadingMultisiteProps) {
  const [progress, setProgress] = useState(0)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [showLongMessage, setShowLongMessage] = useState(false)
  const startTimeRef = useRef<number>(Date.now())
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const [isCancelling, setIsCancelling] = useState(false)
  const [completedSourcesCount, setCompletedSourcesCount] = useState(0)

  // Compter les sources réellement terminées (en excluant les sites exclus)
  useEffect(() => {
    const filteredResults = realSiteResults.filter(r => {
      const normalizedSite = r.site.toLowerCase().replace(/\s+/g, '')
      const normalizedExcluded = excludedSites.map(s => s.toLowerCase().replace(/\s+/g, ''))
      return !normalizedExcluded.includes(normalizedSite)
    })
    const completed = filteredResults.filter(r => r.ok).length
    setCompletedSourcesCount(completed)
  }, [realSiteResults, excludedSites])

  // Progression basée sur les sources réellement terminées
  // RÈGLE STRICTE : La progression ne peut pas dépasser 90% tant que toutes les sources ne sont pas terminées
  useEffect(() => {
    const totalSources = Math.max(1, 7 - excludedSites.length) // Nombre total de sources (moins les exclus, minimum 1)
    const baseProgressPerSource = 75 / totalSources // 75% max pour les sources
    const finalizationProgress = 15 // 15% pour la finalisation
    
    if (realSiteResults.length > 0) {
      // Filtrer les résultats pour exclure les sites exclus
      const filteredResults = realSiteResults.filter(r => {
        const normalizedSite = r.site.toLowerCase().replace(/\s+/g, '')
        const normalizedExcluded = excludedSites.map(s => s.toLowerCase().replace(/\s+/g, ''))
        return !normalizedExcluded.includes(normalizedSite)
      })
      
      // Utiliser les données réelles - progression basée sur les sources réellement terminées
      const completed = filteredResults.filter(r => r.ok).length
      const errorCount = filteredResults.filter(r => !r.ok).length
      const totalProcessed = completed + errorCount
      
      // Progression = (sources terminées * progression par source) + finalisation si tout est fait
      const realProgress = (completed * baseProgressPerSource) + 
                          (totalProcessed === totalSources ? finalizationProgress : 0)
      
      // Ne jamais dépasser 90% tant que toutes les sources ne sont pas traitées
      setProgress(Math.min(realProgress, totalProcessed === totalSources ? 90 : 85))
    } else {
      // Simulation réaliste si pas de données (basée sur le temps)
      let current = 0
      
      // Phase 1 : Démarrage rapide (0-20% en 2s)
      const phase1 = setInterval(() => {
        current += 1
        if (current <= 20) {
          setProgress(current)
        } else {
          clearInterval(phase1)
          
          // Phase 2 : Progression modérée (20-60% en 8s)
          const phase2 = setInterval(() => {
            current += 0.5
            if (current <= 60) {
              setProgress(current)
            } else {
              clearInterval(phase2)
              
              // Phase 3 : Progression lente (60-80% sur 10s)
              const phase3 = setInterval(() => {
                current += 0.2
                if (current <= 80) {
                  setProgress(current)
                } else {
                  clearInterval(phase3)
                  // Ne jamais dépasser 80% sans données réelles
                }
              }, 200)
            }
          }, 200)
        }
      }, 100)

      progressIntervalRef.current = phase1

      return () => {
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current)
        }
      }
    }
  }, [realSiteResults, excludedSites])

  // Mise à jour des étapes selon la progression
  useEffect(() => {
    if (progress >= 5 && currentStepIndex === 0) {
      setCurrentStepIndex(1)
    } else if (progress >= 30 && currentStepIndex === 1) {
      setCurrentStepIndex(2)
    } else if (progress >= 60 && currentStepIndex === 2) {
      setCurrentStepIndex(3)
    }
  }, [progress, currentStepIndex])

  // Suivi du temps écoulé
  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000)
      setElapsedTime(elapsed)

      if (elapsed >= 5 && !showLongMessage) {
        setShowLongMessage(true)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [showLongMessage])

  // Fonction d'annulation
  const handleCancel = async () => {
    if (!jobId || isCancelling) return

    setIsCancelling(true)

    try {
      const response = await fetch('/api/scraping/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId }),
      })

      if (response.ok) {
        if (onCancel) {
          onCancel()
        }
      } else {
        console.error('Erreur lors de l\'annulation')
        setIsCancelling(false)
      }
    } catch (error) {
      console.error('Erreur lors de l\'annulation:', error)
      setIsCancelling(false)
    }
  }

  // Message contextuel selon le temps
  const getContextualMessage = () => {
    if (elapsedTime >= 10) {
      return "L'analyse approfondie de chaque source garantit la meilleure qualité et précision des résultats."
    }
    if (elapsedTime >= 5) {
      return "La recherche peut prendre jusqu'à 20 secondes pour analyser toutes les sources disponibles."
    }
    return null
  }

  const contextualMessage = getContextualMessage()
  const brandModel = searchCriteria?.brand && searchCriteria?.model
    ? `${searchCriteria.brand} ${searchCriteria.model}`
    : 'votre véhicule'

  const currentStep = PROCESS_STEPS[currentStepIndex]
  const CurrentStepIcon = currentStep.icon

  return (
    <div className="bg-[#0a0a0a] text-white min-h-screen pt-20">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/3 w-[400px] h-[400px] bg-purple-600/10 rounded-full blur-[100px]"></div>
          </div>
          
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10">
        {/* En-tête avec animations */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <Badge variant="secondary" className="bg-white/10 text-white border-white/20 rounded-full px-4 py-2 mb-6">
            <Search className="size-4 mr-2 inline" />
            RECHERCHE INTELLIGENTE EN COURS
          </Badge>
          
          <h1 className="text-4xl md:text-5xl font-medium text-white mb-4">
            Analyse des meilleures offres
          </h1>
          <p className="text-xl text-gray-400">
            Nous analysons les meilleures offres pour <span className="font-medium text-white bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">{brandModel}</span>
          </p>
        </motion.div>

        {/* Barre de progression avec design moderne */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Card className="bg-white/5 backdrop-blur-xl border-white/10 mb-8">
          <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400 font-medium">
                  Progression globale
                </span>
                  <span className="text-2xl font-medium bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  {Math.round(progress)}%
                </span>
              </div>
                <div className="relative h-3 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
                </div>
            </div>
          </CardContent>
        </Card>
        </motion.div>

        {/* Sources analysées - Grille de bulles avec nouveau design */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <Card className="bg-white/5 backdrop-blur-xl border-white/10 mb-8">
          <CardContent className="p-6">
              <h2 className="text-lg font-medium text-white mb-4">SOURCES ANALYSÉES</h2>
            <ScrapingSourcesGrid
              realSiteResults={realSiteResults}
              elapsedSeconds={elapsedTime}
              excludedSites={excludedSites}
            />
              <p className="text-sm text-gray-400 mt-6 text-center">
                Chaque plateforme est analysée indépendamment. Les résultats s&apos;affichent dès que toutes les sources sont consolidées.
              </p>
          </CardContent>
        </Card>
        </motion.div>

        {/* Étape active unique avec animation */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStepIndex}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="bg-gradient-to-br from-blue-600/20 via-purple-600/20 to-blue-600/10 backdrop-blur-xl border-blue-500/30 mb-8">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                    <CurrentStepIcon className="size-6 text-white animate-spin" />
              </div>
              <div className="flex-1">
                    <h3 className="text-lg font-medium text-white mb-2">
                  {currentStep.label}
                </h3>
                    <p className="text-sm text-gray-300">
                  {currentStep.description}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
          </motion.div>
        </AnimatePresence>

        {/* Message contextuel selon le temps */}
        <AnimatePresence>
        {contextualMessage && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="bg-white/5 backdrop-blur-xl border-white/10 mb-6">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                    <AlertCircle className="size-5 text-blue-400 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-gray-300 leading-relaxed">
                  {contextualMessage}
                </p>
              </div>
            </CardContent>
          </Card>
            </motion.div>
        )}
        </AnimatePresence>

        {/* Bouton d'annulation */}
        {jobId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="text-center"
          >
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={isCancelling}
              className="border-white/20 text-gray-300 hover:bg-white/10 hover:text-white hover:border-white/30"
            >
              {isCancelling ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  Annulation en cours...
                </>
              ) : (
                <>
                  <XCircle className="size-4 mr-2" />
                  Annuler la recherche
                </>
              )}
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  )
}
