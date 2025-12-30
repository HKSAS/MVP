'use client'

/**
 * Composant de chargement intelligent pour la recherche
 * 
 * Affiche :
 * - Texte dynamique orienté valeur
 * - Barre de progression animée
 * - Étapes visibles avec états
 * - Messages contextuels selon le temps
 * - Bouton d'annulation
 */

import { useState, useEffect, useRef } from 'react'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { 
  Brain, 
  Search, 
  Filter, 
  CheckCircle2, 
  Loader2, 
  XCircle,
  Sparkles,
  AlertCircle
} from 'lucide-react'
import { cn } from '@/components/ui/utils'

interface SearchLoadingProps {
  /** Job ID pour permettre l'annulation */
  jobId?: string | null
  /** Callback appelé lors de l'annulation */
  onCancel?: () => void
  /** Critères de recherche pour personnaliser les messages */
  searchCriteria?: {
    brand?: string
    model?: string
  }
}

interface LoadingStep {
  id: string
  label: string
  status: 'pending' | 'active' | 'completed'
  icon: React.ReactNode
}

export function SearchLoading({ jobId, onCancel, searchCriteria }: SearchLoadingProps) {
  const [progress, setProgress] = useState(0)
  const [currentMessage, setCurrentMessage] = useState(0)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [showLongMessage, setShowLongMessage] = useState(false)
  const startTimeRef = useRef<number>(Date.now())
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const messageIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const [isCancelling, setIsCancelling] = useState(false)

  // Messages dynamiques qui changent pendant le chargement
  const messages = [
    "Recherche des meilleures offres en cours...",
    "Analyse du marché automobile en temps réel...",
    "Scan de milliers d'annonces en cours...",
    "Filtrage intelligent des résultats...",
    "Calcul des scores de fiabilité...",
    "Finalisation de votre recherche personnalisée...",
  ]

  // Étapes du processus
  const [steps, setSteps] = useState<LoadingStep[]>([
    {
      id: 'connect',
      label: 'Connexion aux sources',
      status: 'pending',
      icon: <Search className="size-4" />,
    },
    {
      id: 'analyze',
      label: 'Analyse des annonces',
      status: 'pending',
      icon: <Brain className="size-4" />,
    },
    {
      id: 'filter',
      label: 'Filtrage intelligent',
      status: 'pending',
      icon: <Filter className="size-4" />,
    },
    {
      id: 'finalize',
      label: 'Finalisation',
      status: 'pending',
      icon: <Sparkles className="size-4" />,
    },
  ])

  // Gestion de la progression simulée
  useEffect(() => {
    // Progression initiale rapide (0-40% en 3s)
    const initialProgress = () => {
      let current = 0
      const interval = setInterval(() => {
        current += 2
        if (current <= 40) {
          setProgress(current)
        } else {
          clearInterval(interval)
          // Progression lente ensuite (40-85% sur 15s)
          const slowProgress = setInterval(() => {
            current += 0.3
            if (current <= 85) {
              setProgress(current)
            } else {
              clearInterval(slowProgress)
              // Progression très lente pour les dernières 15% (85-95% sur 10s)
              const finalProgress = setInterval(() => {
                current += 0.1
                if (current <= 95) {
                  setProgress(current)
                } else {
                  clearInterval(finalProgress)
                }
              }, 200)
            }
          }, 200)
        }
      }, 50)
      return interval
    }

    progressIntervalRef.current = initialProgress()

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
      }
    }
  }, [])

  // Changement de message toutes les 3 secondes
  useEffect(() => {
    messageIntervalRef.current = setInterval(() => {
      setCurrentMessage((prev) => (prev + 1) % messages.length)
    }, 3000)

    return () => {
      if (messageIntervalRef.current) {
        clearInterval(messageIntervalRef.current)
      }
    }
  }, [messages.length])

  // Suivi du temps écoulé
  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000)
      setElapsedTime(elapsed)

      // Afficher le message long après 5 secondes
      if (elapsed >= 5 && !showLongMessage) {
        setShowLongMessage(true)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [showLongMessage])

  // Mise à jour des étapes selon la progression
  useEffect(() => {
    const updateSteps = () => {
      setSteps((prevSteps) => {
        const newSteps = [...prevSteps]
        
        if (progress >= 10 && newSteps[0].status === 'pending') {
          newSteps[0].status = 'active'
        }
        if (progress >= 25 && newSteps[0].status === 'active') {
          newSteps[0].status = 'completed'
          newSteps[1].status = 'active'
        }
        if (progress >= 50 && newSteps[1].status === 'active') {
          newSteps[1].status = 'completed'
          newSteps[2].status = 'active'
        }
        if (progress >= 75 && newSteps[2].status === 'active') {
          newSteps[2].status = 'completed'
          newSteps[3].status = 'active'
        }
        if (progress >= 90 && newSteps[3].status === 'active') {
          newSteps[3].status = 'completed'
        }
        
        return newSteps
      })
    }

    updateSteps()
  }, [progress])

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
        // Appeler le callback si fourni
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
      return "La recherche prend du temps car nous analysons en profondeur chaque annonce pour garantir la meilleure qualité et précision."
    }
    if (elapsedTime >= 5) {
      return "La recherche peut prendre jusqu'à 20 secondes pour garantir la meilleure qualité des résultats."
    }
    return null
  }

  const contextualMessage = getContextualMessage()
  const brandModel = searchCriteria?.brand && searchCriteria?.model
    ? `${searchCriteria.brand} ${searchCriteria.model}`
    : 'votre véhicule'

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* En-tête avec animation */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white px-6 py-3 rounded-full mb-6 shadow-lg">
            <Brain className="size-5 animate-spin" />
            <span className="font-medium">
              {messages[currentMessage]}
            </span>
          </div>
          
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
            Recherche en cours
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Notre IA analyse les meilleures offres pour <span className="font-semibold text-blue-600">{brandModel}</span>
          </p>
        </div>

        {/* Barre de progression */}
        <Card className="mb-8 border-2 border-blue-100 shadow-lg">
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">
                  Progression
                </span>
                <span className="text-sm font-bold text-blue-600">
                  {Math.round(progress)}%
                </span>
              </div>
              <Progress 
                value={progress} 
                className="h-3 bg-blue-100"
              />
            </div>
          </CardContent>
        </Card>

        {/* Étapes du processus */}
        <Card className="mb-8 border border-gray-200 shadow-md">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Étapes en cours
            </h2>
            <div className="space-y-4">
              {steps.map((step, index) => (
                <div
                  key={step.id}
                  className={cn(
                    "flex items-center gap-4 p-4 rounded-lg transition-all duration-300",
                    step.status === 'active' && "bg-blue-50 border-2 border-blue-200 shadow-sm",
                    step.status === 'completed' && "bg-green-50 border border-green-200",
                    step.status === 'pending' && "bg-gray-50 border border-gray-200"
                  )}
                >
                  <div
                    className={cn(
                      "flex items-center justify-center w-10 h-10 rounded-full transition-all",
                      step.status === 'active' && "bg-blue-600 text-white animate-pulse",
                      step.status === 'completed' && "bg-green-600 text-white",
                      step.status === 'pending' && "bg-gray-300 text-gray-500"
                    )}
                  >
                    {step.status === 'active' ? (
                      <Loader2 className="size-5 animate-spin" />
                    ) : step.status === 'completed' ? (
                      <CheckCircle2 className="size-5" />
                    ) : (
                      step.icon
                    )}
                  </div>
                  <div className="flex-1">
                    <p
                      className={cn(
                        "font-medium transition-colors",
                        step.status === 'active' && "text-blue-900",
                        step.status === 'completed' && "text-green-900",
                        step.status === 'pending' && "text-gray-500"
                      )}
                    >
                      {step.label}
                    </p>
                  </div>
                  {step.status === 'active' && (
                    <div className="flex gap-1">
                      {[...Array(3)].map((_, i) => (
                        <div
                          key={i}
                          className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"
                          style={{ animationDelay: `${i * 0.2}s` }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Message contextuel selon le temps */}
        {contextualMessage && (
          <Card className="mb-8 border border-blue-200 bg-blue-50/50">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="size-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-blue-900 leading-relaxed">
                  {contextualMessage}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Bouton d'annulation */}
        {jobId && (
          <div className="text-center">
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={isCancelling}
              className="border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400"
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
          </div>
        )}

        {/* Indicateur de qualité */}
        <div className="mt-12 text-center">
          <div className="inline-flex items-center gap-2 text-sm text-gray-500">
            <Sparkles className="size-4 text-blue-500" />
            <span>Analyse professionnelle en cours</span>
          </div>
        </div>
      </div>
    </div>
  )
}

